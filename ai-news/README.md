# AI 资讯周报归档

每期周报以「周报生成日」命名，保存为 `YYYY-MM-DD-ai-news.md`；正文覆盖此前一周、**不含生成当天**。自 2026-11-20 起，正文第一行写时刻和时区：`覆盖窗口：D-7 00:00:00 至 D-1 23:59:59（UTC；生成日 D，不含当天）。` [`fetch_feeds.py`](../skills/managed/weekly-ai-blogs-digest/scripts/fetch_feeds.py) 把 feed 发布时间换成 UTC 日历日，再和这两个日期做闭区间比较，所以截止是 D-1 的 23:59:59 UTC，不是北京时间当天 23:59。更早各期的第一行不回改。自 2026-10-30 起，以及 2026-11 补录的更早期次，正文按当时的章节写（〇薅羊毛 → 本周关键词 → 模型进展 → 项目开源 → 精选文章）。2026-11-13 及更早的已归档期次保持原样。2026-11-20 已去掉「〇、薅羊毛」，从「一、本周关键词」起。「精选文章」下用二级章节分「国内」「国际」。更早写在正文里的「国内进展」「国际进展」由站点渲染时收进这一章，原文不改。某一章没有可核对的内容时整章不写。新稿不再写「薅羊毛」，从「一、本周关键词」起。以后按内容形式加的「推特」「播客」仍是「精选文章」后面的同级一级章节。

订阅真源是 [`skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.opml`](../skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.opml)，阅读器可直接导入。没有可用 feed 的站写在同目录的 [`ai-coding-blogs.meta.json`](../skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.meta.json)。拉 feed 用 [`scripts/fetch_feeds.py`](../skills/managed/weekly-ai-blogs-digest/scripts/fetch_feeds.py)。

## 已归档周报

- [2026-11-20 AI 资讯](2026-11-20-ai-news.md) — 覆盖 2026-11-13 00:00:00 至 2026-11-19 23:59:59（UTC）。附 Arena 2026-11-18 快照图（红圈 Gemini 4 Neon）。关键词：Gemini 4 Neon、GPT-6.2 Astra / Sol、Qwen4-Max、Devin Bots、常驻 Agent。GitHub Trending 用 2026-11-19 16:10（UTC+8）的 daily / all 前 5。本期没有 Artificial Analysis 和 OpenRouter 的图（缺 API 密钥）。
- [2026-11-13 AI 资讯](2026-11-13-ai-news.md) — 覆盖 2026-11-06～2026-11-12。附 Arena 2026-11-11 快照图，以及 OpenRouter 本周用量、编程用量、应用用量。关键词：Claude Fable 5.2、Gemini 4 Hydrogen、多 Agent 编排、Qwen Code 1.0。GitHub Trending 用 2026-11-12 15:55（UTC+8）的 daily / all 前 5。补录 11 月 1 日 DeepSeek Harness Super-agent 架构文与 11 月 2 日 Creator Mode。
- [2026-11-06 AI 资讯](2026-11-06-ai-news.md) — 覆盖 2026-10-30～2026-11-05；按新模版重跑。Arena 复用 2026-10-28 的图（较上周无新榜）。
- [2026-10-30 AI 资讯](2026-10-30-ai-news.md) — 覆盖 2026-10-23～2026-10-29；按新模版重跑，附 Arena 2026-10-28 快照图。
- [2026-10-23 AI 资讯](2026-10-23-ai-news.md) — 覆盖 2026-10-16～2026-10-22；2026-11 按订阅重跑。关键词：MiniMax M3.1 Flash，DeepSeek V4.1 Flash。附 Arena 2026-10-22 快照图。
- [2026-10-16 AI 资讯](2026-10-16-ai-news.md) — 覆盖 2026-10-09～2026-10-15；2026-11 按订阅重跑。关键词：Gemini 4 Argon 进入 Antigravity。附 Arena 2026-10-15 快照图。
- [2026-10-09 AI 资讯](2026-10-09-ai-news.md) — 覆盖 2026-10-02～2026-10-08；2026-11 按订阅重跑。关键词：GPT-6 面向所有人，Claude Haiku 5.5。附 Arena 2026-10-08 快照图。本窗口订阅里没有国内技术团队的条目。
- [2026-10-02 AI 资讯](2026-10-02-ai-news.md) — 覆盖 2026-09-25～2026-10-01；2026-11 按订阅重跑。关键词：GPT-6.1 Sol 与 dots。附 Arena 2026-09-30 快照图。
- [2026-09-25 AI 资讯](2026-09-25-ai-news.md) — 覆盖 2026-09-18～2026-09-24；2026-11 按订阅重跑。关键词：GPT-6 Sol 与 Luna，Claude Opus 5.5。Arena 复用 2026-09-13 的图（较上周无新榜）。
- [2026-09-18 AI 资讯](2026-09-18-ai-news.md) — 覆盖 2026-09-11～2026-09-17；2026-11 按订阅重跑。关键词：Claude Fable 5.1 发布。附 Arena 2026-09-13 快照图。本窗口订阅里没有国内技术团队的条目。
- [2026-09-04 AI 资讯](2026-09-04-ai-news.md) — 覆盖 2026-08-28～2026-09-03；2026-11 按订阅重跑。关键词：GPT-6 Astra，Fable 5.1 进入 Devin。附 Arena 2026-09-02 快照图。
- [2026-08-28 AI 资讯](2026-08-28-ai-news.md) — 覆盖 2026-08-21～2026-08-27；2026-11 按订阅重跑。关键词：GPT-5.6 进入 Kiro。附 Arena 2026-08-27 快照图。本窗口订阅里没有国内技术团队的工程帖，模型发布写在模型进展。
- [2026-08-21 AI 资讯](2026-08-21-ai-news.md) — 覆盖 2026-08-14～2026-08-20；2026-11 按订阅重跑。关键词：Cursor 并入 SpaceX。附 Arena 2026-08-19 快照图。
- [2026-08-14 AI 资讯](2026-08-14-ai-news.md) — 覆盖 2026-08-07～2026-08-13；2026-11 按订阅重跑。关键词：GPT-5.6 Sol 的 Ultrafast，DeepSeek V4 Pro。附 Arena 2026-08-12 快照图。

## 归档范围与缺口

当前归档包含工作区中可核验的 13 期成品，覆盖 2026-08-07～2026-11-12。`2026-09-04～2026-09-10` 尚无已完成周报文件；2026-08-07 之前的历史文件不在当前工作区，后续如找回可按相同命名规则补入。

## 维护约定

1. 周报生成后直接提交到本目录，并更新本索引。
2. 文章优先来自 OPML 里的 feed。feed 正文够写摘要就不要再抓原文。feed 太短、失败、被截断，或该站没有 feed 时，再用列表页、sitemap 或文章页核对日期和链接。失效链接须修复或排除。
3. 每篇摘要不超过 200 字；AI Coding 相关条目附带研发落点。
4. 执行模板以 [`skills/managed/weekly-ai-blogs-digest/SKILL.md`](../skills/managed/weekly-ai-blogs-digest/SKILL.md) 为准。播客不进 OPML，只在本周关键词或相关章节里按需点名。
5. 每期说明文件是同名 `YYYY-MM-DD-ai-news.notes.md`，记录来源细节和缺项原因。站点不收录、不链接。
