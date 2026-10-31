"""四个框架共用的实验底层；只处理实验材料、结果和评分，不执行 Agent。"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import shutil
import sys
from collections import Counter
from pathlib import Path
from typing import Any

SHARED_DIR = Path(__file__).resolve().parent


def resolve_edges_root(start: Path = SHARED_DIR) -> Path:
    """优先采用 EDGES_ROOT，否则沿祖先查找框架或工作区 edges/；不绑定项目归属。"""
    override = os.environ.get("EDGES_ROOT")
    candidates = ([Path(override).expanduser().resolve()] if override else
                  [candidate for ancestor in (start, *start.parents)
                   for candidate in (ancestor, ancestor / "edges")])
    marker = Path("packages/evaluation/experiments/harness_memory_ablation/score.py")
    for candidate in candidates:
        if (candidate / marker).is_file():
            return candidate
    raise FileNotFoundError("未找到 Edges 评测模块；请设置 EDGES_ROOT=/absolute/path/to/edges")


EDGES = resolve_edges_root()
sys.path.insert(0, str(EDGES / "packages/evaluation"))
import shared
from harness_memory_ablation.answer import answer_text
from harness_memory_ablation.cases import load_cases
from harness_memory_ablation.judge import judge_from_flag
from harness_memory_ablation.prompt import build_prompt
from harness_memory_ablation.score import compare_trials

CONDITIONS = ("off", "on")


def write_json(path: Path, value: Any) -> None:
    """把可序列化值写入指定路径，自动创建父目录；无返回值。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def prepare_workspace(snapshot: Path, destination: Path) -> Path:
    """复制已物化的目录快照，排除 .git 并拒绝软链接；返回新工作目录。

    不 checkout/reset 输入目录。每个 trial 必须给一个尚不存在的 destination。
    """
    snapshot, destination = snapshot.resolve(), destination.resolve()
    if not snapshot.is_dir() or destination.is_relative_to(snapshot):
        raise ValueError("快照须存在，输出目录不能位于输入快照内")
    # 不跟随软链接：off 中的链接可能指向 on 或宿主机的其他记忆。
    for base, dirs, files in os.walk(snapshot):
        dirs[:] = [name for name in dirs if name != ".git"]
        for name in dirs + files:
            path = Path(base) / name
            if name != ".git" and path.is_symlink():
                raise ValueError(f"请先物化快照中的软链接：{path.relative_to(snapshot)}")
    shutil.copytree(snapshot, destination, ignore=shutil.ignore_patterns(".git"))
    return destination


def snapshot_digest(snapshot: Path) -> str:
    """对冻结目录的相对路径、文件权限和内容计算 SHA-256；返回摘要字符串。"""
    digest = hashlib.sha256()
    for path in sorted(snapshot.rglob("*")):
        if path.is_file():
            digest.update(path.relative_to(snapshot).as_posix().encode() + b"\0")
            digest.update(str(path.stat().st_mode & 0o777).encode() + b"\0")
            digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def score_result(case: dict, result: dict, condition: str, repeat: int, judge: str) -> dict:
    """用独立题目标准给执行结果判分；返回兼容现有 compare_trials 的 trial。

    fixture 仅用于内置测试；skip 保留 verdict=None；失败的执行不进入 judge。
    """
    trial = {
        **result, "case_id": case["case_id"], "category": case["category"],
        "question": case["question"], "condition": condition, "repeat": repeat,
        "verdict": None, "violations": [],
    }
    if result.get("error"):
        return trial
    if judge == "fixture":
        trial["verdict"] = "correct" if result["answer"].strip() == case["criteria"][0] else "incorrect"
    else:
        try:
            judged = judge_from_flag(judge).score(
                question=case["question"], answer=result["answer"],
                criteria=case["criteria"], violations=case["violations"],
            )
            if judged is not None:
                trial.update(verdict=judged.verdict, violations=judged.violations)
        except Exception as exc:
            # 保存错误类型，不把可能含凭据的 HTTP 响应写进报告。
            trial["error"] = "judge:" + type(exc).__name__
    return trial


def write_comparison(path: Path, trials: list[dict], case_ids: list[str], repeats: int, metadata: dict) -> dict:
    """核对每题×条件×重复都齐全后比较 A/B，写 JSON 并返回报告。

    缺失、重复或意外的 trial 抛出 ValueError，避免只比较成功样本。
    """
    expected = Counter((f"memory:{c}", case, r) for c in CONDITIONS for case in case_ids for r in range(1, repeats + 1))
    actual = Counter((t["condition"], t["case_id"], t["repeat"]) for t in trials)
    if actual != expected:
        write_json(path, {"status": "incomplete", "metadata": metadata, "trials": trials})
        raise ValueError("trial 不完整或重复，已保存 partial report，未计算 A/B 结论")
    payload = {"status": "complete", "metadata": metadata, "trials": trials, **compare_trials(trials)}
    if any(t.get("error") for t in trials):
        payload["worth_default_on"] = False
    if metadata.get("controlled_filesystem") is False:
        payload.update(worth_default_on=None, comparison_validity="exploratory-host-filesystem")
    failures = sum(bool(t.get("error")) for t in trials)
    payload["execution_status"] = "failed" if failures else "succeeded"
    write_json(path, payload)
    if failures:
        raise RuntimeError(f"{failures} 个 trial 执行或判分失败；完整报告已保存：{path}")
    return payload


def build_contexts(output: Path, memory_off: Path, memory_on: Path, image: str) -> dict[str, Path]:
    """冻结两个输入目录，生成每组独立的容器构建上下文；返回 condition→目录。

    镜像只含当前条件的工作目录和执行代码；题集、judge 标准在镜像之外。
    """
    contexts = {}
    # 精确选取复用模块，避免把原实验的测试题与标准答案复制给受测 Agent。
    modules = {
        "evaluation/shared": None,
        "evaluation/experiments/retrieval_eval": ["__init__.py", "client.py", "config.py", "config/clients.json"],
        "evaluation/experiments/harness_memory_ablation": ["__init__.py", "answer.py", "cases.py", "judge.py", "prompt.py", "score.py"],
        "observation/langfuse_sink": None,
    }
    for condition, source in zip(CONDITIONS, (memory_off, memory_on)):
        context = output / condition
        prepare_workspace(source, context / "workspace")
        for module, files in modules.items():
            src, dst = EDGES / "packages" / module, context / "edges/packages" / module
            if files is None:
                shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__"))
            else:
                for name in files:
                    target = dst / name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src / name, target)
        for name in ("common.py",):
            target = context / "runtime" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(SHARED_DIR / name, target)
        (context / "Dockerfile").write_text(
            f"FROM {image}\n"
            "USER root\nCOPY edges /opt/edges\nCOPY runtime /opt/ablation\n"
            "COPY workspace /workspace\n"
            "RUN mkdir -p /trial /tmp/agent-home && chmod 777 /trial /tmp/agent-home\n"
            "ENV EDGES_ROOT=/opt/edges HOME=/tmp/agent-home CODEX_HOME=/tmp/agent-home/.codex\n"
            "WORKDIR /workspace\n", encoding="utf-8",
        )
        contexts[condition] = context
    return contexts


def controller_environment(output: Path) -> dict[str, str]:
    """给评测控制器隔离缓存目录并保留原 Docker 配置；输入输出目录，返回环境变量副本。

    只保存 Docker 配置路径，不复制其内容，也不把这些变量传给受测 worker。
    """
    env = dict(os.environ)
    env.setdefault("DOCKER_CONFIG", str(Path.home() / ".docker"))
    home = output / "controller-home"
    home.mkdir(parents=True, exist_ok=True)
    env["HOME"] = str(home)
    return env


def normalize_result(answer: str, *, usage: dict | None = None, latency_ms: float | None = None,
                     error: str | None = None, native: Any = None) -> dict:
    """把框架返回值映射到共同结果；缺失用量保持 None，错误不包含服务响应或凭据。"""
    usage = usage or {}
    return {"answer": answer, "input_tokens": usage.get("input_tokens"),
            "output_tokens": usage.get("output_tokens"), "cached_input_tokens": usage.get("cached_input_tokens"),
            "reasoning_tokens": usage.get("reasoning_tokens"), "latency_ms": latency_ms,
            "error": error or (None if answer.strip() else "empty-answer"), "native": native}


def codex_result(events: str) -> dict:
    """解析 Harbor 内置 Codex 的 JSONL artifact；失败的 turn 不因残留回答而获得分数。"""
    parsed = []
    for line in events.splitlines():
        try:
            item = json.loads(line)
            if isinstance(item, dict):
                parsed.append(item)
        except ValueError:
            continue
    terminal = parsed[-1].get("type") if parsed else None
    error = "codex:turn-failed" if terminal in ("turn.failed", "error") else (
        None if terminal == "turn.completed" else "codex:incomplete-turn")
    fields = {"input_tokens": "input_tokens", "output_tokens": "output_tokens",
              "cached_input_tokens": "cached_input_tokens", "reasoning_tokens": "reasoning_output_tokens"}
    totals = {}
    for target, source in fields.items():
        values = [(e.get("usage") or {}).get(source) for e in parsed if e.get("type") == "turn.completed"]
        known = [v for v in values if isinstance(v, int) and not isinstance(v, bool)]
        totals[target] = sum(known) if known else None
    return normalize_result(answer_text(kind="codex", last_message="", stdout=events),
                            usage=totals,
                            error=error, native={"events_jsonl": events})


def arguments(description: str) -> argparse.ArgumentParser:
    """创建三个原生 Codex 入口共用的参数；模型和 CLI 版本显式记入每轮 manifest。"""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--memory-off", type=Path, default=SHARED_DIR / "fixtures/memory-off")
    parser.add_argument("--memory-on", type=Path, default=SHARED_DIR / "fixtures/memory-on")
    parser.add_argument("--cases", type=Path, default=SHARED_DIR / "fixtures/cases.json")
    parser.add_argument("--model", default=os.environ.get("EVAL_MODEL", "gpt-5.4"))
    parser.add_argument("--codex-version", default="0.156.1")
    parser.add_argument("--reasoning-effort", default="medium", choices=["low", "medium", "high", "xhigh"])
    parser.add_argument("--judge", choices=["fixture", "skip", "llm"], default="fixture")
    parser.add_argument("--agent-image", default="python:3.12-slim")
    parser.add_argument("--auth-json", type=Path, help="可选：只向干净 Codex HOME 导入此登录文件")
    parser.add_argument("--repeats", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--output", type=Path, required=True, help="尚不存在的输出目录")
    return parser


def prepare_experiment(args, *, program_dir: Path) -> tuple[dict, dict[str, Path], dict]:
    """校验并冻结共同题集与快照，不启动 Codex；返回 dataset、contexts 和 manifest。"""
    if args.repeats < 1 or args.timeout < 1:
        raise ValueError("repeats 和 timeout 必须大于 0")
    if args.judge == "fixture" and args.cases.resolve() != (SHARED_DIR / "fixtures/cases.json").resolve():
        raise ValueError("fixture 精确判分只适用于内置两题；自己的题集选择 llm 或 skip")
    if args.judge == "llm":
        judge_from_flag("llm")
    if args.auth_json:
        args.auth_json = args.auth_json.resolve(strict=True)
    args.output = args.output.resolve()
    args.output.mkdir(parents=True, exist_ok=False)
    dataset = load_cases(args.cases)
    contexts = build_contexts(args.output / "contexts", args.memory_off, args.memory_on, args.agent_image)
    metadata = {
        "kind": "native-codex-memory-ablation", "dataset": dataset["dataset"],
        "cases_sha256": hashlib.sha256(args.cases.read_bytes()).hexdigest(),
        "snapshots": {c: snapshot_digest(p / "workspace") for c, p in contexts.items()},
        "agent": "codex", "model": args.model, "codex_version": args.codex_version,
        "reasoning_effort": args.reasoning_effort, "judge": args.judge,
        "judge_model": os.environ.get("JUDGE_MODEL") if args.judge == "llm" else None,
        "repeats": args.repeats, "timeout": args.timeout, "agent_image": args.agent_image,
        "auth_mode": "auth-json" if args.auth_json else "api-key",
        "program_sha256": {f"{d.name}/{p.name}": hashlib.sha256(p.read_bytes()).hexdigest()
                           for d in (SHARED_DIR, program_dir) for p in d.glob("*.py")},
    }
    write_json(args.output / "manifest.json", metadata)
    return dataset, contexts, metadata


def isolated_codex_home(parent: Path, auth_json: Path | None = None) -> Path:
    """创建唯一且权限受限的 Codex HOME；可选只复制 auth.json，不继承用户配置/记忆。"""
    import uuid
    home = parent / uuid.uuid4().hex
    home.mkdir(parents=True, mode=0o700, exist_ok=False)
    if auth_json:
        shutil.copyfile(auth_json, home / "auth.json")
        (home / "auth.json").chmod(0o600)
    return home
