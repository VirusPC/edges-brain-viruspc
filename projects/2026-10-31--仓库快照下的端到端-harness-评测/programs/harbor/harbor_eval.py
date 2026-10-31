"""Harbor 实验入口：使用内置 codex，由独立 Verifier 解析原生日志并判分。"""

from __future__ import annotations

import json
import os
import shlex
import shutil
import subprocess
import sys
from collections import Counter
from datetime import datetime
from importlib.metadata import version
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "shared"))
from common import CONDITIONS, arguments, build_prompt, controller_environment, prepare_experiment, write_comparison, write_json


def create_tasks(args, dataset: dict, contexts: dict[str, Path]) -> Path:
    """把每题×条件写成 Harbor Task 包；输入配置、题集和冻结上下文，返回 tasks 路径。"""
    tasks = args.output / "tasks"
    for condition in CONDITIONS:
        for index, case in enumerate(dataset["items"], 1):
            task = tasks / f"case-{index:03d}-{condition}"
            environment = task / "environment"
            shutil.copytree(contexts[condition], environment)
            (task / "instruction.md").write_text(build_prompt(case["question"]), encoding="utf-8")
            tests = task / "tests"
            write_json(tests / "case.json", case)
            shutil.copy2(HERE / "harbor_verify.py", tests / "harbor_verify.py")
            command = shlex.join([
                "python3", "/tests/harbor_verify.py", "--case", "/tests/case.json",
                "--events", "/logs/agent/codex.txt", "--condition", condition,
                "--judge", args.judge, "--output", "/logs/verifier",
            ])
            (tests / "test.sh").write_text("#!/bin/bash\nset -euo pipefail\n" + command + "\n", encoding="utf-8")
            config = (
                'schema_version = "1.4"\nartifacts = ["/logs/agent/codex.txt"]\n'
                f'[agent]\ntimeout_sec = {args.timeout}\n'
                '[environment]\nbuild_timeout_sec = 600\nworkdir = "/workspace"\n'
                '[verifier]\nenvironment_mode = "separate"\ntimeout_sec = 180\n'
            )
            if args.judge == "llm":
                # 在 verifier 启动时才从宿主解析；不把密钥写进文件或 Agent 镜像。
                config += '[verifier.env]\n' + "".join(
                    f'{name} = "${{{name}}}"\n' for name in ("JUDGE_BASE_URL", "JUDGE_API_KEY", "JUDGE_MODEL")
                )
            (task / "task.toml").write_text(config, encoding="utf-8")
    return tasks


def collect_trials(job_dir: Path) -> list[dict]:
    """读取 Harbor 每次 verifier 的 trial.json；输入 job 路径，返回归一化 trials。

    当前比较按 case 聚合，不按 attempt 配对；repeat 依归档路径顺序编号。
    """
    trials = []
    repeats = Counter()
    for path in sorted(job_dir.glob("*/verifier/trial.json")):
        trial = json.loads(path.read_text(encoding="utf-8"))
        key = (trial["condition"], trial["case_id"])
        repeats[key] += 1
        trial.update(repeat=repeats[key], framework_trial_id=path.parent.parent.name)
        result_path = path.parent.parent / "result.json"
        if result_path.exists():
            native = json.loads(result_path.read_text())
            timing = native.get("agent_execution") or {}
            if timing.get("started_at") and timing.get("finished_at"):
                trial["latency_ms"] = (datetime.fromisoformat(timing["finished_at"]) -
                                       datetime.fromisoformat(timing["started_at"])).total_seconds() * 1000
            if native.get("exception_info"):
                trial.update(error="harbor:trial-error", verdict=None)
        trials.append(trial)
    return trials


def run_experiment(args) -> dict | None:
    """冻结 A/B、生成任务并可选运行 Harbor Job；输入 CLI 参数，返回比较报告或 None。"""
    dataset, contexts, metadata = prepare_experiment(args, program_dir=HERE)
    tasks = create_tasks(args, dataset, contexts)
    # 用真实 SDK 解析每个任务，生成阶段即可发现 task.toml/目录格式错误。
    from harbor.models.task.task import Task
    for path in tasks.iterdir():
        Task(path)
    metadata.update(framework="harbor", version=version("harbor"), separate_verifier=True,
                    execution="codex", isolation="per-trial-docker", model_route="codex-native")
    write_json(args.output / "manifest.json", metadata)
    executable = str(Path(sys.executable).with_name("harbor"))
    command = [executable, "run", "-p", str(tasks), "-a", "codex", "-m", "openai/" + args.model.removeprefix("openai/"),
               "--ak", "version=" + args.codex_version, "--ak", "reasoning_effort=" + args.reasoning_effort,
               "--ak", "web_search=disabled", "-e", "docker",
               "-k", str(args.repeats), "-n", "1", "--max-retries", "0",
               "--jobs-dir", str(args.output / "jobs"), "--job-name", "memory-ablation"]
    write_json(args.output / "framework-config.json", {"agent": "codex", "command": command})
    if args.prepare_only:
        return None
    env = controller_environment(args.output)
    if args.auth_json:
        env["CODEX_AUTH_JSON_PATH"] = str(args.auth_json)
    completed = subprocess.run(command, cwd=HERE, env=env, check=False)
    trials = collect_trials(args.output / "jobs/memory-ablation")
    metadata["harbor_returncode"] = completed.returncode
    report = write_comparison(args.output / "result.json", trials,
                              [case["case_id"] for case in dataset["items"]], args.repeats, metadata)
    if completed.returncode:
        raise RuntimeError(f"Harbor 退出码 {completed.returncode}；已保留日志与结果")
    return report


def main() -> None:
    """解析参数并运行 Harbor 实验，打印结果位置；无返回值。"""
    parser = arguments(__doc__)
    args = parser.parse_args()
    run_experiment(args)
    print(args.output / ("framework-config.json" if args.prepare_only else "result.json"))


if __name__ == "__main__":
    main()
