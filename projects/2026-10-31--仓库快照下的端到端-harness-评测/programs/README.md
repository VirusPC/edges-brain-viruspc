# Memory 有无消融：四套框架程序

前三个入口使用框架现成的 Codex 接入：Inspect SWE `codex_cli()`、Harbor `codex`、Promptfoo `openai:codex-sdk`。新增的 [DeepEval 版本](deepeval/README.md)独立调用 Codex CLI，再用 `LLMTestCase + BaseMetric + evaluate()` 评分。题集、快照冻结、结果格式、judge 与 A/B 统计仍放在 `shared/`。

本目录属于个人大脑的调研与实验项目，不是 Edges 框架发布包的一部分。shared 复用 Edges 的已有评测模块：在共同 workspace 内会自动找到祖先目录下的 `edges/`；独立检出个人脑或使用另一份框架时，请先设置 `EDGES_ROOT=/absolute/path/to/edges`。不要求把本项目复制回框架仓。

**默认评测会调用真实 Codex／模型。** `--judge fixture` 只是内置两题的精确字符串判分器，不表示离线运行；不调用模型时使用 `--prepare-only` 或下方自动检查。

## 目录和接口对应

| 步骤 | Inspect AI + Inspect SWE | Harbor | Promptfoo | DeepEval |
| --- | --- | --- | --- | --- |
| 实验定义 | 两个 Task，dataset 为共同题集 | 每题 × 条件生成 Task 包 | tests 为题集，两个 providers 为 off/on | 执行输出组成 LLMTestCase |
| 启动 Codex | `Task.solver=codex_cli(...)` | `harbor run -a codex` | `providers[].id=openai:codex-sdk` | 本入口 `run_codex()`，再 `evaluate()` |
| 每次准备 | Task 的新 sandbox；setup 只记计时起点 | 每个 trial 新环境；原生 adapter 初始化 Codex HOME | `copy_working_dir`；beforeEach 创建新 Codex HOME | 目录副本 + 新 Codex HOME |
| 判分 | 自定义 scorer → `shared.score_result()` | separate verifier → 同一判分函数 | Python assertion → 同一判分函数 | BaseMetric.measure → 同一判分函数 |
| 原生记录 | Inspect EvalLog、Bridge 模型／工具事件 | Codex JSONL、ATIF trajectory、Job 结果 | SDK raw turn、tokenUsage、原生结果表 | TestResult、MetricData、JSON test run |
| 共同统计 | `shared.write_comparison()` | 同左 | 同左；宿主模式不输出受控消融结论 | 同左；同为宿主模式 |

```text
programs/
├── inspect/
│   ├── inspect_eval.py        # Task + 官方 codex_cli + scorer + 日志映射
│   ├── requirements.txt
│   └── tests/
├── harbor/
│   ├── harbor_eval.py         # Task 包 + 内置 codex 的 Job 启动
│   ├── harbor_verify.py       # 原生 JSONL artifact 的独立评分
│   ├── requirements.txt
│   └── tests/
├── promptfoo/
│   ├── promptfoo_eval.py      # 原生 provider 配置 + 导出映射
│   ├── hooks.py               # beforeEach 创建干净 Codex HOME
│   ├── assertion.py           # 独立评分
│   ├── package.json / package-lock.json
│   └── tests/
├── deepeval/
│   ├── deepeval_eval.py       # 独立 Codex CLI 执行 + LLMTestCase + evaluate
│   ├── shared_metric.py       # BaseMetric 复用共同判分
│   ├── requirements.txt
│   ├── package.json / package-lock.json
│   └── tests/
└── shared/
    ├── common.py              # 快照、题集、归一化、评分、统计；不执行 Agent
    ├── Dockerfile.codex
    ├── fixtures/
    └── tests/                 # fake_codex.py 仅供协议检查
```

四个框架目录互不导入；shared 不依赖框架 SDK。[原生版本对比](promptfoo/COMPARE_INSPECT.md)说明前三者的接线成本和不能直接横比的边界；[DeepEval 接入说明](deepeval/README.md)列出了它与 Inspect 的接口对应。

## 安装和无模型验证

以下命令在本 `programs/` 目录运行。控制器使用 Python 3.12+；Promptfoo 需要 Node.js 22.22.0+。

```bash
uv venv --python 3.12
uv pip install --python .venv/bin/python -r requirements.txt
source .venv/bin/activate
npm ci --prefix promptfoo

python inspect/inspect_eval.py --prepare-only --output .runs/inspect-native-prepared
python harbor/harbor_eval.py --prepare-only --output .runs/harbor-native-prepared
python promptfoo/promptfoo_eval.py --prepare-only --output .runs/promptfoo-native-prepared

python -m unittest discover -s shared/tests -v
python -m unittest discover -s inspect/tests -v
python -m unittest discover -s harbor/tests -v
python -m unittest discover -s promptfoo/tests -v
```

版本固定为 Inspect AI 0.3.286、Inspect SWE 0.2.67、Harbor 0.25.0、Promptfoo 0.125.1、DeepEval 4.3.2、Codex SDK / CLI 0.156.1。DeepEval 使用独立 Python 环境与自己的 CLI lockfile，安装命令见 [DeepEval README](deepeval/README.md)，不需要安装其余框架。Inspect SWE、Harbor、DeepEval 使用公共 `--codex-version`；Promptfoo 使用 lockfile 里的 SDK 所依赖的 CLI，并检查版本一致。模型默认 `gpt-5.4`，可用 `--model` 或 `EVAL_MODEL` 改为明确选择的模型。

Promptfoo 离线测试实际运行框架与 Codex SDK，但把 CLI binary 换成测试协议替身，完成 8 个调用；这不代表真实 Codex 或模型执行。Inspect／Harbor 的无模型验证构建真实 SDK 对象并检查任务格式、事件解析与 verifier，不启动容器。

## 用真实 Codex 执行

配置好 `OPENAI_API_KEY` 后可运行三套程序；Inspect 与 Harbor 还需要已启动的 Docker daemon。以下使用内置两题、两个条件、各重复两次：

```bash
python inspect/inspect_eval.py --output .runs/inspect-native
python harbor/harbor_eval.py --output .runs/harbor-native
python promptfoo/promptfoo_eval.py --output .runs/promptfoo-native
```

也可给 Promptfoo / Harbor 显式导入已有 Codex 登录态。只复制 auth.json，不继承本机配置、用户记忆或 skills：

```bash
python promptfoo/promptfoo_eval.py --auth-json /absolute/path/to/auth.json \
  --repeats 1 --judge skip --output .runs/promptfoo-login-smoke
```

Inspect SWE 的模型请求经过 Agent Bridge，需要为 Inspect 配置模型凭据；这个示例不把 Codex 登录态换成 Inspect API 鉴权。

正式题集与目录参数四者相同，只替换入口和输出目录：

```bash
python inspect/inspect_eval.py \
  --memory-off /path/to/snapshot-off --memory-on /path/to/snapshot-on \
  --cases /path/to/cases.json --model "$EVAL_MODEL" \
  --judge llm --repeats 3 --timeout 120 --output .runs/inspect-real
```

题集沿用 [Edges 现有 Dataset 格式](https://github.com/VirusPC/edges/blob/main/packages/evaluation/experiments/harness_memory_ablation/cases/smoke.json)。评分端读取 `JUDGE_BASE_URL / JUDGE_API_KEY / JUDGE_MODEL`；这些变量不配置到受测 Agent。自定义题集使用 `--judge llm` 或 `skip`。`fixture` 只对内置两题做严格字符串匹配；`skip` 保留 `verdict=null`。

输入应是从同一 commit 物化出的两个目录，只有记忆材料及入口不同。程序不替你 checkout、确定 memory 的文件范围或修复入口；复制时排除 .git、拒绝软链接，输出目录须尚不存在。Agent 收到共同的中性问题提示，不拼入 memory 正文或评分标准。

## 环境和结果的实际边界

Inspect 为每题／epoch 建立新容器；Harbor 为每个 trial 建立环境，另外启动 verifier。镜像中仅包含当前条件的快照，不包含题集或另一组快照。

Promptfoo 原生 SDK 示例和 DeepEval CLI 示例运行在宿主机。目录副本和新 Codex HOME 可以清除工作目录修改、会话与用户配置的串扰，但 **read-only 不等于只允许读取该目录**：Agent 仍可能读取宿主上的另一快照或评分材料。因此其 manifest 标记 `controlled_filesystem=false`，共同报告保留描述性统计，但设置 `worth_default_on=null`、`comparison_validity=exploratory-host-filesystem`。宿主示例适合验证接线和流程，不能直接作为受控 memory 消融证据。

四者使用相同模型标识和 CLI 版本，也不能假设请求完全相同：Inspect SWE 默认通过 Bridge，另外三者走 Codex 原生模型链路。执行环境、系统提示／工具适配和 token 统计来源均需连同结果解释；本轮不做谁更快或模型效果谁更好的结论。

| 输出 | 含义 |
| --- | --- |
| manifest.json | 题集／快照／程序摘要、模型、CLI、框架版本及隔离方式 |
| contexts/ | 冻结的目录与容器构建材料 |
| framework-config.json | Inspect 原生 Task 摘要或 Harbor 实际命令；准备阶段可检查 |
| promptfooconfig.json | Promptfoo 实际原生 provider 配置 |
| result.json | 共同 trials、错误、用量／耗时和 A/B 描述性统计 |
| inspect-logs/、jobs/、promptfoo-results.json | 各框架原生记录 |
| deepeval-results.json、deepeval-results/ | DeepEval 返回值与原生本地 test run |

未知用量保持 null；运行失败不送 judge，也不伪造质量分。执行／判分失败保留报告并非零退出；答错题是正常评分结果。缺失／重复 trial 时保存 incomplete 报告。原实验阈值仍由既有 compare_trials 实现，不是框架默认或行业标准。

Inspect／Harbor 可使用 shared/Dockerfile.codex 预装固定 CLI，减少每轮下载。用 `--agent-image` 选择镜像；生产实验应固定镜像 digest。

## 官方接口

- [Inspect SWE Codex CLI](https://meridianlabs-ai.github.io/inspect_swe/codex_cli.html)、[Inspect Agent Bridge](https://inspect.aisi.org.uk/agent-bridge.html)
- [Harbor 内置 Agent](https://docs.harborframework.com/agents/pre-integrated-agents)、[独立 verifier](https://docs.harborframework.com/tasks/separate-verifier)
- [Promptfoo Codex SDK](https://www.promptfoo.dev/docs/providers/openai-codex-sdk/)、[目录副本](https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/)、[生命周期 hooks](https://www.promptfoo.dev/docs/configuration/reference/)
- [DeepEval 端到端评测](https://deepeval.com/docs/evaluation-end-to-end-single-turn)、[自定义 Metric](https://deepeval.com/docs/metrics-custom)

## 本轮验证

原有 20 项与新增 DeepEval 6 项离线检查通过；本轮复核 shared 14 项和 DeepEval 6 项。DeepEval 实际运行 evaluate()，Codex 使用协议替身，没有新增真实模型调用。此前经用户授权的真实 Promptfoo smoke 因当前 SDK＋登录链路返回 model_not_found 未跑通；容器端到端也未执行。[完整验证记录](VALIDATION.md)。
