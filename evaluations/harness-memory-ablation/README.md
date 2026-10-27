# Harness Memory 消融评估

比较在控制模型、Agent、仓库版本的前提下，注入 `.edges/memory`（及 `AGENTS.md` / `.edges` 索引对其的发现路径）相对不注入，能否在回答质量上正向，同时输入 token 增量与端到端耗时增量落在可接受阈值内。

## 评估目的

回答用户问题：`.edges` 里的 memory 部分，是否在 token 消耗增多不大且耗时增加不大的前提下，对模型回答结果产生正向帮助。本目录存方法、口径、题库（已对齐 Dataset `harness-memory-ablation/v1`）与按日期命名的实测报告。

## 假设

在同一模型、同一 Agent、同一仓库 commit 的前提下：

- 条件 B（完整 memory）相对条件 A（无 memory）在 memory-dependent 题上正确率更高；
- 条件 B 相对 A 的输入 token 增量与端到端耗时增量落在下文默认阈值内；
- 在 memory-irrelevant 题上，条件 B 的质量不低于条件 A（不帮倒忙）；
- conflict/stale 题用于观察 memory 是否把模型带偏，不计入「质量至少提升」的主判定，单独报告。

## 条件组

| 组 | 定义 | 本轮 |
|---|---|---|
| A | 无 memory。独立 worktree 基于同一 commit；去掉 `.edges/memory` 目录，并去掉 `AGENTS.md` 与 `.edges/README.md` 中指向 memory 的索引行；其余文件与硬约束保持不变 | 首轮必跑 |
| B | 完整 memory。与生产一致的现状检出（含 `.edges/memory` 与索引） | 首轮必跑 |
| C | 仅索引、不加载正文，或按需检索（例如只暴露类型 README，不预加载条目正文） | 可选第二阶段；首轮标为后续 |

准备 A 时注意：

1. 只改发现路径与 memory 正文是否存在，不改模型、系统提示、工具集、温度。
2. 根 `AGENTS.md` 硬约束区块（worktree、`Co-authored-by`、`posts/` 禁改等）在 A/B 中都保留。因此「仅靠硬约束即可答对」的题不能用来证明 memory 有增益；memory-dependent 题应优先选**主真源在 `.edges/memory` 正文**的约定。
3. A 的改动只存在于该实验 worktree，禁止 push 到生产分支，禁止改生产 memory。

## 固定变量

- 同一被测模型、温度、系统提示、工具集。
- 同一仓库 commit（brain 仓 tip；跑之前记录完整 SHA）。
- 同一 Agent 宿主（例如 Grok Bot 或指定 Cursor Agent），同一类会话入口。
- 每题每组重复 3 次；汇总时取中位数（token、耗时）或按题记录三次后再对正确率取均值。报告中写明采用哪一种。
- 跑批窗口内尽量排除其它 routine / 并行大任务对额度与调度的干扰。

## 考题（Dataset）

目标规模约 30 题（本轮已落地 30）。题库见 [`cases.md`](cases.md)，已从真实会话精选并导入自建 Langfuse。

### Dataset

| 项 | 值 |
|---|---|
| 名称 | `harness-memory-ablation/v1` |
| 实例 | https://langfuse.viruspc.tech |
| 条数 | 30（memory-dependent 12 / memory-irrelevant 10 / conflict-stale 8） |
| 关联 | VirusPC/edges-brain-viruspc PR #372 |

三类：

1. **memory-dependent**：答对依赖项目约定，主真源在 `.edges/memory` 或根 `AGENTS.md` / 相关 skill（Compose 沉淀入口、brain 改名与旧 PR 引用、云端盲测、CLI 对齐 npm latest、长期 AI 问题追踪、Langfuse tags 与 metadata 分工、evaluations 落点、worktree、禁止直推 main、`posts/` 禁改等）。
2. **memory-irrelevant**：真实会话里的产品/工程问答（多为 Langfuse 概念与上报方案），与 harness 约定无关，用来测是否帮倒忙。
3. **conflict-stale**：约定确实变过的场景（`VirusPC/edges`→`edges-brain-viruspc`、`knowledge/`→`notes/`、Compose 可写、沉淀入口改到 workspace、公开仓不互挂等）。B 侧若另注入冲突 memory，只进实验 worktree，跑完丢弃。

每题：`input={question}`，`expectedOutput={criteria, violations}`，`metadata` 含 `category`、`case_id`、`source_agent`、`source_date`、`original_text`、`source_files` 等；有源 observation 时填 `sourceObservationId`。

### 重建或加题

环境变量：`LANGFUSE_HOST`（或 `LANGFUSE_BASE_URL`）、`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`。

```bash
# 查看 / 创建 Dataset
npx --yes langfuse-cli api datasets get 'harness-memory-ablation/v1' --json
npx --yes langfuse-cli api datasets create --body-json '{"name":"harness-memory-ablation/v1","description":"..."}'

# 加题或按 id upsert（id 建议 harness-memory-ablation-M13）
npx --yes langfuse-cli api dataset-items create --body-file item.json

# 核对条数
npx --yes langfuse-cli api dataset-items list --dataset-name 'harness-memory-ablation/v1' --all --json
```

题面与判对要点变更时：先改 `cases.md`，再按同上 upsert Dataset item，并在本 README「历次报告」或新日期报告里记一笔。Observations 查询用 `/api/public/v2/observations`（带时间窗）；`/api/public/traces` 在本实例为 legacy，`/api/public/sessions` 不可用。

首轮 A/B smoke 已跑（见 [`2026-10-25.md`](2026-10-25.md)）；条件 C 与 Experiment UI 挂载仍见下文步骤。

## 指标

### 质量

- **正确率 / 任务完成率**：按题二值或有限档（建议 `correct` / `partial` / `incorrect`）；主报告用 correct 比例。
- **违反项目硬约束次数**：例如擅自改 `posts/`、未建 worktree 就改本仓、提交缺少约定 trailer、把敏感信息写入公开仓等。按次计数，A/B 分列。

### 成本

- 输入 token、输出 token；**重点看输入增量**（B 相对 A，按题中位数再对全集或按类汇总）。
- 若宿主区分 cache read / cache write，报告中分列，但主阈值仍看总输入（含或不含 cache 须在当次报告写死一种口径并沿用）。

### 耗时

- 端到端墙钟时间（从发出用户题到最终回复完成）。
- 另记：首 token 延迟（若可得）、工具调用次数（memory 可能减少弯路，也可能增加检索调用）。

### 判分

- 主判：MiniMax LLM-as-a-Judge，使用自建 Langfuse 已有 connection `minimax`，对照每题期望要点。
- 先人工标一小批（建议每类至少 3 题 × A/B 各 1 次输出）校准 judge prompt；用 Score Analytics 看与人工的一致性后再全量。
- Langfuse tag：`memory:on`（B）、`memory:off`（A）；可选 `memory:index-only`（C）。另加实验批次 tag，例如 `eval:harness-memory-ablation` 与 `run:YYYY-MM-DD`。
- 流程对齐：Dataset 固定考题 → Experiment 跑 A/B → Evaluator / 人工产生 Score。细节见笔记 [`notes/2026-10-25--langfuse-评估五件套对比与-observation-落地/`](../../notes/2026-10-25--langfuse-评估五件套对比与-observation-落地/)。

## 判定阈值（建议默认，用户可改）

同时满足以下四条，才将本轮结论记为「memory 值得默认开启（在本设定下）」：

1. 质量：memory-dependent 子集上，B 相对 A 正确率至少 **+10 个百分点**（按题聚合后）。
2. 输入 token：B 相对 A 的输入增量 **≤ 15%**（按题中位数再汇总的口径，当次报告写明）。
3. 耗时：B 相对 A 的端到端耗时增量 **≤ 10%**。
4. 不帮倒忙：memory-irrelevant 子集上，B 的质量**不低于** A（正确率不下降；硬约束违反次数不上升）。

conflict/stale 子集单独报告带偏率，不阻塞上述主判定，但若 B 在该类上明显更差，应在结论中写明风险与缓解（例如检索前校验、过期标记）。

阈值变更只改本 README「判定阈值」并在当次报告说明；不要静默改口径。

## 执行步骤

### 1. 准备 A/B worktree

```bash
# 在 edges-brain-viruspc 仓根，基于目标 commit（建议 origin/main tip）
git fetch origin
SHA=$(git rev-parse origin/main)

git worktree add .worktrees/eval-memory-B -b eval/memory-B "$SHA"
git worktree add .worktrees/eval-memory-A -b eval/memory-A "$SHA"

# 仅在 A worktree：删除 memory 正文，并去掉索引行
cd .worktrees/eval-memory-A
rm -rf .edges/memory
# 编辑 AGENTS.md / .edges/README.md：删除指向 .edges/memory 的索引行
# 不要改硬约束区块；不要 commit/push 这些实验用改动
```

记录：`SHA`、模型名、温度、Agent 版本、跑批开始的 Asia/Shanghai 时间。

### 2. 跑题

- 按 [`cases.md`](cases.md)（或扩题后的正式题库）逐题在 A、B 各跑 3 次。
- 每次会话打上 `memory:on` 或 `memory:off`，以及批次 tag。
- 导出或保留：最终回答、工具调用列表、token、耗时、是否触发硬约束违反。

### 3. 进入 Langfuse

1. 创建或更新 Dataset `harness-memory-ablation`，写入 item（input / expected_output / metadata）。
2. 用 Experiment 挂被测任务（或把已跑轨迹按 item 对齐后批量打分）。
3. 配置 MiniMax LLM-as-a-Judge（connection `minimax`），变量映射到输出与 expected；先小批量校准。
4. 人工 Annotation 一小批作金标准，核对 Kappa / 混淆矩阵后再全量。

### 4. 写报告

在本目录新增 `YYYY-MM-DD.md`（日期为跑批日，Asia/Shanghai），结构对齐前例 [`projects/routines/grokbot-langfuse-export/evaluations/frequency-usage/`](../../projects/routines/grokbot-langfuse-export/evaluations/frequency-usage/)：

- 摘要
- 背景
- 设计（条件、固定变量、题量、SHA、模型）
- 结果（质量 / token / 耗时表；不编造）
- 分析
- 局限
- 建议
- 附录（题号与原始分数指针）

然后更新本 README 的「当前结论」与「历次报告」。原始 CSV / 导出文件留本机或 box，不强制入库。

## 目录约定

| 路径 | 用途 |
|---|---|
| `evaluations/README.md` | 本仓级评估索引（非 routine 专属） |
| `evaluations/harness-memory-ablation/README.md` | 本实验方法与口径（本文件） |
| `evaluations/harness-memory-ablation/cases.md` | 真实题库（对齐 Dataset v1） |
| `evaluations/harness-memory-ablation/YYYY-MM-DD.md` | 单次实测报告 |

与 routine 前例的关系：方法结构（摘要、背景、设计、指标、步骤、判定、局限）对齐 `frequency-usage`；落点不同：本实验评估的是 harness memory 能力本身，故放在脑仓根 `evaluations/`，不挂某个 routine，也不进 `notes/`。

## 当前结论

**定位：无 harness 的内容级 smoke（2026-10-25），不是真实 harness 消融。** 本轮直接调 MiniMax API，把 `AGENTS.md` + memory 全文拼进 prompt 做单轮问答；没有 Agent 运行时，没有读文件/搜索/开 PR 等工具，也没有 harness 按 `AGENTS.md` 索引按需读 memory 的机制。报告：[`2026-10-25.md`](2026-10-25.md)（PR #373，仍 open，不合并）。

在该设定下：质量过门槛（memory-dependent A 33.3% → B 75.0%，+41.7pp；irrelevant 未帮倒忙；耗时中位 +3.9%），token 未过（prompt 中位 +246%，远超 ≤15%）。因此否决的是「每请求全文注入」这种注入方式，不是「在 harness 里用 memory」。本轮只能说明 **memory 内容本身有用**，不能回答「在 harness 里用 memory 划不划算」。C 组（仅索引/检索注入）仍是近似，不是真实 harness。改进空间见下节。

## 后续改进

按优先级排列；建议下一步顺序：**先用真实 harness 重跑 A/B**（高优先级），再视情况做 C 组近似与题库/判分加固。

### 1. 用真实 harness 重跑（高优先级）

本轮是无 harness 的内容级 smoke，结论不能外推到生产宿主。更对的做法：

- 在真实 harness（Cursor / Codex CLI、Claude Code、或 edges Agent）里用 A/B worktree 对照。
- 可复用框架仓 VirusPC/edges 已有的 [`packages/evaluation/retrieval_eval/`](https://github.com/VirusPC/edges/tree/main/packages/evaluation/retrieval_eval)：它已用 `codex exec`（也支持 `pi`）在干净 clone 上跑真实 Agent，落 events 与 token 用量并出报告，可选导出 Langfuse（参考报告 [`2026-10-18-224305-retrieval-smoke-edges__codex__retrieval-smoke_edges.md`](https://github.com/VirusPC/edges/blob/main/packages/evaluation/reports/2026-10-18-224305-retrieval-smoke-edges__codex__retrieval-smoke_edges.md)）。重跑时按它的 client / clone / report 结构，把 A/B 两组做成 memory 有无的两个 worktree 即可。注意它原本评的是检索（P@5 等），不是 memory 消融。
- 让 Agent 自己决定是否读 memory、读哪一条（走 `AGENTS.md` 索引与按需读文件），不要由实验脚本全文注入。
- token / 耗时取 harness 实际 tracing（可进 Langfuse），不要用「全文拼进 prompt」的 API 计量当真实成本。
- 题集加多步任务（例如真开 PR、改文件），测做事时守不守约定；单轮问答测不到这一点。
- 目标：回答「在 harness 里用 memory 划不划算」，而不是「memory 正文拼进上下文有没有用」。

### 2. 持续利用线上数据

真实 harness 跑起来后，日常会话本身就是最贴近生产的评测来源。按下面五个切入点把它接回评测：

- **从线上 trace 扩充题库**：每周从 Langfuse 里挑出出过错、被用户纠正或返工的会话，转成新题加进 Dataset `harness-memory-ablation`。新题标上 M/I/C 分类，Dataset 版本递增（v2、v3…）。
- **线上 A/B**：给会话打上 `memory:on` / `memory:off` 和 commit 的 tag，直接对比真实使用中的 token、耗时和返工率。按约定，可过滤的维度放 tags，其余放 metadata。
- **反向查 memory 命中**：从 trace 里看 Agent 实际读了哪些 memory 条目。长期没人用的条目考虑删掉；常被纠正却没写进 memory 的规则就补上。
- **用用户纠正当标签**：把「不对」「重做」这类回复当成负信号，打成线上 score。再抽样人工校准评审模型，避免只靠关键词误判。
- **定期回归**：Dataset 稳定后挂每周 routine 重跑，报告按日期存到 `evaluations/harness-memory-ablation/<YYYY-MM-DD>.md`。这样 memory 每次改动都能看到前后差异。

### 3. 压 token（近似路径，次优先）

- 跑条件 C：只放索引，正文按需读。注意：C 仍是 prompt 侧近似，**不是**真实 harness。
- 再试检索注入：只注入最相关的几条，而不是全文。
- 给 memory 瘦身：合并重复、删过时条目、压短表述。
- 目标：在保住 dependent 增益的前提下，把输入增量压进 ≤15% 门槛（或重新标定可接受区间并写进判定门槛）。

### 4. 结论更可信

- 每题每组 ≥3 次，报告均值与波动（勿再用单次 smoke 当定论）。
- judge 换与被测不同的模型，降低同模自评偏差。
- 人工先标约 15 题，做 judge 与人工的一致性校准后再全量。

### 5. 题目更有代表性

- 补 memory 未覆盖的真实题（从近期会话精选）。
- 补 Cursor / Codex 等编码 Agent 任务，不限聊天问答。
- 从单轮扩到多步（例如真开 PR，看是否违约定）。
- 题量扩到约 50 题后再做「可否默认开启」复核。

### 6. 多用 Langfuse

- A / B / C 各开一次 Experiment，并排对比，并挂基线。
- 用 Experiment 级评估器拿 `expectedOutput`（更正：线上 observation 评估器拿不到期望；Experiment 级可以）。
- 建 Annotation Queue，承接人工校准与抽检。
- memory 变更后自动回归（同一 Dataset + 固定评估器）。

## 历次报告

| 日期 | 报告 | 要点 |
|---|---|---|
| 2026-10-25 | [`2026-10-25.md`](2026-10-25.md) | 无 harness 内容级 smoke 30×2×1，MiniMax-M2.5；质量过、token 不过；只能说明内容有用，不能答 harness 划不划算 |

## 本轮明确不做（设计 PR 时）

设计落地阶段曾约定：不跑模型、不改生产 memory、不合并设计 PR。A/B smoke 已在独立 worktree 完成；仍禁止：改生产 memory、force-push、持久改根 `AGENTS.md`、合并无关 PR。

## 局限（设计层预告）

- 硬约束写在 `AGENTS.md` 时，A/B 都能读到，会压缩可测的 memory 增益；题库必须偏向 memory 正文独有约定。
- Agent 是否主动执行 `$edges-memory-ask` 受系统提示与技能加载影响，宿主差异会干扰对比；固定宿主并在报告中写明。
- LLM-as-a-Judge 与人工不一致时，以校准后的人工小批为准修订 judge，不直接改题期望滥拟合。
- 首轮 smoke 题量不足以定论；达标阈值后的「可默认开启」仍建议在 30-50 题全量上复核。
