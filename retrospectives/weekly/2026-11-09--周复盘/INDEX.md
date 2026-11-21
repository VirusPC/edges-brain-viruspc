# 2026-11-09 周复盘

## 范围

2026-11-09 00:00 至 2026-11-15 23:59（Asia/Shanghai；UTC 对照窗 `2026-11-08T16:00:00Z`～`2026-11-15T15:59:59Z`）。仓库层只读 Compose 工作区根 [VirusPC/edges-workspace-viruspc](https://github.com/VirusPC/edges-workspace-viruspc)（根 `AGENTS.md`：三个顶层 git submodule 挂框架 / 公开脑 / 私密脑；`.edges/compose/` 登记区为空），并覆盖：

| 仓 | 窗内 merged PR | 窗内 created PR | main 窗内 commit | 备注 |
| --- | ---: | ---: | ---: | --- |
| [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)（公开脑） | 54 | 57 | 90（first-parent 54） | first-parent 与 54 个合入 PR 一一对应，无无 PR 直推 main。Deploy 54：成功 45 / 失败 3 / 取消 6；Pages site 100：成功 93 / 失败 7。另有仍 open 2、关闭未合入 1 |
| [VirusPC/edges](https://github.com/VirusPC/edges)（框架） | 15 | 17 | 15 | Frozen install 31/31 成功；Publish 3/3 成功（`@viruspc/edges@0.5.7`、`0.6.0`、`0.6.1`）。仍 open 2 |
| [VirusPC/edges-brain-viruspc-private](https://github.com/VirusPC/edges-brain-viruspc-private)（私密脑） | 7 | 9 | 7 | **可读**；公开正文不写私人内容。无 Actions workflow。仍 open 2。结构核验：已有 `.edges/tasks/`（backlog 1 张卡）；上期曾记为无该看板 |
| [VirusPC/edges-workspace-viruspc](https://github.com/VirusPC/edges-workspace-viruspc)（工作区根，可选） | 6 | 6 | 6 | 全部是 submodule 指针更新；复盘正文不写进工作区根 |

计数按北京时间自然周筛选 PR 创建、合入时间。公开脑 90 个窗内 commit 含 merge 带入的分支历史，不等同独立功能交付；以 first-parent 54 为准。四仓未查到时间窗内的 GitHub Issue 活动，任务进度以仓内看板为准。

对照了：上期 [2026-11-02 周复盘](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-11-02--周复盘/INDEX.md)（同目录 **无** `COMMENTS.md`，API 404）；公开脑 `retrospectives/daily/`；公开脑 / 框架 Actions（Deploy、Pages site、Frozen install、Publish）；框架 tags / releases（本周无新的 GitHub Release，最高 ADR 仍是 0053）；上期行动相关任务卡与 feedbacks；私密脑只读结构核验。采集时 main：公开脑 [`43de9fad`](https://github.com/VirusPC/edges-brain-viruspc/commit/43de9fad89d1c19ec17694249217e3d8ca2bf2b9)（2026-11-15 22:24:29 Asia/Shanghai）、框架 [`453e0d38`](https://github.com/VirusPC/edges/commit/453e0d380938ba9620ff9bbd649bd09a51bd378f)（2026-11-15 22:45:49 Asia/Shanghai）、工作区根 [`07d91c4b`](https://github.com/VirusPC/edges-workspace-viruspc/commit/07d91c4beb0834eaaf2c263b212f747e27ab6430)（2026-11-14 22:30:45 Asia/Shanghai）。`retrospectives/weekly/` 尚无 `2026-11-09--周复盘`。

本次例程按公开脑 main [`.edges/routines/weekly-retrospective/INDEX.md`](https://github.com/VirusPC/edges-brain-viruspc/blob/43de9fad89d1c19ec17694249217e3d8ca2bf2b9/.edges/routines/weekly-retrospective/INDEX.md) 及其引用的同 commit [SKILL.md](https://github.com/VirusPC/edges-brain-viruspc/blob/43de9fad89d1c19ec17694249217e3d8ca2bf2b9/.edges/routines/weekly-retrospective/SKILL.md) 执行（ref：默认分支 `main` @ `43de9fad`）。

**对话层**：逐个核对 72 个助手，并按同一时间窗筛选，得到 2098 条对话消息，来自 17 个有窗内消息的助手；其中用户消息 598 条。数量最多的是 Grok Bot（1196 条，用户 323 条），其次是 Agent Eval 专家、DIY Coding Agent、全栈开发专家、AI CR 专家。关键决策另核对完整上下文。日复盘 11-09～11-15 七天齐全，仅作仓库旁证，不把其中的转述当成用户原话。公开正文不收录私人主题。对话中确认至少 1 条敏感调研已在私密脑开 PR（[#13](https://github.com/VirusPC/edges-brain-viruspc-private/pull/13)）；其余私密合入不在公开正文展开。

按 2026-11-16 反馈，本期在「实际怎样」单独盘点六类沉淀，另增「展望」一节，并从会话与仓库中挖出该沉淀却尚未写成模块的候选，列入建议补充清单。**本次未读到 Langfuse trace**，新模块候选的依据只来自会话与仓库，不猜测 trace 里的内容。

## 本该怎样

这周事先没有单独写下的显式周目标（仓库内未找到「本周目标」类定稿；日复盘与看板卡是日常推进，不事后画靶）。

对照上期 [2026-11-02 周复盘](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-11-02--周复盘/INDEX.md)「下次做什么」。这些是**上期复盘建议**，已连续结转至少两期，不是用户书面承诺；本期按「上期建议验收」核对仓内是否落地。该目录无 `COMMENTS.md`。窗内对话中也**未见**用户叫停或改口这三条的原话。

1. **收口框架侧「拆仓」卡，并裁定复盘向 feedback 是否迁回公开脑（上期建议 1 再结转）。** 完成标准：框架 `2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去` 离开 `in_progress`（标 done 或卡内写明与公开脑 done / R6 的对应）；`feedback_retro_comments_in_separate_file` 在公开脑 `.edges/memory/feedbacks/` 成可读条目，或公开脑 / 上期 `COMMENTS.md` 写明故意只留框架仓。
2. **公开脑 Deploy：把上期两例失败写成仓内结论，并二选一落地（上期建议 2 再结转）。** 完成标准：有 PR 改 workflow/依赖，**或**在公开脑 `COMMENTS` / 笔记 / ADR 级短文写明「故意保留 ECS SSH Deploy、接受偶发 502/超时」，并把上期两例 run（[40466959447](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/40466959447)、[41290110198](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/41290110198)）写进该说明。
3. **给仍写「grill 后补」的高优评测 / routines / 旁路卡补至少一句可验收完成标准；插件化卡书面对齐 ADR 0046（上期建议 3 再结转）。** 完成标准：框架 10-31 三张高优 evaluation backlog、公开脑 routines Project 分组卡、日复盘 Langfuse 旁路卡，每张 INDEX 有可勾选 / 可检验的完成标准一句以上；插件化 backlog 出现「登记模型以 [ADR 0046](https://github.com/VirusPC/edges/blob/main/docs/adr/0046-content-face-org-list.md) 为准」或「显式修订 ADR」的句子。

## 实际怎样

### 上期建议验收

1. **仓内仍未收口（上期建议验收：未完成）。** 框架拆仓卡仍在 [`in_progress`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-09--edges-extensions/tasks/in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去/INDEX.md)，front matter `edges-tasks-status: in_progress`，`edges-updated-at` 仍为 `2026-10-21T01:41:15.012Z`。公开脑同名卡仍在 [`done`](https://github.com/VirusPC/edges-brain-viruspc/blob/main/.edges/projects/2026-10-20--edges-extensions/tasks/done/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去/INDEX.md)，`edges-updated-at` 仍为 `2026-10-21T02:10:00.000Z`——两侧状态仍不一致，路径也未再搬家。`feedback_retro_comments_in_separate_file` 仍只在框架仓。公开脑 `.edges/memory/feedbacks/` 本周不再是空壳：日复盘 [#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460)、[#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465)、[#472](https://github.com/VirusPC/edges-brain-viruspc/pull/472) 写入 3 条可读条目（`feedback_write_core_principles_specific_first`、`feedback_rerun_means_full_rerun_with_current_skill`、`feedback_user_decisions_are_hard_requirements_not_options`），[README](https://github.com/VirusPC/edges-brain-viruspc/blob/main/.edges/memory/feedbacks/README.md) 已索引它们，但都不是上期点名的那一条。仓库内找不到「故意只留框架仓」的书面裁定。对话层：窗内未见用户叫停本条，也未见安排收口拆仓卡或迁回点名 feedback 的原话。

2. **仓内结论仍缺；本周 Deploy 再次失败，更不能用「变绿」替代（上期建议验收：未完成）。** 窗内对 `.github/workflows/deploy.yml` 的 commits 为 `[]`，[当前 workflow](https://github.com/VirusPC/edges-brain-viruspc/blob/main/.github/workflows/deploy.yml) 仍是 ECS SSH 拉取个人 checkout，经 `ghproxy.net` 做 `git fetch`。上期两个 run id 与「故意保留」短文仍未写入仓内。本周 Deploy **54** 次：成功 **45** / 失败 **3** / 取消 **6**。3 次失败都倒在「Pull personal checkout on ECS」——SSH 连通后，ECS 经 ghproxy 拉 main 失败：
   - [43022310294](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/43022310294)（2026-11-11 20:40:03 Asia/Shanghai，随 [#461](https://github.com/VirusPC/edges-brain-viruspc/pull/461)）：ghproxy **502**
   - [43033824548](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/43033824548)（2026-11-11 21:57:15 Asia/Shanghai，随 [#462](https://github.com/VirusPC/edges-brain-viruspc/pull/462)）：同样 **502**
   - [43604430722](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/43604430722)（2026-11-14 22:21:22 Asia/Shanghai，随 [#487](https://github.com/VirusPC/edges-brain-viruspc/pull/487)）：ghproxy **500**
   6 次取消集中在连续合入时段（2026-11-10 20:49 与 2026-11-14 22:21 附近）；抽查 run 的 jobs 列表为空，workflow 写的是 `cancel-in-progress: false`，此处不把原因写成已证实的并发取消。对话层：窗内未见用户关掉本条，也未见写下「故意保留」或要求改 Deploy workflow 的原话。

3. **卡面完成标准仍缺（上期建议验收：未完成）。** 六张点名卡仍在原路径，front matter 时间戳与上期一致，均未补上可勾选 / 可检验的完成标准；插件化卡仍未出现「以 ADR 0046 为准」或「显式修订 ADR」：
   - 框架 [`Memory-AB-分流量开关与-Langfuse-标签评测`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-11--evaluation/tasks/backlog/2026-10-31--Memory-AB-分流量开关与-Langfuse-标签评测/INDEX.md)：`edges-updated-at` 仍 `2026-10-31T07:27:55.464Z`，仍写「动作与完成标准 grill 后补」。
   - 框架 [`Memory-消融实验正式报告`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-11--evaluation/tasks/backlog/2026-10-31--Memory-消融实验正式报告/INDEX.md)：同样「grill 后补」，时间戳仍 2026-10-31。
   - 框架 [`目录结构消融实验程序与报告`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-11--evaluation/tasks/backlog/2026-10-31--目录结构消融实验程序与报告/INDEX.md)：同样「grill 后补」。
   - 公开脑 [`routines-目录下增加-Project-分组层`](https://github.com/VirusPC/edges-brain-viruspc/blob/main/.edges/tasks/backlog/2026-10-23--routines-目录下增加-Project-分组层/INDEX.md)：无完成标准段；`edges-updated-at` 仍 `2026-10-23T09:44:22.692Z`。
   - 公开脑 [`日复盘旁路接入-Langfuse…`](https://github.com/VirusPC/edges-brain-viruspc/blob/main/.edges/tasks/backlog/2026-10-25--日复盘旁路接入-LangfuseCodexCursorGrok-主源仍用-ReadTranscript/INDEX.md)：末行仍是「完成标准待 grill-with-docs 补。」
   - 框架 [`harness-模块插件化`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-09--edges-extensions/tasks/backlog/2026-10-21--harness-模块插件化/INDEX.md)：仍写「完成标准与动作细节待 grill-with-docs」「细节 grill 后补」；未见「以 ADR 0046 为准」。
   附带事实（不改变「没做成」）：框架 [#118](https://github.com/VirusPC/edges/pull/118) 改过 ADR 0046 文本（`--super` 材料面修复，+1 / -1），但插件化卡本身未被更新。对话层：用户本周确有 grill（全栈开发专家 11-10「`/grill-with-docs`」；Grok Bot 11-11 / 11-12「开始grill」），但谈的是 `--super` 语义和 AI 资讯改版，**未见**「去给上述 backlog 补一句完成标准」或「插件化对齐 ADR 0046」的原话，也未见叫停本条。


### 本周沉淀：Memory / Skill / Task / Routine / Note / Project

按 2026-11-16 对话反馈，把这六类从发版和开卡叙述里抽出来单独盘点。后面各主线仍保留原话与发版过程；同一条目若已在本节归类，后文不再重复展开。

**Memory（硬约束、feedback、可复用结论）**

已落仓：
- 写入前必须先有独立 worktree：用户（Grok Bot，2026-11-14 19:15，北京时间）要求「加一个笔记，以及记忆」，公开脑记入 [#493](https://github.com/VirusPC/edges-brain-viruspc/pull/493)；随后收成框架 init 模板，只在新建 Git 根 `AGENTS.md` 时写入，已有文件不回填（[#127](https://github.com/VirusPC/edges/pull/127)、[#128](https://github.com/VirusPC/edges/pull/128) / `0.6.1`）。
- 个人大脑优先加 `--super`：用户（DIY Coding Agent，2026-11-09 16:58–17:05，北京时间）把约定收成 `AGENTS.md` 里一句硬约束；框架侧解析修复随 `0.5.7` 发出（[#118](https://github.com/VirusPC/edges/pull/118)、[#119](https://github.com/VirusPC/edges/pull/119)）。
- 公开脑 `.edges/memory/feedbacks/` 本周写入 3 条可读条目（[#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460)、[#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465)、[#472](https://github.com/VirusPC/edges-brain-viruspc/pull/472)）：`feedback_write_core_principles_specific_first`、`feedback_rerun_means_full_rerun_with_current_skill`、`feedback_user_decisions_are_hard_requirements_not_options`。
- 日复盘记 Task 的判定改成「重要且后续可能用到」，不要求用户口头说「记个 Task」（[#495](https://github.com/VirusPC/edges-brain-viruspc/pull/495)）。
- 框架记下分层记忆适用边界，并开了沉淀成本评估卡（[#121](https://github.com/VirusPC/edges/pull/121)）。
- Harbor 相关可复用结论：`.edges/memory/projects/project_harbor_agents_list_switches_components`（随 [#472](https://github.com/VirusPC/edges-brain-viruspc/pull/472) 合入）。

未收口：上期点名的 `feedback_retro_comments_in_separate_file` 仍只在框架仓；拆仓卡状态仍不一致，见上期建议验收第 1 条。

**Skill**

已落仓：
- 笔记 / 任务技能按 CLI 动作改名为 `edges-create-notes` / `edges-create-tasks`，旧名删掉，随 `0.6.0` 发布（框架 [#125](https://github.com/VirusPC/edges/pull/125)、[#126](https://github.com/VirusPC/edges/pull/126)）。公开脑 [#492](https://github.com/VirusPC/edges-brain-viruspc/pull/492)（`create-learning-notes`）关闭未合入，是改道不是放弃，依据见下文对话。
- `--super` 相关 onboarding skill 文本随 [#118](https://github.com/VirusPC/edges/pull/118) 更新。worktree 硬约束按用户（Grok Bot，2026-11-14 21:12–21:16，北京时间）「memory-init 是不是就不用在写了？」「skill里是不是不用写了」，只留在 init 模板，不在 memory-init / skill 里再写一遍。
- AI 资讯例程的 skill 本周被反复拿来测试和改版（改名、重跑、换干净 agent），详见下文「AI 资讯」主线。

未收口：用户本周明确要求补上的 `edges-create-edges` skill，卡已有、正文未写，见建议补充清单。独立仓 `AGENTS.md` 写入 `edges-harness` 标记的框架 [#120](https://github.com/VirusPC/edges/pull/120) 仍 open；公开脑已有相关原则重构 backlog 卡（随 [#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460)）。用户（全栈开发专家，2026-11-10 23:57，北京时间）提出 skills「最核心的是讲一些最基础的做什么的原则」，部分已进 feedbacks，原则重构本身未完成。

**Task**

本周以「新开卡」为主，未观察到这些新卡从 backlog 推到 done。

公开脑新卡（多数在仓库根 `projects/` 或 `tasks/`，少数在 `.edges/tasks/backlog`）包括：AI News 上站与改版相关（[#461](https://github.com/VirusPC/edges-brain-viruspc/pull/461)、[#464](https://github.com/VirusPC/edges-brain-viruspc/pull/464)、[#467](https://github.com/VirusPC/edges-brain-viruspc/pull/467)、[#476](https://github.com/VirusPC/edges-brain-viruspc/pull/476)、[#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482)、[#483](https://github.com/VirusPC/edges-brain-viruspc/pull/483)）、个人 Dashboard 框架及调研（[#484](https://github.com/VirusPC/edges-brain-viruspc/pull/484)、[#485](https://github.com/VirusPC/edges-brain-viruspc/pull/485)）、学习异步 Agent（[#486](https://github.com/VirusPC/edges-brain-viruspc/pull/486)）、big_model_radar（[#489](https://github.com/VirusPC/edges-brain-viruspc/pull/489)）、改造认知目录 `edges/`（[#497](https://github.com/VirusPC/edges-brain-viruspc/pull/497)）、dream 机制（[#499](https://github.com/VirusPC/edges-brain-viruspc/pull/499)）、个人大脑独立 tasks 看板页（[#501](https://github.com/VirusPC/edges-brain-viruspc/pull/501)）、新条目格式「一句话 + 解释 + 参考资料」（[#503](https://github.com/VirusPC/edges-brain-viruspc/pull/503)）。采集时仍 open：[#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504)（`edges/` 定位为全仓信噪比最高处）、人审中的 [#498](https://github.com/VirusPC/edges-brain-viruspc/pull/498)。公开脑 `.edges/tasks/` 采集时 backlog 16、in_progress 1、done 1（done 卡日期在窗前）。

框架新卡：官方 OCI 镜像（[#124](https://github.com/VirusPC/edges/pull/124)）、`.edges` 下支持自定义材料类别（[#130](https://github.com/VirusPC/edges/pull/130)，高优）、分层记忆沉淀成本（[#121](https://github.com/VirusPC/edges/pull/121)）。上期点名的六张「grill 后补」卡仍无完成标准，见上期建议验收第 3 条。

私密脑本周出现 `.edges/tasks/`（backlog 1 张卡），公开正文只记结构。

**Routine**

已落仓：根目录 routines 子作用域骨架（[#500](https://github.com/VirusPC/edges-brain-viruspc/pull/500)）。依据：用户（日复盘，2026-11-15 17:16–17:17，北京时间）要求「routines下建立一个.edges」「根目录 /routines」。上期周复盘 [#450](https://github.com/VirusPC/edges-brain-viruspc/pull/450) 与本周日复盘 7/7 均已合入。

已记卡、未做成：用户（日复盘，2026-11-15 17:18，北京时间）要求「增加复盘的复盘。确保复盘不腐烂。」卡已有，例程正文未写，见建议补充清单。同日还提出「routines里允许包含skill」（任务记录员，16:09），这是结构想法，当场未拍板，未见单独写成的约定正文。

**Note**

已落仓：OpenViking 记忆机制分析（[#457](https://github.com/VirusPC/edges-brain-viruspc/pull/457)）；learning Project 下的 DSH SDK 与 ACP 调研笔记（[#453](https://github.com/VirusPC/edges-brain-viruspc/pull/453)、[#454](https://github.com/VirusPC/edges-brain-viruspc/pull/454)），以及后续 DSH 源码课程与 Coding Agent 调研（[#488](https://github.com/VirusPC/edges-brain-viruspc/pull/488)）；benchmark 论证与评审笔记（[#451](https://github.com/VirusPC/edges-brain-viruspc/pull/451)）；桌面评测与 Work 调用 Finder（[#490](https://github.com/VirusPC/edges-brain-viruspc/pull/490)、[#491](https://github.com/VirusPC/edges-brain-viruspc/pull/491)）；agent-infra 登记时附带两篇对话笔记（[#502](https://github.com/VirusPC/edges-brain-viruspc/pull/502)，MCP / CLI 与 Code Mode）；另有 Anthropic Agent memory 四层与做梦、Codex 子 agent 与 Claude Agent Teams 笔记（随 [#472](https://github.com/VirusPC/edges-brain-viruspc/pull/472)），以及 CodeRabbit 代码审查规则机制笔记（随 [#496](https://github.com/VirusPC/edges-brain-viruspc/pull/496)）；worktree 核验笔记（[#493](https://github.com/VirusPC/edges-brain-viruspc/pull/493)，与 Memory 同条）。周报缺项改记 notes 是 AI 资讯流程改动（[#468](https://github.com/VirusPC/edges-brain-viruspc/pull/468)）。另有至少 1 条敏感调研已在私密脑开 PR（[#13](https://github.com/VirusPC/edges-brain-viruspc-private/pull/13)），公开正文不写主题。

**Project**

已落仓：Teaching 课与笔记归入同名 Project（[#452](https://github.com/VirusPC/edges-brain-viruspc/pull/452)、[#455](https://github.com/VirusPC/edges-brain-viruspc/pull/455) 等）；IT 资产管理公开索引（[#459](https://github.com/VirusPC/edges-brain-viruspc/pull/459)）；AI 研发流程优化（[#494](https://github.com/VirusPC/edges-brain-viruspc/pull/494)）；agent-infra 登记为正式 Project（[#502](https://github.com/VirusPC/edges-brain-viruspc/pull/502)）。个人大脑 Project 应建在根目录 `projects/`，由 `--super` 约定与 [#118](https://github.com/VirusPC/edges/pull/118) 的解析修复支撑。

说明：[#484](https://github.com/VirusPC/edges-brain-viruspc/pull/484)、[#485](https://github.com/VirusPC/edges-brain-viruspc/pull/485) 记的是「建设个人 Dashboard 框架」任务卡，采集时未看到把它登记为正式 Project 的合入，故放在 Task，不记入本类。

### 本周仓库主线（无事先周目标下的实际产出）

#### 框架发版：`@viruspc/edges` 0.5.7 / 0.6.0 / 0.6.1，Publish 三次全绿

本周没有新的 GitHub Release（最新仍是 2026-10-26 的 [v1.7.0](https://github.com/VirusPC/edges/releases/tag/v1.7.0)）。三个 annotated tag 均在窗内，对应 Publish 三次成功：

- `0.5.7`（2026-11-09 18:11:15 Asia/Shanghai）经 [#119](https://github.com/VirusPC/edges/pull/119)，先收了 [#118](https://github.com/VirusPC/edges/pull/118)：`fix: --super 下 --project 解析到 scope/projects`，并改了 ADR 0031 / 0046 / 0052 与 onboarding skill 文本。
- `0.6.0`（2026-11-14 17:58:48 Asia/Shanghai）经 [#126](https://github.com/VirusPC/edges/pull/126)，先有 [#125](https://github.com/VirusPC/edges/pull/125)「按 CLI 动作拆分笔记与任务技能」。
- `0.6.1`（2026-11-14 21:49:18 Asia/Shanghai）经 [#128](https://github.com/VirusPC/edges/pull/128)，把 [#127](https://github.com/VirusPC/edges/pull/127) 收进补丁。合入说明原文：「edges init 只在新建 Git 根 AGENTS.md 时写入 checkout 隔离硬约束，已有文件不回填。」

Frozen install 窗内 **31/31** 成功。框架 Deploy、公开脑 Bugbot 窗内 0 次 run。

**对话依据（`--super` 与 0.5.7，DIY Coding Agent / 全栈开发专家，2026-11-09，北京时间）：**
- 用户先指出个人大脑 Project 不应建到 `.edges/projects/`：「同名project不应该创建到 根目录/projects么」（16:56），并明确「我觉得个人大脑，应该优先考虑加 super」（16:58）。写进 `AGENTS.md` 时又收成一句：「这是独立 edges harness 仓库，调用 edges cli 时优先考虑加 --super 参数」（17:05）。
- 随后要求框架侧修齐：「edges cli 找其他人修复下，--super 应该所有模块都支持呀」（17:06）；「onboarding&init 时，AGENTS.md也应该补充对应的句子」（17:07）；并以标志为准：「难道不应该根据有没有--super标志来判断？」（17:36），「都要」（17:37，把 memory / compose 也纳入），「其实我的Workspace仓库本身就是一个加了Super之后执行Compose的结果」（17:40）。
- 全栈开发专家侧，用户在确认架构一致性后说「合并吧。发个新的patch版本npm包」（18:05），对应 [#118](https://github.com/VirusPC/edges/pull/118) / [#119](https://github.com/VirusPC/edges/pull/119) / `0.5.7`。当晚继续追问 onboarding 如何区分 `--super`，并提出 `<edges-harness mode="super" />` 标记（19:09–19:13）；相关原则卡与框架 [#120](https://github.com/VirusPC/edges/pull/120) 采集时仍 open。

**对话依据（笔记 / 任务技能改名与 0.6.0，Grok Bot，2026-11-14，北京时间）：**
- 用户 17:28 先要求补学习阅读 skill `create-learning-notes`（Summary 与 Comments 分开），公开脑因此开了 [#492](https://github.com/VirusPC/edges-brain-viruspc/pull/492)。17:32 追问「直接放到edges框架里合适么」，17:33「补充进去吧」。
- 17:37 进一步收成按 CLI 动作命名：「我在想conversion to notes、conversation to tasks 是不是改名 create-notes 和 create-tasks 比较好？里面做下意图识别，分流conversation & learning 等场景。」17:38「好像和cli也比较一致」，随后明确「改」。17:41 又要求旧 skill「我想九点直接删掉吧」「旧的」，不要留过渡名。
- 助手据此关掉 [#492]（17:45 关闭未合入），改由框架 [#125](https://github.com/VirusPC/edges/pull/125) 落地 `edges-create-notes` / `edges-create-tasks`。用户 17:48「合并发布吧，自动发布」，后来说「你自己通过」（18:09），对应 `0.6.0`。

**对话依据（worktree 硬约束与 0.6.1，Grok Bot，2026-11-14，北京时间）：**
- 用户 19:14：「体现出了一个问题，很多工作区没有严格创建WorkTree，而是直接在当前目录上进行了改动。」19:15：「我觉得这个需要加一个笔记，以及记忆。」落成公开脑 [#493](https://github.com/VirusPC/edges-brain-viruspc/pull/493)。
- 19:32：「edges初始化的时候，Agentdmd里面是不是应该写一下？」19:49：「是的，直接在上个pr写完不就好了。」因模板在框架仓，改走 [#127](https://github.com/VirusPC/edges/pull/127)。21:01 用户选择「第1种」：只在新建 Git 根 `AGENTS.md` 时写入，已有文件不回填；21:12–21:16 又要求「memory-init 是不是就不用在写了？」「skill里是不是不用写了」，「改」。这条以模板为唯一来源的决定写进 [#127](https://github.com/VirusPC/edges/pull/127)，随 [#128](https://github.com/VirusPC/edges/pull/128) 发 `0.6.1`。

#### Harbor 评测材料收口，记忆边界落成卡，但不是上期三条点名卡的完成

框架 [#114](https://github.com/VirusPC/edges/pull/114) 归档 Harbor 实验并完成自然请求 v2 测试；[#115](https://github.com/VirusPC/edges/pull/115) 在 README 展示收益与适用边界；[#116](https://github.com/VirusPC/edges/pull/116) 分析 v2 未满召回的检索与选择轨迹；[#117](https://github.com/VirusPC/edges/pull/117) 把冻结数据集发到 Langfuse。[#121](https://github.com/VirusPC/edges/pull/121) 记录分层记忆适用边界并开沉淀成本评估卡。公开脑 [#448](https://github.com/VirusPC/edges-brain-viruspc/pull/448) 将完整 Edges 消融实验入口归入框架；[#451](https://github.com/VirusPC/edges-brain-viruspc/pull/451) 增加 benchmark 论证与评审笔记。这些是评测材料迁移与实验收口，**不是**上期第 3 条点名卡的完成标准补写。

**对话依据：** 用户（日复盘，2026-11-12 01:02，北京时间）追问「116和117可以合并吗」「当时为啥停了没合并」，随后「合并吧」。Agent Eval 专家窗内也在讨论 Harbor 的 rubric / grader 与 Langfuse evaluator，但没有转到上期那六张「grill 后补」卡上。

#### 公开脑主线：AI 资讯周报上 Astro 站，并连续改版

先开卡并上线（[#461](https://github.com/VirusPC/edges-brain-viruspc/pull/461)、[#462](https://github.com/VirusPC/edges-brain-viruspc/pull/462)），再按订阅重跑、改模版、补词云 / 原文链接、改名「AI 资讯」、分类胶囊、榜单小节等（[#458](https://github.com/VirusPC/edges-brain-viruspc/pull/458)、[#463](https://github.com/VirusPC/edges-brain-viruspc/pull/463)、[#464](https://github.com/VirusPC/edges-brain-viruspc/pull/464)、[#466](https://github.com/VirusPC/edges-brain-viruspc/pull/466)、[#467](https://github.com/VirusPC/edges-brain-viruspc/pull/467)、[#468](https://github.com/VirusPC/edges-brain-viruspc/pull/468)、[#469](https://github.com/VirusPC/edges-brain-viruspc/pull/469)、[#473](https://github.com/VirusPC/edges-brain-viruspc/pull/473)、[#477](https://github.com/VirusPC/edges-brain-viruspc/pull/477)、[#478](https://github.com/VirusPC/edges-brain-viruspc/pull/478)、[#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479)、[#480](https://github.com/VirusPC/edges-brain-viruspc/pull/480)、[#481](https://github.com/VirusPC/edges-brain-viruspc/pull/481)）。站点配套还有页脚、Teaching 外链、文章 TOC、dev 预览（[#470](https://github.com/VirusPC/edges-brain-viruspc/pull/470)、[#471](https://github.com/VirusPC/edges-brain-viruspc/pull/471)、[#474](https://github.com/VirusPC/edges-brain-viruspc/pull/474)、[#475](https://github.com/VirusPC/edges-brain-viruspc/pull/475)、[#476](https://github.com/VirusPC/edges-brain-viruspc/pull/476)）。

窗内 Pages site **7** 次失败都发生在 11-13 特征分支上，构建步骤 `verify-dist.mjs` 的 `assertCategoryPills` 断言失败（期望正文匹配 `/阿里：对企业级 AI 研发提效的思考与实践/`）。这些失败在分支上，main 后续 Pages 运行继续有成功记录。

**对话依据（Grok Bot，北京时间）：** 用户 11-10「ok我暂停了。你来接手，重跑最近2周」；11-12「再记录todo，优化整个ai news的排版」，并完成一轮说明移出正文的决定；11-13「AI Coding 资讯改名 Agent资讯吧」，以及「我希望完全重跑，看下skill效果」「我说了多少遍，这是skill测试，肯定换个干净的agent重跑啊」。11-14 又记新卡：「用做dashboard 的思路做ai news」（[#483](https://github.com/VirusPC/edges-brain-viruspc/pull/483)、[#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482)），并「更进一步的，我想建设personal dashboard 框架」（[#484](https://github.com/VirusPC/edges-brain-viruspc/pull/484)、[#485](https://github.com/VirusPC/edges-brain-viruspc/pull/485)）。

#### 教学、新 Project，以及大量新开 backlog 卡

按类型的完整盘点见上文「本周沉淀」。这里只补对话依据，并保留未做成的观察。

Teaching / DSH / ACP：公开脑 [#452](https://github.com/VirusPC/edges-brain-viruspc/pull/452)、[#453](https://github.com/VirusPC/edges-brain-viruspc/pull/453)、[#454](https://github.com/VirusPC/edges-brain-viruspc/pull/454)、[#455](https://github.com/VirusPC/edges-brain-viruspc/pull/455)、[#488](https://github.com/VirusPC/edges-brain-viruspc/pull/488)。OpenViking 记忆机制笔记：[#457](https://github.com/VirusPC/edges-brain-viruspc/pull/457)。新公开索引 / 项目：IT 资产管理 [#459](https://github.com/VirusPC/edges-brain-viruspc/pull/459)，AI 研发流程优化 [#494](https://github.com/VirusPC/edges-brain-viruspc/pull/494)，agent-infra 登记为正式 Project [#502](https://github.com/VirusPC/edges-brain-viruspc/pull/502)。

本周大量新卡进入 backlog（多数在仓库根 `projects/` 或 `tasks/`，少数在 `.edges/tasks/backlog`）：按 dashboard 思路重构 AI News（[#483](https://github.com/VirusPC/edges-brain-viruspc/pull/483)、[#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482)）、个人 Dashboard 框架及调研（[#484](https://github.com/VirusPC/edges-brain-viruspc/pull/484)、[#485](https://github.com/VirusPC/edges-brain-viruspc/pull/485)）、学习异步 Agent（[#486](https://github.com/VirusPC/edges-brain-viruspc/pull/486)）、dream 机制（[#499](https://github.com/VirusPC/edges-brain-viruspc/pull/499)）、改造认知优势目录 `edges/`（[#497](https://github.com/VirusPC/edges-brain-viruspc/pull/497)）、big_model_radar（[#489](https://github.com/VirusPC/edges-brain-viruspc/pull/489)）、个人大脑独立 tasks 看板页（[#501](https://github.com/VirusPC/edges-brain-viruspc/pull/501)）。框架新卡：官方 OCI 镜像（[#124](https://github.com/VirusPC/edges/pull/124)）、`.edges` 下支持自定义材料类别（[#130](https://github.com/VirusPC/edges/pull/130)，高优）。公开脑 [#503](https://github.com/VirusPC/edges-brain-viruspc/pull/503) 记下任务新条目格式为「一句话 + 解释 + 参考资料」，状态仍为 backlog，不实现迁移。未观察到这些新卡在本周被从 backlog 推到 done；以「新增卡」为主。工作记录还有桌面评测 / Work 调用 Finder（[#490](https://github.com/VirusPC/edges-brain-viruspc/pull/490)、[#491](https://github.com/VirusPC/edges-brain-viruspc/pull/491)），以及日复盘任务按重要与后续是否用到判定（[#495](https://github.com/VirusPC/edges-brain-viruspc/pull/495)）。

公开脑另记写入仓库前的 worktree 核验（[#493](https://github.com/VirusPC/edges-brain-viruspc/pull/493)），并初始化根目录 routines 子作用域骨架（[#500](https://github.com/VirusPC/edges-brain-viruspc/pull/500)）。

**对话依据：**
- 用户（DIY Coding Agent，2026-11-09 16:43）：「我是希望，个人大脑里新建一个 teaching，然后在里面放课程和笔记」；16:48「创建同名的project吧」，引出 [#455](https://github.com/VirusPC/edges-brain-viruspc/pull/455) 与上面的 `--super` 约定。
- 用户（通用，2026-11-10 10:20）：「明白了。记录个笔记到合适的大脑project里」，并在 10:33「保持现在」，对应公开脑 [#457](https://github.com/VirusPC/edges-brain-viruspc/pull/457)。同日另有一项调研，用户明确「新的调研放到私密大脑」（10:35），已在私密脑开 PR，公开正文不写主题。
- 用户（IT资产管理，2026-11-10 20:03）：「相关文档，存到edges大脑一份？起个project」，11-11「合并吧」，对应 [#459](https://github.com/VirusPC/edges-brain-viruspc/pull/459)。
- 用户（任务记录员，2026-11-15 16:09）：「我在想，或许各种类型的文件之间，允许存在某种内容包含关系。例如：tasks、projects里，都允许包含notes，routines里允许包含skill，等等。」随后在日复盘要求「routines下建立一个.edges」「根目录 /routines」（17:16–17:17），并「记录个任务：增加复盘的复盘。确保复盘不腐烂。」（17:18）。17:44–17:48 又指出「个人大脑应该要单独的task页吧」「现在部署的tasks页，其实是edges框架的，不是edges大脑的」，「记录任务卡先」，对应 [#500](https://github.com/VirusPC/edges-brain-viruspc/pull/500)、[#501](https://github.com/VirusPC/edges-brain-viruspc/pull/501)。
- 用户（Grok Bot，2026-11-15 16:03）：「个人大脑根目录里，起一个文件夹吧，叫做edges，用于记录一个个观点、洞察、判断、决策性质的内容……skill要求内容格式：一句话 + 解释。」后于 22:46 补充「这将是全仓库信噪比最高的地方」，对应 [#497](https://github.com/VirusPC/edges-brain-viruspc/pull/497)、[#503](https://github.com/VirusPC/edges-brain-viruspc/pull/503)、[#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504)。
- 用户（任务记录员，2026-11-15 17:14）：「记录一个高优任务，.edges下支持自定义类别。比如记录 plan、决策点等等」，17:19「没问题」，22:45「合并」，对应框架 [#130](https://github.com/VirusPC/edges/pull/130)。

#### 上期周复盘与本周日复盘均已落库

[#450](https://github.com/VirusPC/edges-brain-viruspc/pull/450) 于 2026-11-10 20:49:09 Asia/Shanghai 合入 2026-11-02 周复盘。本周日复盘 7/7：[#449](https://github.com/VirusPC/edges-brain-viruspc/pull/449)、[#456](https://github.com/VirusPC/edges-brain-viruspc/pull/456)、[#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460)、[#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465)、[#472](https://github.com/VirusPC/edges-brain-viruspc/pull/472)、[#487](https://github.com/VirusPC/edges-brain-viruspc/pull/487)、[#496](https://github.com/VirusPC/edges-brain-viruspc/pull/496)。`2026-10-29` 日复盘日历篇仍缺。

对话层：用户（Grok Bot，2026-11-10 20:47）说「braind的几个都合并吧」「草稿也合并」，上期周复盘 [#450](https://github.com/VirusPC/edges-brain-viruspc/pull/450) 随当日一批公开脑 PR 合入。窗内未见用户评论上期三条建议本身。

#### 工作区根只更新 submodule 指针

[#21](https://github.com/VirusPC/edges-workspace-viruspc/pull/21) 至 [#26](https://github.com/VirusPC/edges-workspace-viruspc/pull/26) 全部是框架 / 公开脑 / 私密脑 gitlink 更新。

#### 未合入或关闭未合入

- 框架 [#120](https://github.com/VirusPC/edges/pull/120) 仍 open（2026-11-09 19:20:20 Asia/Shanghai 创建，独立仓 AGENTS.md 写入 edges-harness 标记）。公开脑 [#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460) 为此在 `.edges/tasks/backlog` 开了一张与 PR 120 相关的原则重构卡。对话依据见上文 11-09 晚「应该自动识别仓库情况」与 `<edges-harness mode="super" />`。
- 成对待人审、PR 正文写明「请人审阅，不要合并」：框架 [#129](https://github.com/VirusPC/edges/pull/129) 与公开脑 [#498](https://github.com/VirusPC/edges-brain-viruspc/pull/498) 在采集时均 open。
- 公开脑 [#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504) 仍 open（更新已有 backlog 卡：`edges/` 定位为全仓信噪比最高处；创建 2026-11-15 22:49:36 Asia/Shanghai）。
- 公开脑 [#492](https://github.com/VirusPC/edges-brain-viruspc/pull/492) 于 2026-11-14 17:45:56 Asia/Shanghai **关闭未合入**（标题：新增 managed skill `create-learning-notes`）。关闭原因已由对话层核对：不是放弃，而是改放到框架仓并并入 [#125](https://github.com/VirusPC/edges/pull/125) / `0.6.0`，见上文原话。
- 私密脑窗内另有 2 个仍 open 的 PR；公开正文不写标题或主题。

#### 附加核验（不算上期必做名额）

- [ADR 0053](https://github.com/VirusPC/edges/blob/main/docs/adr/0053-personal-brain-reused-across-agent-clients.md) 跨客户端接入指南卡仍在 [`in_progress`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-09--agent-clients-ux/tasks/in_progress/2026-11-08--个人大脑跨客户端与工作空间接入指南/INDEX.md)，`edges-updated-at` 仍 `2026-11-08T02:43:17.931Z`（在本周窗开始之前）。进展段原文：「**未发包、未合并、七层与 E1–E4 未实测**」。本周虽发了 0.5.7 / 0.6.0 / 0.6.1，卡面完成标准仍未勾。本周没有新增 ADR 0054+。对话层：窗内未见用户安排或关掉该实测的原话。
- 抽样的已合入 / 仍 open PR 上，正式 GitHub Review 均为空。对话层有大量用户「合并吧 / 合并发布吧」口头放行，不等于 GitHub review 对象。

## 为什么

### 上期三条建议连续未闭环——仓内可证的是「没有对应收口提交」，不是用户否决

仓内事实：拆仓卡时间戳仍停在 2026-10-21、点名的 feedback 条目仍不在公开脑、`deploy.yml` 窗内 0 commits、六张点名卡「grill 后补」或无完成标准原文未变。本周框架 15 / 公开脑 54 个合入里，未见以上收口标题。本周公开脑 feedbacks 虽然不再是空壳，写入的是另外 3 条日复盘条目，不能算第 1 条完成。对话层 598 条用户消息中，未见叫停或改口这三条。因此本期只记 **上期建议验收未完成**，不把「没做成」写成用户失信，也不编造「被别的主线挤掉」的吞吐因果。

### 上期建议 2 的对象，本周从「历史两例失败」变成「同类失败再次出现」

可能因为：workflow 未改，ECS 仍经 ghproxy 拉 GitHub，偶发 502/500 会继续发生。本周 3 例失败的步骤与上期记录的问题同类（代理返回 5xx，不是 SSH 连不上）。没有仓内结论，下次再红仍要从 Actions 日志重读。6 次取消的步骤原因目前查不到，这里不据此推断并发策略已经失效。对话里也没有「先把 Deploy 写进结论或改 workflow」的安排。

### AI 资讯上站和框架发版是本周看得见的主产出；发版直接对应本周原话，评测侧收的是 Harbor 实验，不是上期点名的空标准卡

依据见「实际怎样」中的 PR 与对话。`0.5.7` 来自「`--super` 应支持所有模块」；`0.6.0` 来自把学习笔记 skill 收成与 CLI 一致的 `edges-create-notes` / `edges-create-tasks`；`0.6.1` 来自「写入前必须先有独立 worktree」只写入新建 Git 根 `AGENTS.md`。[#114](https://github.com/VirusPC/edges/pull/114)–[#117](https://github.com/VirusPC/edges/pull/117) 收的是 Harbor 实验材料。它们改变了框架能力面和评测资产，但没有改那六张「grill 后补」卡的完成标准段。

### ADR 0053 仍停在「文档已合、实测未做」

卡面原文仍写未发包、未合并、七层与 E1–E4 未实测；`edges-updated-at` 未进入本周窗。本周 onboarding 相关合入是 [#118](https://github.com/VirusPC/edges/pull/118) 的 `--super` 解析修复，不是该卡要求的客户端实测。是否升为下期必做仍由你定，不自动挤掉上列三条结转名额。

### 本周沉淀的重心在记笔记、建 Project 和开卡，可复用规则只落了几条

依据见「本周沉淀」。Memory / Skill 侧当场落仓的是 `--super`、worktree 硬约束，以及笔记 / 任务技能改名。Task 侧几乎都是新开 backlog，没有看到推进 done。这是盘点结果，不是对「该不该先开卡」的评价。

### 该保持的

- 框架 Frozen install 全绿（31/31），Publish 三次全绿（0.5.7 / 0.6.0 / 0.6.1），发版门禁这周没有再挡住包。
- `--super` 解析问题修了就随 0.5.7 发出（[#118](https://github.com/VirusPC/edges/pull/118)、[#119](https://github.com/VirusPC/edges/pull/119)），并按用户原话收成一句硬约束。
- 公开脑日复盘 7/7，没有再丢天。
- 日复盘开始把 feedback **真正写入**公开脑（3 条可读条目），而不只是目录壳；其中 `feedback_write_core_principles_specific_first` 能对上「几个关键规则……最核心的是讲一些最基础的做什么的原则」（全栈开发专家，2026-11-10 23:57），`feedback_rerun_means_full_rerun_with_current_skill` 能对上「我希望完全重跑，看下skill效果」（Grok Bot，2026-11-13 15:37）。「换个干净的agent重跑」不是同一条，全局 feedback 尚未单列，见建议补充清单。
- Harbor 实验收口并发布冻结数据集（[#114](https://github.com/VirusPC/edges/pull/114)–[#117](https://github.com/VirusPC/edges/pull/117)）。
- 工作区根继续只用指针 PR 更新子模块，不把业务正文写进工作区根。
- 发现本机直接改目录后，用户当场要求写成笔记和记忆，并收成 init 模板约束（[#493](https://github.com/VirusPC/edges-brain-viruspc/pull/493)、[#127](https://github.com/VirusPC/edges/pull/127)）——应保持这种可打断、随即落仓的协作。
- 先开在个人大脑的 skill，经用户一句「直接放到edges框架里合适么」改道到框架并与 CLI 对齐，而不是把 [#492](https://github.com/VirusPC/edges-brain-viruspc/pull/492) 硬合并进去。

## 下次做什么

1. **收口框架「拆仓」卡 + 裁定复盘向 feedback 是否迁回公开脑（上期建议 1 再结转，已连续两期未完成）。** 完成标准：框架拆仓卡离开 `in_progress`（标 done 或写明与公开脑 done / R6 对应）；`feedback_retro_comments_in_separate_file` 在公开脑 feedbacks 成可读条目，或公开脑 / 本期 `COMMENTS.md` 写明故意只留框架仓。来源：上期建议。本周公开脑虽新增 3 条别的 feedback，点名条目与拆仓卡面未变。对话中未见用户关掉。

2. **公开脑 Deploy：写成仓内结论，并二选一落地（上期建议 2 再结转；本周又新增 3 例失败）。** 完成标准：有 PR 改 workflow/依赖，**或**书面「故意保留 ECS SSH Deploy、接受偶发 502/超时」。说明里须写入上期两例 run（[40466959447](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/40466959447)、[41290110198](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/41290110198)），以及本周三例（[43022310294](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/43022310294)、[43033824548](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/43033824548)、[43604430722](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/43604430722)）。本周 3 次失败、workflow 未改，不满足该标准。

3. **给仍写「grill 后补」的高优评测 / routines / 旁路卡补至少一句可验收完成标准；插件化卡书面对齐 ADR 0046（上期建议 3 再结转，已连续两期未完成）。** 完成标准同「本该怎样」第 3 条。若决定「继续先占位、后 grill」，应在本期 `COMMENTS.md` 写明，避免每周重复验收空标准。另：ADR 0053 指南各客户端**实测**仍是卡面自述缺口，是否升为下期必做由你定，不自动挤掉上列三条结转名额。


## 展望

按 2026-11-16 反馈，本节写本周会话和仓库里已经冒出、但还没收成可执行路线的下一步方向。它们不是「下次做什么」里三条上期结转项的复述，也不把已开卡当成已做成。

1. **建设个人 Dashboard 框架，并用同一思路重构 AI 资讯。** 用户（Grok Bot，2026-11-14 00:05）要求「用做dashboard 的思路做ai news。分数据层和可视化层，模型榜单也支持通过下拉菜单切换而不是平铺等等」；01:22「更进一步的，我想建设personal dashboard 框架」；02:40「甚至可以按照指定主题，持久化追踪消息和趋势。」02:44 提到「可能需要简单版的dify、n8n这种数据流编排工具」。对应 [#483](https://github.com/VirusPC/edges-brain-viruspc/pull/483)、[#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482)、[#484](https://github.com/VirusPC/edges-brain-viruspc/pull/484)、[#485](https://github.com/VirusPC/edges-brain-viruspc/pull/485)、[#489](https://github.com/VirusPC/edges-brain-viruspc/pull/489)。本周只记下任务卡和调研，框架本身和分层重构都还没做成。

2. **把根目录 `edges/` 收成全仓信噪比最高的认知目录，并落地 `edges-create-edges`。** 用户（Grok Bot，2026-11-15 16:03）要求「用于记录一个个观点、洞察、判断、决策性质的内容……skill要求内容格式：一句话 + 解释。」后补「参考资料」，22:46「这将是全仓库信噪比最高的地方」。对应 [#497](https://github.com/VirusPC/edges-brain-viruspc/pull/497)、[#503](https://github.com/VirusPC/edges-brain-viruspc/pull/503)、仍 open 的 [#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504)。卡面完成标准（初始化、skill、历史内容迁出、README 改定位）采集时均未勾完，仓库里也还没有 `edges-create-edges` skill。缺的 skill 正文已列入建议补充清单。

3. **建立产物之间自动流转的 dream 机制。** 用户（Grok Bot，2026-11-15 16:33）要求「处理各种产物之间自动流转管理。本质是做一种dream机制，从memory、notes等提取edges提升个人认知、生成posts对外展示获取反馈等。最高优先级。」对应 [#499](https://github.com/VirusPC/edges-brain-viruspc/pull/499)。本周只有概念和一张 urgent 卡，没有设计方案和实现；卡面写明依赖 `edges/` 格式和 `edges-create-edges` 先定下来。

4. **增加「复盘的复盘」，让发现的 badcase 能做 eval 和回归。** 用户（日复盘，2026-11-15 17:18）要求「增加复盘的复盘。确保复盘不腐烂。发现的badcase要能够eval和回归到」，并举 AI 资讯漏收重要文章为例。卡已随 [#500](https://github.com/VirusPC/edges-brain-viruspc/pull/500) 记入 routines 子作用域，但评测集、回归流程和例程正文都还没有。缺的例程正文已列入建议补充清单。这与上期三条结转项对象不同，故不挤占「下次做什么」名额。

5. **给个人大脑单独做一份 tasks 看板页。** 用户（日复盘，2026-11-15 17:44–17:48）指出「现在部署的tasks页，其实是edges框架的，不是edges大脑的」「记录任务卡先」。对应 [#501](https://github.com/VirusPC/edges-brain-viruspc/pull/501)。本周只留下 backlog 卡，没有改部署。

6. **收口技能与材料面：原则重构、harness 标记，以及 `.edges` 自定义类别。** 0.5.7 已修好 `--super` 解析，那是已做完的部分。还没做完的是：把材料面识别原则写成待确认正文（见建议补充清单）、人审框架 [#120](https://github.com/VirusPC/edges/pull/120)、落地自定义材料类别（[#130](https://github.com/VirusPC/edges/pull/130)，高优卡已合入、实现未做）。同日「tasks、projects里，都允许包含notes，routines里允许包含skill」（任务记录员，2026-11-15 16:09）只是想法，当场未拍板，不能当成已定设计。

## 建议补充内容清单

按 2026-11-16 反馈，下面这些是从本周会话与仓库里新挖出的、该沉淀却还没有写成模块正文的候选。已经开出、且卡面写全的任务，缺的如果是 skill / routine 等模块正文，仍单独列出，不因为有卡就省略。**待你确认后再落库**，本复盘不自行写入。本次未读到 Langfuse trace。

### Note：编码 Agent 的本机记忆与子目录 `AGENTS.md` 对照（本周新挖，未落仓）

- **是什么：** 把本周核对过的两条对照结论写成一篇可独立回查的笔记：Claude Code / Codex 的产品记忆存在本机、不跟账号走，云端任务读不到；Cursor 与符合条件的 Claude Code 能按需读子目录 `AGENTS.md`，Codex 只沿「仓库根 → 启动目录」加载，不会再往下读。由此补上一条已有做法的理由：对所有编码 Agent 都生效的硬规则，只能写在仓库根 `AGENTS.md`。
- **建议去处：** 公开脑 `projects/agent-infra/notes/2026-11-15--编码-agent-本机记忆与子目录-agentsmd/`（与 [#502](https://github.com/VirusPC/edges-brain-viruspc/pull/502) 两篇笔记放在同一 Project 下），并链回 `notes/2026-10-14--基于-git-repo-与文件系统的-agent-memory`，不要重写那篇普查。
- **对话依据：** 用户（Grok Bot，2026-11-15 18:58，北京时间）问「claude code和codex 的memory ，都是存到本机，而不是本账号的么」；19:09 再问「claude code、codex、cursor 等coding agent，可以读到子目录下的agentsmd么？」。其后 19:20–19:22 的 KV Cache / Prompt Caching 是概念澄清，不写入本篇要保存的产品事实。
- **仓库依据：** 采集时 main tip `43de9fad` 上没有这篇笔记。[#502](https://github.com/VirusPC/edges-brain-viruspc/pull/502) 只合入了 MCP / CLI 与 Code Mode 两篇。日复盘 11-16 已起草同一路径的草稿，较新 main 上仍未出现该路径。
- **为什么值得补：** 之后只要决定一段规则写进产品自带 memory、子目录 `AGENTS.md`，还是仓库根 / Edges memory，就会用到这两条结论；也解释了云端任务为何读不到本机记忆。
- **不补代价：** 只留下一场问答。下次再放硬规则或排查「为什么 Codex / 云端没读到」时，要重新对文档，也容易和 10-14 普查、ChatGPT 账号记忆混在一起。
- **处理结果：** **待你确认后再落库**。若采用，建议以已有日复盘草稿为正文，不要重写。

### Memory：测 skill 必须换没有旧稿和本题结论的干净 agent（本周新挖，全局条目未写）

- **是什么：** 单独写一条全局 feedback：凡是「测试 skill」「看 skill 效果」的重跑，必须换一个没有旧稿、也不知道本题结论的干净 agent，只给现行 skill 和输入，从头跑。不要让同一个已经知道答案的助手再跑一遍，就当成验证。
- **建议去处：** 公开脑 `.edges/memory/feedbacks/` 新条目（名称可定为 `feedback_skill_tests_require_clean_agent`），并在 README 索引。正文须写清它和已有 `feedback_rerun_means_full_rerun_with_current_skill`（[#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465)）的差别：后者管「重跑 = 用现行 skill 从头完整生成」；本条管「测 skill 时必须换干净执行者」。不要把两句并成一条。
- **对话依据：** 用户（Grok Bot，2026-11-13 15:37，北京时间）「我希望完全重跑，看下skill效果」，15:38「说白了，就是测试skill」。15:59「我说了多少遍，这是skill测试，肯定换个干净的agent重跑啊」——当时助手先在同一个已经知道「这篇该收」的会话里重跑完 [#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479)。16:00「这还需要记？你是什么模型」是对「还要专门记下来」的不满，意思是这本应是已遵守的做法，不能单独理解成「不要写成记忆」。
- **仓库依据：** [#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465) 的 feedback 没有「换干净 agent」这一句。教训已写入 AI 资讯局部笔记（经 [#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479)），全局 `.edges/memory/feedbacks/` 下没有对应条目。此前定稿曾把这两句并成已有 rerun feedback 的原话证据，这里改正。
- **为什么值得补：** 用户连说「我说了多少遍」，以后任何 skill（不只是 AI 资讯）做效果验证时都会用到。局部笔记只对 AI 资讯例程可见。
- **不补代价：** 下一次测 skill 时，助手仍可能在同一个已经知道结论的会话里重跑，再把结果当成 skill 效果。
- **处理结果：** **待你确认后再落库**。建议与 #465 并列、写清差别，不要在未确认前写成已生效的全局 feedback。

### Memory 或 ADR：把 `--super` / 材料面识别收成一条仍待确认的原则正文（本周新挖，原则本身未成文）

- **是什么：** 把 11-10 晚已经收到「做事顺序」这一层、但尚未由你最终拍板的材料面识别原则，写成一篇可确认的正文。对话里的倾向是：先确定要 harness 的目录，再确定该目录的材料放在哪里，然后在那个位置读写；每一步都是越具体越优先。目录先看 `--scope`，没传再按默认规则往上找；材料位置先看给定路径，再看该目录 `AGENTS.md` 有无 `<edges-harness mode="super" />`，都没有就用 `.edges/`。这篇正文的任务是把原则写清楚、标成「待确认」，而不是宣称已经定稿或已经改 CLI。
- **建议去处：** 框架仓更合适，可与仍 open 的 [#120](https://github.com/VirusPC/edges/pull/120) 对照，写成 `.edges/memory/` 可复用结论或一篇短 ADR / 设计笔记。公开脑已有原则重构卡（随 [#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460)），不要再开一张同名卡；缺的是原则正文。
- **对话依据：** 用户（全栈开发专家，2026-11-10 21:24）「怎么感觉整个skills味儿都不对了。完全重构下？总觉得没能突出核心原则，变成了一堆乱糟糟的 if else」。23:53–23:57 依次为「不希望做过多限制。」「逻辑越简单越solud」「我甚至怀疑，@super也不需要」「有标记也可以读写.edges呀」「有标记时兜底写根目录。该是越具体越好啊。」「几个关键规则吧……最核心的是讲一些最基础的做什么的原则。」11-11 00:15「不本质」，随后「比如说，先确定要harness的目录是哪个」。助手按做事顺序复述了三步并提问后，窗内**未见**你再给出一句明确的「是」或「改」。因此原则仍是对话倾向，不是已拍板的硬约束。更早的标记来源见 11-09 19:08–19:13「应该自动识别仓库情况」与 `<edges-harness mode="super" />`。
- **仓库依据：** `feedback_write_core_principles_specific_first`（[#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460)）只写下写规则时的元原则，没有写下材料面识别原则本身。原则重构卡仍在 backlog，卡面写明「设计未定稿，代码未改」。[#120](https://github.com/VirusPC/edges/pull/120) 采集时仍 open。
- **为什么值得补：** 缺的不是「要重构 skill」这张卡，而是那条原则的可确认文本。不先写出来给你点头，#120 和相关 skill 很难按同一条原则收口，也容易再滑回 if-else。
- **不补代价：** 继续只剩一张「设计未定稿」的卡和一条元原则 feedback。下次再改 onboarding / CLI / `--super` 时，还要从 11-10 的长对话里重听一遍。
- **处理结果：** **待你确认后再落库**。先写出待确认的原则正文，请你点头或改写；不要把助手在 00:15 的复述当成已生效的硬约束，也不要未确认就改 CLI。


### Skill：`edges-create-edges`（本周已给出格式，skill 正文未写）

- **是什么：** 写出 `edges-create-edges` skill 正文：把观点、洞察、判断、决策写成一篇篇精简条目，格式为「一句话 + 解释 + 参考资料」，并初始化该目录的 `.edges`。
- **建议去处：** 按用户原话，放在公开脑根目录 `edges/.edges/` 下；与已有任务卡 [#497](https://github.com/VirusPC/edges-brain-viruspc/pull/497)、[#503](https://github.com/VirusPC/edges-brain-viruspc/pull/503)、仍 open 的 [#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504) 对齐，不要再开同名卡。缺的是 skill 正文，不是又一张卡。
- **对话依据：** 用户（Grok Bot，2026-11-15 16:03，北京时间）「个人大脑根目录里，起一个文件夹吧，叫做edges，用于记录一个个观点、洞察、判断、决策性质的内容。每个点占一篇内容，保持精简。初始化好.edges，并在.edges里补充一个skill：edges-create-edges，skill要求内容格式：一句话 + 解释 。」随后改成先记任务卡，并确认用已有「认知优势」目录。20:46 补充格式要加「参考资料」。22:46「这将是全仓库信噪比最高的地方」。
- **仓库依据：** 三张相关卡已落，但采集时 main 上没有已落地的 `edges-create-edges` skill；卡面完成标准（`.edges` 初始化、skill 正文、历史内容迁出、README 改定位）均未勾完。
- **为什么值得补：** 用户当场给出了目录、skill 名和正文格式。只开卡不等于模块已沉淀；后面 dream 产物流转也依赖这个格式先定下来。
- **不补代价：** 之后往 `edges/` 里写条目没有统一 skill 可遵循，格式会再次漂移，[#499](https://github.com/VirusPC/edges-brain-viruspc/pull/499) 的 dream 机制也会继续空转。
- **处理结果：** **待你确认后再落库**。确认后按已有卡面和原话写 skill 正文，不新开卡。

### Routine：「复盘的复盘」例程正文尚未写成（已记卡）

- **是什么：** 把「复盘的复盘」写成例程定义：何时跑、回看什么、发现的 badcase 如何进入 eval 和回归（例如 AI 资讯漏收重要文章），而不只留一张任务卡。
- **建议去处：** 公开脑 routines 子作用域（骨架已随 [#500](https://github.com/VirusPC/edges-brain-viruspc/pull/500) 落下），可与已有日 / 周复盘例程并列，或挂进现有复盘例程。已有卡 `routines/.edges/tasks/backlog/2026-11-15--增加复盘的复盘让-badcase-能-eval-和回归/`。缺的是例程正文，不是再开一张卡。
- **对话依据：** 用户（日复盘，2026-11-15 17:18，北京时间）「然后记录个任务：增加复盘的复盘。确保复盘不腐烂。发现的badcase要能够eval和回归到。例如，之前发现ai news routine 忽略了重要的 claude research 下的 memory 文章。」原话先要求「记录个任务」，例程形态（独立例程还是挂在现有日 / 周复盘里）仍待你确认。
- **仓库依据：** 卡已记入，但采集时没有对应的例程 `INDEX.md` / Skill / 日程，也没有评测集或回归流程。
- **为什么值得补：** 这是对复盘例程自身质量的要求。没有例程正文和回归机制，就还是靠下次人工发现同一类遗漏。
- **不补代价：** 以后只能继续用周复盘人工发现同一类 rotten case。
- **处理结果：** **待你确认后再落库**。先确认例程形态，再写定义；不自动挤掉「下次做什么」的三条结转名额。


### 框架拆仓卡仍 in_progress（与公开脑 done 不一致）

- **是什么：** 拆仓事实在公开脑卡上已勾完，框架卡仍停在 2026-10-21 的 `in_progress`。
- **建议去处：** 框架 `.edges/projects/2026-09-09--edges-extensions/tasks/in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去`。
- **为什么值得补：** 看板进度连续三周不一致。
- **不补代价：** 周复盘继续重复验收同一条。
- **处理结果：** 未处理（**延续**）。已列入下次做什么第 1 条。

### `feedback_retro_comments_in_separate_file` 仍只在框架仓

- **是什么：** 公开脑 feedbacks 本周有了另外 3 条可读条目，但没有上期点名的这一条，也没有「故意只留框架」的书面裁定。
- **建议去处：** 公开脑 `.edges/memory/feedbacks/`，或书面「故意只留框架」。
- **为什么值得补：** 周复盘默认读公开脑；现在目录里「有条目」更容易让人误以为点名那条已经迁回。
- **不补代价：** COMMENTS 约定继续只在框架侧被读到。
- **处理结果：** 目录不再为空，点名条目仍缺（**延续**）。并入下次做什么第 1 条。

### 公开脑 Deploy 失败仍无仓内结论文档，且本周再次出现同类失败

- **是什么：** 上期两例 502 / SSH 超时，加上本周三例 ghproxy 502/500，都还只有 Actions 日志，没有 PR 或「故意保留」短文。
- **建议去处：** workflow PR，或公开脑短笔记 / 本期 COMMENTS。
- **为什么值得补：** 完成标准要求「归因 + PR 或故意保留」；问题本周再次出现。
- **不补代价：** 下次再红仍从零猜。
- **处理结果：** workflow 未改，正式说明仍缺（**延续，且本周加重**）。列入下次做什么第 2 条。

### 缺 2026-10-29 日复盘日历篇

- **是什么：** `retrospectives/daily/` 仍无该天；历史上同目录也缺 10-14、10-23。
- **建议去处：** 补日历篇，或 COMMENTS 写「不补、由邻近日覆盖」。
- **为什么值得补：** 目录缺天会被反复追问。
- **不补代价：** 例程健康度统计持续噪音。
- **处理结果：** 本周仍未补（**延续**）。是否补写仍待你定。

### 10-31 高优评测卡 / routines / 旁路卡完成标准空白

- **是什么：** 仍写 grill 后补或无完成标准段，时间戳未变。
- **建议去处：** 各卡 INDEX。
- **为什么值得补：** 高优却不可验收。
- **不补代价：** 周复盘第三次（含上上期则更多）验收同一批空标准。
- **处理结果：** 未处理（**延续**）。并入下次做什么第 3 条。

### 插件化卡未书面对齐 ADR 0046

- **是什么：** 仍「待 grill」；[#118](https://github.com/VirusPC/edges/pull/118) 只改了 ADR 0046 正文一行，卡面未更新。
- **建议去处：** 插件化卡前提 / 完成标准段。
- **为什么值得补：** 带着与叶子登记 / 递归 Project 冲突的前提继续 grill 会返工。
- **不补代价：** 模型再打架。
- **处理结果：** 未处理（**延续**）。并入下次做什么第 3 条。

### ADR 0053 已合入，跨客户端接入仍待实测

- **是什么：** 卡面仍写「未发包、未合并、七层与 E1–E4 未实测」；本周发版没有勾掉这些标准。窗内对话未见安排实测的原话。
- **建议去处：** 框架 [`2026-11-08--个人大脑跨客户端与工作空间接入指南`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-09--agent-clients-ux/tasks/in_progress/2026-11-08--个人大脑跨客户端与工作空间接入指南/INDEX.md)。
- **为什么值得补：** 决策若只停在文档层，指南与真实客户端行为会分叉。
- **不补代价：** onboarding 对外承诺超前。
- **处理结果：** **实测未完成**（卡面自述）。是否列入下一轮必做由你定。

### 私密脑已出现 `.edges/tasks`（仅结构结论）

- **是什么：** 上期结构核验是「无私密脑任务看板」。采集时私密脑 main 已有 `.edges/tasks/`（backlog 1 张卡）。公开正文不写卡名、路径主题或正文。窗内公开对话未见专门解释这次结构变化的原话。
- **建议去处：** 无强制动作；若要对齐公开脑的任务约定，先在对话或私密脑侧决定，不要把私人正文写入公开仓。
- **为什么值得记下：** 避免下期仍引用上期「无看板、不必迁移」的过时结构结论。
- **不补代价：** 结构事实与上周复盘不一致时容易误判。
- **处理结果：** **只记结构变化**。是否另开私密脑约定由你定。

### 公开脑 #492 关闭未合入（对话层已核对：改道，不是放弃）

- **是什么：** [#492](https://github.com/VirusPC/edges-brain-viruspc/pull/492)（新增 managed skill `create-learning-notes`）于 2026-11-14 17:45:56 Asia/Shanghai 关闭且未合并。
- **建议去处：** 无需重开。能力已并入框架 [#125](https://github.com/VirusPC/edges/pull/125) 的 `edges-create-notes`（学习场景走 Summary / Comments），随 `0.6.0` 发布。
- **为什么值得记下：** 只看仓库会误判为放弃；对话里用户先问「直接放到edges框架里合适么」，再要求按 CLI 动作改名并删掉旧 skill。
- **不补代价：** 把已改道且已发版的工作当成缺口。
- **处理结果：** **已改道完成**。不列入下次做什么。

### 「复盘的复盘」与 badcase 回归（已提升为 Routine 候选）

- 同上文 Routine 候选。此处不再重复。卡已有、例程正文未写，待你确认后再落库。


### 周复盘要盘点沉淀、挖新模块，并展望未来（本周反馈，已写入例程）

- **是什么：** 用户（周复盘，2026-11-16 12:34–12:43，北京时间）先要求「应该强调下沉淀memory、skill、task、routine 等等」，并补上「note  project」；随后指出「你没有根据trace 会话 代码等，去沉淀新的模块内容」，再要求「不仅回顾过去，还要展望未来。」
- **建议去处：** 例程 Skill（`.edges/routines/weekly-retrospective/SKILL.md`）与 `retrospectives/weekly/README.md`。
- **为什么值得补：** 只盘已落仓条目，看不到该沉淀却还没写成的模块；只回顾不展望，会把本周新冒出的方向漏掉。
- **不补代价：** 下期仍可能只报吞吐和旧结转项。
- **处理结果：** **已写入本期正文**（「本周沉淀」「展望」、以及上面三条新挖出的模块候选），并随本 PR 更新例程 Skill 与周复盘 README（合入后对下期生效）。本次未读到 Langfuse trace，已在「范围」写明。

### 上期清单中仍有效、本周未再作为必做推进（不新开下次做什么名额）

- 框架 [#120](https://github.com/VirusPC/edges/pull/120) 仍 open；公开脑已有相关原则重构 backlog 卡。对话里用户已提出要用标记识别 harness / `--super`，是否合入由人审决定。
- 成对的人审 PR（框架 [#129](https://github.com/VirusPC/edges/pull/129)、公开脑 [#498](https://github.com/VirusPC/edges-brain-viruspc/pull/498)）正文要求不要自动合并，本复盘不催合。
