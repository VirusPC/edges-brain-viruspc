"""Ask an agent client for repository-relative paths.

Codex (`kind=codex`): `codex exec --json` prints a JSONL event stream on
stdout (`thread.*`, `turn.*`, `item.started` / `item.completed`, including
`command_execution` and `reasoning`). Scoring reads the `-o` last-message
file first. If that file is empty, the fallback is the last `item.completed`
event whose `item.type` is `agent_message`.

pi (`kind=pi`): `pi --mode json` prints one JSON object per line. There is
no `-o` file. The answer is the concatenated `text` blocks of the last
assistant `message_end` with `stopReason` `stop`. Exit code 0 with
`stopReason` `error` or `aborted` is still a failure. stdin is `DEVNULL`.
Tools stay at pi's defaults (`read`, `bash`, `edit`, `write`): the command
does not pass `--tools`. Before the prompt, `pi install npm:pi-sandbox@0.7.1`
loads the sandbox into a fresh `PI_CODING_AGENT_DIR`. `sandbox.json` lists real
top-level directories in `denyRead` (symlinks and proc/dev/sys are omitted),
`allowRead` as the clone (`.`) plus system directories that are not symlinks,
and `allowWrite` as `[]`. `denyWrite` covers runtime paths that stay writable
when `allowWrite` is empty. Before the prompt, one sandboxed `true` must
succeed. `-ne` stays off so that package loads.
The runner stores the event stream under
`.harness/evaluation/.cache/retrieval/sessions/` (gitignored).
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

from retrieval_eval.config import Client


_JSON_OBJECT = re.compile(r"\{[\s\S]*?\}")
_PI_FAILURE_REASONS = frozenset({"error", "aborted"})
PI_SANDBOX_PACKAGE = "npm:pi-sandbox@0.7.1"
# Real directories only. On usr-merge, /bin /lib /lib64 are symlinks into /usr
# and must stay out of both lists: bwrap refuses --tmpfs on a symlink.
_SYSTEM_ALLOW_READ = ("/usr", "/bin", "/lib", "/lib64", "/System")
_ROOT_DENY_SKIP = frozenset({"proc", "dev", "sys"})
# @carderne/sandbox-runtime always bind-mounts these, ignoring allowWrite: [].
_RUNTIME_DENY_WRITE = (
    "/tmp/agents",
    "/private/tmp/agents",
    "~/.npm/_logs",
    "~/.claude/debug",
)


class ClientEnvError(RuntimeError):
    """A `$NAME` client env reference is unset. The message contains the name only."""


@dataclass(frozen=True)
class ClientCall:
    predicted: list[str]
    command: list[str]
    stdout: str
    stderr: str
    returncode: int
    timed_out: bool
    parse_error: str | None


def build_prompt(question: str) -> str:
    """Tell the client to finish with a predicted-path JSON object."""
    return (
        "你在当前 git 仓库里做检索。根据仓库里的文件，找出最多 5 个最相关的文档。\n"
        "路径使用仓库根下的相对路径，按相关程度从高到低排列。\n"
        "最后一行只写 JSON，不要加代码围栏：\n"
        '{"predicted":["相对路径"]}\n'
        "\n"
        f"问题：{question}\n"
    )


def codex_command(
    client: Client,
    repo_dir: Path,
    prompt: str,
    last_message_path: Path,
) -> list[str]:
    """Non-interactive client command. The sandbox stays read-only unless configured otherwise."""
    config_args: list[str] = []
    for override in client.codex_config_overrides():
        config_args.extend(["-c", override])
    return [
        client.command,
        "exec",
        "--ephemeral",
        "--json",
        "--sandbox",
        client.sandbox,
        "--skip-git-repo-check",
        *config_args,
        "-C",
        str(repo_dir),
        "-o",
        str(last_message_path),
        prompt,
    ]


def pi_command(client: Client, prompt: str) -> list[str]:
    """pi with default tools. cwd is the repo; there is no `-o` and no `--tools`.

    Extensions stay enabled so the package installed into `PI_CODING_AGENT_DIR`
    loads. `--no-approve` still ignores project-local files.
    """
    return [
        client.command,
        "--mode",
        "json",
        "--no-session",
        "-ns",
        "-np",
        "-nc",
        "--no-themes",
        "--no-mcp",
        "-na",
        "--offline",
        "--model",
        f"{client.provider}/{client.model}",
        "--thinking",
        client.thinking or "",
        "--",
        prompt,
    ]


def pi_install_command(client: Client) -> list[str]:
    """Install pi-sandbox into the active agent dir. Does not trust project files."""
    return [client.command, "install", PI_SANDBOX_PACKAGE, "--no-approve"]


def pi_deny_read_paths(root: Path | None = None) -> list[str]:
    """Real top-level directories, skipping symlinks and proc/dev/sys.

    pi-sandbox turns `denyRead: ["/"]` into `--tmpfs` on each child and
    follows symlinks. bubblewrap 0.11+ then exits with
    `Can't mount on symlink destination`.
    """
    base = root or Path("/")
    found: list[str] = []
    for child in base.iterdir():
        if child.name in _ROOT_DENY_SKIP or child.is_symlink():
            continue
        if child.is_dir():
            found.append(str(child))
    return sorted(found)


def pi_allow_read_paths(candidates: tuple[str, ...] | None = None) -> list[str]:
    """`.` plus system directories that are real directories, not symlinks."""
    allow = ["."]
    for raw in _SYSTEM_ALLOW_READ if candidates is None else candidates:
        path = Path(raw)
        if path.is_symlink() or not path.is_dir():
            continue
        allow.append(raw)
    return allow


def pi_sandbox_config() -> dict[str, object]:
    """Expanded root deny, clone plus real system dirs, and no configured writes.

    A configured array replaces that key's plugin default. `allowWrite: []`
    drops the plugin default of `.` and `/tmp`. The runtime still mounts its
    own write paths, so those are listed in `denyWrite`.
    """
    return {
        "filesystem": {
            "denyRead": pi_deny_read_paths(),
            "allowRead": pi_allow_read_paths(),
            "allowWrite": [],
            "denyWrite": list(_RUNTIME_DENY_WRITE),
        }
    }


def pi_sandbox_config_json() -> str:
    """JSON written to `$PI_CODING_AGENT_DIR/sandbox.json`."""
    return json.dumps(pi_sandbox_config(), ensure_ascii=False)


def pi_sandbox_check_command(cwd: Path, bwrap: str = "bwrap") -> list[str]:
    """One sandboxed `true` using the same deny/allow mounts as sandbox.json.

    Linux runs bubblewrap directly. macOS asks `sandbox-exec` to apply the
    same allow/deny paths. A non-zero status fails the sample before the prompt.
    """
    filesystem = pi_sandbox_config()["filesystem"]
    assert isinstance(filesystem, dict)
    deny = filesystem["denyRead"]
    allow = filesystem["allowRead"]
    assert isinstance(deny, list) and isinstance(allow, list)
    resolved = str(cwd.resolve()) if cwd.exists() else os.path.abspath(cwd)
    if sys.platform == "darwin":
        lines = ["(version 1)", "(allow default)"]
        for path in deny:
            lines.append(f'(deny file-read* (subpath "{path}"))')
        for path in allow:
            target = resolved if path == "." else path
            lines.append(f'(allow file-read* (subpath "{target}"))')
        lines.append('(allow file-read* (literal "/"))')
        return ["sandbox-exec", "-p", "\n".join(lines), "true"]
    command = [bwrap, "--die-with-parent", "--ro-bind", "/", "/"]
    for path in deny:
        command.extend(["--tmpfs", str(path)])
    for path in allow:
        target = resolved if path == "." else str(path)
        if path != "." and not Path(target).exists():
            continue
        command.extend(["--ro-bind", target, target])
    command.extend(["--chdir", resolved, "--", "true"])
    return command


def missing_pi_sandbox_dependencies() -> list[str]:
    """Binaries pi-sandbox's runtime refuses to start without.

    In `--mode json` a failed init is only a no-op UI notify, and pi then runs
    unsandboxed. Missing binaries fail the sample before that.
    """
    if sys.platform.startswith("linux"):
        required = ("rg", "bwrap", "socat")
    elif sys.platform == "darwin":
        required = ("sandbox-exec",)
    else:
        return [sys.platform]
    return [name for name in required if shutil.which(name) is None]


def read_command_version(command: str) -> str | None:
    """First stdout line of `command --version`, or None when that call fails."""
    try:
        result = subprocess.run(
            [command, "--version"],
            check=False,
            text=True,
            capture_output=True,
            stdin=subprocess.DEVNULL,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    lines = result.stdout.strip().splitlines()
    if not lines:
        return None
    version = lines[0].strip()
    return version or None


def expand_client_env(client: Client) -> dict[str, str]:
    """Resolve `$NAME` entries from the process environment. Literals pass through.

    A missing or empty referenced variable raises `ClientEnvError` with the
    variable name. The value is never included.
    """
    expanded: dict[str, str] = {}
    for key, value in (client.env or {}).items():
        if value.startswith("$"):
            ref = value[1:]
            got = os.environ.get(ref)
            if got is None or got == "":
                raise ClientEnvError(f"missing environment variable {ref}")
            expanded[key] = got
        else:
            expanded[key] = value
    return expanded


def run_client(
    client: Client,
    repo_dir: Path,
    prompt: str,
    last_message_path: Path,
) -> ClientCall:
    """Run the client and parse `{"predicted": [...]}`."""
    if client.kind == "pi":
        return _run_pi(client, repo_dir, prompt, last_message_path)
    return _run_codex(client, repo_dir, prompt, last_message_path)


def _run_codex(
    client: Client,
    repo_dir: Path,
    prompt: str,
    last_message_path: Path,
) -> ClientCall:
    """Parse `{"predicted": [...]}` from the `-o` file, else Codex JSONL."""
    command = codex_command(client, repo_dir, prompt, last_message_path)
    try:
        result = subprocess.run(
            command,
            check=False,
            text=True,
            capture_output=True,
            timeout=client.timeout_seconds,
            # Codex reads stdin when it is open and then waits until timeout.
            stdin=subprocess.DEVNULL,
        )
    except subprocess.TimeoutExpired as exc:
        stdout, stderr = _timeout_streams(exc)
        return ClientCall(
            predicted=[],
            command=command,
            stdout=stdout,
            stderr=stderr,
            returncode=-1,
            timed_out=True,
            parse_error="timeout",
        )

    last_message = ""
    if last_message_path.is_file():
        last_message = last_message_path.read_text(encoding="utf-8")
    predicted, parse_error = parse_client_answer(last_message, result.stdout)
    return ClientCall(
        predicted=predicted,
        command=command,
        stdout=result.stdout,
        stderr=result.stderr,
        returncode=result.returncode,
        timed_out=False,
        parse_error=parse_error,
    )


def _write_pi_sandbox_config(agent_dir: Path) -> None:
    (agent_dir / "sandbox.json").write_text(pi_sandbox_config_json() + "\n", encoding="utf-8")


def _run_pi_process(
    command: list[str],
    *,
    cwd: Path,
    env: dict[str, str],
    timeout: int,
) -> subprocess.CompletedProcess[str] | ClientCall:
    try:
        return subprocess.run(
            command,
            check=False,
            text=True,
            capture_output=True,
            timeout=timeout,
            stdin=subprocess.DEVNULL,
            cwd=cwd,
            env=env,
        )
    except subprocess.TimeoutExpired as exc:
        stdout, stderr = _timeout_streams(exc)
        return ClientCall(
            predicted=[],
            command=command,
            stdout=stdout,
            stderr=stderr,
            returncode=-1,
            timed_out=True,
            parse_error="timeout",
        )


def _run_pi(
    client: Client,
    repo_dir: Path,
    prompt: str,
    last_message_path: Path,
) -> ClientCall:
    """Run pi with stdin closed. A fresh PI_CODING_AGENT_DIR is removed afterwards."""
    command = pi_command(client, prompt)
    try:
        expanded = expand_client_env(client)
    except ClientEnvError as exc:
        return ClientCall(
            predicted=[],
            command=command,
            stdout="",
            stderr="",
            returncode=-1,
            timed_out=False,
            parse_error=str(exc),
        )

    missing = missing_pi_sandbox_dependencies()
    if missing:
        return ClientCall(
            predicted=[],
            command=command,
            stdout="",
            stderr="",
            returncode=-1,
            timed_out=False,
            parse_error="Sandbox dependencies not available: " + ", ".join(missing),
        )

    agent_dir = tempfile.mkdtemp(prefix="pi-coding-agent-")
    env = os.environ.copy()
    env.update(expanded)
    env["PI_CODING_AGENT_DIR"] = agent_dir
    env["PI_TELEMETRY"] = "0"
    install = pi_install_command(client)
    try:
        _write_pi_sandbox_config(Path(agent_dir))
        installed = _run_pi_process(
            install,
            cwd=repo_dir,
            env=env,
            timeout=client.timeout_seconds,
        )
        if isinstance(installed, ClientCall):
            return installed
        if installed.returncode != 0:
            return ClientCall(
                predicted=[],
                command=install,
                stdout=installed.stdout,
                stderr=installed.stderr,
                returncode=installed.returncode,
                timed_out=False,
                parse_error=f"pi install {PI_SANDBOX_PACKAGE} failed",
            )
        bwrap = shutil.which("bwrap") or "bwrap"
        check = pi_sandbox_check_command(repo_dir, bwrap if sys.platform.startswith("linux") else "bwrap")
        checked = _run_pi_process(
            check,
            cwd=repo_dir,
            env=env,
            timeout=min(30, client.timeout_seconds),
        )
        if isinstance(checked, ClientCall):
            if checked.parse_error == "timeout":
                return ClientCall(
                    predicted=[],
                    command=check,
                    stdout=checked.stdout,
                    stderr=checked.stderr,
                    returncode=checked.returncode,
                    timed_out=True,
                    parse_error="pi sandbox bash check failed: timeout",
                )
            return checked
        if checked.returncode != 0:
            detail = (checked.stderr or checked.stdout or "").strip()
            if len(detail) > 500:
                detail = detail[-500:]
            message = "pi sandbox bash check failed"
            if detail:
                message = f"{message}: {detail}"
            return ClientCall(
                predicted=[],
                command=check,
                stdout=checked.stdout,
                stderr=checked.stderr,
                returncode=checked.returncode,
                timed_out=False,
                parse_error=message,
            )
        result = _run_pi_process(
            command,
            cwd=repo_dir,
            env=env,
            timeout=client.timeout_seconds,
        )
        if isinstance(result, ClientCall):
            return result
    finally:
        shutil.rmtree(agent_dir, ignore_errors=True)

    predicted, parse_error = parse_pi_answer(result.stdout, result.returncode)
    answer = "" if parse_error else _last_stop_text(result.stdout) or ""
    last_message_path.write_text(answer, encoding="utf-8")
    return ClientCall(
        predicted=predicted,
        command=command,
        stdout=result.stdout,
        stderr=result.stderr,
        returncode=result.returncode,
        timed_out=False,
        parse_error=parse_error,
    )


def _timeout_streams(exc: subprocess.TimeoutExpired) -> tuple[str, str]:
    stdout = exc.stdout or ""
    stderr = exc.stderr or ""
    if isinstance(stdout, bytes):
        stdout = stdout.decode("utf-8", errors="replace")
    if isinstance(stderr, bytes):
        stderr = stderr.decode("utf-8", errors="replace")
    return stdout, stderr


_EVENT_PREFIXES = ("thread.", "turn.", "item.")


def parse_client_answer(last_message: str, stdout: str) -> tuple[list[str], str | None]:
    """Prefer the `-o` last message. Otherwise read the last JSONL agent message."""
    if last_message.strip():
        return parse_predicted(last_message)
    is_event_stream, message = _agent_message_from_jsonl(stdout)
    if not is_event_stream:
        return parse_predicted(stdout)
    if message is None:
        return [], "no agent message in event stream"
    return parse_predicted(message)


def _agent_message_from_jsonl(stdout: str) -> tuple[bool, str | None]:
    """Return whether stdout is a Codex `--json` stream and its last agent message."""
    saw_event = False
    found: str | None = None
    for line in stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(event, dict):
            continue
        event_type = event.get("type")
        if not isinstance(event_type, str):
            continue
        if event_type != "error" and not event_type.startswith(_EVENT_PREFIXES):
            continue
        saw_event = True
        if event_type != "item.completed":
            continue
        item = event.get("item")
        if not isinstance(item, dict) or item.get("type") != "agent_message":
            continue
        text = item.get("text")
        if isinstance(text, str):
            found = text
    return saw_event, found


def parse_pi_answer(stdout: str, returncode: int) -> tuple[list[str], str | None]:
    """Answer from the last `stop` message. Exit 0 plus `error`/`aborted` still fails."""
    messages = _assistant_messages(stdout)
    if messages:
        last = messages[-1]
        reason = last.get("stopReason")
        if reason in _PI_FAILURE_REASONS:
            detail = last.get("errorMessage")
            if isinstance(detail, str) and detail.strip():
                return [], detail.strip()
            return [], reason if isinstance(reason, str) else "error"
    if returncode != 0:
        return [], f"exit {returncode}"
    text = _last_stop_text(stdout)
    if text is None:
        return [], "no agent message in event stream"
    return parse_predicted(text)


def _assistant_messages(stdout: str) -> list[dict]:
    messages: list[dict] = []
    for event in _json_objects(stdout):
        if event.get("type") != "message_end":
            continue
        message = event.get("message")
        if isinstance(message, dict) and message.get("role") == "assistant":
            messages.append(message)
    return messages


def _last_stop_text(stdout: str) -> str | None:
    found: str | None = None
    for message in _assistant_messages(stdout):
        if message.get("stopReason") != "stop":
            continue
        found = _join_text_blocks(message.get("content"))
    return found


def _join_text_blocks(content: object) -> str:
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text" and isinstance(block.get("text"), str):
            parts.append(block["text"])
    return "".join(parts)


def _json_objects(stdout: str) -> list[dict]:
    events: list[dict] = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(event, dict):
            events.append(event)
    return events


def parse_predicted(text: str) -> tuple[list[str], str | None]:
    """Return the last JSON object's predicted string list."""
    if not text.strip():
        return [], "empty output"
    for candidate in reversed(_JSON_OBJECT.findall(text)):
        try:
            obj = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and "predicted" in obj:
            predicted = obj["predicted"]
            if isinstance(predicted, list) and all(isinstance(item, str) for item in predicted):
                return predicted, None
            return [], "predicted is not a list of strings"
    return [], "no predicted json found"
