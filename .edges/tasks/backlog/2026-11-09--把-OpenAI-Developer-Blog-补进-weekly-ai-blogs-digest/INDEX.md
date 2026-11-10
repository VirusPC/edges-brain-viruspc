---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-09T21:21:42.406Z'
  edges-title: 把 OpenAI Developer Blog 补进 weekly-ai-blogs-digest
  edges-tasks-status: backlog
  edges-task-priority: none
name: 把_OpenAI_Developer_Blog_补进_weekly_ai_blogs_digest
description: weekly-ai-blogs-digest 已订 OpenAI News RSS，但未覆盖 Developer Blog。按对话核定的方式用列表页补上这一源，不把站点 rss.xml 当博客订阅，并保留原 News RSS。
---
**背景：**
用户在对比 Codex 与 Claude Code 的技术博客时，问到 AI 资讯 skill 现在订的是哪一路 OpenAI 源。当时 `weekly-ai-blogs-digest` 已订阅 OpenAI News RSS（`openai.com/news/rss.xml`，对应 `openai.com/index/` 一路，对话中举例包括 agent loop、App Server、Harness engineering），尚未配置 OpenAI Developer Blog（对话中对应 `developers.openai.com` 上的开发者博客；举例包括长任务与 Codex as a platform 等文）。用户随后要求「补充下」。
- 现状：默认分支上的订阅配置仍只有 OpenAI News；窗内也没有对应的公开 PR。对话里助手称已补上且配置检查通过，但仓库里看不到这次变更。
- 预期：资讯 skill 在保留原 News RSS 的同时，用列表页补上 Developer Blog 这一源。
- 非目标：不把 `developers.openai.com/rss.xml` 当作博客 RSS 写入订阅（对话核对该地址实际是文档、教程和 cookbook，没有一篇是博客）；不采用 BestBlogs 上只能找到的 `@OpenAIDevs` 推文源来代替博客原文；不改其它已有订阅源。
- 关联：现有看板卡「AI资讯工作流改为 RSS 并优化数据格式与 token 对比」处理的是整套工作流改以 RSS 为先；本卡只补这一源，不替代那张卡。

**目标：**
把 OpenAI Developer Blog 补进 `weekly-ai-blogs-digest`，沿用现有「RSS 优先、列表页补漏」规则，只补这一项。

**动作：**
- 核对 Developer Blog 的列表页地址后，写入 `skills/managed/weekly-ai-blogs-digest` 的现有订阅配置（并按现有规则决定是否写入 OPML）。
- 这一站走列表页抓取，不要把 `developers.openai.com/rss.xml` 加入 RSS 订阅。
- 生成周报时打开每篇文章，以文章页上的发布日期为准（对话说明列表页上的日期常常不带年份）。
- 保留原来的 OpenAI News RSS。
- 跑该 skill 现有的配置检查。

**完成标准：**
- [ ] `skills/managed/weekly-ai-blogs-digest` 的配置中已有 OpenAI Developer Blog 的列表页来源。
- [ ] 未把 `developers.openai.com/rss.xml` 当作博客 RSS 写入订阅。
- [ ] 原 OpenAI News RSS（`openai.com/news/rss.xml`）仍在。
- [ ] 配置检查通过。
