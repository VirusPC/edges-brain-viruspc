# 2026-11-23 日复盘

## 范围

- 窗口 2026-11-22 05:15 至 2026-11-23 05:15（Asia/Shanghai）。
- 来源是本机落盘的助手对话索引。ReadTranscript 在本次自动化里不可用，改读本机 search-index。索引最晚到 2026-11-23 01:00，比窗口结束早约 4 小时，窗口末约 4 小时的对话未覆盖。
- 读到的助手：Grok Bot（主要）、视觉&交互&设计专家、3d打印、通用-辅助、日复盘。其余 68 个助手窗口内无消息。
- Langfuse 未拉取：缺少 `LANGFUSE_BASE_URL` / `LANGFUSE_HOST` 配置（只有公私钥）。按 Skill 不编 URL，只靠 transcript。
- 窗口内另有 19 条非主对话消息未纳入。
- 窗口内主线：用户提出把语雀迁来的 notes 改为 projects，设计专家把嵌套 Project 展示收到根与子项目共用同一高密度列表（去掉教学文案），批准后合入 [#565](https://github.com/VirusPC/edges-brain-viruspc/pull/565)；Teaching 站内闭环合入 [#566](https://github.com/VirusPC/edges-brain-viruspc/pull/566)。AI 资讯回补前三期、重算四期关键词、重写四期正文并补录 11-13 的三条（[#569](https://github.com/VirusPC/edges-brain-viruspc/pull/569)、[#570](https://github.com/VirusPC/edges-brain-viruspc/pull/570)、[#571](https://github.com/VirusPC/edges-brain-viruspc/pull/571)，数据仓 [#11](https://github.com/VirusPC/ai-news-data/pull/11)、[#16](https://github.com/VirusPC/ai-news-data/pull/16)、[#17](https://github.com/VirusPC/ai-news-data/pull/17) 等已合入）。随后流程定为数据准备、数据清洗、数据总结，目录 `raw/`、`cleaned/`、`summary/`，总结阶段三路并行后再筛关键词并带关联映射（[#575](https://github.com/VirusPC/edges-brain-viruspc/pull/575)、[#576](https://github.com/VirusPC/edges-brain-viruspc/pull/576)、[#577](https://github.com/VirusPC/edges-brain-viruspc/pull/577) 已合入，[#574](https://github.com/VirusPC/edges-brain-viruspc/pull/574) 仍开着）。窗口末（00:55）要求 skill、数仓与网站渲染一次用上最新版并部署渲染成功，该迁移当时尚未完成。

## 建议补充内容清单

- 本次落 1 条任务。建议去处：公开脑 `.edges/tasks` backlog。写入路径：[`.edges/tasks/backlog/2026-11-22--整理-notes-根下不带日期前缀的语雀主题草稿/INDEX.md`](../../../.edges/tasks/backlog/2026-11-22--整理-notes-根下不带日期前缀的语雀主题草稿/INDEX.md)。`notes/` 根下 22 个不带日期前缀的语雀式主题目录不在笔记索引里，站点只收日期笔记。看板没有同意图的开放任务，所以新开这一张：逐个判断去向（project、并入已有 project、teaching 或保留）并完成迁移。
- 本次补 1 条记忆，只覆盖原先没有的两句。建议去处：`.edges/memory/feedbacks`。写入路径：[`.edges/memory/feedbacks/feedback_ai_news_migration_updates_skill_data_and_site/INDEX.md`](../../../.edges/memory/feedbacks/feedback_ai_news_migration_updates_skill_data_and_site/INDEX.md)。内容是：skill 不留旧格式兼容层，要兼容就改数据本身；一次迁移同时让 skill、数仓数据和网站渲染用上最新版。
- 已存在，不重复写三阶段、目录、版本号和关键词映射：
  - 已存在于 `skills/managed/weekly-ai-blogs-digest/SKILL.md`（数据准备、数据清洗、数据总结；`references/prepare/prepare.md`、`references/clean/clean.md`、`references/summarize/summarize.md`；产出 `raw/`、`cleaned/`、`summary/`；中间与最终数据进数据仓；semver 按 Edges skills 目录规范）。
  - 已存在于 `skills/managed/weekly-ai-blogs-digest/references/summarize/summarize.md` 与 `references/summarize/keywords.md`（精选文章、开源项目、模型经验与榜单三路并行，关键词从这三路再筛，映射写在 `summary/keywords.json`，渲染时不现推关联）。
  - 已存在于 `skills/managed/weekly-ai-blogs-digest/references/summarize/check.md`（`summary/index.json` 排章节和内容 ID，页面由这些 summary 文件代表）。
  - 已存在于 `.edges/memory/feedbacks/feedback_ai_news_three_stages/INDEX.md`。
- 不重复写「用户给出的执行顺序必须严格遵守」。该条在仍开的 [#573](https://github.com/VirusPC/edges-brain-viruspc/pull/573)，准备写入根 `AGENTS.md` 硬约束。
- 不做：3d打印助手的打印配件与应用咨询是纯问答，不沉淀。
- 不做：睡前每 20 分钟的督办 routine，以及 `/goal` 询问，是一次性操作。
- 不做：已合入的 PR 本身不再重复沉淀，包括 [#565](https://github.com/VirusPC/edges-brain-viruspc/pull/565)、[#566](https://github.com/VirusPC/edges-brain-viruspc/pull/566)、[#569](https://github.com/VirusPC/edges-brain-viruspc/pull/569)、[#570](https://github.com/VirusPC/edges-brain-viruspc/pull/570)、[#571](https://github.com/VirusPC/edges-brain-viruspc/pull/571)、[#575](https://github.com/VirusPC/edges-brain-viruspc/pull/575)、[#576](https://github.com/VirusPC/edges-brain-viruspc/pull/576)、[#577](https://github.com/VirusPC/edges-brain-viruspc/pull/577)，以及数据仓 [#11](https://github.com/VirusPC/ai-news-data/pull/11)、[#16](https://github.com/VirusPC/ai-news-data/pull/16)、[#17](https://github.com/VirusPC/ai-news-data/pull/17)。
- 没有私人候选，所以没有私密仓 PR。
