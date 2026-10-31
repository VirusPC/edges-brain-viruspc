"""Promptfoo 原生 Codex 响应的独立判分；不执行 Agent。"""
import os
import re
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared"))
from common import normalize_result, score_result, write_json


def get_assert(output: str, context: dict) -> dict:
    """把正式 ProviderResponse 转成公共结果并判分；trial 标识由导出的原生结果补齐。"""
    response = context["providerResponse"]
    usage = response.get("tokenUsage") or {}
    try:
        native_usage = (json.loads(response.get("raw") or "{}").get("usage") or {})
    except (TypeError, ValueError):
        native_usage = {}
    # Promptfoo 的通用 tokenUsage 会补默认 0；明细只从 SDK 原始 usage 取，避免把未知当成零。
    raw = normalize_result(output, usage={"input_tokens": native_usage.get("input_tokens", usage.get("prompt")),
        "output_tokens": native_usage.get("output_tokens", usage.get("completion")),
        "cached_input_tokens": native_usage.get("cached_input_tokens"), "reasoning_tokens": native_usage.get("reasoning_output_tokens")},
        error="promptfoo:provider-error" if response.get("error") else None, native=response.get("raw"))
    trial = score_result(context["vars"]["case"], raw, "pending", 0, context["config"]["judge"])
    key = context["vars"]["trialKey"]
    if not re.fullmatch(r"[0-9a-f]{32}", key):
        raise ValueError("invalid trialKey")
    write_json(Path(os.environ["ABLATION_OUTPUT"]) / "trials" / key / "scored.json", trial)
    value = {"correct": 1.0, "partial": 0.5, "incorrect": 0.0}.get(trial["verdict"])
    return {"pass": not trial.get("error") and trial["verdict"] in (None, "correct"),
            "score": value if value is not None else float(not trial.get("error")),
            "reason": trial.get("error") or trial["verdict"] or "unscored: execution only",
            "namedScores": {"scored": float(value is not None), **({"quality": value} if value is not None else {})}}
