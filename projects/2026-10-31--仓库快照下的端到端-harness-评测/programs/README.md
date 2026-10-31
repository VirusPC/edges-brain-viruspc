# Memory 有无消融：实验设计与复现说明

本实验研究：在固定 Agent、模型、问题和仓库基础内容的条件下，提供记忆材料及其读取入口，是否改善回答质量，以及增加多少输入 token 和执行时间。

当前提供 Inspect AI + Inspect SWE、Harbor、Promptfoo、DeepEval 四种实现。四者共用题集、快照冻结、判分和统计代码；每个框架内分别比较 memory off/on。框架之间的执行环境和模型路由不同，不能直接把结果差异归因于“框架更好”。

**当前阶段是实验流程验证。** 默认数据为手写的两个最小目录、两道题；真实模型评测尚未跑通，Docker 端到端尚未执行。本文先说明已实现的实验协议，再给出正式实验前需要人工准备的材料。程序检查通过不构成 memory 有效的证据。

## 1. 研究问题与实验单位

| 问题 | 主要观察量 | 比较范围 |
| --- | --- | --- |
| 记忆能否帮助回答依赖项目知识的问题？ | memory-dependent 题类的准确率变化 | 同一框架内，on 对 off |
| 记忆是否干扰不需要项目知识的问题？ | memory-irrelevant 准确率、违反项数量 | 同上 |
| 收益需要多少额外成本？ | 输入 token 和执行耗时的变化 | 同上 |
| 冲突或过期记忆是否导致退化？ | conflict-stale 中 on 比 off 更差的题目 ID | 当前为诊断项 |

一个 **trial** 是一次独立执行，标识为 `(框架, condition, case_id, repeat)`。一题的多次执行用于观察重复运行的波动；聚合时先按题统计，再对题目等权平均。报告中的题类 `n` 是题目数，不是 trial 数；重复运行不能当成更多不同的问题。

处理变量是“**记忆材料 + 使 Agent 发现它的入口**”。默认 on 同时增加记忆文件和 `AGENTS.md`，因此测量的是这整个材料组合的效果，不能单独解释成记忆正文的效果。当前不包含跨 trial 的记忆学习、写入或会话接续。

## 2. 实验材料：仓库和题目从哪里来

### 2.1 默认使用手写样例目录

默认输入在 [shared/fixtures](shared/fixtures)，由本项目手写，未从 GitHub 下载，也没有 Git 历史或真实业务代码：

```text
shared/fixtures/
├── memory-off/
│   └── README.md                  # 两组相同的示例项目说明
├── memory-on/
│   ├── README.md
│   ├── AGENTS.md                  # 回答发布约定前，读取下面的记忆文件
│   └── .edges/memory/deploy.md     # 内容为 release/personal
└── cases.json                     # 两组共用的题目与评分标准
```

| 条件 | 提供给 Agent 的材料 | 预期作用 |
| --- | --- | --- |
| `memory:off` | 只有示例 README | 缺少发布约定，作为对照 |
| `memory:on` | 同一 README，增加入口和发布约定记忆 | Agent 可通过文件读取获得项目知识 |

这里的“快照”指程序复制并冻结的目录内容，不代表默认样例来自某个仓库 commit。

### 2.2 默认题集

题集见 [cases.json](shared/fixtures/cases.json)，dataset 为 `memory-ablation/pipeline-smoke`。任务类型为只读问答。

| case_id | 分类 | 问题 | 两组相同的判对标准 |
| --- | --- | --- | --- |
| M01 | `memory-dependent` | 项目的发布分支是什么？ | `release/personal` |
| G01 | `memory-irrelevant` | 2 + 2 等于多少？ | `4` |

M01 用于检查有无记忆能否改变回答；G01 用于检查普通问题是否被干扰。两题的 `violations` 都是空列表，也没有 `conflict-stale` 题，因此默认数据不能检验硬约束遵守或冲突记忆的影响。每类只有一道题，不能据此估计真实任务分布上的收益。

### 2.3 换成真实仓库时的输入责任

程序接受已准备好的 `--memory-off`、`--memory-on` 和 `--cases`，不会自动 clone、checkout、删除记忆或验证两份输入只差记忆。正式实验需要调用方先完成：

1. 选定并记录真实仓库的同一个 base commit，物化为两份目录。
2. 列出作为处理变量的记忆文件与入口；检查其余业务文件一致。不要把修 bug、改依赖等变化混进 on 组。
3. 在运行前确定题集、判对要点、违反项、重复次数和判定门槛。题目应覆盖实际关心的任务；记忆材料使用预先确定的项目资料。
4. 将题集和评分标准保存在受测目录之外；用独立 judge 或可验证结果评分。不要让 Agent 从评测文件中直接读出标准答案。

自定义题集沿用 [Edges Dataset 格式](https://github.com/VirusPC/edges/blob/main/packages/evaluation/experiments/harness_memory_ablation/cases/smoke.json)。最小条目如下；`id`、`case_id` 均必填，`case_id` 在题集中唯一：

```json
{
  "dataset": "personal-memory-ablation/v1",
  "items": [{
    "id": "M001",
    "case_id": "M001",
    "input": {"question": "项目中应如何处理某种发布情况？"},
    "expectedOutput": {
      "criteria": ["回答必须覆盖的判对要点"],
      "violations": ["回答不得建议的操作"]
    },
    "metadata": {"category": "memory-dependent"}
  }]
}
```

分类支持 `memory-dependent`、`memory-irrelevant`、`conflict-stale`。这个 JSON 只是格式示例，正式运行前需要替换为可判定的真实问题与标准。

## 3. 实验配置与控制变量

| 项目 | 默认值或当前行为 |
| --- | --- |
| Agent | Codex；CLI 固定为 `0.156.1` |
| 模型 | `--model`，否则 `EVAL_MODEL`，否则 `gpt-5.4` |
| 推理强度 | `--reasoning-effort medium` |
| 条件 | off、on，两组使用同一题集与判分规则 |
| 重复次数 | `--repeats 2`，每题每组执行两次 |
| 单次超时参数 | `--timeout 120` 秒；各入口的作用域不同，见下表 |
| 判分方式 | `--judge fixture`；自定义题集使用 `llm` 或 `skip` |
| 容器基础镜像 | `--agent-image python:3.12-slim`，用于 Inspect / Harbor |
| Web search | 四个入口均配置为关闭 |
| 调用并发 | 四个入口当前均按串行执行配置 |
| 顺序与随机性 | 没有统一的 A/B 随机交错、顺序平衡或随机种子协议 |

| 框架 | `--timeout` 的绑定位置和作用域 |
| --- | --- |
| Inspect | `Task.time_limit`，单个 sample 的时间限制 |
| Harbor | `task.toml` 的 `agent.timeout_sec`，Agent 阶段；镜像构建和 verifier 有各自时限 |
| Promptfoo | `evaluateOptions.timeoutMs`，单个评测步骤的框架级超时，可能包含 hook、provider、assertion／judge |
| DeepEval | Codex CLI 进程的 `communicate(timeout=...)`；不包含后续 DeepEval 判分 |

同样填写 120 秒不能视为四者具有相同的 Agent 预算或中断行为；正式跨框架比较前还需统一超时作用域。LLM judge 自身也有超时设置，以上参数不是整个实验的总时限。

默认每个框架的执行矩阵是：

```text
2 道题 × 2 个条件 × 2 次重复 = 8 个 trial
```

完整运行四个框架会产生 32 个计划 trial。这是运行规模，不是当前已完成的真实模型实验次数。

两组使用相同的中性提示词：要求 Agent 在当前工作目录回答问题，可以读文件和搜索，不改仓库文件；调用方不把记忆正文或评分标准拼入提示词。实际文本由 Edges 的 `build_prompt()` 生成。

每次执行使用新的工作目录副本或容器，具体 Agent 状态隔离见下一节。程序不向下次 trial 回写上次的工作目录修改。新目录、会话或 HOME 也不意味着模型服务端的缓存被清空。

正式效果实验还需记录运行顺序、机器与负载、模型版本和外部服务变化。当前只有重复执行和描述性汇总，未实现置信区间、显著性检验或根据统计功效确定样本量；不能把串行执行自动视为已经控制了时间与顺序影响。

## 4. 执行环境与框架接入

| 环节 | Inspect AI + Inspect SWE | Harbor | Promptfoo | DeepEval |
| --- | --- | --- | --- | --- |
| 实验定义 | 两个 `Task`，共同 dataset | 每题 × 条件生成 Task 包 | 同一 tests，两个条件 provider | 执行输出组成 `LLMTestCase` |
| 启动 Agent | `Task.solver=codex_cli(...)` | `harbor run -a codex` | `openai:codex-sdk` | 本入口调用 Codex CLI |
| 每次隔离 | 新 Docker sandbox | 每个 trial 新 Docker 环境 | 工作目录副本、新 `CODEX_HOME`、关闭线程复用 | 工作目录副本、新 HOME 与 `CODEX_HOME` |
| 模型路由 | Inspect SWE Agent Bridge | Codex 原生链路 | Codex 原生链路 | Codex 原生链路 |
| 判分接口 | 自定义 scorer | 独立 verifier | Python assertion | `BaseMetric.measure()` |
| 公共统计 | 四者均调用 `shared.write_comparison()` | 同左 | 同左 | 同左 |

### 4.1 Harbor 如何使用仓库快照

Harbor 入口生成每个任务的 `environment/` 和 Dockerfile，将当前条件的快照复制进去。Inspect 的 Docker 上下文也采用相同的快照准备逻辑：

```text
输入目录 → 冻结的 workspace/ → Docker build → 镜像 → 新容器中的 /workspace
```

Dockerfile 的核心语句是 `COPY workspace /workspace`。off 的构建内容不含 on 的记忆；受测镜像不包含题集和具体评分标准。Harbor 把题目标准放在任务的 `tests/`，通过 `environment_mode="separate"` 的 verifier 评分。

构建交给配置的 Docker 引擎；示例没有配置向 Docker Hub 或其他 registry 推送镜像。使用远程 Docker 引擎时，构建上下文会传给该引擎。`--prepare-only` 只生成材料，不构建镜像、不启动容器。本项目目前尚未实际完成 Docker 构建及容器端到端验证。

### 4.2 宿主目录模式的边界

Promptfoo、DeepEval 当前在宿主机运行。目录副本和新 Agent 状态可减少串扰，但只读沙箱不能保证 Agent 只读取当前目录；另一组快照或评分材料仍可能位于可读的宿主文件系统中。

这两个入口明确写入 `controlled_filesystem=false`。结果只用于探索性描述，报告固定保留 `comparison_validity="exploratory-host-filesystem"`、`worth_default_on=null`。正式受控消融需要先补齐文件系统隔离。

同一模型标识和 CLI 版本也不足以证明四个入口的请求完全一致。尤其 Inspect 使用 Bridge，模型配置、系统提示和工具适配的差异都可能影响回答、token 与耗时。本文的主比较单位始终是每个框架内部的 off/on。

## 5. 单次执行如何评分

一次完整执行依次经过：校验并冻结输入 → 在新环境中启动 Agent → 收集最终回答、用量和耗时 → 独立判分 → 检查 trial 矩阵完整性 → 汇总 A/B 结果。公共实现见 [shared/common.py](shared/common.py)。

### 5.1 判分模式

| `--judge` | 判分方法 | 适用范围 |
| --- | --- | --- |
| `fixture` | 对 `answer.strip()` 与内置标准答案做精确匹配；只产生 correct / incorrect | 默认两题的流程验证 |
| `llm` | 独立 judge 读取问题、回答、criteria、violations，返回判定 | 自定义题集 |
| `skip` | 不评价质量，保留 `verdict=null` | 只验证执行和采集用量 |

`fixture` 不是语义评分：即使答案意思正确，多一句解释也可能判错。它也不会调用 LLM judge。**但默认执行仍会调用真实 Codex／模型**；要完全离线，使用 `--prepare-only` 或协议测试。

`llm` 复用 Edges 的独立判分器，通过 `JUDGE_BASE_URL / JUDGE_API_KEY / JUDGE_MODEL` 配置，以 temperature=0 请求 judge。Judge 只收到问题、最终回答及题目的评分规则，不额外读取记忆正文，请求中不附 off/on 标签；这些 judge 环境变量不配置给受测 Agent。当前未安排人工盲评或 judge 一致性校准流程，正式实验需另行安排。

### 5.2 质量分与约束违反

| verdict | 含义 | 映射到框架的原生质量分 |
| --- | --- | --- |
| `correct` | 覆盖判对要点，结论无反向冲突 | 1 |
| `partial` | 部分满足要点；仅 llm 模式可能产生 | 0.5 |
| `incorrect` | 未满足判对要求 | 0 |
| null | 未评分，或执行／判分失败 | 不作为质量判定 |

Inspect 保存 `Score.value`；Harbor 保存 `reward.quality` 并用 `reward.scored` 表示是否判分；Promptfoo / DeepEval 的质量指标名为 `TaskQuality`。`skip` 下，Promptfoo / DeepEval 显示 `ExecutionSucceeded`，只是执行检查；Harbor 不写 quality，Inspect 使用 unscored。

`violations` 是 LLM judge 返回的、回答触碰的预设违反项列表。统计的是各 trial 违反项数量之和，不是归一化的违反率。fixture / skip 不评约束；空数组不能解释为已经验证“没有违反约束”。

**共同报告中的 accuracy 只把 correct 计为答对。** partial 虽然在原生质量分中显示为 0.5，但在 accuracy 中计为未答对，二者不能混用。

### 5.3 成本和运行状态

| 字段 | 定义与解释 |
| --- | --- |
| `input_tokens` | 当前适配器报告的输入 token；用于成本门槛 |
| `output_tokens` | 输出 token，记录但不参与当前门槛 |
| `cached_input_tokens`、`reasoning_tokens` | 原始响应提供时记录；未知为 null，不补成 0 |
| `latency_ms` | Agent 执行相关耗时，计时口径见下表 |
| `error` | 执行或 judge 错误；不是 incorrect |

| 框架 | 耗时来源 |
| --- | --- |
| Inspect | setup 记录起点，到 scorer 读取最终回答时的时间差 |
| Harbor | 原生 `agent_execution` 的 started_at / finished_at |
| Promptfoo | 原生导出的 `latencyMs` |
| DeepEval | 启动 CLI 到收集 CLI 结果的墙钟时间 |

这些耗时不是整个实验的总耗时，也不构成完全一致的跨框架性能口径。当前没有美元成本、judge 费用、记忆读取率、检索命中率或工具调用正确率指标；题目答对也不能单独证明 Agent 确实读过记忆。

## 6. 如何聚合并得出结果

共同比较逻辑来自 Edges 的 [compare_trials](https://github.com/VirusPC/edges/blob/main/packages/evaluation/experiments/harness_memory_ablation/score.py)。

对题目 i、条件 c、重复次数 R：

```text
每题准确率 a(i,c) = correct 的执行次数 / R
题类准确率 A(c)  = 该题类中所有题目的 a(i,c) 的等权平均
质量增益 Δ(pp)   = 100 × [A(on) - A(off)]
```

只有该题所有重复都已判分，才计算它的准确率；题类内存在未评分题时，相关准确率保持未评分。程序不会通过丢掉失败 trial 来抬高质量指标。

输入 token 与耗时先对每题每条件的可用重复值取中位数，再仅保留 off/on 两侧都有数值的配对题，对每侧的题目中位数再取中位数：

```text
成本变化率 = [median_on - median_off] / median_off
```

部分重复用量缺失时，当前仍可能用其余可用值求中位数；成本指标没有单独输出覆盖率，解释时必须核对原始 trials。两侧都为 0 时变化率为 0；off 为 0、on 大于 0 时为正无穷；没有配对值时标记 unscored。

### 6.1 当前业务门槛

| gate ID | 通过条件 |
| --- | --- |
| `dependent_accuracy` | memory-dependent 准确率至少提高 10 个百分点 |
| `input_tokens` | 配对题输入 token 的上述中位数增幅不超过 15% |
| `latency` | 配对题耗时的上述中位数增幅不超过 10% |
| `irrelevant_not_harmful` | memory-irrelevant 准确率不下降，违反项总数不增加 |

这些阈值继承自项目已有的 memory 消融设计，是可讨论的业务门槛，不是框架默认值或行业标准。`conflict-stale` 目前只输出 on 比 off 更差的 `b_worse_case_ids`，不参与这四个 gate；默认两题也不覆盖它。

`worth_default_on` 是按这些门槛生成的建议字段，不是统计显著性结论：只有四个 gate 都明确为 true，才可能为 true。存在未评分 gate 时不能当作通过；当前非宿主模式的代码会因此得到 false，这不等于已经证明记忆无效。执行或判分错误也会阻止通过；宿主目录模式始终覆盖为 null。

### 6.2 失败和完整性规则

预期的每个 case × condition × repeat 必须恰好有一个 trial。缺失、重复或出现意外 trial 时，保存 `status="incomplete"` 并停止计算 A/B 建议。

执行失败不进入 judge，保留 `error` 与 `verdict=null`；judge 失败也保留为错误。完整收集但含错误时，保存 `execution_status="failed"` 并非零退出。答错题属于正常评测结果，不等于程序执行失败。`status="complete"` 只说明收集矩阵完整，不代表执行成功或回答正确。

## 7. 复现实验

本目录属于公开个人大脑的实验项目。shared 复用 Edges 既有模块，在共同 workspace 内会自动查找祖先目录下的 `edges/`；独立检出时显式设置 `EDGES_ROOT=/absolute/path/to/edges`。所有下列命令在本 `programs/` 目录执行，输出目录必须尚不存在。

### 7.1 安装固定版本

控制器使用 Python 3.12+，Promptfoo 需要 Node.js 22.22.0+。版本固定为 Inspect AI 0.3.286、Inspect SWE 0.2.67、Harbor 0.25.0、Promptfoo 0.125.1、DeepEval 4.3.2、Codex SDK / CLI 0.156.1。

```bash
# Inspect / Harbor，以及 Promptfoo 的 Python hook / assertion
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
npm ci --prefix promptfoo

# DeepEval 独立依赖环境与 CLI
uv venv --python 3.12 deepeval/.venv
uv pip install --python deepeval/.venv/bin/python -r deepeval/requirements.txt
npm ci --prefix deepeval
```

Inspect / Harbor 的实际执行需要可用的 Docker daemon。可用 [shared/Dockerfile.codex](shared/Dockerfile.codex) 预装固定 CLI，再通过 `--agent-image` 选用；正式实验应固定镜像 digest。基础镜像 tag 和第三方模型名称本身不保证内容永远不变。

### 7.2 不调用模型的准备与检查

```bash
.venv/bin/python inspect/inspect_eval.py --prepare-only --output .runs/inspect-prepared
.venv/bin/python harbor/harbor_eval.py --prepare-only --output .runs/harbor-prepared
.venv/bin/python promptfoo/promptfoo_eval.py --prepare-only --output .runs/promptfoo-prepared
deepeval/.venv/bin/python deepeval/deepeval_eval.py --prepare-only --output .runs/deepeval-prepared

.venv/bin/python -m unittest discover -s shared/tests -v
.venv/bin/python -m unittest discover -s inspect/tests -v
.venv/bin/python -m unittest discover -s harbor/tests -v
.venv/bin/python -m unittest discover -s promptfoo/tests -v
deepeval/.venv/bin/python -m unittest discover -s deepeval/tests -v
```

协议测试使用真实框架和测试 CLI 替身，不发送真实模型请求。替身中的答案和 token 数只用于验证数据传递。它与默认正常执行使用的真实 Codex 是两种不同的运行方式。

### 7.3 执行默认两题

以下命令会调用模型。先配置 Agent 凭据，并把 `EVAL_MODEL` 设为该鉴权与模型路由下可用的模型标识：

```bash
.venv/bin/python inspect/inspect_eval.py --model "$EVAL_MODEL" --output .runs/inspect-smoke
.venv/bin/python harbor/harbor_eval.py --model "$EVAL_MODEL" --output .runs/harbor-smoke
.venv/bin/python promptfoo/promptfoo_eval.py --model "$EVAL_MODEL" --output .runs/promptfoo-smoke
deepeval/.venv/bin/python deepeval/deepeval_eval.py --model "$EVAL_MODEL" --output .runs/deepeval-smoke
```

Agent 可使用 `OPENAI_API_KEY`；Harbor / Promptfoo / DeepEval 也支持显式 `--auth-json /absolute/path/to/auth.json` 导入登录文件，不继承原 Codex 配置。Inspect SWE 的模型请求经过 Bridge，需配置 Inspect 模型凭据，不接受该登录文件参数。这些接入能否使用指定模型须以实际 smoke 结果为准。

### 7.4 执行自己的正式题集

在完成第 2.3 节的材料准备、配置独立 judge 环境变量后，可用下列命令启动；3 次重复仅是调用示例，不代表足够的正式样本量：

```bash
.venv/bin/python inspect/inspect_eval.py \
  --memory-off /path/to/snapshot-off --memory-on /path/to/snapshot-on \
  --cases /path/to/cases.json --model "$EVAL_MODEL" \
  --judge llm --repeats 3 --timeout 120 --output .runs/inspect-real
```

换框架时替换入口和输出目录，DeepEval 使用自己的 Python 环境。自定义题集不能用 fixture judge。复制输入时排除 `.git`，拒绝软链接，不修改输入目录；参数与完整协议保持一致后，才进行同一框架内的 A/B 解释。

## 8. 产物和复现记录

| 输出 | 用途 |
| --- | --- |
| `manifest.json` | 题集／快照／程序摘要、模型、CLI、框架版本、judge 及环境配置 |
| `contexts/` | 冻结的目录和构建材料；生成它不意味着已经构建镜像 |
| `framework-config.json`、`promptfooconfig.json` | 对应入口的框架配置或执行命令 |
| `result.json` | 共同 trials、by_category、gates、错误和 A/B 建议 |
| `inspect-logs/`、`jobs/`、`promptfoo-results.json` | 各框架原生记录 |
| `deepeval-results.json`、`deepeval-results/` | DeepEval 返回值与本地 test run |

manifest 已记录题集内容摘要、两组快照摘要、入口／shared Python 文件摘要和运行参数，但当前不会自动记录输入仓库 commit、外部 Edges 评测模块的源码版本、镜像 digest、机器环境及统一的随机化计划。正式复现需要另行保存这些信息，连同原始输出、运行顺序、judge 版本与审阅记录一起归档。`.runs/` 默认被 Git 忽略，不会随本项目提交自动同步。

## 9. 已完成的验证与结论边界

| 验证层次 | 当前状态 | 可以说明什么 |
| --- | --- | --- |
| 离线检查 | 29 项通过：shared 17、Inspect 2、Harbor 2、Promptfoo 2、DeepEval 6 | 检查覆盖的快照、SDK 配置、协议传递、判分及报告逻辑通过 |
| 真实模型 smoke | 此前 Promptfoo 用 gpt-5.4、gpt-6.1-sol 经指定 SDK＋ChatGPT 登录链路均返回 model_not_found | 没有产生有效回答，未证明真实模型链路成功 |
| 容器端到端 | Inspect / Harbor 尚未运行 | 尚未验证实际镜像构建与容器任务执行 |
| 正式 memory 效果实验 | 尚未完成 | 当前没有足以支持 memory 收益的真实实验结果 |

完整执行记录见 [VALIDATION.md](VALIDATION.md)。准备文件、离线测试分数、未评分的执行成功，以及原生结果页面能打开，都不能替代正式实验结果。

## 10. 代码与接口导航

| 目录 | 实现职责 |
| --- | --- |
| [inspect/](inspect/README.md) | 官方 codex_cli、Task、scorer、EvalLog 归一化 |
| [harbor/](harbor/README.md) | 任务包、内置 codex、独立 verifier 与 Job 结果采集 |
| [promptfoo/](promptfoo/README.md) | 原生 provider、HOME hook、Python assertion 与导出映射 |
| [deepeval/](deepeval/README.md) | 独立 CLI 执行、LLMTestCase、BaseMetric、evaluate |
| [shared/](shared/README.md) | 共同材料、归一化、评分和完整性检查；不执行 Agent |

四个框架目录互不导入，shared 不依赖框架 SDK。[原生版本对比](promptfoo/COMPARE_INSPECT.md)说明前三者的代码接线；[DeepEval 对照](deepeval/README.md)说明它与 Inspect 的接口对应。

官方接口：[Inspect SWE Codex CLI](https://meridianlabs-ai.github.io/inspect_swe/codex_cli.html)、[Agent Bridge](https://inspect.aisi.org.uk/agent-bridge.html)；[Harbor 内置 Agent](https://docs.harborframework.com/agents/pre-integrated-agents)、[独立 verifier](https://docs.harborframework.com/tasks/separate-verifier)；[Promptfoo Codex SDK](https://www.promptfoo.dev/docs/providers/openai-codex-sdk/)；[DeepEval 端到端评测](https://deepeval.com/docs/evaluation-end-to-end-single-turn)、[自定义 Metric](https://deepeval.com/docs/metrics-custom)。
