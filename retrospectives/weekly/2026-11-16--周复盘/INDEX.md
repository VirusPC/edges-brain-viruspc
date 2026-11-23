# 2026-11-16 周复盘

## 范围

时间窗：2026-11-16 00:00:00 至 2026-11-22 23:59:59（Asia/Shanghai；UTC 对照 `2026-11-15T16:00:00Z`～`2026-11-22T15:59:59Z`）。2026-11-23 窗后合入（如公开脑 [#575](https://github.com/VirusPC/edges-brain-viruspc/pull/575)–[#578](https://github.com/VirusPC/edges-brain-viruspc/pull/578)）不计入本周统计。

| 仓 | 窗内合入 PR | 窗内新建 PR | 备注 |
| --- | ---: | ---: | --- |
| [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)（公开脑） | 63 | 70 | first-parent main 63 commits 与合入 PR 一一对应，无直推；关闭未合入 1 个（#515），窗内新建且仍 open 7 个 |
| [VirusPC/edges](https://github.com/VirusPC/edges)（框架） | 5 | 4 | Frozen install 9/9 成功；窗内无 Publish、无新 tag 或 Release（最高仍 `@viruspc/edges@0.6.1`）；[#120](https://github.com/VirusPC/edges/pull/120) 仍 open |
| VirusPC/edges-brain-viruspc-private（私密脑） | 1（#19） | 1 | 已读；公开正文只记编号 #19，不写标题或正文；另有 #18、#20 仍 open |
| [VirusPC/edges-workspace-viruspc](https://github.com/VirusPC/edges-workspace-viruspc)（工作区根） | 0 | 0 | 0 commit、0 PR；子模块指针停在窗前 #26（2026-11-14） |

仓库锚点：公开脑窗起 [`43de9fad`](https://github.com/VirusPC/edges-brain-viruspc/commit/43de9fad89d1c19ec17694249217e3d8ca2bf2b9)（#503，2026-11-15 22:24 Asia/Shanghai）至窗末 [`69dcf6ac`](https://github.com/VirusPC/edges-brain-viruspc/commit/69dcf6acfc4b4816490022f947feca62323e7255)（#571，2026-11-22 20:09 Asia/Shanghai）；框架窗起 [`453e0d38`](https://github.com/VirusPC/edges/commit/453e0d380938ba9620ff9bbd649bd09a51bd378f) 至窗末 [`53db33c0`](https://github.com/VirusPC/edges/commit/53db33c09a2483e2ede8a5d2bd8e6ca12e4084e4)（Merge #131，2026-11-21 16:48 Asia/Shanghai）。仓库层全量核对了 68 个合入 PR 的 641 个变更文件与任务卡树状态。

对话层：逐一扫描全部 73 个助手，其中 16 个助手在 2026-11-16 至 2026-11-22 有发言，覆盖 `user-messages.jsonl`（742 条用户消息）与 `search-window.jsonl`（2651 条窗内消息）。对发生转写截断的发言只引用可见部分并标明「转写截断」，不作补全；日复盘仅作仓库旁证，不替代用户原话。**本次未读到 trace，依据仅来自会话与仓库。**

## 本该怎样

本周仓库内没有事先写下的显式周目标，不事后画靶。

对照上期 [2026-11-09 周复盘](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-11-09--周复盘/INDEX.md)（随 [#506](https://github.com/VirusPC/edges-brain-viruspc/pull/506) 于 2026-11-21 合入）「下次做什么」的三条行动。它们是**上期复盘建议**，并非用户承诺；该目录无 `COMMENTS.md`。对话层在窗内未见用户叫停、改口或给这三条排期，也未见用户主动提起它们的原有对象：

1. 收口框架「拆仓」卡，并裁定 `feedback_retro_comments_in_separate_file` 是否迁回公开脑。
2. 公开脑 Deploy：把失败写成仓内结论，并二选一落地（改 workflow，或书面写明故意保留 ECS SSH Deploy）。
3. 给仍写「grill 后补」的高优评测、routines、旁路卡补上可验收的完成标准；插件化卡书面对齐 ADR 0046。

## 实际怎样

### 上期建议逐条验收

1. **没做成。**
   - 框架拆仓卡仍在 [`in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去`](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-09--edges-extensions/tasks/in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去/INDEX.md)，`edges-updated-at` 仍是 `2026-10-21T01:41:15.012Z`，与公开脑 `done` 同名卡状态仍不一致。
   - 本周框架 [#131](https://github.com/VirusPC/edges/pull/131) 把旧卡记作「进行中」并写明「那张拆的是内容和仓库，本卡拆的是模块和能力」，只说明了二者关系，没有收口旧卡。
   - 公开脑 `.edges/memory/feedbacks/` 窗末仍只有上期 3 条，没有点名的 `feedback_retro_comments_in_separate_file`；该条目仍只在框架仓。`retrospectives/weekly/2026-11-09--周复盘/COMMENTS.md` 不存在。
   - 对话层：窗内未见用户叫停或改口（讨论「个人大脑」的四次分别涉及 `teaching` 与 AI 资讯站点 Star 指向；任务记录员 2026-11-16 10:28–10:32 要求拆分「主框架和 personal harness 扩展」，指向模块能力切分而非旧拆仓卡）。
2. **没做成。**
   - 公开脑 [`.github/workflows/deploy.yml`](https://github.com/VirusPC/edges-brain-viruspc/blob/main/.github/workflows/deploy.yml) 窗内 0 commit（最后修改为 2026-10-20），仓内也没有「故意保留」说明或 `COMMENTS.md`。
   - 本周 Deploy 又失败 2 次（见下「CI 与 Deploy」）。
   - 对话层：窗内未见用户叫停、改口或要求写 Deploy 结论（提到「ECS」的是 Coding Agent 专家 2026-11-18 18:02 讨论游戏引擎 ECS 架构，与部署无关）。
3. **没做成。**
   - 上期点名的六张卡（框架 3 张 10-31 评测卡、公开脑 routines Project 分组卡、日复盘 Langfuse 旁路卡、框架 `harness-模块插件化` 卡）时间戳和原文均未变化，68 个合入 PR 的全量 641 个变更文件都没有碰到它们，插件化卡也仍无 ADR 0046 字样。
   - 附带核验：框架 ADR 0053 接入指南卡仍在 `in_progress`，`edges-updated-at` 仍 `2026-11-08T02:43:17.931Z`。
   - 对话层：窗内未见用户对这六张卡作排期、推迟或「先不管」的表态。

### 任务卡移入 done 核验（全量核验结果）

经拉取 68 个合入 PR 全部 641 个文件（无 `renamed`、无 `removed`、无路径含 `/done/`），并在公开脑窗起 `43de9fad` / 窗末 `69dcf6ac`、框架窗起 `453e0d38` / 窗末 `53db33c0` 全量枚举 `*/tasks/<status>/<card>/INDEX.md` 及 front matter `edges-tasks-status`（全部一致，私密脑 `#19` 也不涉及 `tasks/`），**本周公开脑与框架任务卡移入 `done` 均为 0**（公开脑 `done` 16→16，框架 `done` 56→56）。两仓共新增 5 张卡，4 张在 `backlog`、1 张在 `in_review`。

### 本周沉淀：Memory / Skill / Task / Routine / Note / Project

**Memory**

已落仓（窗内合入）：
- [#540](https://github.com/VirusPC/edges-brain-viruspc/pull/540)（`.edges/memory/projects/project_daily_retro_pr_use_merge_commit/INDEX.md`）：合并日复盘 PR 用普通 merge commit，不要 squash。对话依据：日复盘，2026-11-20 16:33（Asia/Shanghai），用户先说「合并」，随即「停」，然后「这几天很多没有合并，直接合不要squash」。
- [#531](https://github.com/VirusPC/edges-brain-viruspc/pull/531)（`site/.edges/memory/projects/project_site_viewport_and_theme/INDEX.md`、`site/AGENTS.md` 本层硬约束及根 `AGENTS.md` 登记）：站点改动必须同时覆盖手机、电脑、浅色和暗色。对话依据：Grok Bot，2026-11-20 22:47（Asia/Shanghai），「初始化一下吧，要求同时关注移动端和PC端，同时关注light 和dark模式」，22:54「合并吧」。
- [#546](https://github.com/VirusPC/edges-brain-viruspc/pull/546)（`site/.edges/memory/projects/project_note_card_design/INDEX.md`，后续 [#549](https://github.com/VirusPC/edges-brain-viruspc/pull/549)、[#552](https://github.com/VirusPC/edges-brain-viruspc/pull/552) 续改）：AI News 笔记卡与筛选栏设计原则。对话依据：视觉&交互&设计专家，2026-11-21 17:43–17:44（Asia/Shanghai），用户先问「设计原则你简单总结下？」，随后「记录到site的edges里吧」。

不计入本周 / 未合入 / 仅卡未写：
- 窗外或未合入：[#575](https://github.com/VirusPC/edges-brain-viruspc/pull/575)（`.edges/memory/feedbacks/feedback_ai_news_three_stages/`）于 2026-11-23 00:04（Asia/Shanghai）合入，属窗外；[#574](https://github.com/VirusPC/edges-brain-viruspc/pull/574)（`feedback_ai_news_dataflow_lives_in_skill`）、[#564](https://github.com/VirusPC/edges-brain-viruspc/pull/564)（更新笔记卡记忆）、[#573](https://github.com/VirusPC/edges-brain-viruspc/pull/573)（根 `AGENTS.md` 硬约束：用户指定步骤先后按序执行，且上游变化须重算下游）窗末仍 open。
- 跨仓记忆：Coding Agent 专家（2026-11-19 15:09，Asia/Shanghai）用户问「发布流程相关写进项目记忆了么」并确认「好的」，对应在 `VirusPC/open-grokbot`（开出 `open-grokbot#5`），不在 edges 工作区四仓内。
- 上期点名仍未写：「测 skill 换干净 agent」全局 feedback、`--super` 材料面识别原则（框架 [#120](https://github.com/VirusPC/edges/pull/120) 仍 open）。
- 只有卡、正文未写：无。

**Skill**

已落仓（窗内无新增 skill 目录，框架仓本周无 skill 改动）：
- `skills/managed/weekly-ai-blogs-digest/`：窗内被 24 个合入 PR 修改（[#521](https://github.com/VirusPC/edges-brain-viruspc/pull/521)、#523–#529、#532、#537–#539、#543、#545–#547、#551–#554、#558、#568、#569、[#571](https://github.com/VirusPC/edges-brain-viruspc/pull/571)）。其中 [#532](https://github.com/VirusPC/edges-brain-viruspc/pull/532) 将流程拆为 `references/01–05` 五步，并新增 `fetch_openrouter_endpoints.py`、`model_release_ranks.py`（#538）、`test_fetch_feeds.py`（#547）、`build_keywords.mjs`、`keyword_cloud_style.mjs`（#553、#568）等脚本与测试。对话依据：Grok Bot，2026-11-20 23:01–23:02（Asia/Shanghai），用户先说严格拆两个 skill，随即改口「我觉得我可能说错了」「那就不要拆两个Skill了，这个Skill拆步骤，里面加References，References里面步骤文件就好了」；11-22 23:18 要求把三阶段数据流架构写进 Skill（当晚文档 PR 未合入）。
- `skills/managed/llm-arena-marked-chart/scripts/`（#521）：改动渲染脚本并补测试。
- `skills/managed/summarize-ai-article/SKILL.md`（#539）：配合订阅源调整修改。

只有卡、正文未写：
- `edges-create-edges`：[#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504) 仅给公开脑 [`tasks/backlog/2026-11-15--个人大脑根目录新建-edges存观点与判断并加-edges-create-edges-skill`](https://github.com/VirusPC/edges-brain-viruspc/blob/main/tasks/backlog/2026-11-15--个人大脑根目录新建-edges存观点与判断并加-edges-create-edges-skill/INDEX.md) 加了一行背景；`main` 上仍无该 skill，也无 `edges/.edges`。对话依据：周复盘，2026-11-16 12:54–12:56（Asia/Shanghai），用户追问「没有要沉淀的skill和routine 么」，助手说明仅留在复盘清单、无单独文件，未见再提。

**Task**

已落仓新开卡（5 张，移入 `done` 为 0）：
- 公开脑 [#498](https://github.com/VirusPC/edges-brain-viruspc/pull/498)：`projects/2026-11-14--ai-研发流程优化/tasks/backlog/2026-11-15--建立-CodeRabbit-CR-规则自迭代流程/`（有完成标准段）。
- 公开脑 [#536](https://github.com/VirusPC/edges-brain-viruspc/pull/536)：`.edges/projects/2026-09-10--site-and-content/tasks/backlog/2026-11-20--设计-AI-资讯文末介绍和-Star-引导/`（无完成标准段）。对话依据：Grok Bot，2026-11-21 00:22（Asia/Shanghai），「按钮没问题，立刻做，指向个人大脑。其他文章末尾文案啥的，先记录一个任务吧。」
- 公开脑 [#561](https://github.com/VirusPC/edges-brain-viruspc/pull/561)：`projects/2026-09-13--site-and-content/tasks/in_review/2026-11-21--给个人知识库站点加基于-GitHub-的读者反馈渠道/`（卡面写「待验收」；另有同卡冲突 open PR [#550](https://github.com/VirusPC/edges-brain-viruspc/pull/550) 在 `backlog/`）。对话依据：视觉&交互&设计专家，2026-11-21 20:37–20:39（Asia/Shanghai），「我觉得需要给大家反馈的渠道，是不是可以直接利用github」「记录task」。
- 框架 [#131](https://github.com/VirusPC/edges/pull/131)（`urgent`）：`.edges/projects/2026-09-09--edges-extensions/tasks/backlog/2026-11-16--将-edges-拆为主框架和-personal-harness-扩展/`（写「完成标准待 grill-with-docs 补」）。对话依据：任务记录员，2026-11-16 10:28–10:32（Asia/Shanghai），「记录一个高优任务，将edges拆为主框架和personal harness 扩展……以及打通各个输入场景的获取输入的模块等」「改为urgent吧」；日复盘，2026-11-21 16:47（Asia/Shanghai），「edges 仓库， 129和 131合并」。
- 框架 [#132](https://github.com/VirusPC/edges/pull/132)：`.edges/projects/2026-09-08--project-memory/tasks/backlog/2026-11-17--把日复盘沉淀为-dream-机制/`（只有「待定问题」）。对话依据：任务记录员，2026-11-17 18:18（Asia/Shanghai），「记录一个任务。把日复盘沉淀为dream机制」，20:06「合并吧」。

更新已有卡：公开脑 #504；框架 [#134](https://github.com/VirusPC/edges/pull/134)（沉淀成本评测卡补充关联 #133）；框架 [#129](https://github.com/VirusPC/edges/pull/129)（Code Review 项目指向公开脑 #498）。另 #531 新增空看板 `site/.edges/tasks/README.md`。

未建卡 / 仅口头要求：Coding Agent 专家（2026-11-17 20:35，Asia/Shanghai），「记录一个待办。这里只验证了检索效率，没有验证沉淀效率。」（两仓均未见对应新卡，已列入建议补充内容清单）；同助手（2026-11-19 14:25）「初始化一下，然后记录 github actions的task」建在 `VirusPC/open-grokbot#5`，不在四仓内。

**Routine**

已落仓：
- [#533](https://github.com/VirusPC/edges-brain-viruspc/pull/533)（及 #547、#551、#554、#568、#569 续改）：`.edges/routines/weekly-ai-blogs-digest/INDEX.md`，登记每周五 09:00（Asia/Shanghai）的 AI 资讯周报 routine。对话依据：Grok Bot，2026-11-21 18:14「还是做好兜底。routine的.edges里写清楚」；2026-11-22 14:54「记得重写routine，重新生成最近四期的关键词啥的」。
- [#506](https://github.com/VirusPC/edges-brain-viruspc/pull/506)：更新 `.edges/routines/weekly-retrospective/SKILL.md` 与 `retrospectives/weekly/README.md`，写入六类沉淀、挖新模块与展望规则。对话依据：周复盘，2026-11-16 12:34–12:43（Asia/Shanghai）。
- 日复盘例程窗内合入 6 篇：11-16（#505）、11-17（[#511](https://github.com/VirusPC/edges-brain-viruspc/pull/511)）、11-18（[#514](https://github.com/VirusPC/edges-brain-viruspc/pull/514)）、11-19（[#516](https://github.com/VirusPC/edges-brain-viruspc/pull/516)；重复 PR #515 关闭未合）、11-20（[#517](https://github.com/VirusPC/edges-brain-viruspc/pull/517)）、11-21（#540）；11-22（#564）仍 open。

只有卡、正文未写：
- 「复盘的复盘」：只有卡 `routines/.edges/tasks/backlog/2026-11-15--增加复盘的复盘让-badcase-能-eval-和回归/`（时间戳 2026-11-15），无例程 `INDEX.md` 或回归流程。

**Note**

已落仓（公开脑窗内新增 21 篇 notes INDEX；私密脑 #19 合入 1 个 PR 不写主题；只有卡无正文：无）：
- `projects/agent-infra/notes/` 4 篇：#505 编码 Agent 本机记忆与子目录 `AGENTS.md`（上期候选已落仓）、[#512](https://github.com/VirusPC/edges-brain-viruspc/pull/512) Codex 的 Code Mode、[#513](https://github.com/VirusPC/edges-brain-viruspc/pull/513) 编码 Agent 的 Goal 机制、[#519](https://github.com/VirusPC/edges-brain-viruspc/pull/519) 编码 Agent 用户打断是否带入下一轮。对话依据：Grok Bot（2026-11-17 15:12「刚刚说的都记录笔记。记录到合适的project下，之前有聊过PTL、Code mode 这些」、17:09「以 goal 为研究对象，起一个笔记。」）；DIY Coding Agent（2026-11-20 11:03–11:47「沉淀笔记」「沉淀project里」「记录，」）。其中 11-17 15:52 追问「ptl 或者 code mode 的技术难点」与 Code Mode 同脉络，未另单开 PTL 笔记。
- `projects/memory/notes/` 1 篇（#514）：以项目为中心的记忆缺口、仓库归属、分支与回滚。
- `projects/2026-11-09--dsh/notes/` 1 篇（#516）：Cordis 插件依赖与 Unity 组件模式对比。
- 根 `notes/` 4 篇：#516 评测与任务卡里已证实的失败模式（对应 Agent Eval 专家 2026-11-18 17:19–17:36 排查 failure mode）；#517 3 篇（cloudflare agents、edges 记忆作用域分享稿、开源 personal agent 主动性）。
- `projects/2026-10-31--仓库快照下的端到端-harness-评测/notes/` 11 篇评测论文十问笔记（[#542](https://github.com/VirusPC/edges-brain-viruspc/pull/542)）。对话依据：Grok Bot，2026-11-21 14:49（Asia/Shanghai），「10个agent 并行读一下吧，放到合适的Project里。」
- 另框架 [#133](https://github.com/VirusPC/edges/pull/133) 补实验说明 `packages/evaluation/experiments/harness_memory_ablation/harbor/synthetic/DATASET.md`（对话依据：Coding Agent 专家，2026-11-17 20:02–20:30），属实验文档而非 notes 模块。

**Project**

已落仓：本周无新建 Project，也无只有卡未写正文的新 Project；仅更新 4 个已有 Project 的 `INDEX.md`（公开脑 #498 `ai-研发流程优化`、#516 `dsh`、#542 `端到端-harness-评测`；框架 #129 `code-review`）。另 #531 为 `site/` 初始化 `.edges` 子作用域（属作用域而非 Project）。

只有卡、正文未写：无。

**不在六类内的主要产出**：AI 资讯期刊 [#518](https://github.com/VirusPC/edges-brain-viruspc/pull/518)（11-20 期）与 [#570](https://github.com/VirusPC/edges-brain-viruspc/pull/570)（重写四期旧刊）；`site/` 改版（46 个合入 PR 涉及 `site/`）；teaching 课程 [#508](https://github.com/VirusPC/edges-brain-viruspc/pull/508)（always-on-agents 7 课）与 [#510](https://github.com/VirusPC/edges-brain-viruspc/pull/510)（Super-agent 9 课）。

### CI 与 Deploy

- **公开脑 Deploy（窗内 63 次：成功 60、失败 2、取消 1；累计失败 7 例）：**
  - [45016523038](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/45016523038)（2026-11-22 19:16:46 Asia/Shanghai，随 #570）：倒在 `Pull personal checkout on ECS`，日志为 `fatal: unable to access 'https://ghproxy.net/https://github.com/VirusPC/edges-brain-viruspc.git/': The requested URL returned error: 502`。
  - [45020855686](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/45020855686)（2026-11-22 20:09:49 Asia/Shanghai，随 #571）：倒在同一步骤，日志返回 **500**。
  - 取消 1 次：[44703618196](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/44703618196)（2026-11-20 16:34:24 Asia/Shanghai，随 #514），jobs 列表为空，日志无记录且对话层未见提及，不推测原因。
  - 历史累计 7 例 = 上两期正文记录 5 例（`40466959447`、`41290110198`、`43022310294`、`43033824548`、`43604430722`）+ 本周 2 例。
- **Pages site：** PR 触发 123 次（成功 121、失败 2：[44653706170](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/44653706170)、[45029277174](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/45029277174)），main push 触发 57 次（成功 56、失败 1：[45007523232](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/45007523232) 随 #568 失败，在下一个 main push [#569](https://github.com/VirusPC/edges-brain-viruspc/pull/569) 修好），失败均由站点测试断言拦下。
- **框架：** Frozen install 9/9 成功；窗内无 Publish 或 Deploy run。

### 未合入与关闭

公开脑关闭未合入 1 个（#515，与已合入 #516 重复）；窗内新建仍 open 7 个（[#544](https://github.com/VirusPC/edges-brain-viruspc/pull/544)、#550、#564、[#567](https://github.com/VirusPC/edges-brain-viruspc/pull/567)、[#572](https://github.com/VirusPC/edges-brain-viruspc/pull/572)、#573、#574）。框架 #120 仍 open；私密脑 #18、#20 仍 open。

## 为什么

- **上期三条建议再次未闭环，仓库可证的是「没有对应收口提交」，不是用户否决。** 点名卡时间戳未变、`deploy.yml` 0 commit、点名 feedback 不在公开脑，对话层 742 条用户消息中也未见叫停、改口或排期。可能因为三条都属于文书或收尾性质，本周未分配专门执行轮次。
- **Deploy 同类失败继续出现。** 两次失败日志均明确指向 ECS 经 `ghproxy.net` 拉取 GitHub 返回 502/500；在未修改 workflow 或未书面写明「故意保留并接受偶发 5xx」之前，每次变红仍只能重读日志。
- **任务看板只增不出、AI 资讯 skill 窗内改了 24 次。** 可能因为本周高强度推进转向了 AI 资讯改版（24 个 PR 改 skill）和个人脑站点建设（46 个 PR 碰 `site/`），规则和视觉边界在多轮验收中边跑边定，而大量对话里当场实现或先记卡的任务尚未进入 `done` 验收阶段；这只描述分布，不评判是否应当先开卡。
- **执行先后与下游重算曾出现偏差。** Grok Bot（2026-11-22 20:45–21:11，Asia/Shanghai）对话显示，助手未按用户指定的「先补数据、再补其他」顺序执行而擅自并行，且未在中间节点变化时重算下游，随后才被用户叫停并写入待审硬约束 PR #573。
- **该保持的：**
  - 公开脑 63 个合入与 first-parent 一一对应，没有直推 `main`。
  - 站点 Pages 测试本周 3 次在合并前或合并后立刻拦下回归（#568 失败后下一个 PR #569 即修复）。
  - 框架 Frozen install 9/9 全绿。
  - 上期候选「编码 Agent 本机记忆」笔记（#505）和周复盘新规则（#506）本周均已落仓。
  - 站点子作用域约束（#531）同时落进了 `site/AGENTS.md` 硬约束和项目记忆，没有只停在口头。

## 下次做什么

（注：以下至多 3 条为复盘建议，并非用户已批承诺；上期建议同理。）

1. **公开脑 Deploy 写成仓内结论，并二选一落地。**
   - **来源：** 上期建议 2（第三次结转；本周再增 2 例，累计 7 例）。
   - **完成标准：** 有 PR 修改 `.github/workflows/deploy.yml` 或其拉取依赖，**或者**在公开脑写入短说明 / 本期 `COMMENTS.md`，写明「故意保留 ECS SSH + ghproxy、接受偶发 5xx」，并列出全部 7 个 run id（`40466959447`、`41290110198`、`43022310294`、`43033824548`、`43604430722`、`45016523038`、`45020855686`）。
2. **收口看板卡面。**
   - **来源：** 上期建议 1 与 3 合并结转（对话层未见叫停、改口或排期）。
   - **完成标准：**
     - 框架拆仓卡离开 `in_progress`，或在卡内写明与公开脑 `done` 的对应关系。
     - `feedback_retro_comments_in_separate_file` 迁进公开脑 `.edges/memory/feedbacks/`，或书面写明「故意只留框架」。
     - 上期点名六张卡（框架 3 张 10-31 评测卡、公开脑 routines 分组卡、日复盘 Langfuse 旁路卡、框架 `harness-模块插件化` 卡）每张至少有一句可检验的完成标准，插件化卡写明以 ADR 0046 为准或要修订它。
     - 若决定继续占位，在本期 `COMMENTS.md` 写明，下期不再重复验收本条。
3. **写出 `edges-create-edges` skill 正文（是否排期待你定）。**
   - **来源：** 建议补充内容清单第 1 条（上期方向，已有 high 优先级卡 #497、#503、#504；11-16 周复盘对话点名后未见排期原话）。
   - **完成标准：** `main` 上落成 `edges/.edges/skills/edges-create-edges/` 正文，写明「一句话 + 解释 + 参考资料」与单点精简格式，`edges/` 已初始化 `.edges`，并勾掉卡面原有完成标准。

## 展望

以下为本周会话与仓库中已冒出、尚未收成可执行路线的新方向（2 条上期方向的新进展 + 3 条本周对话层新方向）。AI 资讯页具体的视觉、标签与栏目改版细节不作为新展望条目；所有条目均不把「已开卡」写成「已完成」。

1. **AI 资讯从「一篇周报」走向「有契约的数据流水线」（上期「个人 Dashboard 框架与重构 AI 资讯」方向的新进展）。**
   - **依据：** 仓库中 #538 将价格/速度排名写进快照、#568 将关键词写进采集快照、open 的 #574 尝试把数据流收进 skill，窗后合入的 #575（仅作演进佐证，不计入本周）定下 `raw` / `cleaned` / `summary` 三阶段文档结构；对话中用户（Grok Bot，2026-11-21 00:52，Asia/Shanghai）问「是不是从数据层就要补充上？我是说那个数据仓库。」，2026-11-22 21:12–21:34 要求「应该写清楚整个流程。」「应该有种数据流的感觉。」「所有的数据最后都要写入数据仓。每一步数据处理后的数据都应该放入数据仓。」，23:18 拍板「没问题。整个这个架构在Skill里面也记录一下吧。」，23:30 给出目录决定（**转写截断**，可见部分定下 `self` / `per-item` / `allow`）并在 23:40 定名「raw，cleaned，summary，改名这三个目录吧」。
   - **与「下次做什么」的区别：** 本周个人 Dashboard 框架本身未再推进，三阶段的数据迁移与脚本改造在窗末也尚未完成，属持续演进中的架构方向，不等同于三条结转行动。

2. **把日复盘沉淀为 `dream` 机制（上期「dream 机制」方向的新进展）。**
   - **依据：** 对话中用户（任务记录员，2026-11-17 18:18，Asia/Shanghai）说「记录一个任务。把日复盘沉淀为dream机制」，20:06「合并吧」；仓库对应框架 [#132](https://github.com/VirusPC/edges/pull/132)（`backlog`，仅写「待定问题（出栈前 grill-with-docs）」）。
   - **与「下次做什么」的区别：** 本周只是记卡并把对象收窄到日复盘，尚未做出机制或例程设计；区别于「下次做什么」第 2 条的旧卡收口。

3. **把 `edges` 拆成主框架与 `personal harness` 扩展（对话层新方向 1）。**
   - **依据：** 对话中用户（任务记录员，2026-11-16 10:28–10:32，Asia/Shanghai）说：「记录一个高优任务，将edges拆为主框架和personal harness 扩展。edges框架要保持简洁和具备可扩展性，包含memory、task等核心模块，并支持自由注册模块；personla harness包括一些内置的routine，以及personal evaluation，以及edges、posts 等打通知识分发和获取反馈的模块等。」「以及打通各个输入场景的获取输入的模块等。」「改为urgent吧」；仓库对应框架 [#131](https://github.com/VirusPC/edges/pull/131)（`backlog`，`urgent`，写「完成标准待 grill-with-docs 补」；公开脑 #561 读者反馈渠道与 #536 Star 引导卡也呼应了知识分发与反馈环节）。
   - **与「下次做什么」的区别：** 卡面已写明它拆分的是「模块和能力」，而非上期建议 1 里旧拆仓卡的「内容和仓库」；目前只有任务卡，尚未做模块边界设计与拆分路线。

4. **用记忆作用域讲清 `edges`，并区分项目记忆与团队记忆（对话层新方向 2）。**
   - **依据：** 对话中用户（Grok Bot，2026-11-19 17:57，Asia/Shanghai，**转写截断**）给出讲稿：「从作用域的角度讲，记忆主要分成四种。工作记忆、用户记忆、项目记忆以及团队记忆。……所以，对于组织来说，更重要的是后两者。 一个是以项目仓库为中心的项目记忆。…… 另一个跨项目仓库的团队记忆。…… 回到edges，可以分三层去理解。 第一层，就是我们刚刚说的项目记忆。 （一句话介绍）用户可以为项目…」（后半段未落盘，不补写）；此前在 Agent Memory 专家（2026-11-17）用户多次追问跨人、跨 agent 的项目记忆系统，仓库对应探索见 #514 笔记。
   - **与「下次做什么」的区别：** 这是记忆分层与对外表述的新方向，尚未形成可执行架构或改造任务，与结转项无交叉。

5. **把一批 `notes` 收成可嵌套的 `projects`，统一列表展示并把 `teaching` 收进站内闭环（对话层新方向 3）。**
   - **依据：** 对话中用户（Grok Bot，2026-11-22 10:57，Asia/Shanghai）说：「感觉很多notes应该改为projects ？」「至少从语雀迁移到edges又迁移到notes的」，11:05–11:58 讨论嵌套 project 展示并「可以，按这个开发」，12:50「能不能不直接跳teaching 站点，站内闭环掉」，14:03「合并teaching」；仓库中 [#541](https://github.com/VirusPC/edges-brain-viruspc/pull/541)、[#565](https://github.com/VirusPC/edges-brain-viruspc/pull/565)、[#566](https://github.com/VirusPC/edges-brain-viruspc/pull/566) 已把统一列表与站内浏览 `teaching` 上站。
   - **与「下次做什么」的区别：** 站点呈现已先行一步，但哪些存量 `notes` 要迁移成 `projects`、长期信息架构如何划分尚未形成迁移路线，不把展示上线写成迁移已完成。

## 建议补充内容清单

以下将仓库层 8 条与对话层 11 条候选合并去重，共列出 **9 条** 仍缺正文、需要裁定或刚开待审 PR 的条目。已有完整模块正文或已合入落地的条目不重复列入：其中站点多端与明暗硬约束（已随 #531 落入 `site/AGENTS.md` 与记忆）、AI News 笔记卡设计原则（已随 #546 落入 `site/.edges/memory/projects/project_note_card_design/`）、Code Mode / Goal / 打断笔记（#512、#513、#519）均已落仓；`open-grokbot` 的 GitHub Actions 卡与项目记忆开在 `VirusPC/open-grokbot#5`（四仓外）。上期遗留但本周对话未再提及的「测 skill 换干净 agent」feedback 与 `--super` 原则（框架 #120 仍 open）维持待确认，不新占条目。

### 1. Skill：`edges-create-edges` 正文
- **类型：** Skill
- **正文要点：** 写出把观点、洞察、判断写成「一句话 + 解释 + 参考资料」单点精简条目的 `edges-create-edges` skill 正文，并初始化 `edges/.edges`。
- **落点：** 公开脑 `edges/.edges/skills/edges-create-edges/`（对齐卡 `tasks/backlog/2026-11-15--个人大脑根目录新建-edges存观点与判断并加-edges-create-edges-skill/`，不另开卡）。
- **依据：** 仓库 #497、#503 开卡，本周 #504 只加一行背景，窗末 `main` 无该 skill 与 `edges/.edges`；对话中周复盘（2026-11-16 12:54–12:56，Asia/Shanghai）助手说明仅留在复盘正文、无单独文件，未见再提或排期。
- **为什么值得补：** 卡面已是 high 优先级且格式已定，dream 机制也依赖它作为产出入口。
- **不补的代价：** 向 `edges/` 写条目缺少统一 skill 规范，格式易再漂移。
- **状态：** 待你确认（已列为「下次做什么」第 3 条，是否排期待你定）。

### 2. Routine：「复盘的复盘」例程正文与 badcase 回归
- **类型：** Routine
- **正文要点：** 写明触发时机、回看范围，以及 badcase 如何进入 eval 与回归测试；明确采用独立例程还是挂进现有日复盘 / 周复盘。
- **落点：** 公开脑 `routines/` 子作用域，或合入 `.edges/routines/` 现有复盘例程（已有卡 `routines/.edges/tasks/backlog/2026-11-15--增加复盘的复盘让-badcase-能-eval-和回归/`）。
- **依据：** 仓库卡时间戳停在 2026-11-15，无例程 `INDEX.md` 或回归流程（本周 AI 资讯回归靠站点 Pages 测试 3 次拦下，复盘层无对应回归）；对话中 11-16 周复盘点名后无新的用户原话。
- **为什么值得补：** 复盘自身的漏收与误判目前只能靠人工再发现。
- **不补的代价：** 同类遗漏继续反复发生。
- **状态：** 待你确认。

### 3. Note / `COMMENTS.md` 或 workflow PR：Deploy 失败的仓内结论
- **类型：** Note / `COMMENTS.md` 或 workflow PR
- **正文要点：** 汇总累计 7 例 Deploy 失败的 run id 与日志依据，并在「修改 `.github/workflows/deploy.yml` / 依赖」与「书面写明故意保留 ECS SSH + ghproxy、接受偶发 5xx」之间二选一落地。
- **落点：** 公开脑 `.github/workflows/deploy.yml` PR，或短说明 / 本期 `COMMENTS.md`。
- **依据：** 仓库 `deploy.yml` 窗内 0 commit；本周再增 `45016523038`（502）、`45020855686`（500）两例，累计 7 例；对话层未见用户叫停或写结论要求。
- **为什么值得补：** 已连续三期结转，失败仍在继续出现。
- **不补的代价：** 下次 Deploy 变红仍要重新从零查日志。
- **状态：** 待你确认（已列为「下次做什么」第 1 条）。

### 4. Memory / Skill / Routine：AI 资讯三阶段数据流落库与 `#574` / `#575` 冲突收口
- **类型：** Memory / Skill / Routine
- **正文要点：** 裁定公开脑 `.edges/memory/feedbacks/` 中两条流程契约 feedback 的去留——窗后 #575 已合入 `feedback_ai_news_three_stages`，而仍 open 的 #574 拟新增 `feedback_ai_news_dataflow_lives_in_skill` 且修改同一批 `references/`（对话里助手曾指出其属未批准旧契约）；同时把三阶段架构、备用数据源兜底与数据仓目录迁移落到脚本和 routine。
- **落点：** 公开脑 `.edges/memory/feedbacks/`、`skills/managed/weekly-ai-blogs-digest/` 与 `.edges/routines/weekly-ai-blogs-digest/INDEX.md`。
- **依据：** 对话中 Grok Bot（2026-11-21 18:14）「还是做好兜底。routine的.edges里写清楚」、（2026-11-22 23:18）「整个这个架构在Skill里面也记录一下吧」、23:30 数据仓决定（**转写截断**）、23:40「raw，cleaned，summary，改名这三个目录吧」，当晚文档未合并、数据未迁移；仓库中窗末 #574 仍 open（Pages 检查 `45029277174` 失败），#575 于 2026-11-23 00:04 合入。
- **为什么值得补：** 两条 feedback 与两套目录契约并存会导致后续改 skill 无所适从，脚本与数据未迁移前新契约只停在文档。
- **不补的代价：** 误合 #574 会与现行三阶段目录冲突，routine 仍按旧模式运行。
- **状态：** 待你确认（窗末/窗后事件，待人工裁定是否关闭 #574 并排期迁移）。

### 5. Task：记忆检索实验「未验证沉淀效率」待办
- **类型：** Task
- **正文要点：** 记录一条评测缺口任务——现有记忆检索实验只验证了检索效率，尚未验证沉淀效率，需补对应指标或实验方案。
- **落点：** 框架 `VirusPC/edges` 的 `.edges/projects/2026-09-11--evaluation/tasks/backlog/`。
- **依据：** 对话中 Coding Agent 专家（2026-11-17 20:35，Asia/Shanghai），用户明确说「记录一个待办。这里只验证了检索效率，没有验证沉淀效率。」；经全量核对，两仓窗内均未出现该新卡（框架仅在 #134 更新了已有沉淀成本卡）。
- **为什么值得补：** 这是用户明确要求记录的待办，直接影响评测维度是否完整。
- **不补的代价：** 评测继续缺沉淀效率这一半结论，对话里的口头待办会被忘掉。
- **状态：** 待你确认。

### 6. Task：消除 `#550` 与已合入 `in_review` 卡（`#561`）的冲突
- **类型：** Task
- **正文要点：** 关闭重复的 open PR #550，或改成仅补充卡面信息，避免「给个人知识库站点加基于 GitHub 的读者反馈渠道」一卡同时存在于 `backlog/` 与 `in_review/`。
- **落点：** 公开脑 `projects/2026-09-13--site-and-content/tasks/` 及 PR #550。
- **依据：** 对话中视觉&交互&设计专家（2026-11-21 20:37–20:39，Asia/Shanghai）要求「记录task」；仓库中 #561 已将功能与同名卡合入 `in_review/`，而 #550 仍 open 且拟在 `backlog/` 再建同名卡。
- **为什么值得补：** 卡与实现已合入待验收，不应再留重复的 `backlog` 卡。
- **不补的代价：** 误合入 #550 会造成看板状态分裂与计数失真。
- **状态：** 待你确认。

### 7. Task：卡面完成标准补齐（上期 6 张 + 本周新卡 `edges#131`、`edges#132`、`#536`）及新卡设计正文
- **类型：** Task（及对应 Design / Routine 正文）
- **正文要点：** 为上期 6 张卡补可检验完成标准并使插件化卡对齐 ADR 0046；为本周 3 张新卡（`edges#131` urgent 主框架/personal harness 拆分、`edges#132` 日复盘 dream 机制、`#536` 文末介绍与 Star 引导）补齐完成标准段；并在 grill 后补出 `edges#131`、`edges#132` 的模块设计与机制正文。
- **落点：** 各卡 `INDEX.md`（上期 6 张已并入「下次做什么」第 2 条；本周 3 张位于框架与公开脑对应看板）。
- **依据：** 仓库中上期 6 张卡时间戳未变，`edges#131` 写「完成标准待 grill-with-docs 补」，`edges#132` 只有「待定问题」，`#536` 无完成标准段；对话中用户已要求记卡（任务记录员 11-16 10:28–10:32、11-17 18:18；Grok Bot 11-21 00:22），设计尚未展开。
- **为什么值得补：** urgent 与高优卡缺完成标准时无法验收，也推不动后续设计落库。
- **不补的代价：** 看板持续只增不出，新旧空标准卡越积越多。
- **状态：** 上期 6 张已并入「下次做什么」第 2 条；本周 3 张新卡与后续设计正文 **待你确认**。

### 8. Project / `AGENTS.md` 约定：公开脑 `site-and-content` 与 `agent-clients-ux` 双位置收口
- **类型：** Project / `AGENTS.md` 约定
- **正文要点：** 明确公开脑中 Project 应统一放在根 `projects/` 还是 `.edges/projects/`，并将两处 INDEX 相同但卡片分散的 `site-and-content`（`.edges/projects/2026-09-10--site-and-content/` 与 `projects/2026-09-13--site-and-content/`）以及同现双份的 `agent-clients-ux` 收口到单一位置。
- **落点：** 公开脑根 `AGENTS.md` 或一条 project memory，随后迁移或标注废弃旧目录。
- **依据：** 仓库 `git ls-tree 69dcf6ac` 显示两处并存；本周 #536（Star 引导卡）写进 `.edges/projects/` 下的目录，而 #561、#550 写进根 `projects/` 下的目录；对话层未见用户约定此拆分是有意为之。
- **为什么值得补：** 同一主题的任务分散在两个位置，开卡 agent 容易继续落错。
- **不补的代价：** 看板检索与计数漏卡，站点项目列表也可能出现重复或遗漏。
- **状态：** 待你确认。

### 9. `AGENTS.md` 硬约束：按指定顺序执行，且上游变化须重算下游
- **类型：** `AGENTS.md` 硬约束
- **正文要点：** 用户明确指定步骤先后时不得擅自并行；上游/中间节点发生变化后，所有依赖下游必须失效并重算、重新验证。
- **落点：** 公开脑根 `AGENTS.md`（PR #573 已开）。
- **依据：** 对话中 Grok Bot（2026-11-22 20:45–21:11，Asia/Shanghai），「先补数据，再补其他。」「为什么不严格按照我说的顺序？」「这个edges里面需要记录一下。」「中间节点发生变化，后面的节点都应该跟着重新计算呀。」「这个应该记住。」；仓库中 #573 仅改根 `AGENTS.md`（对话核对两条规则均已写入该 PR，窗末仍 open）。
- **为什么值得补：** 这是本周对执行纪律最明确的用户纠正，已有成文 PR，只差人审合入。
- **不补的代价：** 约束留在 open PR 里不生效，后续仍可能越序并行或漏重算。
- **状态：** 待你确认（已有 open PR #573 待人审，本复盘不催合）。
