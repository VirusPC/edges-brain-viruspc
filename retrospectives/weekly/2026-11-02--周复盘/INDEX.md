# 2026-11-02 周复盘

## 范围

2026-11-02 00:00 至 2026-11-08 23:59（Asia/Shanghai；UTC 对照窗 `2026-11-01T16:00:00Z`～`2026-11-08T15:59:59Z`）。仓库层只读 Compose 工作区根 [VirusPC/edges-workspace-viruspc](https://github.com/VirusPC/edges-workspace-viruspc)（根 `AGENTS.md`：三个顶层 git submodule 挂框架 / 公开脑 / 私密脑；`.edges/compose/` 登记区为空），并覆盖：

| 仓 | 窗内 merged PR | 窗内 created PR | main 窗内 commit | 备注 |
| --- | ---: | ---: | ---: | --- |
| [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)（公开脑） | 20 | 19 | 20 | Deploy 19 success / 1 cancelled / 0 failure；Pages site 7/0 |
| [VirusPC/edges](https://github.com/VirusPC/edges)（框架） | 28 | 29 | 72 | Frozen install 71/0；Publish 5 success / 1 failure / 1 cancelled。commit 数高于 PR 数，是因为部分 PR（尤其 [#94](https://github.com/VirusPC/edges/pull/94)）以 merge commit 纳入分支历史，不是 72 次独立功能交付 |
| [VirusPC/edges-brain-viruspc-private](https://github.com/VirusPC/edges-brain-viruspc-private)（私密脑） | 2 | 2 | 2 | **可读**；公开正文不写私人内容。窗内 0 次 Actions run |
| [VirusPC/edges-workspace-viruspc](https://github.com/VirusPC/edges-workspace-viruspc)（工作区根，可选） | 4 | 4 | 4 | submodule 指针与工作区规则；复盘正文不写进工作区根 |

计数规则：以精确 UTC 窗筛 `created_at` / `merged_at`（合入 PR 的 `closedAt` 与对应 squash/merge commit 时间一致，抽查 [#85](https://github.com/VirusPC/edges/pull/85) `merged_at=2026-11-01T16:52:34Z`、[#428](https://github.com/VirusPC/edges-brain-viruspc/pull/428) `merged_at=2026-11-02T15:15:04Z`）。公开脑 [#428](https://github.com/VirusPC/edges-brain-viruspc/pull/428) 在窗外创建、窗内合入，计入 merged、不计入 created。框架 [#106](https://github.com/VirusPC/edges/pull/106) 窗内创建后关闭且未合入，计入 created、不计入 merged。GitHub Issues 搜索（created / closed / updated，缓冲日 `2026-11-01..2026-11-09`）四仓均为 0；看板变化看 `.edges/tasks` 与 `.edges/projects/*/tasks`。

对照了：上期 [2026-10-26 周复盘](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-10-26--周复盘/INDEX.md)（同目录 **无** `COMMENTS.md`，API 404）；公开脑 `retrospectives/daily/`；公开脑 / 框架 Actions（Deploy、Pages site、Frozen install、Publish）；框架 tags / releases；上期行动相关任务卡（迁移后的递归 Project 路径）；公开脑 `.edges/memory/feedbacks/` 与框架同名反馈；公开脑项目记忆 `project_workspace_is_deposit_entry`；私密脑 main 树结构核验（对私密脑 main 树做只读结构核验：无 `.edges/tasks` 看板、INDEX 无 `type: Task`；不列私人路径主题）。当前 `retrospectives/weekly/` 仍只有 2026-10-05 / 10-12 / 10-19 / 10-26，**没有** `2026-11-02--周复盘` 文件夹。

**对话层**：主聊天导出的 SearchTranscripts 日期严格索引，精确 UTC 窗去重 **1269** 条（`search-window.jsonl`），覆盖窗内有命中的 **16** 个助手名（另有空转写 / 最新消息早于窗起点的助手不追旧页）。任务记录员 432 / Grok Bot 292 已分页到覆盖完整窗。ReadTranscript 原文只作上下文；时间戳沿 user 内 `<timestamp>` 继承。日复盘日历篇 11-02～11-08 七天齐全，每日 `daily-scan` 原始 jsonl 亦齐，只作旁证，**不**把日复盘转述当成用户原话。公开摘要不从简历等私密对话抽私人主题。

窗外（`> 2026-11-08T15:59:59Z`）已打开、不计入上表：公开脑 [#448](https://github.com/VirusPC/edges-brain-viruspc/pull/448)（draft）、[#449](https://github.com/VirusPC/edges-brain-viruspc/pull/449)；框架 [#114](https://github.com/VirusPC/edges/pull/114)（draft）。私密脑窗外另有打开的 PR，公开正文不写编号以外的信息。

## 本该怎样

这周事先没有单独写下的显式周目标（仓库内未找到「本周目标」类定稿；日复盘与看板卡是日常推进，不事后画靶）。

对照上期 [2026-10-26 周复盘](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-10-26--周复盘/INDEX.md)「下次做什么」。这些是**上期复盘建议**，不是用户书面承诺；本期按「上期建议验收」核对仓内是否落地。该目录无 `COMMENTS.md`，Search 窗内也**未见**用户叫停 / 改口这三条的原话：

1. **收口框架侧「拆仓」卡，并裁定复盘向 feedback 是否迁回公开脑。** 完成标准：框架 `2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去` 离开 `in_progress`（标 done 或卡内写明与公开脑 done / R6 的对应）；`feedback_retro_comments_in_separate_file` 在公开脑 `.edges/memory/feedbacks/` 可读，或公开脑 / 上期 `COMMENTS.md` 写明故意只留框架仓。
2. **公开脑 Deploy：把上期两例失败写成仓内结论，并二选一落地。** 完成标准：有 PR 改 workflow/依赖，**或**在公开脑 `COMMENTS` / 笔记 / ADR 级短文写明「故意保留 ECS SSH Deploy、接受偶发 502/超时」，并把上期两例 run（[40466959447](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/40466959447)、[41290110198](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/41290110198)）写进该说明。
3. **给仍写「grill 后补」的高优评测 / routines / 旁路卡补至少一句可验收完成标准；插件化卡书面对齐 ADR 0046。** 完成标准：框架 10-31 三张高优 evaluation backlog、公开脑 routines Project 分组卡、日复盘 Langfuse 旁路卡，每张 INDEX 有可勾选 / 可检验的完成标准一句以上；插件化 backlog 出现「登记模型以 [ADR 0046](https://github.com/VirusPC/edges/blob/main/docs/adr/0046-content-face-org-list.md) 为准」或「显式修订 ADR」的句子。

## 实际怎样

### 上期建议验收

1. **仓内仍未收口（上期建议验收：未完成）。** 框架拆仓卡仍在 [`in_progress`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-09--edges-extensions/tasks/in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去/INDEX.md)，front matter `edges-tasks-status: in_progress`，`edges-updated-at` 仍为 `2026-10-21T01:41:15.012Z`；完成标准后三项仍未勾。公开脑同名卡仍在 [`done`](https://github.com/VirusPC/edges-brain-viruspc/blob/main/.edges/projects/2026-10-20--edges-extensions/tasks/done/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去/INDEX.md) 且写「已全部完成，本卡关闭」——两侧状态仍不一致。路径因本周递归 Project 迁移而改变（框架随 [#94](https://github.com/VirusPC/edges/pull/94)，公开脑随 [#431](https://github.com/VirusPC/edges-brain-viruspc/pull/431)），但状态本身没有被收口。`feedback_retro_comments_in_separate_file` 仍只在框架；公开脑 `.edges/memory/feedbacks/` 由 [#437](https://github.com/VirusPC/edges-brain-viruspc/pull/437) 带出目录壳，README 仍写「暂无条目」。仓库内找不到「故意只留框架仓」说明；上期目录无 `COMMENTS.md`。对话层：Search 1269 条未见用户叫停本条。

2. **仓内结论仍缺（上期建议验收：未完成；本周 Deploy 变绿不能替代）。** 窗内公开脑 `deploy.yml` commits API 返回 `[]`。公开脑树找不到上述两个 run id 及「故意保留」短文。窗内 Deploy：**20** 次（success **19** / cancelled **1** / failure **0**）。唯一非 success 是 [run 42494950835](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/42494950835)（2026-11-08 23:28 Asia/Shanghai），与同分钟连续合入的日复盘 PR 重叠，结论为 cancelled。Pages site **7/0**。对话层：未见用户关掉本条或写下「故意保留」。

3. **卡面完成标准仍缺（上期建议验收：未完成）。** 五张点名卡仍缺可验收完成标准，插件化卡仍未点名 ADR 0046（正文检索无 `0046` / `ADR`）：
   - 框架三张 10-31 evaluation backlog：仍写「动作与完成标准 grill 后补」，时间戳仍 2026-10-31。
   - 公开脑 routines Project 分组卡：无完成标准段；随 [#431](https://github.com/VirusPC/edges-brain-viruspc/pull/431) 迁路径，状态未变。
   - 公开脑日复盘 Langfuse 旁路卡：末行仍「完成标准待 grill-with-docs 补」。
   - 框架 harness 模块插件化：仍「待 grill-with-docs」/「细节 grill 后补」。
   对话层：用户本周大量在用 grill（尤其 11-08 个人大脑接入），但 **Search 未见**「去给上述 backlog 补一句完成标准」或「插件化对齐 ADR 0046」的用户原话；也未见叫停本条。Agent Eval 侧用户说「我记得我有用 grill 和 plan 的习惯」（2026-11-08 15:41 Asia/Shanghai，pos 197）——谈的是评测异议归因，不是上期第 3 条卡面补标。

### 本周仓库主线（无事先周目标下的实际产出）

#### 递归 Project：材料分组模型落地，并发 0.5.0

- 框架 [#94](https://github.com/VirusPC/edges/pull/94)（2026-11-02 17:13 Asia/Shanghai 合入）+ [ADR 0052](https://github.com/VirusPC/edges/blob/main/docs/adr/0052-projects-as-recursive-material-groups.md)：Project 按主题聚合材料，`P/<module>` 直属组成；ADR 写明用户已确认设计并批准实现。
- 框架 [#95](https://github.com/VirusPC/edges/pull/95) 发 `@viruspc/edges@0.5.0`。
- 公开脑 [#431](https://github.com/VirusPC/edges-brain-viruspc/pull/431)（2026-11-02 19:28 Asia/Shanghai 合入）tasks-only 迁递归 Project，避免 `Legacy Task Project layout requires migration`。
- 框架 [#97](https://github.com/VirusPC/edges/pull/97)：无参 `edges init` 默认模块补上 `tasks`。

**对话依据（Grok Bot，Asia/Shanghai）：**
- 用户 19:02:55 pos 3350：「brain 本身就是一个.edges呀」；19:04:13 pos 3358：「整个brain 就是一个.edges。那么你要改的是什么？」；19:04:33 pos 3360：「如说它里面Tasks的结构对吗？」；19:05:17 pos 3363：「对呀。重新审视各个模块呀。」；19:08:28 pos 3366：「改一下改一下。」；19:09:07 pos 3371：「车忘了有两个脑仓。」；19:28:14 pos 3388：「合并吧」。
- 助手同段确认：公开脑仍是旧 Task Project 分组；私密脑检查后**没有** `.edges/tasks` / 根 `tasks` / 旧看板，`tasks list` 已 exit 0，**不必再迁**（pos 3382 / 3386）。这与本期私密脑 main 结构核验一致：`edges_tasks_board_present=false`，`has_type_Task_in_INDEX=false`。

#### 个人大脑跨客户端接入（ADR 0053）与 onboarding 连续打磨

- onboarding / 安装文档：[#99](https://github.com/VirusPC/edges/pull/99)、[#101](https://github.com/VirusPC/edges/pull/101)、[#102](https://github.com/VirusPC/edges/pull/102)；公开脑 [#437](https://github.com/VirusPC/edges-brain-viruspc/pull/437)、工作区 [#18](https://github.com/VirusPC/edges-workspace-viruspc/pull/18)。
- [#103](https://github.com/VirusPC/edges/pull/103) Publish failure → [#104](https://github.com/VirusPC/edges/pull/104) 约 19 分钟后修好测试并发 0.5.2。
- [#106](https://github.com/VirusPC/edges/pull/106) 用户关闭未合；[#107](https://github.com/VirusPC/edges/pull/107) 把 idea/待办写进「个人大脑」场景。
- [#108](https://github.com/VirusPC/edges/pull/108) 任务卡 → [#109](https://github.com/VirusPC/edges/pull/109)（2026-11-08 10:27 Asia/Shanghai）落地 [ADR 0053](https://github.com/VirusPC/edges/blob/main/docs/adr/0053-personal-brain-reused-across-agent-clients.md) 与 onboarding 0.7.0：主路径「接入已有大脑」，Compose 降为可选旁路。卡仍 in_progress；PR 自述各客户端链路未实测。
- [#111](https://github.com/VirusPC/edges/pull/111) Grok 共享长期记忆；[#112](https://github.com/VirusPC/edges/pull/112) 可选接入 Langfuse。

**对话依据：**
- 用户（任务记录员，2026-11-03 13:25 Asia/Shanghai pos 3140）：「记个任务，完善个人大脑场景的安装和使用方式。」→ 框架 [#98](https://github.com/VirusPC/edges/pull/98)。
- 用户（通用-辅助，2026-11-03 23:01:42 pos 760）：「有的时候我不是跟项目组说话，是把这个仓库当做一个edges目录，就比如说个人大脑，这种情况有讲吗？」；23:07:20 pos 777 补充朋友想搭个人大脑、引导不足 → [#100](https://github.com/VirusPC/edges/pull/100)。
- 用户（DIY Coding Agent，2026-11-04 15:43:16 pos 50）：「edges onboarding 应该默认把skill装项目内，而不是全局？」→ [#101](https://github.com/VirusPC/edges/pull/101)。
- 用户（任务记录员，2026-11-08 00:17:52 pos 3445）：「算了。我发现项目内的任务的话，完全可以被第一个场景cover住。个人的idea和待办，可以合并到个人大脑。」（对应关闭 [#106](https://github.com/VirusPC/edges/pull/106) 的方向）。
- 用户（任务记录员，2026-11-08 00:54:02 pos 3487）：「现在虽然能够方便创建个人大脑了，但是怎么样把个人大脑接入不同的Agent客户端作为workspace 仍然没有指南。」→ ADR 0053 grill 起点。
- 用户多轮 Confirm（任务记录员，01:11～10:18，pos 3502/3509/3571/3576/3581/3591）：客户端指南放 onboarding `references`、默认可写、首期 Cursor/Codex/Claude Code、默认继续接入当前客户端、「客户端工作区」命名、Git 同步一律验收、Grok 用长期记忆记路径等。Search 对部分 Confirm 表 **truncated=true**，细则以已合 ADR 0053 / [#109](https://github.com/VirusPC/edges/pull/109) 正文为准；若需逐字段核对可用 ReadTranscript `around` 上列 position。
- 用户（任务记录员，2026-11-08 09:41:16 pos 3553）：「grill结果不是应该放到adr么，怎么变superpowers了」。
- 用户（任务记录员，2026-11-08 10:53:08 pos 3623）：「然后，个人大脑的话，是不是应该顺手接入langfuse ？」→ [#112](https://github.com/VirusPC/edges/pull/112) 方向。
- 用户（任务记录员，2026-11-08 10:57/10:59）：「合并吧，然后发包。」「你继续自动审批。」→ [#113](https://github.com/VirusPC/edges/pull/113) / `0.5.6`。

#### npm 发版（框架）

窗内 git tag 可见 `@viruspc/edges@0.5.0` 至 `0.5.6`。GitHub Releases 页最近仍是更早的 [v1.7.0](https://github.com/VirusPC/edges/releases/tag/v1.7.0)。Publish 7 次：success 5 / failure 1（[#103](https://github.com/VirusPC/edges/pull/103)）/ cancelled 1（[#110](https://github.com/VirusPC/edges/pull/110)）。**不能**仅凭 Actions 证明 `0.5.1` 与 `0.5.5` 已发到 npm。Frozen install **71/0**。

#### README / 评测叙事与新开卡

窗起步框架连续合入 Personal Evaluation / README 澄清 [#85](https://github.com/VirusPC/edges/pull/85)–[#93](https://github.com/VirusPC/edges/pull/93)。**对话依据：** 用户（Grok Bot，2026-11-02 00:26:08 pos 3259）：「edges readme里面没有讲清一个重要的点，personal evaluation」；00:30:28 pos 3270：「那我这里就叫personal evaluation 可以吗」；00:34:26 pos 3283：「readme里也突出下这个点吧。」；00:35:01 pos 3287：「我让别人去改吧」。

#### 公开脑：上期周复盘入库、日复盘全覆盖、笔记与例程卡

- 上期周复盘 [#430](https://github.com/VirusPC/edges-brain-viruspc/pull/430)；窗外创建的 [#428](https://github.com/VirusPC/edges-brain-viruspc/pull/428) 本周合入。
- 日复盘 11-02～11-08 **七天都有日历篇**（#429/#432/#435/#438/#440/#442/#445）。
- 新 skill [#434](https://github.com/VirusPC/edges-brain-viruspc/pull/434)；例程/设备卡 [#433](https://github.com/VirusPC/edges-brain-viruspc/pull/433)、[#446](https://github.com/VirusPC/edges-brain-viruspc/pull/446)；学习笔记与 digest 若干（#436/#439/#441/#443/#444/#447）。
- 上期缺的 **2026-10-29 日复盘日历篇仍然缺失**。

#### 工作区根（只在范围里陈述）

窗内 4 个合入：[#17](https://github.com/VirusPC/edges-workspace-viruspc/pull/17)、[#18](https://github.com/VirusPC/edges-workspace-viruspc/pull/18)、一次私密脑指针更新、[#20](https://github.com/VirusPC/edges-workspace-viruspc/pull/20)（更新私密脑指针须用中性提交说明）。工作区根无 Actions run。

#### 私密脑（结构事项，不写私人正文）

窗内 2 merged / 2 main commit；**已读到**。公开正文不写主题或文件名。结构核验：当前 main **不是**旧 Task-as-Project / `.edges/tasks` 看板布局（无 `.edges/tasks`，INDEX 无 `type: Task`）。公开脑 [#431](https://github.com/VirusPC/edges-brain-viruspc/pull/431) 正文曾写「私密脑还需同等迁移」；同日对话与云端检查已澄清私密脑无旧看板可迁（Grok Bot pos 3382/3386）。**本期不授权、也不建议再开「私密脑 tasks 递归迁移」PR。**

#### 审阅

对框架窗内 PR #85–#113、公开脑 #428–#447、工作区 #17–#20 逐条请求 reviews，返回均为空数组；私密脑窗内两 PR reviews length 0。仓库层看不到正式 Approve / Changes requested。对话层有大量用户「合并吧 / merge / 发包」口头放行，不等于 GitHub review 对象。

### CI 数字汇总

| Workflow | 仓 | success | failure | cancelled | 其他 |
| --- | --- | ---: | ---: | ---: | --- |
| Deploy | 公开脑 | 19 | 0 | 1 | 合计 20 |
| Pages site | 公开脑 | 7 | 0 | 0 | 合计 7 |
| Deploy | 框架 | 0 | 0 | 0 | 仅手动触发，窗内无 run |
| Frozen install | 框架 | 71 | 0 | 0 | 合计 71 |
| Publish @viruspc/edges | 框架 | 5 | 1 | 1 | 合计 7 |

### 日复盘覆盖

| 日期 | 有无日历篇 | 依据 PR |
| --- | --- | --- |
| 11-02 | 有 | [#429](https://github.com/VirusPC/edges-brain-viruspc/pull/429) |
| 11-03 | 有 | [#432](https://github.com/VirusPC/edges-brain-viruspc/pull/432) |
| 11-04 | 有 | [#435](https://github.com/VirusPC/edges-brain-viruspc/pull/435) |
| 11-05 | 有 | [#438](https://github.com/VirusPC/edges-brain-viruspc/pull/438) |
| 11-06 | 有 | [#440](https://github.com/VirusPC/edges-brain-viruspc/pull/440) |
| 11-07 | 有 | [#442](https://github.com/VirusPC/edges-brain-viruspc/pull/442) |
| 11-08 | 有 | [#445](https://github.com/VirusPC/edges-brain-viruspc/pull/445) |

上期缺的 10-29 日历篇本周仍未补。

## 为什么

### 上期三条建议连续未闭环——仓内可证的是「没有对应收口提交」，不是用户否决

仓内事实：拆仓卡时间戳仍停在 2026-10-21、公开脑 feedbacks README「暂无条目」、`deploy.yml` 窗内 0 commits、五张点名卡「grill 后补」原文未变；窗内框架 28 / 公开脑 20 个合入里，未见以上收口标题。对话层 Search 未见用户叫停这三条。因此本期只记 **上期建议验收未完成**，不把「没做成」写成用户失信，也不编造「被别的主线挤掉」的吞吐因果。

### 材料分组改成递归 Project——要把各模块分组收成一种，并去掉 Tasks 自己的 Project 层

依据：[ADR 0052](https://github.com/VirusPC/edges/blob/main/docs/adr/0052-projects-as-recursive-material-groups.md) 与 [#94](https://github.com/VirusPC/edges/pull/94)/[#431](https://github.com/VirusPC/edges-brain-viruspc/pull/431)。对话上用户先纠正「整仓即 `.edges`」，再追问 Tasks 是否符合 0.5.0，并明确「改一下」（Grok Bot 19:02–19:08）。公开脑迁移的直接触发是 CLI 报 Legacy；私密脑同日核实无旧看板。

### 个人大脑主路径从「Compose 进项目」收成「跨客户端复用」——大脑首先服务各 Agent 客户端，不一定先有代码项目

依据：[ADR 0053](https://github.com/VirusPC/edges/blob/main/docs/adr/0053-personal-brain-reused-across-agent-clients.md) 写明 2026-11-08 grill 确定主路径；用户原话先点出「接入不同 Agent 客户端作为 workspace 仍然没有指南」（任务记录员 pos 3487），再多轮 Confirm，并要求 grill 结果进 ADR（pos 3553）。这是对 [ADR 0034](https://github.com/VirusPC/edges/blob/main/docs/adr/0034-compose-harness-repos-into-workspace.md) 使用场景的收窄，不是废止本地组合树。

### Deploy 本周变绿，并不等于上期建议 2 已完成

仓内：本窗 0 failure、`deploy.yml` 未改；上期两例 run 的结论文档仍找不到。cancelled 一次发生在 11-08 密集合入日复盘时，更像并发推 main，而不是环境故障复现。

### 发版门禁能挡住过时测试，但「先合 release PR、再修测试」会留下未发布的中间版本号

依据：[#103](https://github.com/VirusPC/edges/pull/103) Publish failure 日志中的旧标题切片；[#104](https://github.com/VirusPC/edges/pull/104) 约 19 分钟后按新流程重写测试。`0.5.1` publish skipped；后续 success 的 0.5.2+ 可证。

### 该保持的

- 框架 Frozen install 全绿（71/0）。
- 公开脑日复盘 7/7；11-06～11-08 偏晚合入，但没有再丢天。
- 公开脑 Pages site 7/0、Deploy 0 failure；双轨继续。
- 结构决策写成 ADR 并成对落地：0052↔#94+#431；0053↔#109+#111+#112；默认 skill 装进当前项目 #101+#437+#18。
- Publish 失败能按同一套测试说明快速修好（#104）。
- 工作区用规则管私密脑指针提交说明（#20）。
- 用户纠正「整仓即 scope / grill 进 ADR」能当场改助手计划——应保持这种可打断的协作。

## 下次做什么

1. **收口框架「拆仓」卡 + 裁定复盘向 feedback 是否迁回公开脑（上期建议 1 再结转）。** 完成标准：框架拆仓卡离开 `in_progress`（标 done 或写明与公开脑 done / R6 对应）；`feedback_retro_comments_in_separate_file` 在公开脑 feedbacks 成可读条目，或公开脑 / 本期 `COMMENTS.md` 写明故意只留框架仓。来源：上期建议；本周只移动了路径，卡面与反馈条目未变。Search 未见用户关掉。

2. **公开脑 Deploy：把上期两例失败写成仓内结论，并二选一落地（上期建议 2 再结转）。** 完成标准：有 PR 改 workflow/依赖，**或**书面「故意保留 ECS SSH Deploy、接受偶发 502/超时」，并写入上期两例 run 链接。本周 0 failure 不满足该标准。

3. **给仍写「grill 后补」的高优评测 / routines / 旁路卡补至少一句可验收完成标准；插件化卡书面对齐 ADR 0046（上期建议 3 再结转）。** 完成标准同「本该怎样」第 3 条。若决定「继续先占位、后 grill」，应在本期 `COMMENTS.md` 写明，避免每周重复验收空标准。另：ADR 0053 指南各客户端**实测**仍是 [#109](https://github.com/VirusPC/edges/pull/109) 自述缺口，是否升为下期必做由你定，不自动挤掉上列三条结转名额。

## 建议补充内容清单

### 框架拆仓卡仍 in_progress（与公开脑 done 不一致）

- **是什么：** 拆仓事实在公开脑卡上已勾完，框架卡完成标准后三项未勾。
- **建议去处：** 框架 `.edges/projects/2026-09-09--edges-extensions/tasks/in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去`。
- **为什么值得补：** 看板进度不一致；递归 Project 只改了路径。
- **不补代价：** 连续周复盘重复验收同一条。
- **处理结果：** 未处理（**延续**）。已列入下次做什么第 1 条。

### `feedback_retro_comments_in_separate_file` 仍只在框架仓

- **是什么：** 公开脑有 feedbacks 目录壳，README「暂无条目」。
- **建议去处：** 公开脑 `.edges/memory/feedbacks/`，或书面「故意只留框架」。
- **为什么值得补：** 周复盘默认读公开脑；目录在、条目不在更易误判。
- **不补代价：** COMMENTS 约定继续只在框架侧被读到。
- **处理结果：** 目录壳有了，条目仍缺（**延续**）。并入下次做什么第 1 条。

### 公开脑 Deploy 上期两例失败仍无仓内结论文档

- **是什么：** 502 / SSH 超时已有 Actions 日志，缺 PR / 说明。
- **建议去处：** workflow PR，或公开脑短笔记 / 本期 COMMENTS。
- **为什么值得补：** 上期建议 2 的完成标准要求「归因 + PR 或故意保留」。
- **不补代价：** 下次再红仍从零猜。
- **处理结果：** 本周无失败、workflow 未改；**仓内正式说明仍缺**（**延续**）。列入下次做什么第 2 条。

### 缺 2026-10-29 日复盘日历篇

- **是什么：** `retrospectives/daily/` 仍无该天；上期称对话由 10-30 加长窗覆盖。
- **建议去处：** 补日历篇，或 COMMENTS 写「不补、由 10-30 覆盖」。
- **为什么值得补：** 目录缺天会被反复追问。
- **不补代价：** 例程健康度统计持续噪音。
- **处理结果：** 本周仍未补（**延续**）。是否补写仍待你定。

### 10-31 高优评测卡 / routines / 旁路卡完成标准空白

- **是什么：** 仍写 grill 后补或无完成标准段。
- **建议去处：** 各卡 INDEX。
- **为什么值得补：** 高优却不可验收。
- **不补代价：** 周复盘第三次验收同一批空标准。
- **处理结果：** 未处理（**延续**）。并入下次做什么第 3 条。

### 插件化卡未书面对齐 ADR 0046

- **是什么：** 仍「待 grill」；未见「以 ADR 0046 为准」或「显式改 ADR」。本周又多了 ADR 0052。
- **建议去处：** 插件化卡前提 / 完成标准段。
- **为什么值得补：** 带着与叶子登记 / 递归 Project 冲突的前提继续 grill 会返工。
- **不补代价：** 模型再打架。
- **处理结果：** 未处理（**延续**）。并入下次做什么第 3 条。

### 私密脑 tasks 递归迁移（结构结论：不必做）

- **是什么：** 公开脑 #431 正文曾点名私密脑需同等迁移。
- **建议去处：** 无。结构核验 + 同日对话已确认私密脑无旧 Task Project / `.edges/tasks` 看板。
- **为什么值得记下：** 避免下期再把「未迁移」当成缺口。
- **不补代价：** 无（迁移本身不适用）。
- **处理结果：** **不做**。公开摘要只保留本结构结论，不写私人内容。private 仓仅授权敏感复盘落库时另议，**不**授权迁移。

### ADR 0053 已合入，跨客户端接入仍待实测

- **是什么：** [#109](https://github.com/VirusPC/edges/pull/109) / ADR 0053 已定主路径；PR 自述各客户端链路未实测，指南不得宣称已支持。
- **建议去处：** 框架 [`2026-11-08--个人大脑跨客户端与工作空间接入指南`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-09--agent-clients-ux/tasks/in_progress/2026-11-08--个人大脑跨客户端与工作空间接入指南/INDEX.md)。
- **为什么值得补：** 本周新决策若只停在文档层，指南与真实客户端行为会分叉。
- **不补代价：** onboarding 对外承诺超前。
- **处理结果：** 仓库层已有 ADR 与指南；**实测未完成**（PR 自述）。是否列入下一轮必做由你定。

### 上期清单中仍有效、本周未再推进（不新开下次做什么名额）

- npm-publish「代理可自审」是否收紧：本周未见专门 PR；Publish 失败来自测试而非审阅策略。
- `#174` 完成标准：框架 tree 搜索 `174` **0 命中**，仓库层找不到继续跟踪路径。
- stage-only token / ECS 旧目录：公开正文不展开凭据；未见本周清理 PR。
- open-grokbot 桌面壳卡：learning Project backlog 仍在，未见本周收口 PR。
