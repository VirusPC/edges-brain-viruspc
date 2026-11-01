---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-31T17:40:00.000Z'
  edges-title: AI资讯工作流改为 RSS 并优化数据格式与 token 对比
  edges-tasks-status: in_progress
  edges-task-priority: high
name: ai资讯工作流改为_rss_并优化数据格式与_token_对比
description: AI 资讯周报改为以自维护 OPML 的 RSS 为先，列表页只作退路，并留下 2026-10-30 窗口的覆盖与体积对比。
---

**背景：**
用户 2026-10-31 点「先全落高优 backlog，细节 grill 后补」。现有周报从博客首页 URL 抓列表。关联框架仓卡「Agent 取外部内容优先走 RSS，浏览器爬取只作退路」（VirusPC/edges，edges-extensions）。本仓不改那张卡。

2026-10-31 grill 已锁定：只改 `weekly-ai-blogs-digest` 和 `ai-news/`；播客维持现状；OPML 是可导入阅读器的订阅真源；没有原生 feed 时先查 BestBlogs 的 OPML，仍没有再用列表页或 sitemap，浏览器最后。同日用户确认：BestBlogs 对上的 RSSHub、XGo.ing、Wechat2RSS 也写入 OPML，列表页留作退路。脚本出精简 JSON，正文够则不抓原文。

**目标：**
周报以 RSS 为主发现文章，输出仍沿用现有 `ai-news/` 模版，并有 2026-10-30 窗口的一次覆盖与体积对比。

**动作：**
- 订阅真源改为 [`skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.opml`](../../../../../skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.opml)。只收录真实 feed，阅读器可导入。
- 没有原生 feed 时，BestBlogs 对上的转换源写入 OPML，并在 [`ai-coding-blogs.meta.json`](../../../../../skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.meta.json) 标明 `feedOrigin` 和列表页退路。BestBlogs 没有命中的站只留列表页退路。
- `scripts/fetch_feeds.py` 读 OPML 与 meta，拉 feed，按日期过滤、去重，输出精简 JSON。
- Skill 改为：跑脚本 → 正文太短或 feed 被截断再抓页面 → 按原模版写 `ai-news/`。播客仍只在风向里点名。
- 用 2026-10-30 那期的窗口做一次对比，短记放在本目录 [`ab-2026-10-30.md`](ab-2026-10-30.md)。
- OPML 增加「GitHub Trending」。Artificial Analysis 与 LLM Arena 不进 OPML，用 skill 目录里的两个脚本，周报单独成节。
- OPML 增加「薅羊毛 / linux.do」。周报「〇、薅羊毛」用这份 feed，并收其它博客里和 AI / Coding 有关的优惠；日常消费类不写。

**完成标准：**
- [x] OPML + meta 覆盖原列表里的博客。有 feed 的进 OPML，其余标明退路。
- [x] 脚本可运行，skill 与 `ai-news/README.md` 写明 RSS 优先，输出模版不变。
- [x] 2026-10-30 窗口的短对比（篇数、遗漏、体积或 token 估算、耗时）在 [`ab-2026-10-30.md`](ab-2026-10-30.md)。
- [x] 不改框架仓「Agent 取外部内容优先走 RSS」那张卡。
- [x] 播客不接入 feed。
