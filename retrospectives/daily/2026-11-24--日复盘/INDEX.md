# 2026-11-24 日复盘

## 范围

- 窗口 2026-11-23 05:17:26 至 2026-11-24 05:17:26（Asia/Shanghai）。
- 来源是本机落盘的助手对话索引。ReadTranscript 在本次自动化里对其它助手不可用，改读本机 search-index。索引最晚到 2026-11-24 00:59:57（Asia/Shanghai），比窗口结束早约 257 分钟，窗口末对话未覆盖。
- Langfuse 未拉取：缺少 `LANGFUSE_BASE_URL` / `LANGFUSE_HOST`（只有公私钥），按 Skill 不编 URL。
- 读到的助手：Grok Bot（主要）、视觉&交互&设计专家、任务记录员、周复盘、日复盘、通用-辅助、4070ts-win设备助手、IT资产管理。其余约 65 个助手窗口内无主对话消息。另有 10 条非主对话未纳入。
- 落盘前核对 main，仍是 `9a6ab626917b7d6deadd481cce2ca1d247ce8cc1`。索引截止后约 01:09（Asia/Shanghai），公开脑 [#597](https://github.com/VirusPC/edges-brain-viruspc/pull/597) 与数据仓 [ai-news-data#28](https://github.com/VirusPC/ai-news-data/pull/28) 已合并。数据仓 [ai-news-data#27](https://github.com/VirusPC/ai-news-data/pull/27) 仍开着（测试，勿合并）。
- 窗口内主线：把 AI 资讯周报收成 skill 编排并补信息源、本周概览。公开脑已合入相关实现（[#581](https://github.com/VirusPC/edges-brain-viruspc/pull/581)–[#597](https://github.com/VirusPC/edges-brain-viruspc/pull/597)，含索引截止后合入的 #597 与数据仓 #28）。框架仓合入 [edges#135](https://github.com/VirusPC/edges/pull/135)、[#136](https://github.com/VirusPC/edges/pull/136)、[#137](https://github.com/VirusPC/edges/pull/137)。

## 建议补充内容清单

- 本次补 1 条反馈记忆，并在周复盘 Skill 的敏感内容段落补了同一句。写入路径：[`.edges/memory/feedbacks/feedback_weekly_retro_omit_interview/INDEX.md`](../../../.edges/memory/feedbacks/feedback_weekly_retro_omit_interview/INDEX.md)、[`.edges/routines/weekly-retrospective/SKILL.md`](../../../.edges/routines/weekly-retrospective/SKILL.md)。内容是：以后的公开周复盘一律不写面试相关内容；如有则只进私密仓或完全不出现在公开正文。私密仓既有面试 PR 不动。
- 本次补 1 条例程登记（平台侧已在跑，仓库里还没有入口）。写入路径：[`.edges/routines/grokbot-box-disk-check/INDEX.md`](../../../.edges/routines/grokbot-box-disk-check/INDEX.md)、[`.edges/routines/grokbot-box-disk-check/SKILL.md`](../../../.edges/routines/grokbot-box-disk-check/SKILL.md)。内容是：每天约 10:00（Asia/Shanghai，±15 分钟，含周末）检查 Grok Bot 电脑磁盘；剩余空间低于 30% 时在聊天里提醒并列出占用最大的目录，不自动删除；空间够则不发消息。
- 本次落 2 条任务。建议去处：公开脑 `.edges/tasks` backlog。
  - [`.edges/tasks/backlog/2026-11-23--文章拉取在-feed-截断时启用退路/INDEX.md`](../../../.edges/tasks/backlog/2026-11-23--文章拉取在-feed-截断时启用退路/INDEX.md)。文章拉取在 feed 截断（最旧一条未覆盖本期窗口起点）时启用备源或列表退路。核对 main 后，`references/prepare/articles.md` 的 status 仍是 `ok` / `empty` / `error` / `stopped`，列表页只在主源和备源都不 `ok` 时启用，截断退路尚未实现。不要重开 #567。
  - [`.edges/tasks/backlog/2026-11-23--正式重跑五期并补回被裁精选文章/INDEX.md`](../../../.edges/tasks/backlog/2026-11-23--正式重跑五期并补回被裁精选文章/INDEX.md)。在数据仓测试 PR #27（按 0.0.7 重跑 11-20，勿合并）通过后，正式重跑五期并补回 #572 约定的两篇精选（10-23 天猫数字员工、10-30 Personal Agent），再做站点核验。核对时 #27 仍开着，#28 只补本周概览，五期尚未正式重跑。现在不要替换线上数据。
- 已存在、不重复写：skill 主导数据处理与长期记忆先进两脑（#586）；用户指定步骤先后时按该顺序执行（#573）；本 skill 只升 patch（#593）；改周报 skill 的检查清单（#589）；本周概览两轮 grill 与 0.0.8 实现（#590、#597）；信息源与精选计数等已合入页面改动（#583–#588、#591）；框架仓已落的 onboarding / memory-ask 任务卡（edges#135、#137）；昨日日复盘已落的 notes 整理任务与 migration 记忆（#579）。
- 没有私人候选，所以没有私密仓 PR。
