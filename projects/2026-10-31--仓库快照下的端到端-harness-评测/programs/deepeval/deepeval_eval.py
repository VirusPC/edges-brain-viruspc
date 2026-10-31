"""Codex CLI 执行任务，DeepEval evaluate() 评分；复用 shared 的 memory 消融协议。"""
from __future__ import annotations

import importlib.metadata
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "shared"))
from common import (CONDITIONS, arguments, build_prompt, codex_result, controller_environment,
                    isolated_codex_home, normalize_result, prepare_experiment,
                    prepare_workspace, write_comparison, write_json)


def configure_deepeval(output: Path) -> None:
    """在导入 SDK 前隔离本地状态并关闭自动 dotenv、遥测和 Confident 上传。"""
    os.environ.update(controller_environment(output))
    os.environ.update({
        "DEEPEVAL_TELEMETRY_OPT_OUT": "1", "DEEPEVAL_DISABLE_DOTENV": "1",
        "DEEPEVAL_DISABLE_LEGACY_KEYFILE": "1", "CONFIDENT_API_KEY": "",
        "CONFIDENT_OPEN_BROWSER": "0", "DEEPEVAL_NO_INSPECT_PROMPT": "1",
        "DEEPEVAL_HOME": str(output / "deepeval-home"),
        "DEEPEVAL_RESULTS_FOLDER": str(output / "deepeval-results"),
        "DEEPEVAL_LOCAL_STORE": "json",
    })


def run_codex(args, workspace: Path, question: str) -> dict:
    """在全新 HOME 中调用只读 Codex；超时终止本次进程组，返回共同结果格式。"""
    home = isolated_codex_home(args.output / "codex-homes", args.auth_json)
    (home / "tmp").mkdir()
    env = {"PATH": os.environ.get("PATH", os.defpath), "HOME": str(home),
           "CODEX_HOME": str(home), "XDG_CONFIG_HOME": str(home / "config"),
           "TMPDIR": str(home / "tmp"), "LANG": "C.UTF-8"}
    if not args.auth_json:
        for name in ("OPENAI_API_KEY", "CODEX_API_KEY"):
            if os.environ.get(name):
                env[name] = os.environ[name]
    command = [str(args.codex_path), "exec", "--json", "--skip-git-repo-check",
               "--sandbox", "read-only", "--model", args.model, "--cd", str(workspace),
               "-c", f'model_reasoning_effort="{args.reasoning_effort}"',
               "-c", 'web_search="disabled"', "-"]
    started = time.perf_counter()
    process = None
    try:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, text=True, encoding="utf-8",
                                   cwd=workspace, env=env, start_new_session=True)
        error = None
        try:
            stdout, _ = process.communicate(build_prompt(question), timeout=args.timeout)
        except subprocess.TimeoutExpired:
            # CLI 的原生子进程也必须结束，不能只杀 npm/入口包装进程。
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            stdout, _ = process.communicate()
            error = "timeout"
        result = codex_result(stdout)
        if error or process.returncode:
            result["error"] = error or result["error"] or f"codex:exit:{process.returncode}"
        result["latency_ms"] = (time.perf_counter() - started) * 1000
        return result
    except (OSError, ValueError) as exc:
        return normalize_result("", error="codex:" + type(exc).__name__,
                                latency_ms=(time.perf_counter() - started) * 1000)
    finally:
        # 正常结束通常已无该进程组；取消／异常时也清理原生子进程。
        if process is not None:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.wait()
        (home / "auth.json").unlink(missing_ok=True)


def run_experiment(args) -> dict:
    """冻结输入，逐次执行 Codex，交给 DeepEval 评分，再输出共同 A/B 报告。"""
    args.codex_path = args.codex_path.resolve()
    dataset, contexts, metadata = prepare_experiment(args, program_dir=HERE)
    metadata.update(framework="deepeval", framework_version=importlib.metadata.version("deepeval"),
                    execution="separate-codex-cli", controlled_filesystem=False,
                    isolation="host-workspace-copy-and-fresh-home")
    write_json(args.output / "manifest.json", metadata)
    config = {"api": "evaluate(test_cases, metrics)", "test_case": "LLMTestCase",
              "metric": "ExecutionSucceeded" if args.judge == "skip" else "TaskQuality",
              "test_cases": len(dataset["items"]) * len(CONDITIONS) * args.repeats,
              "run_async": False, "use_cache": False, "cloud_upload": False,
              "codex_path": str(args.codex_path)}
    write_json(args.output / "framework-config.json", config)
    if args.prepare_only:
        return config
    version = subprocess.run([str(args.codex_path), "--version"], capture_output=True,
                             text=True, check=True, timeout=10).stdout.strip()
    if version != f"codex-cli {args.codex_version}":
        raise ValueError(f"CLI 版本不一致：需要 {args.codex_version}，实际 {version}")
    configure_deepeval(args.output)
    from deepeval import evaluate
    from deepeval.evaluate import AsyncConfig, CacheConfig, DisplayConfig, ErrorConfig
    from deepeval.test_case import LLMTestCase
    from shared_metric import SharedMemoryMetric

    test_cases = []
    trial_paths = []
    for condition in CONDITIONS:
        for index, case in enumerate(dataset["items"]):
            for repeat in range(1, args.repeats + 1):
                # 目录用序号，题目 ID 不参与文件路径拼接。
                trial_dir = args.output / "trials" / condition / f"{index:04d}-{repeat}"
                workspace = prepare_workspace(contexts[condition] / "workspace", trial_dir / "workspace")
                raw = run_codex(args, workspace, case["question"])
                trial_path = trial_dir / "trial.json"
                trial_paths.append(trial_path)
                test_cases.append(LLMTestCase(
                    name=f"memory:{condition}/{case['case_id']}/{repeat}",
                    input=build_prompt(case["question"]), actual_output=raw["answer"],
                    input_token_count=raw["input_tokens"], output_token_count=raw["output_tokens"],
                    completion_time=raw["latency_ms"] / 1000,
                    metadata={"case": case, "raw": raw, "condition": f"memory:{condition}",
                              "repeat": repeat, "trial_path": str(trial_path)},
                ))
    previous_cwd = Path.cwd()
    try:
        # SDK 的相对本地缓存也归入这次 output，不污染项目或用户目录。
        os.chdir(args.output)
        result = evaluate(
            test_cases=test_cases, metrics=[SharedMemoryMetric(args.judge)],
            async_config=AsyncConfig(run_async=False),
            cache_config=CacheConfig(use_cache=False, write_cache=False),
            display_config=DisplayConfig(show_indicator=False, print_results=False,
                                         inspect_after_run=False,
                                         results_folder=str(args.output / "deepeval-results")),
            error_config=ErrorConfig(ignore_errors=True),
        )
        write_json(args.output / "deepeval-results.json", result.model_dump(mode="json"))
    finally:
        os.chdir(previous_cwd)
    import json
    trials = [json.loads(path.read_text()) for path in trial_paths if path.exists()]
    return write_comparison(args.output / "result.json", trials,
                            [case["case_id"] for case in dataset["items"]], args.repeats, metadata)


def main() -> None:
    """解析公共实验参数及本入口独有的 CLI 路径，运行实验。"""
    parser = arguments(__doc__)
    parser.add_argument("--codex-path", type=Path, default=HERE / "node_modules/.bin/codex")
    args = parser.parse_args()
    run_experiment(args)
    print(args.output)


if __name__ == "__main__":
    main()
