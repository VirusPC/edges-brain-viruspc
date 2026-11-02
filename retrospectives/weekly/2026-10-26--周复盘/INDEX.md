# 2026-10-26 周复盘

## 范围

2026-10-26 00:00 至 2026-11-01 23:59（Asia/Shanghai；UTC 对照窗 `2026-10-25T16:00:00Z`～`2026-11-01T15:59:59Z`）。仓库层只读 Compose 工作区根 [VirusPC/edges-workspace-viruspc](https://github.com/VirusPC/edges-workspace-viruspc)（`AGENTS.md`：三顶层 submodule 挂框架 / 公开脑 / 私密脑），并覆盖：

| 仓 | 窗内 merged PR | main 窗内 commit | 备注 |
| --- | ---: | ---: | --- |
| [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)（公开脑） | 42 | 53 | Deploy / Pages site 有运行 |
| [VirusPC/edges](https://github.com/VirusPC/edges)（框架） | 35 | 47 | Frozen install / Publish 有运行；Deploy 仅 `workflow_dispatch`，窗内 0 次 |
| [VirusPC/edges-brain-viruspc-private](https://github.com/VirusPC/edges-brain-viruspc-private)（私密脑） | 3 | 3 | **可读**；公开正文不写私人内容 |
| [VirusPC/edges-workspace-viruspc](https://github.com/VirusPC/edges-workspace-viruspc)（工作区根，可选） | 7 | 8 | 主要是随框架发版刷新随包技能与 submodule 指针 |

对照了两仓 `.edges/tasks` 与上期行动相关卡路径、公开脑 `retrospectives/daily/`、框架/公开脑 Actions（Deploy、Frozen install、Publish、Pages site）、框架 releases/tags。

对话层主要依据本周日复盘正文（10-26/27/28/30/31、11-01）与 `daily-scan` 摘要 jsonl；周复盘例程本身未直读各助手全量转写。**10-29 无独立日复盘与 scan 目录，由 10-30 篇加长窗（自 10-29 05:18）覆盖。**

公开脑日复盘：有 10-26、10-27、10-28、10-30、10-31、11-01；**缺 10-29 日历篇**（对话已被加长窗覆盖，日历篇是否补写仍待定，见建议清单）。

## 本该怎样

这周事先没有单独写下的显式周目标（仓库内未找到「本周目标」类定稿；日复盘与看板卡是日常推进，不事后画靶）。

对照上期 [2026-10-19 周复盘](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-10-19--周复盘/INDEX.md)「下次做什么」（该目录无 `COMMENTS.md`）：

1. **收口框架侧「拆仓」in_progress 卡**，并核对公开脑 done / 口头 R6；顺带裁定 #332 后根反馈记忆是否迁回公开脑。完成标准：框架 `.edges/tasks` 里 `2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去` 不再停在 in_progress（或卡上写明对应）；`feedback_retro_comments_in_separate_file` 等复盘向反馈在公开脑可读，或说明故意只留框架仓。
2. **查清公开脑 Deploy 窗后段零星失败**；完成标准：最近一周公开脑 Deploy 失败有归因，并有对应 PR 或「故意保留」书面说明。
3. **评测 / Langfuse / routines 新 backlog 补完成标准**；插件化五问先裁定与 ADR 0046 关系。完成标准：相关卡每张至少一句可验收完成标准；插件化 grill 第 5 题书面以 ADR 0046 为准或显式改 ADR。

## 实际怎样

### 上期行动验收

1. **没做成。** 框架卡仍在 [`edges-extensions/in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去`](https://github.com/VirusPC/edges/tree/main/.edges/tasks/edges-extensions/in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去)，front matter `edges-tasks-status: in_progress`，完成标准后三项仍为未勾。公开脑同名卡已在 [`edges-extensions/done/...`](https://github.com/VirusPC/edges-brain-viruspc/tree/main/.edges/tasks/edges-extensions/done/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去) 且四项完成标准已勾——两侧状态仍不一致。`feedback_retro_comments_in_separate_file` 仍只在框架 [`.edges/memory/feedbacks/feedback_retro_comments_in_separate_file`](https://github.com/VirusPC/edges/tree/main/.edges/memory/feedbacks/feedback_retro_comments_in_separate_file)；公开脑根 `.edges/memory/feedbacks/` **404**，code search `feedback_retro_comments_in_separate_file` 在公开脑 **0 命中**；仓库内也**找不到**「故意只留框架仓」的书面说明。对话层：全窗未见用户说「关掉/不做」该条。

2. **没做成（失败可归因，但无修复 PR / 无「故意保留」说明）。** 窗内公开脑 Deploy：**42** 次（success **36** / failure **2** / cancelled **4**）。两例失败日志归因如下（非编造，来自 Actions log）：
   - [run 40466959447](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/40466959447)（约 2026-10-27 15:25 Asia/Shanghai）：ECS 上经 `ghproxy.net` fetch 公开脑时 **HTTP 502**。
   - [run 41290110198](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/41290110198)（约 2026-11-01 17:04 Asia/Shanghai）：SSH 连 ECS **Timeout, server not responding**（步骤 `Pull personal checkout on ECS`）。
   窗内未找到针对上述根因的修复 PR，也未找到「故意保留现状」的仓库书面说明。取消的 4 次集中在 11-01 密集 push main 时段（例：[41290139151](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/41290139151) 等）。另：公开脑新增 **Pages site** workflow，窗内 **17** 次 **全部 success**（自 Astro 博客 [#417](https://github.com/VirusPC/edges-brain-viruspc/pull/417) 一带起）。对话层：未见用户关掉本条。

3. **没做成（局部有进展，整体未达标）。**
   - **已收口一例：** 框架 [#70](https://github.com/VirusPC/edges/pull/70)（2026-10-27 合入）验收 Langfuse 接入 skill 评测并收口母卡；母卡现见 [`evaluation/done/2026-10-25--框架附带可接入评测能力含-Experiment-Webhook-适配层`](https://github.com/VirusPC/edges/tree/main/.edges/tasks/evaluation/done/2026-10-25--框架附带可接入评测能力含-Experiment-Webhook-适配层)。（[#63](https://github.com/VirusPC/edges/pull/63) 曾开过同主题，closed 未 merge，由 #70 承接。）
   - **仍缺完成标准 / 明确写「grill 后补」的卡仍在：** 框架高优新卡如 [`2026-10-31--Memory-AB-...`](https://github.com/VirusPC/edges/tree/main/.edges/tasks/evaluation/backlog/2026-10-31--Memory-AB-分流量开关与-Langfuse-标签评测)、[`Memory-消融实验正式报告`](https://github.com/VirusPC/edges/tree/main/.edges/tasks/evaluation/backlog/2026-10-31--Memory-消融实验正式报告)、[`目录结构消融...`](https://github.com/VirusPC/edges/tree/main/.edges/tasks/evaluation/backlog/2026-10-31--目录结构消融实验程序与报告) 正文写「动作与完成标准 grill 后补」；公开脑 [`routines-目录下增加-Project-分组层`](https://github.com/VirusPC/edges-brain-viruspc/tree/main/.edges/tasks/_default/backlog/2026-10-23--routines-目录下增加-Project-分组层) 无完成标准段；[`日复盘旁路接入-Langfuse...`](https://github.com/VirusPC/edges-brain-viruspc/tree/main/.edges/tasks/_default/backlog/2026-10-25--日复盘旁路接入-LangfuseCodexCursorGrok-主源仍用-ReadTranscript) 写「完成标准待 grill-with-docs 补」。另有卡**已有**完成标准（如公开脑「Grok Bot 会话每小时写入 Langfuse」「OpenCode/Pi tags 缺口」「验收 evaluation 迁移…」），故本条是「相关卡未全部补齐」，不是「一张都没写」。
   - **插件化 vs ADR 0046：** 框架 [`edges-extensions/backlog/2026-10-21--harness-模块插件化`](https://github.com/VirusPC/edges/tree/main/.edges/tasks/edges-extensions/backlog/2026-10-21--harness-模块插件化) 仍 backlog，完成标准「待 grill-with-docs」；[ADR 0046](https://github.com/VirusPC/edges/blob/main/docs/adr/0046-content-face-org-list.md) 在窗后（文内记 2026-11-02 修订）仍强调叶子登记在模块 README、不回落 AGENTS——卡上**未见**书面「以 ADR 0046 为准」或「显式改 ADR」的裁定句。
   - **对话补充：** 用户 10-31 15:24 一次抛出 eval / AI 工作流 / edges / 个人主页等高优清单（任务记录员 jsonl）；助手 15:25:34 称「按你的确认，整批落高优 backlog，细节 grill 后补」并开框架 [#83](https://github.com/VirusPC/edges/pull/83)、公开脑 [#411](https://github.com/VirusPC/edges-brain-viruspc/pull/411)。用户确认句本身 **日复盘转述，未见更早原话**（15:24～15:25 间无写入索引的用户确认行）。这与上期「每张至少一句完成标准」冲突——本周选择了「先占位」。

### 本周仓库主线（无事先周目标下的实际产出）

#### 工作区：Compose 卸载 → 三顶层 git submodule

- **对话依据：** 用户（Grok Bot，2026-10-26 10:55:45）：「突然觉得，edges & edges-brain-viruspc & edges-brain-viruspc-private，不应该被compose。他们本身不是这个workspace的harness，应该是子目录？」；10:56:58：「compose卸载，改成子目录的git modules吧。」→ 工作区 [#10](https://github.com/VirusPC/edges-workspace-viruspc/pull/10)。

#### 材料目录 `.harness` → `.edges` 与随包技能硬切断

- 框架 [#67](https://github.com/VirusPC/edges/pull/67)、公开脑 [#391](https://github.com/VirusPC/edges-brain-viruspc/pull/391)、私密脑 [#6](https://github.com/VirusPC/edges-brain-viruspc-private/pull/6)、工作区根同日指针更新：材料目录硬切 `.edges`。
- 随包技能/标记改 `edges-*`：框架 [#76](https://github.com/VirusPC/edges/pull/76)→[#78](https://github.com/VirusPC/edges/pull/78)；公开脑 [#400](https://github.com/VirusPC/edges-brain-viruspc/pull/400)；工作区 [#12](https://github.com/VirusPC/edges-workspace-viruspc/pull/12)/[#13](https://github.com/VirusPC/edges-workspace-viruspc/pull/13)。
- 废止 shared-extensions：框架 [#72](https://github.com/VirusPC/edges/pull/72)、公开脑 [#397](https://github.com/VirusPC/edges-brain-viruspc/pull/397)；通用 skill 改归使用方 `skills/managed`（框架 [#73](https://github.com/VirusPC/edges/pull/73)、公开脑 [#398](https://github.com/VirusPC/edges-brain-viruspc/pull/398)）。
- **对话依据：** 用户纠正脑仓理解——「还有个问题，脑仓的README格式不对吧。不符合.edges的规范要求？」（全栈，2026-10-27 15:59:09）；「你脑子转不过来？把brain仓库看做.edges目录，根README本身也是索引呀。」（16:01:31）。另：「你为什么老是不用html-plan呀」（21:50:20）——与根 AGENTS「grill 后先中文 html-plan」硬约束（[#66](https://github.com/VirusPC/edges/pull/66)）同日氛围。
- 随包 skill 收敛为总入口 `edges`：框架 [#80](https://github.com/VirusPC/edges/pull/80)；用户记忆技能改名等 [#79](https://github.com/VirusPC/edges/pull/79)。**对话依据：** 用户经 Respond 确认总入口名 `edges`、并入清单等（全栈，2026-10-27 22:20～22:42）。据日复盘转述：曾落 project 记忆「随包 skill 默认一个 edges 总入口」。

#### npm 发版（框架）

窗内 Publish workflow **4 success / 0 failure**：`@viruspc/edges@0.2.7`（[#50](https://github.com/VirusPC/edges/pull/50)）、`0.3.0`（随 [#67](https://github.com/VirusPC/edges/pull/67)）、`0.4.0`（[#77](https://github.com/VirusPC/edges/pull/77)）、`0.4.1`（[#81](https://github.com/VirusPC/edges/pull/81)）。另有 GitHub Release [v1.7.0](https://github.com/VirusPC/edges/releases/tag/v1.7.0)（约 2026-10-26 01:41 Asia/Shanghai）。Frozen install：**72 success / 0 failure**。

**对话补充：** 用户（Grok Bot，2026-10-28 00:09:21 / 00:09:30）：「框架仓的README有问题。安装方式应该让大家直接装Skill就好了呀。」「npx skills」。审 [#401](https://github.com/VirusPC/edges-brain-viruspc/pull/401) 时否掉补开跟踪卡——**日复盘转述，未见更早原话**。

#### 站点 / 内容面（公开脑）

- Astro 双轨博客与 Pages：[#417](https://github.com/VirusPC/edges-brain-viruspc/pull/417) 及后续 notes/projects 布局 [#418](https://github.com/VirusPC/edges-brain-viruspc/pull/418)～[#424](https://github.com/VirusPC/edges-brain-viruspc/pull/424)；框架侧笔记标题去日期前缀 [#84](https://github.com/VirusPC/edges/pull/84)。
- AI 周报 RSS 优先、OPML 真源：[#413](https://github.com/VirusPC/edges-brain-viruspc/pull/413)；历史周报迁 `ai-news`：[#392](https://github.com/VirusPC/edges-brain-viruspc/pull/392)～[#394](https://github.com/VirusPC/edges-brain-viruspc/pull/394)。**对话依据：** 高优清单原话含「从简单网站url改成RSS数据源…最好补充下实验，对比token消耗」（任务记录员，2026-10-31 15:24:01）；11-01 回报 OPML 已有「薅羊毛」组（未合）。
- 个人 Harness 评测项目与四框架对比：[#412](https://github.com/VirusPC/edges-brain-viruspc/pull/412)、[#414](https://github.com/VirusPC/edges-brain-viruspc/pull/414)；Agent 产品评测看板与 `_eval_*` 迁 done：[#425](https://github.com/VirusPC/edges-brain-viruspc/pull/425)～[#427](https://github.com/VirusPC/edges-brain-viruspc/pull/427)。
- 高优 backlog 落卡：公开脑 [#411](https://github.com/VirusPC/edges-brain-viruspc/pull/411)、框架 [#83](https://github.com/VirusPC/edges/pull/83)。

#### 公网接入 / 推广入口

- **对话依据：** 用户比较「nginx 统一反代 vs Cloudflare Tunnel、从长期维护角度」（IT资产管理，2026-10-26 14:28:05）→ Tunnel 公网接入笔记 [#388](https://github.com/VirusPC/edges-brain-viruspc/pull/388)。用户：「挂到github README和可以放网站链接的地方？」（全栈，2026-10-29 21:39:38）→ 框架 [#82](https://github.com/VirusPC/edges/pull/82)「Edges 小助手」合入。

#### 例程 / 周复盘基建

- 窗初框架 routines 模块 [#49](https://github.com/VirusPC/edges/pull/49)、公开脑接入 [#384](https://github.com/VirusPC/edges-brain-viruspc/pull/384)；上期周复盘正文 [#386](https://github.com/VirusPC/edges-brain-viruspc/pull/386)。
- 日复盘路径迁 `.edges` 后，10-26/10-27 曾需重放：[#396](https://github.com/VirusPC/edges-brain-viruspc/pull/396)、[#395](https://github.com/VirusPC/edges-brain-viruspc/pull/395)；原 [#385](https://github.com/VirusPC/edges-brain-viruspc/pull/385) closed **未 merge**（由 #396 承接）。10-28 日复盘为补跑（[#401](https://github.com/VirusPC/edges-brain-viruspc/pull/401)；据该篇转述：原例程因路径 404 错过）。[#402](https://github.com/VirusPC/edges-brain-viruspc/pull/402) 把 daily-scan 必读 Langfuse observations 写入例程文档。

#### 框架 README / 推广向文档

大量 docs PR（[#51](https://github.com/VirusPC/edges/pull/51)～[#62](https://github.com/VirusPC/edges/pull/62)、[#82](https://github.com/VirusPC/edges/pull/82) 等）重组首页、结构图与「Edges 小助手」入口；任务卡记录推广与 agents/teams 等（[#69](https://github.com/VirusPC/edges/pull/69)、[#71](https://github.com/VirusPC/edges/pull/71)）。

#### open-grokbot / 桌面壳（对话补充）

Electron/macOS 壳、同事页「创建房间」文案、坑点笔记 [#407](https://github.com/VirusPC/edges-brain-viruspc/pull/407)；公开脑跟踪卡 [#406](https://github.com/VirusPC/edges-brain-viruspc/pull/406) 等仍 OPEN。面向用户「开房」→「创建房间」见 Coding Agent 2026-10-29 15:19 回报；用户否决原话若未进索引则标 **日复盘转述，未见更早原话**。

#### 私密脑（范围声明）

窗内 3 个 merged PR（[#6](https://github.com/VirusPC/edges-brain-viruspc-private/pull/6) `.harness`→`.edges`；另两篇为私人材料入库）。公开正文不展开。

#### 未合但打开的 PR（截至今次起草）

- 公开脑 [#428](https://github.com/VirusPC/edges-brain-viruspc/pull/428)（周报订阅分栏）、[#429](https://github.com/VirusPC/edges-brain-viruspc/pull/429)（11-02 日复盘，已出本周窗外）。
- 框架 [#90](https://github.com/VirusPC/edges/pull/90)（README 优化项目）。

### CI 数字汇总

| Workflow | 仓 | success | failure | cancelled | 其他 |
| --- | --- | ---: | ---: | ---: | --- |
| Deploy | 公开脑 | 36 | 2 | 4 | 合计 42 |
| Pages site | 公开脑 | 17 | 0 | 0 | 合计 17 |
| Deploy | 框架 | 0 | 0 | 0 | 仅手动触发，窗内无 run |
| Frozen install | 框架 | 72 | 0 | 0 | 合计 72 |
| Publish @viruspc/edges | 框架 | 4 | 0 | 0 | 合计 4 |

### 日复盘覆盖

| 日期 | 有无日历篇 | 依据 PR（若有） |
| --- | --- | --- |
| 10-26 | 有（重放） | [#396](https://github.com/VirusPC/edges-brain-viruspc/pull/396) |
| 10-27 | 有（重放） | [#395](https://github.com/VirusPC/edges-brain-viruspc/pull/395) |
| 10-28 | 有（补跑） | [#401](https://github.com/VirusPC/edges-brain-viruspc/pull/401) |
| **10-29** | **无**（对话由 10-30 加长窗覆盖） | — |
| 10-30 | 有 | [#408](https://github.com/VirusPC/edges-brain-viruspc/pull/408) |
| 10-31 | 有 | [#410](https://github.com/VirusPC/edges-brain-viruspc/pull/410) |
| 11-01 | 有 | [#415](https://github.com/VirusPC/edges-brain-viruspc/pull/415) |

## 为什么

### 上期三条行动几乎都没闭环——可能因为结构改造吞吐压过了「看板收口」

可能因为本周大量合入落在 `.harness`→`.edges`、`edges-*` 硬切断、发版与站点 Astro，助手与 PR 队列优先推可合并的代码/文档，而「把已事实完成的拆仓卡改出 in_progress」「把 feedback 迁回或写明故意不迁」「给 Deploy 失败写说明」没有单独排进必合 PR。依据：框架拆仓卡 `edges-updated-at` 仍为 2026-10-21；feedback code search 公开脑 0；Deploy 两败有日志无对应修复 PR；对照窗内框架 35 / 公开脑 42 个合入里未见上述收口标题。对话层：未见用户明示关掉这三条，故属「没排进必合」而非「用户否决」。

### 工作区从 Compose 挂三仓改成顶层 submodule——因为用户认定三仓「不是 workspace 的 harness」

可能因为用户要简单入口：三仓应是子目录/git modules，而不是再被 Compose 当 harness 挂。依据：2026-10-26 10:55～10:56 原话（见「实际怎样」）；[#10](https://github.com/VirusPC/edges-workspace-viruspc/pull/10) 同日落地。

### Brain 被要求按「.edges 目录 / 根 README=索引」理解——因为废止 shared-extensions 后个人脑即共享 harness 面

可能因为框架只废止隔间、通用 skill 归使用方仓后，助手仍按「普通内容仓 README」改路径，被用户当场纠正。依据：2026-10-27 15:59～16:01 原话；ADR 0048 / [#75](https://github.com/VirusPC/edges/pull/75) 一带改写。

### Deploy 从「lockfile 红」变成「基础设施偶发红」

可能因为 Frozen install 已拦住安装类问题（框架 72/0），公开脑 Deploy 现只做 ECS teaching checkout，失败形态转为 **代理 502** 与 **SSH 超时**。依据：两例 failure log；`deploy.yml` 注释写明个人仓 Deploy 只 fast-forward personal checkout / teaching。

### 评测母卡能收口，新高优 backlog 却故意留空完成标准

可能因为用户对「先落高优 backlog、细节 grill 后补」有明确节奏（10-31 三张框架卡正文；助手 15:25:34 确认句），与上期「每张至少一句完成标准」的复盘行动目标冲突——本周选择了「先占位」而非「先可验收」。依据：三张卡原文「完成标准 grill 后补」；[#83](https://github.com/VirusPC/edges/pull/83)/[#411](https://github.com/VirusPC/edges-brain-viruspc/pull/411) 同日落高优；用户 15:24:01 清单原话；确认句 **日复盘转述，未见更早原话**。

### 资讯源改 RSS——因为用户要把 URL 列表升级为可对比消耗的数据源

可能因为高优清单把「AI资讯工作流」写成 RSS + token 实验。依据：2026-10-31 15:24:01 原话；[#413](https://github.com/VirusPC/edges-brain-viruspc/pull/413)。

### 日复盘在目录更名后出现断档与补跑——可能因为例程仍读旧路径

可能因为材料目录硬切后，平台例程/skill 路径未同步，导致 10-28 需补跑、10-26/27 需重放；10-29 则直接缺日历篇（对话仍由 10-30 加长窗覆盖）。依据：[#401](https://github.com/VirusPC/edges-brain-viruspc/pull/401) 标题「补跑」；据该篇转述「路径 404」；[#395](https://github.com/VirusPC/edges-brain-viruspc/pull/395)/[#396](https://github.com/VirusPC/edges-brain-viruspc/pull/396)「重放…到 .edges」；目录 listing 无 `2026-10-29--日复盘`；10-30 日复盘范围自 10-29 05:18。

### 该保持的

- **框架 Frozen install / Publish 全绿**（72/0、4/0）：安装与发版门禁本周可靠，应保持。
- **公开脑 Pages site 17/0**：博客静态发布与 Deploy（teaching SSH）解耦后更稳，应保持双轨而不是把站点又绑回 ECS SSH。
- **结构决策继续进仓**：`.edges` 更名、`edges-*` 切断、shared-extensions 废止、skill 总入口，都有成对框架+公开脑 PR，避免只改一仓；用户口头纠偏（Brain=.edges、Compose→submodule、html-plan）当天就进 PR。
- **日复盘断了能补**：重放/补跑 PR 存在，比静默缺天好；缺 10-29 仍需在清单里显式处理。

## 下次做什么

1. **收口框架「拆仓」卡 + 裁定复盘向 feedback 是否迁回公开脑（上期行动 1 结转）。** 完成标准：框架 `2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去` 离开 `in_progress`（标 done 或卡内写明与公开脑 done / R6 的对应）；`feedback_retro_comments_in_separate_file` 在公开脑 `.edges/memory/feedbacks/` 可读，或公开脑/本期 `COMMENTS.md` 写明故意只留框架仓。来源：上期下次做什么第 1 条；本周核对路径仍未变。对话层未见用户关掉。

2. **公开脑 Deploy：把本周两例失败写成仓内结论，并二选一落地。** 完成标准：有 PR 改 workflow/依赖（例如降低对单点 `ghproxy` 的依赖、或加重试/告警），**或**在公开脑 `COMMENTS`/笔记/ADR 级短文写明「故意保留 ECS SSH Deploy、接受偶发 502/超时」；两例 run 链接写进该说明。来源：上期行动 2；本周 [40466959447](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/40466959447)、[41290110198](https://github.com/VirusPC/edges-brain-viruspc/actions/runs/41290110198)。对话层未见用户关掉。

3. **给仍写「grill 后补」的高优评测/routines/旁路卡补至少一句可验收完成标准；插件化卡书面对齐 ADR 0046。** 完成标准：框架 10-31 三张高优 evaluation backlog、公开脑 routines Project 分组卡、日复盘 Langfuse 旁路卡，每张 INDEX 有可勾选/可检验的完成标准一句以上；插件化 backlog 出现「登记模型以 [ADR 0046](https://github.com/VirusPC/edges/blob/main/docs/adr/0046-content-face-org-list.md) 为准」或「显式修订 ADR」的句子。来源：上期行动 3；本周卡面原文与「细节 grill 后补」节奏。对话层未见用户关掉本条（反而强化了「先占位、后 grill」）。

## 建议补充内容清单

### 框架拆仓卡仍 in_progress（与公开脑 done 不一致）

- **是什么：** 拆仓事实已完成（公开脑 done 四项全勾），框架卡未收口。
- **建议去处：** 框架 `.edges/tasks/edges-extensions/.../2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去`。
- **为什么值得补：** 看板进度是错的，会重复开卡或误判未拆完。
- **不补代价：** 连续周复盘重复验收同一条。
- **处理结果：** 未处理（**延续**）。已列入下次做什么第 1 条。

### `feedback_retro_comments_in_separate_file` 仍只在框架仓

- **是什么：** 复盘 COMMENTS 约定反馈未回到公开脑根 feedbacks。
- **建议去处：** 公开脑 `.edges/memory/feedbacks/`，或书面「故意只留框架」。
- **为什么值得补：** 周复盘助手默认读公开脑；错仓则再次改 INDEX。
- **不补代价：** COMMENTS 约定继续只在框架侧被读到。
- **处理结果：** 未处理（公开脑 code search 0；**延续**）。已并入下次做什么第 1 条。

### 公开脑 Deploy 两例失败无仓内结论文档

- **是什么：** 502（ghproxy）与 SSH 超时已有 Actions 日志，缺 PR/说明。
- **建议去处：** workflow PR 或公开脑短笔记 / 本期周复盘合入后的 COMMENTS。
- **为什么值得补：** 上期行动 2 的完成标准明确要求「归因 + PR 或故意保留」。
- **不补代价：** 下次红了仍从零猜。
- **处理结果：** 仓库层已写归因与 run 链接；**仓内正式说明仍缺**（**延续**）。已列入下次做什么第 2 条。

### 缺 2026-10-29 日复盘日历篇

- **是什么：** `retrospectives/daily/` 无 `2026-10-29--日复盘`；10-30 篇窗含 10-29 05:18 起，对话层已确认加长窗覆盖。
- **建议去处：** 补日历篇，或本期/下期 COMMENTS 写「不补、由 10-30 覆盖」。
- **为什么值得补：** 目录缺天会被反复追问（与上期 10-23 同类）。
- **不补代价：** 周复盘与例程健康度统计持续噪音。
- **处理结果：** 对话覆盖已处理；**日历篇是否补写仍待你定**。

### 10-31 高优评测卡完成标准空白（grill 后补）

- **是什么：** Memory AB / 消融正式报告 / 目录结构消融三卡无完成标准；公开脑 #411 同源高优亦「grill 后补」。
- **建议去处：** 各卡 INDEX；grill-with-docs → html-plan 后再改。
- **为什么值得补：** 高优却不可验收；用户已要「细节 grill 后补」。
- **不补代价：** 「高优 backlog」无法判断做完没有。
- **处理结果：** 已开卡/PR，**细节未处理**。已并入下次做什么第 3 条。

### 插件化卡未书面对齐 ADR 0046

- **是什么：** 插件化 backlog 仍「待 grill」；ADR 0046 已 accepted（含 2026-11-02 修订说明）。
- **建议去处：** 插件化卡前提/完成标准段。
- **为什么值得补：** 带着与叶子登记模型冲突的前提继续 grill 会返工。
- **不补代价：** 插件化与 notes/projects 清单模型再打架。
- **处理结果：** 未处理。已并入下次做什么第 3 条。

### 例程路径硬切后的调度脆弱性（10-28 补跑、10-26/27 重放）

- **是什么：** 目录更名导致日复盘例程漏跑/错路径，靠人工补 PR 挽回。
- **建议去处：** 公开脑 `.edges/routines/*/INDEX.md` 与平台 routine 配置核对清单（或框架 routines 模块校验）。
- **为什么值得补：** 周/日复盘是外部脑时间轴；漏天会丢决策依据。
- **不补代价：** 下次硬切/迁路径再丢天。
- **处理结果：** [#402](https://github.com/VirusPC/edges-brain-viruspc/pull/402) 等有文档补丁；**平台侧是否已永久改路径，仓库层无法单凭 GitHub 证明**——待运维侧确认。

### open-grokbot 跟踪卡与私仓同步债（对话层新）

- **是什么：** 公开脑 [#406](https://github.com/VirusPC/edges-brain-viruspc/pull/406) 等仍 OPEN；GitHub/Origin 曾不同步。
- **建议去处：** 审合或关闭跟踪卡；同步约定见坑点笔记 [#407](https://github.com/VirusPC/edges-brain-viruspc/pull/407) 一带。
- **为什么值得补：** 壳与文案已推进，卡状态与事实不一致。
- **不补代价：** 看板噪音；下次再踩同步坑。
- **处理结果：** 部分处理（壳/笔记已有）；**卡仍待审**。

### npm / README「npx skills」安装轨道（对话层新）

- **是什么：** 用户要「直接装 Skill / npx skills」；框架 README 是否已定稿为唯一对外安装路径。
- **建议去处：** 框架 README + 与 skills 发布流程对齐。
- **为什么值得补：** 对外安装叙事已口头改口，文档若仍多轨会误导新人。
- **不补代价：** README 与真实安装路径继续分叉。
- **处理结果：** 对话已提出（2026-10-28 00:09）；是否已合入定稿以仓库层为准。

### 上期清单中仍有效、本周未再推进（不新开下次做什么名额）

- npm-publish「代理可自审」是否收紧：仍无新的仓库层证据本周处理。
- `#174` 完成标准仍空：框架 backlog 仍在，COMMENTS 曾说可不催。
- stage-only token / ECS 旧目录：公开正文不展开凭据；未见本周清理 PR。
