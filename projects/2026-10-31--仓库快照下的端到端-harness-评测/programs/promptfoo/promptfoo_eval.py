"""Promptfoo 原生 openai:codex-sdk：配置目录、题目和评分，不实现自定义 provider。"""
from __future__ import annotations
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "shared"))
from common import (CONDITIONS, arguments, build_prompt, controller_environment, normalize_result,
                    prepare_experiment, score_result, write_comparison, write_json)


def create_config(args, dataset: dict, contexts: dict[str, Path]) -> dict:
    """将两种目录条件绑定内置 Codex provider，使用正式 repeat、Python assertion 和 HOME hook。"""
    providers = []
    for condition in CONDITIONS:
        config = {"working_dir": str(contexts[condition] / "workspace"), "copy_working_dir": True,
                  "model": args.model.removeprefix("openai/"), "model_reasoning_effort": args.reasoning_effort,
                  "persist_threads": False, "skip_git_repo_check": True, "sandbox_mode": "read-only",
                  "approval_policy": "never", "network_access_enabled": False, "web_search_mode": "disabled",
                  "enable_streaming": True, "maxRetries": 0, "cli_env": {"CODEX_HOME": "{{codexHome}}"}}
        if args.codex_path:
            config["codex_path_override"] = str(args.codex_path.resolve())
        providers.append({"id": "openai:codex-sdk", "label": "memory:" + condition, "config": config})
    return {
        "description": "Native Codex memory ablation", "prompts": [build_prompt("{{case.question}}")], "providers": providers,
        "tests": [{"description": c["case_id"], "vars": {"case": c}} for c in dataset["items"]],
        "extensions": ["file://" + str(HERE / "hooks.py") + ":beforeEach"],
        "evaluateOptions": {"timeoutMs": args.timeout * 1000},
        "defaultTest": {"assert": [{"type": "python", "value": "file://" + str(HERE / "assertion.py"),
                        "config": {"judge": args.judge}, "metric": "ExecutionSucceeded" if args.judge == "skip" else "TaskQuality"}]},
        "commandLineOptions": {"repeat": args.repeats, "maxConcurrency": 1, "cache": False, "share": False},
    }


def collect_trials(path: Path, args) -> list[dict]:
    """从 Promptfoo 原生导出取回 provider 条件和 repeat，补齐共同结果；失败响应也保留。"""
    rows = json.loads(path.read_text(encoding="utf-8"))["results"]["results"]
    trials = []
    for row in rows:
        variables = row["vars"]
        response = row.get("response") or {}
        key = variables.get("trialKey", "")
        # 原生导出会脱敏绝对路径；只用不含路径和凭据的相对标识关联评分文件。
        scored = args.output / "trials" / key / "scored.json" if re.fullmatch(r"[0-9a-f]{32}", key) else None
        if scored and scored.exists():
            trial = json.loads(scored.read_text())
        else:
            trial = score_result(variables["case"], normalize_result(str(response.get("output") or ""),
                                 error="promptfoo:provider-or-assertion-error"), "pending", 0, args.judge)
        repeat_index = row.get("repeatIndex", 0 if args.repeats == 1 else None)
        trial.update(condition=row["provider"]["label"], repeat=int(repeat_index) + 1 if repeat_index is not None else 0,
                     latency_ms=row.get("latencyMs"), framework_trial_id=row["id"])
        trials.append(trial)
    return sorted(trials, key=lambda t: (t["condition"], t["case_id"], t["repeat"]))


def run_experiment(args) -> dict | None:
    """准备原生 provider 配置，可选执行 Promptfoo，然后复用公共 A/B 比较。"""
    package = json.loads((HERE / "node_modules/@openai/codex-sdk/package.json").read_text())
    if package["dependencies"]["@openai/codex"] != args.codex_version:
        raise ValueError("--codex-version 必须与 package-lock 固定的 SDK CLI 版本一致")
    dataset, contexts, metadata = prepare_experiment(args, program_dir=HERE)
    config_path = args.output / "promptfooconfig.json"
    write_json(config_path, create_config(args, dataset, contexts))
    metadata.update(framework="promptfoo", version=json.loads((HERE / "node_modules/promptfoo/package.json").read_text())["version"],
                    codex_sdk_version=package["version"], execution="openai:codex-sdk", isolation="workspace-copy-and-fresh-codex-home",
                    model_route="codex-native", config_sha256=hashlib.sha256(config_path.read_bytes()).hexdigest(),
                    controlled_filesystem=False,
                    package_lock_sha256=hashlib.sha256((HERE / "package-lock.json").read_bytes()).hexdigest(),
                    custom_codex_binary=bool(args.codex_path))
    write_json(args.output / "manifest.json", metadata)
    if args.prepare_only:
        return None
    env = controller_environment(args.output)
    env.update(PROMPTFOO_PYTHON=sys.executable, PROMPTFOO_DISABLE_TELEMETRY="1", PROMPTFOO_DISABLE_UPDATE="1",
               PROMPTFOO_CONFIG_DIR=str(args.output / "promptfoo-state"), ABLATION_OUTPUT=str(args.output),
               REQUEST_TIMEOUT_MS=str((args.timeout + 60) * 1000))
    if args.auth_json:
        env["ABLATION_AUTH_JSON"] = str(args.auth_json)
    command = [str(HERE / "node_modules/.bin/promptfoo"), "eval", "-c", str(config_path),
               "-o", str(args.output / "promptfoo-results.json"), "--repeat", str(args.repeats),
               "--max-concurrency", "1", "--no-cache", "--no-share"]
    try:
        completed = subprocess.run(command, cwd=HERE, env=env, stdin=subprocess.DEVNULL, check=False)
    finally:
        # 仅临时导入鉴权；框架退出后删除每次 HOME 中复制的登录文件。
        for auth_file in (args.output / "codex-homes").glob("*/auth.json"):
            auth_file.unlink(missing_ok=True)
    metadata["promptfoo_returncode"] = completed.returncode
    native_result = args.output / "promptfoo-results.json"
    if not native_result.exists():
        write_json(args.output / "result.json", {"status": "incomplete", "metadata": metadata, "trials": []})
        raise RuntimeError(f"Promptfoo 未导出结果，退出码 {completed.returncode}；已保存 incomplete 报告")
    trials = collect_trials(native_result, args)
    report = write_comparison(args.output / "result.json", trials, [c["case_id"] for c in dataset["items"]], args.repeats, metadata)
    if completed.returncode not in (0, 100):
        raise RuntimeError(f"Promptfoo 退出码 {completed.returncode}，结果已保留")
    return report


def main() -> None:
    """解析共同参数及可选测试 CLI 路径，执行或仅生成原生 Codex 配置。"""
    parser = arguments(__doc__)
    parser.add_argument("--codex-path", type=Path, help="可选 Codex binary；provider 会检查与 SDK 版本匹配")
    args = parser.parse_args()
    run_experiment(args)
    print(args.output / ("promptfooconfig.json" if args.prepare_only else "result.json"))


if __name__ == "__main__":
    main()
