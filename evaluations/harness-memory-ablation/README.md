# Harness Memory 消融评估

比较在控制模型、Agent、仓库版本的前提下，注入 `.harness/memory`（及 `AGENTS.md` / `.harness` 索引对其的发现路径）相对不注入，能否在回答质量上正向，同时输入 token 增量与端到端耗时增量落在可接受阈值内。

## 评估目的

回答用户问题：`.harness` 里的 memory 部分，是否在 token 消耗增多不大且耗时增加不大的前提下，对模型回答结果产生正向帮助。本目录只存方法、口径、题库草稿与按日期命名的实测报告；不假装已跑过数据。

## 假设

在同一模型、同一 Agent、同一仓库 commit 的前提下：

- 条件 B（完整 memory）相对条件 A（无 memory）在 memory-dependent 题上正确率更高；
- 条件 B 相对 A 的输入 token 增量与端到端耗时增量落在下文默认阈值内；
- 在 memory-irrelevant 题上，条件 B 的质量不低于条件 A（不帮倒忙）；
- conflict/stale 题用于观察 memory 是否把模型带偏，不计入「质量至少提升」的主判定，单独报告。

## 条件组

| 组 | 定义 | 本轮 |
|---|---|---|
| A | 无 memory。独立 worktree 基于同一 commit；去掉 `.harness/memory` 目录，并去掉 `AGENTS.md` 与 `.harness/README.md` 中指向 memory 的索引行；其余文件与硬约束保持不变 | 首轮必跑 |
| B | 完整 memory。与生产一致的现状检出（含 `.harness/memory` 与索引） | 首轮必跑 |
| C | 仅索引、不加载正文，或按需检索（例如只暴露类型 README，不预加载条目正文） | 可选第二阶段；首轮标为后续 |

准备 A 时注意：

1. 只改发现路径与 memory 正文是否存在，不改模型、系统提示、工具集、温度。
2. 根 `AGENTS.md` 硬约束区块（worktree、`Co-authored-by`、`posts/` 禁改等）在 A/B 中都保留。因此「仅靠硬约束即可答对」的题不能用来证明 memory 有增益；memory-dependent 题应优先选**主真源在 `.harness/memory` 正文**的约定。
3. A 的改动只存在于该实验 worktree，禁止 push 到生产分支，禁止改生产 memory。

## 固定变量

- 同一被测模型、温度、系统提示、工具集。
- 同一仓库 commit（brain 仓 tip；跑之前记录完整 SHA）。
- 同一 Agent 宿主（例如 Grok Bot 或指定 Cursor Agent），同一类会话入口。
- 每题每组重复 3 次；汇总时取中位数（token、耗时）或按题记录三次后再对正确率取均值。报告中写明采用哪一种。
- 跑批窗口内尽量排除其它 routine / 并行大任务对额度与调度的干扰。

## 考题（Dataset）

目标规模 30–50 题；首轮可用 10–15 题做 smoke。题库草稿见 [`cases.md`](cases.md)（待人工审，未宣称已跑）。

三类：

1. **memory-dependent**：答对依赖项目约定，且主真源在 `.harness/memory`（例如 Compose 沉淀入口、brain 仓改名与引用旧 PR 的方式、云端盲测写法、子仓合入后要 bump workspace 指针等）。
2. **memory-irrelevant**：普通问答或与本仓约定无关的编码题，用于测是否帮倒忙（质量是否下降、是否无谓多读 memory）。
3. **conflict/stale**：在 B 侧为该题临时写入过时或冲突的 memory 条目（或使用事先准备好的冲突片段），观察是否被带偏。冲突材料只进实验 worktree，跑完丢弃，不进 main。

每题须写：题干、类别、期望答案或判对要点、主真源路径（若适用）。导入 Langfuse 时，Dataset item 的 `input` 为题干，`expected_output` 为判对要点，`metadata` 含 `category`、`case_id`。

建议 Dataset 名：`harness-memory-ablation`（或带版本后缀，如 `harness-memory-ablation-v1`）。

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
rm -rf .harness/memory
# 编辑 AGENTS.md / .harness/README.md：删除指向 .harness/memory 的索引行
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
| `evaluations/harness-memory-ablation/cases.md` | 题库草稿，待人工审 |
| `evaluations/harness-memory-ablation/YYYY-MM-DD.md` | 单次实测报告 |

与 routine 前例的关系：方法结构（摘要、背景、设计、指标、步骤、判定、局限）对齐 `frequency-usage`；落点不同：本实验评估的是 harness memory 能力本身，故放在脑仓根 `evaluations/`，不挂某个 routine，也不进 `notes/`。

## 当前结论

**尚未跑数据。** 本轮只落地实验设计与题库草稿；不实际跑模型、不改生产 memory、不合并本 PR。

## 历次报告

| 日期 | 报告 | 要点 |
|---|---|---|
| （无） | | |

## 本轮明确不做

- 不实际调用被测模型跑 A/B
- 不修改生产 `.harness/memory`
- 不修改根 `AGENTS.md` 的生产内容（实验 A 的删索引仅在一次性 worktree 内）
- 不合并本设计 PR（由人审阅后决定）

## 局限（设计层预告）

- 硬约束写在 `AGENTS.md` 时，A/B 都能读到，会压缩可测的 memory 增益；题库必须偏向 memory 正文独有约定。
- Agent 是否主动执行 `$project-memory-ask` 受系统提示与技能加载影响，宿主差异会干扰对比；固定宿主并在报告中写明。
- LLM-as-a-Judge 与人工不一致时，以校准后的人工小批为准修订 judge，不直接改题期望滥拟合。
- 首轮 smoke 题量不足以定论；达标阈值后的「可默认开启」仍建议在 30–50 题全量上复核。
