---
name: visualize_ai_news_on_astro_blog
description: ai-news 周报现在只是仓里的 Markdown，看着不方便；要在 Astro 博客上做成能直接浏览的页面。
metadata:
  edges-type: task
  edges-title: ai-news 周报在 Astro 博客上可视化展示
  edges-tasks-status: backlog
  edges-agent-client: grok-bot
  edges-username: Grok Bot
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-11-11T12:17:51.000Z'
---

**背景：**
AI Coding 资讯周报每周五由例程生成，以 `ai-news/YYYY-MM-DD-ai-coding-news.md` 的形式存进 edges-brain-viruspc，Arena 排行图是同目录的 SVG/PNG，目录在 `ai-news/README.md`。现在只能翻 Git 文件看，阅读体验差。2026-11-11 peng cheng 提出想在网站里也可视化一下，并确认目标站点是个人 Astro 博客（VirusPC/blog），于是开了这张卡。
- 现状：已有 12 期，覆盖 2026-08-07 到 2026-11-05；从 2026-10-30 那期起换成固定章节（〇薅羊毛 → 本周关键词 → 模型进展 → 项目开源 → 国内进展 → 国际进展）
- 非目标：不改周报的生成流程和内容规范
- 关联：weekly-ai-blogs-digest skill；Grok Bot 例程「AI Coding 资讯周报」；兄弟卡「除 posts 外支持更丰富的内容输出形态」「posts用Astro搭博客与CI」

**目标：**
在 Astro 博客上按期浏览 ai-news 周报（期次列表、正文排版、排行图），新周报合入后自动出现在网站上。
