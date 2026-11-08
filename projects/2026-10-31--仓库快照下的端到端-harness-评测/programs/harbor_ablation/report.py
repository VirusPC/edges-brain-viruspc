"""Offline Chinese report from a frozen Harbor run; no model or network calls.

Use --run /private/run --output /private/new-report. The output directory must
not exist and must be outside the immutable run directory. Only the archived
run/source/metrics.py defines the scoring protocol; the installed checkout does
not substitute for a missing archived implementation.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import math
import re
import statistics
from pathlib import Path
from types import ModuleType
from typing import Any

TASK_MODES = ("memory_qa", "pre_task_retrieval")
TRACKS = ("all", *TASK_MODES, "scope_known", "scope_unknown")
TRACK_LABELS = {"all": "全部", "memory_qa": "记忆问答", "pre_task_retrieval": "执行前记忆检索",
                "scope_known": "scope 已知", "scope_unknown": "scope 未知"}
CONDITIONS = ("scoped", "root", "none")
PRIMARY = ("selected_recall_at_5", "total_tokens", "agent_latency_ms")
DISPLAY = (
    ("selected_recall_at_5", "所选记忆 recall@5", "percent"),
    ("evidence_recall_at_5", "有读取证据的 recall@5", "percent"),
    ("precision_at_5", "Precision@5", "percent"),
    ("mrr", "MRR", "number"),
    ("answer_checks_pass", "答案规则通过比例（窄规则）", "percent"),
    ("input_tokens", "输入 token 均值", "number"),
    ("output_tokens", "输出 token 均值", "number"),
    ("cached_input_tokens", "缓存输入 token 均值", "number"),
    ("uncached_input_tokens", "未缓存输入 token 均值", "number"),
    ("total_tokens", "总 token 均值", "number"),
    ("tool_calls", "工具调用次数均值", "number"),
)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def time_value(value: str) -> datetime:
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("dataset timestamps require timezones")
    return result


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_protocol(run_dir: Path, manifest: dict) -> tuple[ModuleType, dict]:
    """Load the archived implementation and verify its declared source digest."""
    source = run_dir / "source/metrics.py"
    if not source.is_file() or source.is_symlink() or not source.resolve().is_relative_to(run_dir):
        raise ValueError("Missing regular run/source/metrics.py; refusing current-code fallback")
    digest = sha256(source)
    declared = manifest.get("program_sha256", {}).get("metrics.py")
    if declared is not None and declared != digest:
        raise ValueError("Archived metrics.py does not match manifest program_sha256")
    name = "_harbor_report_protocol_" + digest[:16]
    spec = importlib.util.spec_from_file_location(name, source)
    if spec is None or spec.loader is None:
        raise ValueError("Cannot load archived metrics protocol")
    module = importlib.util.module_from_spec(spec)
    # Execute archived bytes without creating __pycache__ inside the frozen run.
    exec(compile(source.read_bytes(), str(source), "exec"), module.__dict__)
    if not callable(getattr(module, "summarize", None)):
        raise ValueError("Archived metrics protocol has no summarize function")
    if tuple(getattr(module, "CONDITIONS", ())) != CONDITIONS:
        raise ValueError("Archived protocol does not define scoped/root/none")
    return module, {"source": "source/metrics.py", "sha256": digest,
                    "manifest_hash_verified": declared is not None}


def selected_cases(dataset: dict, manifest: dict) -> list[dict]:
    split, limit = manifest.get("split"), manifest.get("limit")
    if split not in {"dev", "test", "all"}:
        raise ValueError("manifest must declare the selected split")
    if limit is not None and (type(limit) is not int or limit < 1):
        raise ValueError("manifest limit must be a positive integer or null")
    cases = dataset["cases"]
    if not isinstance(cases, list) or len({c["case_id"] for c in cases}) != len(cases):
        raise ValueError("invalid or duplicate dataset cases")
    chosen = [case for case in cases if split == "all" or case["split"] == split]
    if limit is not None:
        chosen = chosen[:limit]
    if not chosen or manifest.get("cases") != len(chosen):
        raise ValueError("manifest case count disagrees with dataset split/limit selection")
    return chosen


def validate_matrix(plan: list[dict], rows: list[dict], cases: list[dict], manifest: dict) -> None:
    """Validate the full intended Cartesian matrix, not only observed successes."""
    repeats = manifest.get("repeats")
    if type(repeats) is not int or repeats < 1:
        raise ValueError("manifest repeats must be positive")
    if not isinstance(plan, list) or not isinstance(rows, list):
        raise ValueError("plan and trials must be arrays")
    expected = Counter((case["case_id"], condition, repeat) for case in cases
                       for condition in CONDITIONS for repeat in range(1, repeats + 1))
    actual = Counter((entry["case_id"], entry["condition"], entry["repeat"]) for entry in plan)
    if expected != actual or manifest.get("planned_trials") != len(plan):
        raise ValueError("plan is not the complete case × condition × repeat matrix")
    ids = [entry["trial_id"] for entry in plan]
    if len(set(ids)) != len(ids) or not all(isinstance(i, str) and re.fullmatch(r"[A-Za-z0-9_-]+", i) for i in ids):
        raise ValueError("duplicate or unsafe planned trial ID")
    by_id = {entry["trial_id"]: entry for entry in plan}
    observed = set()
    case_map = {case["case_id"]: case for case in cases}
    for row in rows:
        tid = row["trial_id"]
        if tid in observed or tid not in by_id:
            raise ValueError("duplicate or unexpected observed trial")
        observed.add(tid)
        if any(row.get(key) != by_id[tid][key] for key in ("case_id", "condition", "repeat")):
            raise ValueError("trial identity differs from plan")
        if row.get("task_mode", case_map[row["case_id"]].get("task_mode", "memory_qa")) != case_map[row["case_id"]].get("task_mode", "memory_qa"):
            raise ValueError("trial task_mode differs from frozen dataset")


def unknown_scope(case: dict) -> bool:
    evidence = case.get("scope_evidence") or {}
    return evidence.get("kind") == "unknown" or case.get("scope") in {None, "."}


def case_card(cases: list[dict], memories: list[dict]) -> tuple[dict, list[dict]]:
    """Count source coverage and per-question retrieval ceilings without prose."""
    memory_map = {memory["memory_id"]: memory for memory in memories}
    if len(memory_map) != len(memories):
        raise ValueError("duplicate memory IDs")
    detail = []
    sessions = set()
    for case in cases:
        query = time_value(case["query_at"])
        visible = {mid for mid, memory in memory_map.items() if time_value(memory["available_at"]) < query}
        gold = case["gold_memory_ids"]
        if len(gold) != len(set(gold)) or not set(gold) <= visible:
            raise ValueError("gold is duplicate, missing, or not strictly available before query")
        session = case.get("source", {}).get("session_id")
        has_session = isinstance(session, str) and bool(session)
        if has_session:
            sessions.add(session)
        detail.append({
            "case_id": case["case_id"], "task_mode": case.get("task_mode", "memory_qa"),
            "split": case["split"], "scope_unknown": unknown_scope(case),
            "visible_memory_count": len(visible), "gold_count": len(gold),
            "recall_at_5_ceiling": min(5, len(gold)) / len(gold) if gold else None,
            "has_source_session": has_session,
        })
    counts = [row["visible_memory_count"] for row in detail]
    ceilings = [row["recall_at_5_ceiling"] for row in detail if row["recall_at_5_ceiling"] is not None]
    return {
        "cases": len(cases), "source_sessions": len(sessions),
        "cases_without_session": sum(not row["has_source_session"] for row in detail),
        "positive_cases": sum(row["gold_count"] > 0 for row in detail),
        "negative_cases": sum(row["gold_count"] == 0 for row in detail),
        "scope_unknown_cases": sum(row["scope_unknown"] for row in detail),
        "scope_unknown_fraction": sum(row["scope_unknown"] for row in detail) / len(detail) if detail else None,
        "scope_unknown_rule": "scope_evidence.kind=unknown, or scope=. (global/unknown root grouped together)",
        "visible_memory_min": min(counts) if counts else None,
        "visible_memory_median": statistics.median(counts) if counts else None,
        "visible_memory_max": max(counts) if counts else None,
        "no_visible_memory_cases": sum(count == 0 for count in counts),
        "gold_above_five_cases": sum(row["gold_count"] > 5 for row in detail),
        "mean_positive_recall_ceiling": statistics.mean(ceilings) if ceilings else None,
        "minimum_positive_recall_ceiling": min(ceilings) if ceilings else None,
        "memory_files": len(memories),
    }, detail


def paired_session_counts(comparisons: dict, plan: list[dict], rows: list[dict], cases: list[dict]) -> None:
    """Expose true source-session counts, not fallback case clusters as sessions."""
    planned = Counter((entry["case_id"], entry["condition"]) for entry in plan)
    grouped = defaultdict(list)
    for row in rows:
        grouped[(row["case_id"], row["condition"])].append(row)
    for comparison, fields in comparisons.items():
        left, right = comparison.split("-vs-", 1)
        for metric, summary in fields.items():
            sessions, without_session, paired_count = set(), 0, 0
            for case in cases:
                cid = case["case_id"]
                both = []
                for condition in (left, right):
                    values = [float(bool(row.get("error"))) if metric == "failure_rate" else row.get(metric)
                              for row in grouped[(cid, condition)]]
                    both.append(bool(values) and len(values) == planned[(cid, condition)] and all(finite(value) for value in values))
                if not all(both):
                    continue
                paired_count += 1
                session = case.get("source", {}).get("session_id")
                if isinstance(session, str) and session:
                    sessions.add(session)
                else:
                    without_session += 1
            # A new protocol may add eligibility not recoverable from numeric rows.
            # In that case do not pretend these inferred counts match its estimand.
            matches = paired_count == summary.get("paired_cases")
            summary["independent_source_sessions"] = len(sessions) if matches else None
            summary["paired_cases_without_session"] = without_session if matches else None


def audit_commands(run_dir: Path, plan: list[dict]) -> tuple[list[dict], dict]:
    """Extract actual command events for private review; no keyword judgments."""
    commands = []
    counts = Counter()
    for entry in plan:
        paths = sorted((run_dir / "jobs" / entry["trial_id"]).glob("*/agent/codex.txt"))
        counts["planned_trials"] += 1
        counts["trials_with_one_log"] += len(paths) == 1
        counts["trials_without_log"] += not paths
        counts["trials_with_multiple_logs"] += len(paths) > 1
        for path in paths:
            if path.is_symlink() or not path.resolve().is_relative_to(run_dir):
                raise ValueError("agent log escapes the frozen run")
            with path.open(encoding="utf-8", errors="replace") as stream:
                for line_number, line in enumerate(stream, 1):
                    try:
                        event = json.loads(line)
                    except ValueError:
                        counts["non_json_lines"] += 1
                        continue
                    if not isinstance(event, dict) or event.get("type") != "item.completed":
                        continue
                    item = event.get("item")
                    if not isinstance(item, dict):
                        continue
                    kind = item.get("type")
                    if kind in {"file_change", "web_search", "command_execution"}:
                        counts[kind + "_events"] += 1
                    if kind != "command_execution":
                        continue
                    commands.append({
                        "trial_id": entry["trial_id"], "case_id": entry["case_id"],
                        "condition": entry["condition"], "repeat": entry["repeat"],
                        "source_log": path.relative_to(run_dir).as_posix(), "line_number": line_number,
                        "item_id": item.get("id"), "command": item.get("command"),
                        "status": item.get("status"), "exit_code": item.get("exit_code"),
                    })
    return commands, {**dict(counts),
                      "interpretation": "event-type counts only; shell effects and policy violations require manual command review"}


def format_number(value: Any, kind: str = "number", signed: bool = False) -> str:
    if not finite(value):
        return "—"
    if kind == "percent":
        return f"{value * 100:.1f}%"
    if kind == "pp":
        return f"{value * 100:+.2f} pp"
    if kind == "seconds":
        return f"{value / 1000:+.3f}" if signed else f"{value / 1000:.3f}"
    if signed:
        return f"{value:+.2f}"
    return f"{value:,.2f}".rstrip("0").rstrip(".")


def cell(value: Any) -> str:
    """Escape manifest labels; never pass prompts, questions, or source IDs here."""
    if value is None:
        return "manifest 未记录"
    if isinstance(value, (dict, list)):
        return f"manifest 已归档 {len(value)} 项（不展示逐题标识）"
    return str(value).replace("|", "\\|").replace("\n", " ").replace("\r", " ").replace("`", "'")


def coverage(summary: dict) -> str:
    if summary.get("eligible_cases") == 0:
        return "N/A（无适用题）"
    return f"{summary.get('complete_cases', '—')}/{summary.get('eligible_cases', '—')}"


def markdown_report(report: dict) -> str:
    """Produce aggregate-only Markdown, deliberately excluding all private text."""
    manifest = report["manifest_summary"]
    all_track = report["tracks"]["all"]
    lines = ["# Harbor 三臂记忆消融报告", "",
             f"矩阵状态：**{cell(all_track['analysis_status'])}**；计划 {all_track['planned_trials']} 次，已记录 {all_track['observed_trials']} 次，失败 {all_track['failed_trials']} 次。", ""]
    if all_track["status"] != "complete":
        lines += ["矩阵尚未完成。以下表格只描述已观察数据，不用于判断收益；不展示配对效应结论。", ""]
    elif all_track["failed_trials"]:
        lines += ["矩阵已收齐但包含失败。质量值不将失败填成零；解释差异须同时核对指标覆盖率。", ""]
    lines += ["## 运行来源", "", "以下版本及标识只读取运行 manifest；未记录项保持未知。", "",
              "| 项目 | 记录 |", "| --- | --- |"]
    for name, key in (("模型", "model"), ("Codex CLI", "codex_version"), ("Harbor", "harbor_version"),
                      ("推理强度", "reasoning_effort"), ("Agent 超时（秒）", "timeout_sec"),
                      ("最大并发 trial", "concurrency"), ("时延运行条件", "latency_context"),
                      ("批次墙钟时间（毫秒）", "execution_wall_ms"),
                      ("Prompt 版本", "prompt_version"), ("Prompt SHA-256", "prompt_sha256"),
                      ("Dataset SHA-256", "dataset_sha256")):
        value = manifest.get(key)
        if key == 'latency_context' and isinstance(value, dict):
            value = value.get('interpretation')
        lines.append(f"| {name} | {cell(value)} |")
    lines += ["", "## 数据卡", "", "| 范围 | 题数 | 来源 session | 有 gold / 无 gold | scope 未知 | 每题可见记忆 最小 / 中位 / 最大 | gold > 5 | 正例平均 recall@5 上限 |",
              "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for track in TRACKS:
        card = report["tracks"][track]["dataset_card"]
        lines.append(f"| {TRACK_LABELS[track]} | {card['cases']} | {card['source_sessions']} | {card['positive_cases']} / {card['negative_cases']} | {format_number(card['scope_unknown_fraction'], 'percent')} | "
                     f"{format_number(card['visible_memory_min'])} / {format_number(card['visible_memory_median'])} / {format_number(card['visible_memory_max'])} | {card['gold_above_five_cases']} | {format_number(card['mean_positive_recall_ceiling'], 'percent')} |")
    card = all_track["dataset_card"]
    lines += ["", f"固定语料含 {card['memory_files']} 份记忆；{card['no_visible_memory_cases']} 题没有时间合格的可见记忆，{card['cases_without_session']} 题缺少来源 session。",
              "每题理论上限为 min(5, gold 数量) / gold 数量；无 gold 时为 N/A。可见记忆严格按 available_at < query_at 统计。scope 明确标为 unknown，或为根目录时计入未知组（含全局根作用域）；scope 分层与任务类型分层各自独立，不可相加。逐题计数见 cases.csv。", ""]
    for track in TRACKS:
        summary = report["tracks"][track]
        lines += [f"## {TRACK_LABELS[track]}", "",
                  f"状态：{summary['analysis_status']}；计划 {summary['planned_trials']} 次，已记录 {summary['observed_trials']} 次，失败 {summary['failed_trials']} 次。", ""]
        if not summary["dataset_card"]["cases"]:
            lines += ["本次选择中没有该 track 的题目。", ""]
            continue
        lines += ["| 指标 | 分作用域 scoped | 根目录 root | 无记忆 none |", "| --- | ---: | ---: | ---: |"]
        sides = summary["by_condition"]
        for key, label, kind in DISPLAY:
            values = [format_number(sides[c]["metrics"].get(key, {}).get("mean"), kind) for c in CONDITIONS]
            lines.append("| " + " | ".join([label, *values]) + " |")
        for quantile, label in (("median", "实际 trial Agent 时延中位数（秒）"), ("p95", "实际 trial Agent 时延 p95（秒）")):
            values = [format_number(sides[c]["metrics"].get("agent_latency_ms", {}).get("raw_trial_distribution", {}).get(quantile), "seconds") for c in CONDITIONS]
            lines.append("| " + " | ".join([label, *values]) + " |")
        lines.append("| 已观察 trial 失败率 | " + " | ".join(format_number(sides[c].get("failure_rate"), "percent") for c in CONDITIONS) + " |")
        for key, label in (("selected_recall_at_5", "所选 recall 有效题/适用题"), ("evidence_recall_at_5", "证据 recall 有效题/适用题"),
                           ("total_tokens", "总 token 有效题/适用题"), ("agent_latency_ms", "时延有效题/适用题")):
            lines.append("| " + " | ".join([label, *(coverage(sides[c]["metrics"].get(key, {})) for c in CONDITIONS)]) + " |")
        lines += ["", "均值先按题平均全部重复，再按题等权汇总。上表时延中位数/p95 来自原始 trial，含失败时仍可测得的成本；缺失值不填零。", ""]
        if summary["status"] != "complete":
            lines += ["配对表暂不展示：该 track 的计划矩阵尚未完成。JSON/CSV 保留带覆盖率的描述性统计，不能作为完整矩阵结论。", ""]
            continue
        lines += ["scoped − root 的三个主要指标（差值为前者减后者）：", "",
                  "| 指标 | 配对差值 | 描述性 95% CI | 配对题/适用题 | 独立来源 session |",
                  "| --- | ---: | --- | ---: | ---: |"]
        primary_labels = {"selected_recall_at_5": ("所选记忆 recall@5", "pp"), "total_tokens": ("总 token", "number"),
                          "agent_latency_ms": ("Agent 时延均值（秒）", "seconds")}
        for key in PRIMARY:
            entry = summary["paired_comparisons"].get("scoped-vs-root", {}).get(key, {})
            label, kind = primary_labels[key]
            interval = entry.get("ci95")
            ci = "—" if not isinstance(interval, list) or len(interval) != 2 else "[" + ", ".join(format_number(v, kind, signed=True) for v in interval) + "]"
            lines.append(f"| {label} | {format_number(entry.get('delta_left_minus_right'), kind, signed=True)} | {ci} | {entry.get('paired_cases', '—')}/{entry.get('eligible_cases', '—')} | {format_number(entry.get('independent_source_sessions'))} |")
        lines += ["", "时延差值基于每题重复均值，不能与原始 trial 的中位数相减混用。recall 差值使用百分点；token 与时延保留各自单位。三个对比的全部指标见 paired-comparisons.csv 和 report.json。", ""]
    audit = report["tool_audit"]
    lines += ["## 工具审计与局限", "",
              f"发现 {audit.get('trials_with_one_log', 0)} 次独立 Agent 日志；缺少日志 {audit.get('trials_without_log', 0)} 次，多日志 {audit.get('trials_with_multiple_logs', 0)} 次。",
              f"原生事件中 command_execution={audit.get('command_execution_events', 0)}、file_change={audit.get('file_change_events', 0)}、web_search={audit.get('web_search_events', 0)}。这些是事件计数，不是违规判定。工具命令仅写入私密 tool-commands.jsonl，不复制到本报告；shell 内动作仍需人工审阅。", "",
              "- 这是固定单用户候选库上的实验，不代表其他用户，也不是完整历史记忆回放。",
              "- 联网限制来自提示词与关闭 Web search，不能声称容器网络硬隔离。",
              "- 记忆问答与执行前检索分别报告；后者没有实际完成原任务，regex 局部检查也不等于任务成功率。",
              "- 读取证据采用运行归档的指标协议；选中 ID、内容暴露、正确理解与因果使用是不同概念。",
              "- 区间按来源 session 聚类，缺少 session 时协议可能使用 case；不足两个 cluster 时不输出 CI。CI 仅为描述性结果，未做多指标校正。",
              "- 完整配对统计要求同题各重复值齐全；必须同时查看失败率、适用题数与覆盖率，不把缺失样本隐藏为总体收益。",
              "- 无记忆组在有 gold 题上的检索 recall=0 是结构基线，不能据此证明分层优于平铺。", ""]
    return "\n".join(lines)


def write_file(path: Path, text: str) -> None:
    with path.open("x", encoding="utf-8", newline="") as stream:
        path.chmod(0o600)
        stream.write(text)


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("x", encoding="utf-8", newline="") as stream:
        path.chmod(0o600)
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def generate(run_dir: Path, output: Path, *, bootstrap: int = 2000) -> dict:
    run_dir, output = run_dir.resolve(strict=True), output.resolve()
    if bootstrap < 0:
        raise ValueError("bootstrap must be nonnegative")
    if output.is_relative_to(run_dir):
        raise ValueError("report output must be outside the immutable run directory")
    manifest = read_json(run_dir / "manifest.json")
    dataset_path = run_dir / "dataset.json"
    if manifest.get("dataset_sha256") != sha256(dataset_path):
        raise ValueError("dataset.json hash differs from manifest, or manifest hash is missing")
    dataset, plan = read_json(dataset_path), read_json(run_dir / "plan.json")
    rows = read_json(run_dir / "trials.json") if (run_dir / "trials.json").is_file() else []
    cases = selected_cases(dataset, manifest)
    if any(case.get("task_mode", "memory_qa") not in TASK_MODES for case in cases):
        raise ValueError("unknown task_mode in selected dataset")
    validate_matrix(plan, rows, cases, manifest)
    protocol, protocol_info = load_protocol(run_dir, manifest)
    quality_metrics = getattr(protocol, "QUALITY_METRICS", ())
    if any(row.get("error") and any(row.get(key) is not None for key in quality_metrics) for row in rows):
        raise ValueError("failed trials must have null quality metrics; refusing zero-filled or stale scores")
    seed = manifest.get("seed")
    if type(seed) is not int:
        raise ValueError("manifest must declare an integer bootstrap seed")
    tracks, case_details = {}, []
    for track in TRACKS:
        if track == "all":
            chosen = cases
        elif track in {"scope_known", "scope_unknown"}:
            chosen = [case for case in cases if unknown_scope(case) == (track == "scope_unknown")]
        else:
            chosen = [case for case in cases if case.get("task_mode", "memory_qa") == track]
        ids = {case["case_id"] for case in chosen}
        subplan = [entry for entry in plan if entry["case_id"] in ids]
        subrows = [row for row in rows if row["case_id"] in ids]
        card, detail = case_card(chosen, dataset["memories"])
        summary = protocol.summarize(subplan, subrows, chosen, seed=seed, bootstrap=bootstrap)
        paired_session_counts(summary["paired_comparisons"], subplan, subrows, chosen)
        status = ("无样本" if not chosen else "矩阵不完整" if summary["status"] != "complete" else
                  "矩阵完整但有失败" if summary["failed_trials"] else "矩阵完整且执行成功")
        summary.update(dataset_card=card, analysis_status=status,
                       comparisons_descriptive_only=True,
                       complete_execution_matrix=bool(chosen) and summary["status"] == "complete" and not summary["failed_trials"])
        tracks[track] = summary
        if track == "all":
            case_details = detail
    commands, audit = audit_commands(run_dir, plan)
    manifest_summary = {key: manifest.get(key) for key in (
        "model", "codex_version", "harbor_version", "reasoning_effort", "timeout_sec",
        "prompt_version", "prompt_sha256", "dataset_sha256", "seed", "repeats", "split", "limit",
        "concurrency", "latency_context", "execution_wall_ms", "execution_started_at", "execution_finished_at", "interrupted")}
    result = {"schema_version": 1, "created_at": datetime.now(timezone.utc).isoformat(),
              "manifest_summary": manifest_summary, "protocol": protocol_info,
              "input_sha256": {name: sha256(run_dir / name) if (run_dir / name).is_file() else None
                               for name in ("manifest.json", "dataset.json", "plan.json", "trials.json")},
              "tracks": tracks, "cases": case_details, "tool_audit": audit}
    comparisons, conditions = [], []
    for track, summary in tracks.items():
        for comparison, metrics in summary["paired_comparisons"].items():
            for metric, values in metrics.items():
                interval = values.get("ci95") or [None, None]
                comparisons.append({"track": track, "comparison": comparison, "metric": metric,
                                    "matrix_status": summary["status"], "failed_trials": summary["failed_trials"],
                                    **values, "ci95_lower": interval[0], "ci95_upper": interval[1]})
        for condition, side in summary["by_condition"].items():
            for metric, values in side["metrics"].items():
                raw = values.get("raw_trial_distribution", {})
                conditions.append({"track": track, "condition": condition, "metric": metric,
                                   "matrix_status": summary["status"], "failed_trials": side["failed_trials"],
                                   **values, "raw_trial_count": raw.get("count"),
                                   "raw_trial_median": raw.get("median"), "raw_trial_p95": raw.get("p95")})
    output.mkdir(parents=True, exist_ok=False, mode=0o700)
    write_file(output / "report.json", json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    write_file(output / "report.md", markdown_report(result))
    write_file(output / "tool-commands.jsonl", "".join(json.dumps(command, ensure_ascii=False) + "\n" for command in commands))
    write_csv(output / "paired-comparisons.csv", comparisons, [
        "track", "comparison", "metric", "matrix_status", "failed_trials", "left_mean", "right_mean",
        "delta_left_minus_right", "ci95_lower", "ci95_upper", "paired_cases", "eligible_cases", "total_cases",
        "paired_coverage", "source_clusters", "independent_source_sessions", "paired_cases_without_session"])
    write_csv(output / "condition-metrics.csv", conditions, [
        "track", "condition", "metric", "matrix_status", "failed_trials", "mean", "median", "p95",
        "distribution_unit", "complete_cases", "eligible_cases", "total_cases", "case_coverage",
        "observed_trial_values", "raw_trial_count", "raw_trial_median", "raw_trial_p95"])
    write_csv(output / "cases.csv", case_details, ["case_id", "task_mode", "split", "scope_unknown",
              "visible_memory_count", "gold_count", "recall_at_5_ceiling", "has_source_session"])
    observed = {row["trial_id"]: row for row in rows}
    case_map = {case["case_id"]: case for case in cases}
    matrix = [{**entry, "task_mode": case_map[entry["case_id"]].get("task_mode", "memory_qa"),
               "execution_status": "missing" if entry["trial_id"] not in observed else
                                   "failed" if observed[entry["trial_id"]].get("error") else "success",
               "error": observed.get(entry["trial_id"], {}).get("error")}
              for entry in plan]
    write_csv(output / "matrix.csv", matrix, ["trial_id", "case_id", "condition", "repeat", "task_mode",
              "execution_status", "error"])
    metric_keys = list(dict.fromkeys([*getattr(protocol, "METRICS", ()),
                                    *(key for row in rows for key, value in row.items() if finite(value))]))
    trial_fields = list(dict.fromkeys(["trial_id", "case_id", "condition", "repeat", "task_mode", "error", *metric_keys]))
    # Explicit field projection excludes question, answer, source IDs and native logs.
    write_csv(output / "trials.csv", rows, trial_fields)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--bootstrap", type=int, default=2000)
    args = parser.parse_args()
    generate(args.run, args.output, bootstrap=args.bootstrap)
    print(args.output / "report.md")


if __name__ == "__main__":
    main()
