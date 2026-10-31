# DeepEval：同一份 memory off/on 消融

本入口复用 `../shared/` 的题集、目录快照、提示词、Codex JSONL 解析、judge 和 A/B 统计。与 Inspect、Harbor、Promptfoo 分目录，互不导入。

**执行层由本入口调用 Codex CLI；评分层使用 DeepEval 的正式 API。** 这里没有把 Codex 包装成 DeepEval 内置 provider。DeepEval 官方的端到端示例也是先运行应用，再把输入／输出组成 `LLMTestCase` 交给 `evaluate()`。

```python
dataset, contexts, metadata = prepare_experiment(args)
test_cases = []
for condition, case, repeat in experiment_grid:
    workspace = prepare_workspace(contexts[condition], fresh_directory)
    result = run_codex(args, workspace, case["question"])
    test_cases.append(LLMTestCase(
        input=build_prompt(case["question"]),
        actual_output=result["answer"],
        metadata={...},  # 执行结果和控制器侧评分标准
    ))

# SharedMemoryMetric.measure() → shared.score_result() → 保存 trial.json
native_result = evaluate(test_cases, metrics=[SharedMemoryMetric(args.judge)])
report = write_comparison(trials, ...)
```

上面是流程伪代码；可执行入口是 [deepeval_eval.py](deepeval_eval.py)，Metric 在 [shared_metric.py](shared_metric.py)。所有函数都有注释。

| 环节 | Inspect 版本 | 本 DeepEval 版本 |
| --- | --- | --- |
| 输入定义 | `Task(dataset=...)` | `LLMTestCase(input, actual_output, metadata)` |
| 执行 Codex | `Task.solver=codex_cli(...)`，由 Inspect SWE 接入 | 本入口 `run_codex()` 调用 CLI，再收集输出 |
| 评分 | `@scorer` → `shared.score_result()` | `BaseMetric.measure()` → 同一函数 |
| 编排 | `eval(tasks, ...)` 管执行与评分 | Python 循环执行，`evaluate()` 管评分与原生结果 |
| 环境 | Inspect sandbox 容器 | 宿主目录副本 + 每次新 HOME；不要求 Docker |
| 原生结果 | EvalLog、Bridge 事件 | TestResult、MetricData、JSON test run |

因此这个任务里，DeepEval 需要自行接执行循环。若已有能返回 Agent 输出的实验脚本，接 `LLMTestCase + Metric` 会更直接。

## 安装与运行

在 `programs/` 目录执行。使用独立 Python 环境，避免四个框架的依赖相互影响：

```bash
uv venv --python 3.12 deepeval/.venv
uv pip install --python deepeval/.venv/bin/python -r deepeval/requirements.txt
npm ci --prefix deepeval

# 只冻结题集／快照并生成配置，不运行模型。
deepeval/.venv/bin/python deepeval/deepeval_eval.py \
  --prepare-only --output .runs/deepeval-prepared

# 离线检查：真实 DeepEval + 测试 CLI 替身，不需要密钥。
deepeval/.venv/bin/python -m unittest discover -s deepeval/tests -v

# 配好 OPENAI_API_KEY 后会调用真实 Codex／模型。
deepeval/.venv/bin/python deepeval/deepeval_eval.py \
  --model "$EVAL_MODEL" --output .runs/deepeval-real
```

固定 DeepEval `4.3.2`、Codex CLI `0.156.1`。可通过 `--codex-path /absolute/path/to/codex` 替换可执行文件，仍会核对 `--codex-version`；本机其他版本须显式指定版本。`--auth-json /absolute/path/to/auth.json` 只临时复制登录文件，执行后删除副本，不继承原用户配置。

公共参数与另外三份程序一致：`--memory-off`、`--memory-on`、`--cases`、`--repeats`、`--timeout`、`--judge`。输出目录须尚不存在。自定义题集使用 `--judge llm`（配置 `JUDGE_BASE_URL / JUDGE_API_KEY / JUDGE_MODEL`）或 `skip`。这些 judge 变量不会传给 Codex。

- `fixture`：只给共同内置两题做精确字符串匹配，原生指标为 `TaskQuality`；它不代表离线执行 Agent。
- `llm`：复用 shared 的独立 judge，指标同上。
- `skip`：原生指标为 `ExecutionSucceeded`；共同报告 `verdict=null`，不把执行成功说成回答正确。

## 结果与边界

| 文件 | 内容 |
| --- | --- |
| `manifest.json`、`framework-config.json` | 输入摘要、版本、执行与评分配置 |
| `trials/*/*/trial.json` | 同一份 shared trial 格式，包括 Codex 事件、用量、延迟、错误与分数 |
| `deepeval-results.json` | `evaluate()` 返回的完整序列化结果 |
| `deepeval-results/test_run_*.json` | DeepEval 原生本地 test run 导出 |
| `result.json` | 与其他入口同格式的共同 A/B 报告 |

此版本在导入 DeepEval 前关闭遥测、dotenv、旧登录文件和自动云上传，原生记录留在输出目录。`deepeval view` 是 Confident AI 云端查看入口，可能上传缓存；这里不自动调用它。新版 CLI 的 `deepeval inspect` 可查看本地记录。

每个 trial 使用新目录和新 Codex HOME，只给 Codex 中性问题提示，评分标准只留控制器侧。只读沙箱仍可能读取工作目录外的宿主文件，因此明确标记 `controlled_filesystem=false`、`comparison_validity=exploratory-host-filesystem`、`worth_default_on=null`。这是接线示例，不能直接作为受控消融证据。

只记录 Codex CLI 实际暴露的事件与 token 明细，不伪造内部工具 trace；缺失用量为 null。执行／判分失败保留报告并非零退出；超时终止本次进程组。真实模型链路本轮未运行。

## 官方依据

- [端到端 single-turn 评测](https://deepeval.com/docs/evaluation-end-to-end-single-turn)
- [自定义 Metric](https://deepeval.com/docs/metrics-custom)
- [评测配置与本地 JSON 导出](https://deepeval.com/docs/evaluation-flags-and-configs)
- [环境变量](https://deepeval.com/docs/environment-variables)、[CLI 与查看结果](https://deepeval.com/docs/command-line-interface)
