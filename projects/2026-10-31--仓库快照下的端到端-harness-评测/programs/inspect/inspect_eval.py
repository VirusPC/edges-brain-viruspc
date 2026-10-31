"""Inspect AI + Inspect SWE：使用官方 codex_cli()，不自行执行 CLI。"""
from __future__ import annotations
import asyncio
import json
import os
import sys
import time
from importlib.metadata import version
from pathlib import Path

from inspect_ai import Task, eval_async
from inspect_ai.dataset import Sample
from inspect_ai.scorer import Score, Scorer, Target, scorer
from inspect_ai.solver import TaskState, solver
from inspect_swe import codex_cli

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "shared"))
from common import (CONDITIONS, arguments, build_prompt, controller_environment, normalize_result,
                    prepare_experiment, score_result, write_comparison, write_json)


@solver
def memory_setup():
    """返回准备回调；环境由 Task.sandbox 创建，此处只记录执行计时起点。"""
    async def setup(state, generate):
        """输入 TaskState，记录 Agent 执行起点并返回同一 state。"""
        state.metadata["agent_started"] = time.monotonic()
        return state
    return setup


def result_scorer(condition: str, judge: str) -> Scorer:
    """绑定 memory 条件和判分方式，返回调用共同 score_result 的正式 scorer。"""

    @scorer(metrics=[])
    def score_trial() -> Scorer:
        """返回已绑定条件和 judge 的正式 Inspect scorer 回调。"""
        async def score(state: TaskState, target: Target) -> Score:
            """读取 Codex Agent 的最终回答，独立判分并将完整 trial 放进 Score.metadata。"""
            raw = normalize_result(state.output.completion,
                                   latency_ms=(time.monotonic() - state.metadata["agent_started"]) * 1000)
            trial = await asyncio.to_thread(score_result, state.metadata["case"], raw,
                                            f"memory:{condition}", state.epoch, judge)
            value = {"correct": 1.0, "partial": 0.5, "incorrect": 0.0}.get(trial["verdict"], "unscored")
            return Score(value=value, answer=trial["answer"], metadata={"trial": trial})

        return score

    return score_trial()


def create_tasks(args, dataset: dict, contexts: dict[str, Path]) -> list[Task]:
    """构建两个真实 Task；每题/epoch 的新 sandbox 由 Inspect 管理。"""
    tasks = []
    for condition in CONDITIONS:
        compose = contexts[condition] / "compose.yaml"
        compose.write_text("services:\n  default:\n    build: .\n    command: tail -f /dev/null\n"
                           "    init: true\n    working_dir: /workspace\n", encoding="utf-8")
        tasks.append(Task(
            name=f"memory-{condition}",
            dataset=[Sample(id=c["case_id"], input=build_prompt(c["question"]), metadata={"case": c}) for c in dataset["items"]],
            setup=memory_setup(),
            solver=codex_cli(cwd="/workspace", home_dir="/tmp/agent-home/.codex", version=args.codex_version,
                             web_search="disabled", goals=False,
                             config_overrides={"model_reasoning_effort": json.dumps(args.reasoning_effort)}),
            scorer=result_scorer(condition, args.judge),
            sandbox=("docker", str(compose)), epochs=args.repeats, time_limit=args.timeout, fail_on_error=False,
        ))
    return tasks


def normalize_usage(model_usage: dict) -> dict:
    """汇总正式 Inspect ModelUsage；映射 cache-read 字段，未知项继续保持 None。"""
    mapping = {"input_tokens": "input_tokens", "output_tokens": "output_tokens",
               "cached_input_tokens": "input_tokens_cache_read", "reasoning_tokens": "reasoning_tokens"}
    normalized = {}
    for target, source in mapping.items():
        values = [getattr(u, source, None) for u in model_usage.values()]
        normalized[target] = sum(v for v in values if v is not None) if any(v is not None for v in values) else None
    return normalized


async def run_experiment(args) -> dict | None:
    """冻结输入、构建原生 Task，可选执行评测，归一化日志后调用共同 A/B 比较。"""
    if args.auth_json:
        raise ValueError("Inspect SWE 的模型调用经过 Bridge；请给 Inspect 配置 OPENAI_API_KEY")
    dataset, contexts, metadata = prepare_experiment(args, program_dir=HERE)
    tasks = create_tasks(args, dataset, contexts)
    metadata.update(framework="inspect-ai", version=version("inspect-ai"), inspect_swe_version=version("inspect-swe"),
                    execution="inspect_swe/codex_cli", isolation="per-sample-docker", model_route="inspect-bridge")
    write_json(args.output / "manifest.json", metadata)
    write_json(args.output / "framework-config.json", {"solver": "inspect_swe/codex_cli", "tasks": len(tasks),
               "sample_count": len(dataset["items"]) * len(tasks) * args.repeats})
    if args.prepare_only:
        return None
    os.environ.update(controller_environment(args.output))
    logs = await eval_async(tasks, model="openai/" + args.model.removeprefix("openai/"), max_samples=1, max_tasks=1,
                            reasoning_effort=args.reasoning_effort, ctl_server=False,
                            log_dir=str(args.output / "inspect-logs"), log_format="json")
    cases = {c["case_id"]: c for c in dataset["items"]}
    trials = []
    for condition, log in zip(CONDITIONS, logs):
        for sample in log.samples or []:
            scored = [s.metadata["trial"] for s in (sample.scores or {}).values() if s.metadata and "trial" in s.metadata]
            trial = scored[0] if scored else score_result(cases[str(sample.id)],
                normalize_result(sample.output.completion if sample.output else "", error="inspect:sample-error"),
                f"memory:{condition}", sample.epoch, args.judge)
            if sample.error:
                trial.update(error="inspect:sample-error", verdict=None)
            trial.update(normalize_usage(sample.model_usage or {}))
            trials.append(trial)
    trials.sort(key=lambda t: (t["condition"], t["case_id"], t["repeat"]))
    return write_comparison(args.output / "result.json", trials, list(cases), args.repeats, metadata)


def main() -> None:
    """解析公共参数，运行或仅准备 Inspect 的原生 Codex 实验。"""
    args = arguments(__doc__).parse_args()
    asyncio.run(run_experiment(args))
    print(args.output / ("framework-config.json" if args.prepare_only else "result.json"))


if __name__ == "__main__":
    main()
