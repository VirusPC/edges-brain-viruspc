"""Ask a Codex-style agent client for repository-relative paths.

`codex exec --json` prints a JSONL event stream on stdout (`thread.*`,
`turn.*`, `item.started` / `item.completed`, including `command_execution`
and `reasoning`). The runner stores that stream under
`.harness/evaluation/.cache/retrieval/sessions/` (gitignored). Scoring reads
the `-o` last-message file first. If that file is empty, the fallback is the
last `item.completed` event whose `item.type` is `agent_message`.
"""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from retrieval_eval.config import Client


_JSON_OBJECT = re.compile(r"\{[\s\S]*?\}")


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
    return [
        client.command,
        "exec",
        "--ephemeral",
        "--json",
        "--sandbox",
        client.sandbox,
        "--skip-git-repo-check",
        "-C",
        str(repo_dir),
        "-o",
        str(last_message_path),
        prompt,
    ]


def run_client(
    client: Client,
    repo_dir: Path,
    prompt: str,
    last_message_path: Path,
) -> ClientCall:
    """Run the client and parse `{"predicted": [...]}` from the `-o` file, else JSONL."""
    command = codex_command(client, repo_dir, prompt, last_message_path)
    try:
        result = subprocess.run(
            command,
            check=False,
            text=True,
            capture_output=True,
            timeout=client.timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        if isinstance(stdout, bytes):
            stdout = stdout.decode("utf-8", errors="replace")
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", errors="replace")
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
