"""Three-arm metrics; no model calls and no third-party dependencies."""
from __future__ import annotations

import json
import math
import random
import re
import statistics
from collections import Counter, defaultdict
from typing import Any

CONDITIONS = ("scoped", "root", "none")
QUALITY_METRICS = (
    "selected_recall_at_5", "evidence_recall_at_5", "precision_at_5", "mrr",
    "answer_checks_pass", "forbidden_violation_rate", "unknown_selected_count", "empty_gold_selection_rate",
)
METRICS = QUALITY_METRICS + (
    "tool_calls", "observed_memory_count", "input_tokens", "output_tokens",
    "cached_input_tokens", "uncached_input_tokens", "total_tokens",
    "agent_latency_ms", "trial_wall_ms", "failure_rate",
)


def number(value: Any) -> bool:
    """Recognize finite measured numbers, without accepting booleans."""
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def parse_events(text: str) -> dict:
    """Parse completed Codex events; command text is never retrieval evidence."""
    events = []
    for line in text.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if isinstance(event, dict) and isinstance(event.get("type"), str):
            events.append(event)
    answer, outputs, tools = "", [], set()
    for index, event in enumerate(events):
        if event["type"] != "item.completed":
            continue
        item = event.get("item") or {}
        if not isinstance(item, dict):
            continue
        kind = item.get("type")
        if kind == "agent_message" and isinstance(item.get("text"), str):
            answer = item["text"]
        if kind in {"command_execution", "mcp_tool_call", "web_search", "file_change"}:
            tools.add(item.get("id") or f"event-{index}")
        if kind == "command_execution" and isinstance(item.get("aggregated_output"), str):
            outputs.append(item["aggregated_output"])
        elif kind == "mcp_tool_call":
            # Only returned content, never the command/arguments or assistant text.
            result = item.get("result")
            if isinstance(result, (dict, list, str)):
                outputs.append(result if isinstance(result, str) else json.dumps(result))
    completed = [event for event in events if event["type"] == "turn.completed"]
    usage = {}
    for field in ("input_tokens", "output_tokens", "cached_input_tokens"):
        values = [(event.get("usage") or {}).get(field) for event in completed]
        usage[field] = sum(values) if values and all(number(v) and v >= 0 for v in values) else None
    inp, cached, out = (usage[k] for k in ("input_tokens", "cached_input_tokens", "output_tokens"))
    usage["uncached_input_tokens"] = inp - cached if inp is not None and cached is not None and 0 <= cached <= inp else None
    usage["total_tokens"] = inp + out if inp is not None and out is not None else None
    terminal = events[-1]["type"] if events else None
    error = None if terminal == "turn.completed" else "codex:incomplete-or-failed-turn"
    return {"raw_answer": answer, "tool_outputs": outputs,
            "tool_calls": len(tools) if events else None, "error": error, **usage}


def parse_answer(text: str) -> dict:
    """Require one JSON object with a unique ranking of at most five memory IDs."""
    stripped = text.strip()
    if stripped.startswith("```json\n") and stripped.endswith("\n```"):
        stripped = stripped[8:-4]
    data = json.loads(stripped)
    if not isinstance(data, dict) or set(data) != {"answer", "selected_memory_ids"}:
        raise ValueError("answer must contain exactly answer and selected_memory_ids")
    ids = data["selected_memory_ids"]
    if not isinstance(data["answer"], str) or not data["answer"].strip():
        raise ValueError("answer must be nonempty text")
    if not isinstance(ids, list) or len(ids) > 5 or not all(isinstance(i, str) and i for i in ids):
        raise ValueError("ranking must contain at most five IDs")
    if len(set(ids)) != len(ids):
        raise ValueError("ranking contains duplicate IDs")
    return data


def evaluate_artifact(spec: dict, events_text: str) -> dict:
    """Score selected memory, observed tool output, and narrow answer regex checks."""
    parsed = parse_events(events_text)
    outputs = parsed.pop("tool_outputs")
    markers = spec["read_markers"]
    observed = [mid for mid, marker in markers.items() if any(marker in output for output in outputs)]
    row = {"case_id": spec["case"]["case_id"], "condition": spec["condition"],
           "task_mode": spec["case"].get("task_mode", "memory_qa"),
           **parsed, "observed_memory_ids": sorted(observed),
           "observed_memory_count": len(observed) if parsed["tool_calls"] is not None else None,
           "selected_memory_ids": None, "answer": None, "format_valid": None,
           **dict.fromkeys(QUALITY_METRICS), "agent_latency_ms": None}
    if row["error"]:
        return row
    try:
        answer = parse_answer(parsed["raw_answer"])
    except (ValueError, TypeError):
        row.update(error="output:invalid-json-schema", format_valid=False)
        return row
    row.update(answer, format_valid=True)
    selected = answer["selected_memory_ids"]
    gold = set(spec["case"]["gold_memory_ids"])
    visible = set(spec["visible_memory_ids"])
    # none cannot retrieve a file that is not present, even if it guesses its ID.
    hits = gold.intersection(selected, visible)
    if gold:
        row.update(selected_recall_at_5=len(hits) / len(gold),
                   evidence_recall_at_5=len(hits.intersection(observed)) / len(gold),
                   precision_at_5=len(hits) / 5,
                   mrr=next((1 / rank for rank, mid in enumerate(selected, 1) if mid in hits), 0.0))
    else:
        row["empty_gold_selection_rate"] = float(bool(selected))
    row["unknown_selected_count"] = len(set(selected) - visible)
    checks = spec["case"].get("answer_checks", [])
    if checks:
        matches = {c["check_id"]: bool(re.search(c["pattern"], answer["answer"], flags=re.IGNORECASE)) for c in checks}
        row["answer_check_results"] = matches
        row["answer_checks_pass"] = float(all(matches.values()))
    forbidden = spec["case"].get("forbidden_patterns", [])
    if forbidden:
        matches = [bool(re.search(pattern, answer["answer"], flags=re.IGNORECASE)) for pattern in forbidden]
        row["forbidden_matches"] = matches
        row["forbidden_violation_rate"] = float(any(matches))
    return row


def invalidate_quality(row: dict, error: str) -> dict:
    """Keep measured resource costs when the infrastructure reports a failure."""
    row.update(error=error, **dict.fromkeys(QUALITY_METRICS))
    return row


def percentile(values: list[float], probability: float) -> float:
    """Linearly interpolate a sorted bootstrap distribution."""
    values = sorted(values)
    index = (len(values) - 1) * probability
    lo, hi = math.floor(index), math.ceil(index)
    return values[lo] + (values[hi] - values[lo]) * (index - lo)


def summarize(plan: list[dict], rows: list[dict], cases: list[dict], *, seed: int, bootstrap: int = 2000) -> dict:
    """Compare case means, resampling whole source sessions rather than repeats."""
    expected = {p["trial_id"]: p for p in plan}
    if len(expected) != len(plan):
        raise ValueError("duplicate planned trial ID")
    seen = Counter(row["trial_id"] for row in rows)
    if any(count != 1 for count in seen.values()) or set(seen) - set(expected):
        raise ValueError("duplicate or unexpected trial ID")
    for row in rows:
        wanted = expected[row["trial_id"]]
        if any(row.get(k) != wanted[k] for k in ("case_id", "condition", "repeat")):
            raise ValueError("trial metadata disagrees with the execution plan")
    case_map = {c["case_id"]: c for c in cases}
    planned = Counter((p["case_id"], p["condition"]) for p in plan)
    grouped = defaultdict(list)
    for row in rows:
        grouped[(row["case_id"], row["condition"])].append(row)

    def case_value(case_id: str, condition: str, metric: str) -> float | None:
        values = [float(bool(row.get("error"))) if metric == "failure_rate" else row.get(metric)
                  for row in grouped[(case_id, condition)]]
        if len(values) != planned[(case_id, condition)] or not values or not all(number(v) for v in values):
            return None
        return statistics.mean(values)

    def eligible(case: dict, metric: str) -> bool:
        if metric in {"selected_recall_at_5", "evidence_recall_at_5", "precision_at_5", "mrr"}:
            return bool(case.get("gold_memory_ids"))
        if metric == "empty_gold_selection_rate":
            return not case.get("gold_memory_ids")
        if metric == "answer_checks_pass":
            return bool(case.get("answer_checks"))
        if metric == "forbidden_violation_rate":
            return bool(case.get("forbidden_patterns"))
        return True

    by_condition = {}
    for condition in CONDITIONS:
        current = [r for r in rows if r["condition"] == condition]
        totals = sum(p["condition"] == condition for p in plan)
        by_condition[condition] = {
            "planned_trials": totals, "observed_trials": len(current),
            "failed_trials": sum(bool(r.get("error")) for r in current),
            "failure_rate": sum(bool(r.get("error")) for r in current) / len(current) if current else None,
            "metrics": {},
        }
        for metric in METRICS:
            eligible_ids = [cid for cid, case in case_map.items() if eligible(case, metric)]
            values = [case_value(cid, condition, metric) for cid in eligible_ids]
            known = [v for v in values if v is not None]
            raw_values = ([float(bool(r.get("error"))) for r in current] if metric == "failure_rate" else
                          [r[metric] for r in current if number(r.get(metric))])
            by_condition[condition]["metrics"][metric] = {
                "mean": statistics.mean(known) if known else None,
                "median": statistics.median(known) if known else None,
                "p95": percentile(known, .95) if known else None,
                "distribution_unit": "case mean across all repeats",
                "raw_trial_distribution": {
                    "count": len(raw_values), "median": statistics.median(raw_values) if raw_values else None,
                    "p95": percentile(raw_values, .95) if raw_values else None,
                    "unit": "individual trial; includes measured resource costs of failures",
                },
                "complete_cases": len(known), "eligible_cases": len(values), "total_cases": len(case_map),
                "case_coverage": len(known) / len(values) if values else None,
                "observed_trial_values": len(current) if metric == "failure_rate" else sum(number(r.get(metric)) for r in current),
            }
    comparisons = {}
    for left, right in (("scoped", "root"), ("scoped", "none"), ("root", "none")):
        metrics = {}
        for metric in METRICS:
            pairs = []
            clusters = defaultdict(list)
            eligible_count = sum(eligible(case, metric) for case in case_map.values())
            for cid, case in case_map.items():
                if not eligible(case, metric):
                    continue
                a, b = case_value(cid, left, metric), case_value(cid, right, metric)
                if a is None or b is None:
                    continue
                delta = a - b
                pairs.append((a, b, delta))
                session = case.get("source", {}).get("session_id")
                cluster = "session:" + session if isinstance(session, str) and session else "case:" + cid
                clusters[cluster].append(delta)
            ci = None
            if len(clusters) >= 2 and bootstrap > 0:
                rng = random.Random(f"{seed}:{left}:{right}:{metric}")
                cluster_values = list(clusters.values())
                sampled = []
                for _ in range(bootstrap):
                    draws = rng.choices(cluster_values, k=len(cluster_values))
                    sampled.append(statistics.mean(value for draw in draws for value in draw))
                ci = [percentile(sampled, .025), percentile(sampled, .975)]
            metrics[metric] = {
                "left_mean": statistics.mean(p[0] for p in pairs) if pairs else None,
                "right_mean": statistics.mean(p[1] for p in pairs) if pairs else None,
                "delta_left_minus_right": statistics.mean(p[2] for p in pairs) if pairs else None,
                "ci95": ci, "paired_cases": len(pairs), "total_cases": len(case_map),
                "eligible_cases": eligible_count,
                "paired_coverage": len(pairs) / eligible_count if eligible_count else None,
                "source_clusters": len(clusters),
            }
        comparisons[f"{left}-vs-{right}"] = metrics
    return {
        "status": "complete" if len(rows) == len(plan) else "incomplete",
        "planned_trials": len(plan), "observed_trials": len(rows),
        "failed_trials": sum(bool(r.get("error")) for r in rows),
        "by_condition": by_condition, "paired_comparisons": comparisons,
        "statistics": {"unit": "mean of all repeats for a case", "bootstrap_unit": "source session; case if absent",
                       "bootstrap_samples": bootstrap, "seed": seed,
                       "missingness": "require all repeats for each case metric; show complete-case coverage",
                       "ci_note": "descriptive percentile intervals, not multiplicity-adjusted; fewer than two clusters => null"},
    }
