"""Controlled scoped/root/none memory ablation using Harbor's native Codex agent."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import random
import re
import secrets
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path, PurePosixPath

from metrics import CONDITIONS, content_anchors, evaluate_artifact, invalidate_quality, summarize

HERE = Path(__file__).resolve().parent
HARBOR_VERSION = "0.25.0"
SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}\Z")


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    temporary.replace(path)


def timestamp(value: str) -> datetime:
    if not isinstance(value, str):
        raise ValueError("timestamps must be ISO 8601 strings with a timezone")
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("timestamps must have a timezone")
    return result.astimezone(timezone.utc)


def scope_path(value: str) -> PurePosixPath:
    """Reject traversal and ambiguous paths, while allowing real .edges scopes."""
    if not isinstance(value, str) or not value or "\\" in value or any(ord(c) < 32 for c in value):
        raise ValueError("scope must be a safe relative POSIX path")
    path = PurePosixPath(value)
    if value != "." and (path.is_absolute() or path.as_posix() != value or
                         any(part in {".", "..", ".git"} for part in path.parts)):
        raise ValueError("scope must be a normalized relative path without dot segments")
    # These are generated control files in each scope, never business directories.
    if any(part in {"AGENTS.md", "README.md", "MEMORY_INDEX.md"} or part.startswith("memory-") for part in path.parts):
        raise ValueError("scope collides with generated control files")
    return path


def required_text(item: dict, field: str) -> str:
    value = item.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be nonempty text")
    return value


def validate_dataset(dataset: dict) -> dict:
    """Fail before snapshots on bad gold, temporal leakage, IDs, regexes or splits."""
    if not isinstance(dataset, dict) or type(dataset.get("schema_version")) is not int or dataset["schema_version"] != 1:
        raise ValueError("expected dataset schema_version 1")
    memories, cases = dataset.get("memories"), dataset.get("cases")
    if not isinstance(memories, list) or not isinstance(cases, list) or not cases:
        raise ValueError("dataset requires memories and nonempty cases arrays")
    memory_map, seen_cases, sessions = {}, set(), {}
    for memory in memories:
        if not isinstance(memory, dict):
            raise ValueError("memory must be an object")
        mid = required_text(memory, "memory_id")
        if not SAFE_ID.fullmatch(mid) or mid in memory_map:
            raise ValueError("unsafe or duplicate memory_id")
        required_text(memory, "title")
        required_text(memory, "body")
        scope_path(memory.get("scope"))
        timestamp(memory.get("available_at"))
        if not isinstance(memory.get("source"), dict):
            raise ValueError("memory requires source provenance")
        memory_map[mid] = memory
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError("case must be an object")
        cid = required_text(case, "case_id")
        if not SAFE_ID.fullmatch(cid) or cid in seen_cases:
            raise ValueError("unsafe or duplicate case_id")
        seen_cases.add(cid)
        required_text(case, "question")
        scope_path(case.get("scope"))
        when = timestamp(case.get("query_at"))
        if case.get("split") not in {"dev", "test"}:
            raise ValueError("case split must be dev or test")
        if case.get("task_mode", "memory_qa") not in {"memory_qa", "pre_task_retrieval"}:
            raise ValueError("unknown task_mode")
        if not isinstance(case.get("source"), dict):
            raise ValueError("case requires source provenance")
        session = case["source"].get("session_id")
        if session is not None and (not isinstance(session, str) or not session):
            raise ValueError("source.session_id must be nonempty text if present")
        if session:
            previous = sessions.setdefault(session, case["split"])
            if previous != case["split"]:
                raise ValueError("one source session occurs in both dev and test")
        gold = case.get("gold_memory_ids")
        if not isinstance(gold, list) or not all(isinstance(mid, str) for mid in gold) or len(set(gold)) != len(gold):
            raise ValueError("gold_memory_ids must be a unique string list")
        for mid in gold:
            if mid not in memory_map:
                raise ValueError("gold refers to an unknown memory")
            if timestamp(memory_map[mid]["available_at"]) >= when:
                raise ValueError("gold memory was not available strictly before the query")
        checks = case.get("answer_checks", [])
        forbidden = case.get("forbidden_patterns", [])
        if not isinstance(checks, list) or not isinstance(forbidden, list):
            raise ValueError("answer_checks and forbidden_patterns must be lists")
        check_ids = set()
        for check in checks:
            if not isinstance(check, dict):
                raise ValueError("answer check must be an object")
            check_id = required_text(check, "check_id")
            if check_id in check_ids:
                raise ValueError("duplicate answer check ID")
            check_ids.add(check_id)
            re.compile(required_text(check, "pattern"))
        for pattern in forbidden:
            if not isinstance(pattern, str) or not pattern:
                raise ValueError("forbidden pattern must be nonempty text")
            re.compile(pattern)
    return dataset


def memory_text(memory: dict, marker: str) -> str:
    """Identical payload across arms; ownership/time facts survive flattening."""
    metadata = {key: memory[key] for key in ("memory_id", "scope", "title", "available_at")}
    return (json.dumps(metadata, ensure_ascii=False, sort_keys=True) + "\n\n" + memory["body"] +
            f"\n\n<!-- {marker} -->\n")


def all_scopes(memories: list[dict], task_scope: str) -> list[PurePosixPath]:
    scopes = {PurePosixPath(".")}
    for value in [task_scope, *(memory["scope"] for memory in memories)]:
        path = scope_path(value)
        scopes.add(path)
    return sorted(scopes, key=lambda path: (len(path.parts), path.as_posix()))


def build_workspace(destination: Path, memories: list[dict], condition: str,
                    task_scope: str, markers: dict[str, str]) -> dict:
    """Materialize all time-eligible memories, never filter by the query's scope."""
    if condition not in CONDITIONS:
        raise ValueError("unknown condition")
    destination.mkdir(parents=True, exist_ok=False)
    scopes = all_scopes(memories, task_scope)
    for scope in scopes:
        (destination / scope).mkdir(parents=True, exist_ok=True)
    (destination / "README.md").write_text("# Read-only project question\nAnswer from the available local evidence.\n")
    payloads, paths = {}, {}
    if condition == "none":
        return {"memory_payload_sha256": payloads, "memory_paths": paths}
    for memory in sorted(memories, key=lambda memory: memory["memory_id"]):
        mid = memory["memory_id"]
        relative = (scope_path(memory["scope"]) / ".edges/memory" if condition == "scoped" else PurePosixPath(".")) / f"memory-{mid}.md"
        path = destination / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = memory_text(memory, markers[mid]).encode()
        path.write_bytes(payload)
        paths[mid] = relative.as_posix()
        payloads[mid] = hashlib.sha256(payload).hexdigest()
    if condition == "root":
        entries = ["# Available memory files", ""]
        for memory in sorted(memories, key=lambda memory: memory["memory_id"]):
            title = memory["title"].replace("\n", " ")
            entries.append(f'- [{memory["memory_id"]}]({paths[memory["memory_id"]]}) — {title}; scope={memory["scope"]}')
        (destination / "MEMORY_INDEX.md").write_text("\n".join(entries) + "\n")
        (destination / "AGENTS.md").write_text(
            "# Memory discovery\nRead [the memory index](MEMORY_INDEX.md); select relevant entries and read their files.\n"
            "Use each file's scope and available_at to interpret its applicability. Do not modify files.\n")
    else:
        for scope in scopes:
            entries = [f"# Scope {scope.as_posix()}", "",
                       "Select relevant memory files and descendant scopes from these links. Read leaf files before citing their IDs.",
                       "Use each file's scope and available_at to interpret its applicability. Do not modify files.", ""]
            for memory in sorted(memories, key=lambda memory: memory["memory_id"]):
                if scope_path(memory["scope"]) == scope:
                    title = memory["title"].replace("\n", " ")
                    entries.append(f'- [{memory["memory_id"]}](.edges/memory/memory-{memory["memory_id"]}.md) — {title}; scope={memory["scope"]}')
            for child in scopes:
                ancestors = [ancestor for ancestor in child.parents if ancestor in scopes]
                nearest = ancestors[0] if ancestors else None
                if child != scope and nearest == scope:
                    relative = child.relative_to(scope).as_posix()
                    entries.append(f"- [Scope {child.as_posix()}]({relative}/AGENTS.md) — memory and narrower scopes under {child.as_posix()}")
            (destination / scope / "AGENTS.md").write_text("\n".join(entries) + "\n")
    return {"memory_payload_sha256": payloads, "memory_paths": paths}


def directory_digest(directory: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(directory.rglob("*")):
        if path.is_file():
            digest.update(path.relative_to(directory).as_posix().encode() + b"\0")
            digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def instruction(case: dict) -> str:
    mode = case.get("task_mode", "memory_qa")
    task_instruction = (
        "下方是历史用户任务。不要执行外部操作或更改仓库；选择在执行前应该读取的已有记忆。"
        "读取文件后给出最多 5 个 ID，并在 answer 中简述适用规则和未知条件。答案不是完整任务执行结果。\n"
        if mode == "pre_task_retrieval" else "回答下方问题，并说明适用的已知事实。\n"
    )
    return (
        "在 /workspace 的独立环境中回答下面的真实问题。当前任务作用域是 " + json.dumps(case["scope"], ensure_ascii=False) + "。\n"
        "历史任务时间为 " + case["query_at"] + "；请按该时间理解记忆中的事实与变更。\n"
        "可读取本地文件；若存在 AGENTS.md，则从它发现相关材料。仅使用适用于该作用域的事实；可以参考祖先或其他作用域的材料，但不要混淆适用范围。\n"
        "不要联网、修改文件或虚构未获得的事实。只有实际读取过正文的记忆才能进入 selected_memory_ids。\n"
        "按与问题的相关程度排序，最多选择 5 个不同 memory_id；没有相关记忆则返回空数组。记忆 ID 见正文。\n"
        "最终仅输出 JSON 对象，精确包含 answer（自然语言答案）与 selected_memory_ids（字符串数组）两个字段。\n\n"
        + task_instruction + ("历史用户任务：" if mode == "pre_task_retrieval" else "问题：") + case["question"] + "\n"
    )


def prepare(args: argparse.Namespace) -> tuple[dict, list[dict], list[dict], dict]:
    dataset = validate_dataset(json.loads(args.dataset.read_text()))
    if args.repeats < 1 or args.timeout < 1 or args.bootstrap < 0 or (args.limit is not None and args.limit < 1):
        raise ValueError("repeats, timeout and limit must be positive; bootstrap must be nonnegative")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._/:@-]*", args.agent_image):
        raise ValueError("invalid container image")
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", args.codex_version):
        raise ValueError("codex-version must be an explicit numeric release")
    cases = [case for case in dataset["cases"] if args.split == "all" or case["split"] == args.split]
    if args.limit:
        cases = cases[:args.limit]
    if not cases:
        raise ValueError("no cases selected")
    args.output = args.output.resolve()
    # Refuse an existing input directory; all source files remain immutable.
    if args.output == args.dataset.resolve().parent:
        raise ValueError("output cannot replace the dataset directory")
    args.output.mkdir(parents=True, exist_ok=False, mode=0o700)
    nonce = secrets.token_hex(32)
    markers = {memory["memory_id"]: "EDGES_MEMORY_READ_" + hashlib.sha256((nonce + ":" + memory["memory_id"]).encode()).hexdigest()[:32]
               for memory in dataset["memories"]}
    # Preserve the exact input outside every Docker build context.
    shutil.copyfile(args.dataset, args.output / "dataset.json")
    source_dir = args.output / 'source'
    source_dir.mkdir()
    for source in sorted(HERE.iterdir()):
        if source.is_file() and (source.suffix == '.py' or source.name in {'requirements.txt', 'requirements.lock.txt', 'Dockerfile.base'}):
            shutil.copy2(source, source_dir / source.name)
    snapshots, tasks, anchor_cache = {}, {}, {}
    for index, case in enumerate(cases, 1):
        visible = [memory for memory in dataset["memories"] if timestamp(memory["available_at"]) < timestamp(case["query_at"])]
        visible_key = tuple(memory['memory_id'] for memory in visible)
        if visible_key not in anchor_cache:
            anchor_cache[visible_key] = content_anchors(visible)
        anchors = anchor_cache[visible_key]
        for condition in CONDITIONS:
            name = f"case-{index:04d}-{condition}"
            task = args.output / "tasks" / name
            environment = task / "environment"
            snapshot = build_workspace(environment / "workspace", visible, condition, case["scope"], markers)
            snapshot.update(case_id=case["case_id"], condition=condition,
                            workspace_sha256=directory_digest(environment / "workspace"))
            snapshots[name] = snapshot
            tasks[(case["case_id"], condition)] = name
            (environment / "Dockerfile").write_text(
                f"FROM {args.agent_image}\n"
                "USER root\n"
                "RUN apt-get update && apt-get install -y --no-install-recommends bash curl ca-certificates git && rm -rf /var/lib/apt/lists/*\n"
                "COPY workspace /workspace\nRUN git init -q --initial-branch=main /workspace\nWORKDIR /workspace\n")
            (task / "instruction.md").write_text(instruction(case))
            tests = task / "tests"
            tests.mkdir(parents=True)
            visible_ids = [memory["memory_id"] for memory in visible] if condition != "none" else []
            write_json(tests / "spec.json", {
                "case": case, "condition": condition, "visible_memory_ids": visible_ids,
                "read_markers": {mid: markers[mid] for mid in visible_ids},
                "content_anchors": {mid: anchors[mid] for mid in visible_ids},
            })
            for module in ("metrics.py", "verify.py"):
                shutil.copy2(source_dir / module, tests / module)
            (tests / "test.sh").write_text("#!/bin/bash\nset -euo pipefail\npython3 /tests/verify.py --spec /tests/spec.json\n")
            (tests / "test.sh").chmod(0o755)
            (task / "task.toml").write_text(
                'schema_version = "1.4"\nartifacts = ["/logs/agent/codex.txt"]\n'
                f'[agent]\ntimeout_sec = {args.timeout}\n'
                '[environment]\nbuild_timeout_sec = 900\n'
                f'workdir = {json.dumps((PurePosixPath("/workspace") / scope_path(case["scope"])).as_posix())}\n'
                '[verifier]\nenvironment_mode = "separate"\ntimeout_sec = 120\n')
        a, b = (snapshots[tasks[(case["case_id"], condition)]]["memory_payload_sha256"] for condition in ("scoped", "root"))
        if a != b:
            raise ValueError("scoped/root memory payloads differ")
    plan = [{"case_id": case["case_id"], "condition": condition, "repeat": repeat,
             "task_name": tasks[(case["case_id"], condition)]}
            for case in cases for repeat in range(1, args.repeats + 1) for condition in CONDITIONS]
    random.Random(args.seed).shuffle(plan)
    for index, entry in enumerate(plan, 1):
        entry.update(order=index, trial_id=f"trial-{index:06d}")
    write_json(args.output / "plan.json", plan)
    from harbor.models.task.task import Task
    if version("harbor") != HARBOR_VERSION:
        raise ValueError(f"requires harbor=={HARBOR_VERSION}")
    for task in (args.output / "tasks").iterdir():
        Task(task)
    manifest = {
        "kind": "harbor-three-arm-memory-ablation", "schema_version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(), "harbor_version": version("harbor"),
        "agent": "codex", "model": args.model, "codex_version": args.codex_version,
        "reasoning_effort": args.reasoning_effort, "agent_image": args.agent_image,
        "auth_mode": "auth-json" if args.auth_json else "api-key",
        "seed": args.seed, "repeats": args.repeats, "timeout_sec": args.timeout,
        "split": args.split, "limit": args.limit, "cases": len(cases), "planned_trials": len(plan),
        "task_modes": {mode: sum(case.get("task_mode", "memory_qa") == mode for case in cases)
                       for mode in ("memory_qa", "pre_task_retrieval")},
        "dataset_sha256": hashlib.sha256(args.dataset.read_bytes()).hexdigest(),
        "program_sha256": {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in source_dir.glob("*.py")},
        "prompt_version": "three-arm-historical-retrieval-v2",
        "prompt_sha256": {case['case_id']: hashlib.sha256(instruction(case).encode()).hexdigest() for case in cases},
        "snapshots": snapshots, "platform": platform.platform(), "python": platform.python_version(),
        "isolation": "fresh Docker per trial; separate verifier; native Codex clean HOME",
        "project_root": "identical empty git repository initialized at /workspace for native ancestor AGENTS discovery",
        "network": "web search disabled; network available for installation and model access",
        "treatment": "memory placement plus scope navigation; identical memory payloads and temporal visibility",
        "retrieval_definition": "primary selected-memory recall@5; evidence requires selected ID and body marker or unique body snippet in completed tool output",
        "quality_definition": "predeclared regex checks only, not semantic correctness",
    }
    write_json(args.output / "manifest.json", manifest)
    return dataset, cases, plan, manifest


def controller_environment(output: Path, auth_json: Path | None) -> dict[str, str]:
    """Isolate host config; auth stays in an environment pointer, never a task."""
    keys = {"PATH", "LANG", "LC_ALL", "TMPDIR", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
            "http_proxy", "https_proxy", "all_proxy", "no_proxy", "SSL_CERT_FILE", "SSL_CERT_DIR",
            "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE", "DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS_VERIFY",
            "DOCKER_CERT_PATH", "DOCKER_CONFIG", "DOCKER_API_VERSION", "SSH_AUTH_SOCK"}
    env = {key: value for key, value in os.environ.items() if key in keys}
    env.setdefault("DOCKER_CONFIG", str(Path.home() / ".docker"))
    home = output / "controller-home"
    home.mkdir(mode=0o700, exist_ok=True)
    env["HOME"] = str(home)
    if auth_json:
        env["CODEX_AUTH_JSON_PATH"] = str(auth_json.resolve(strict=True))
        env["CODEX_FORCE_AUTH_JSON"] = "true"
    else:
        env.update({key: os.environ[key] for key in ("OPENAI_API_KEY", "CODEX_API_KEY", "OPENAI_BASE_URL") if key in os.environ})
    return env


def collect_trial(output: Path, entry: dict, wall_ms: float, returncode: int) -> dict:
    job = output / "jobs" / entry["trial_id"]
    spec = json.loads((output / "tasks" / entry["task_name"] / "tests/spec.json").read_text())
    artifacts = list(job.glob("*/verifier/trial.json"))
    if len(artifacts) == 1:
        try:
            row = json.loads(artifacts[0].read_text())
        except (ValueError, OSError):
            row = evaluate_artifact(spec, "")
            invalidate_quality(row, "harbor:invalid-verifier-artifact")
        if row.get("case_id") != entry["case_id"] or row.get("condition") != entry["condition"]:
            row = evaluate_artifact(spec, "")
            invalidate_quality(row, "harbor:verifier-identity-mismatch")
        native_path = artifacts[0].parent.parent / "result.json"
    else:
        # Preserve observable costs on verifier failure; do not pretend host scoring proves isolation.
        logs = list(job.glob("*/agent/codex.txt"))
        text = logs[0].read_text() if len(logs) == 1 else ""
        row = evaluate_artifact(spec, text)
        invalidate_quality(row, "harbor:missing-or-duplicate-verifier-artifact")
        native_paths = list(job.glob("*/result.json"))
        native_path = native_paths[0] if len(native_paths) == 1 else None
    if native_path is not None and native_path.is_file():
        try:
            native = json.loads(native_path.read_text())
            timing = native.get("agent_execution") or {}
            if timing.get("started_at") and timing.get("finished_at"):
                latency = (timestamp(timing["finished_at"]) - timestamp(timing["started_at"])).total_seconds() * 1000
                row["agent_latency_ms"] = latency if latency >= 0 else None
            if native.get("exception_info"):
                error_type = native["exception_info"].get("exception_type", "trial-error")
                invalidate_quality(row, "harbor:" + str(error_type))
        except (ValueError, OSError, TypeError):
            invalidate_quality(row, "harbor:invalid-native-result")
    else:
        invalidate_quality(row, "harbor:missing-native-result")
    if returncode:
        invalidate_quality(row, row.get("error") or f"harbor:exit-{returncode}")
    row.update({key: entry[key] for key in ("trial_id", "case_id", "condition", "repeat", "order", "task_name")})
    row.update(trial_wall_ms=wall_ms, harbor_returncode=returncode)
    return row


def execute(args: argparse.Namespace) -> dict | None:
    _dataset, cases, plan, manifest = prepare(args)
    executable = Path(sys.executable).with_name("harbor")
    commands = []
    for entry in plan:
        commands.append([
            str(executable), "run", "-p", str(args.output / "tasks" / entry["task_name"]),
            "-a", "codex", "-m", "openai/" + args.model.removeprefix("openai/"),
            "--ak", "version=" + args.codex_version,
            "--ak", "reasoning_effort=" + args.reasoning_effort,
            "--ak", "web_search=disabled", "-e", "docker", "-k", "1", "-n", "1",
            "--max-retries", "0", "--jobs-dir", str(args.output / "jobs"), "--job-name", entry["trial_id"],
        ])
    write_json(args.output / "commands.json", commands)
    if args.prepare_only:
        return None
    env = controller_environment(args.output, args.auth_json)
    # Inspect an already built image without pulling or serializing Docker credentials.
    try:
        inspected = subprocess.run(["docker", "image", "inspect", args.agent_image],
                                   env=env, capture_output=True, text=True, timeout=15, check=False)
        images = json.loads(inspected.stdout) if inspected.returncode == 0 else []
        if images:
            manifest["base_image_identity"] = {key: images[0].get(key) for key in ("Id", "RepoDigests", "Os", "Architecture")}
    except (OSError, ValueError, subprocess.TimeoutExpired):
        manifest["base_image_identity"] = None
    write_json(args.output / "manifest.json", manifest)
    rows = []
    (args.output / "controller-logs").mkdir()
    try:
        for entry, command in zip(plan, commands):
            print(f"[{entry['order']}/{len(plan)}] {entry['case_id']} {entry['condition']} repeat={entry['repeat']}", flush=True)
            started = time.monotonic()
            with (args.output / "controller-logs" / (entry["trial_id"] + ".log")).open("w") as log:
                completed = subprocess.run(command, cwd=HERE, env=env, stdout=log, stderr=subprocess.STDOUT, check=False)
            row = collect_trial(args.output, entry, (time.monotonic() - started) * 1000, completed.returncode)
            rows.append(row)
            write_json(args.output / "trials.json", rows)
            # Checkpoint without expensive confidence intervals after every trial.
            report = summarize(plan, rows, cases, seed=args.seed, bootstrap=0)
            write_json(args.output / "result.json", {**report, "manifest": manifest, "trials": rows})
    finally:
        report = summarize(plan, rows, cases, seed=args.seed, bootstrap=args.bootstrap)
        write_json(args.output / "result.json", {**report, "manifest": manifest, "trials": rows})
    return report


def arguments() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--codex-version", default="0.162.1")
    parser.add_argument("--auth-json", type=Path)
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--seed", type=int, default=20261108)
    parser.add_argument("--split", choices=["dev", "test", "all"], default="test")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--reasoning-effort", choices=["low", "medium", "high", "xhigh"], default="low")
    parser.add_argument("--agent-image", default="python:3.12-slim")
    parser.add_argument("--bootstrap", type=int, default=2000)
    parser.add_argument("--prepare-only", action="store_true")
    return parser


def main() -> None:
    args = arguments().parse_args()
    report = execute(args)
    print(args.output / ("plan.json" if args.prepare_only else "result.json"))
    if report and (report["status"] != "complete" or report["failed_trials"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
