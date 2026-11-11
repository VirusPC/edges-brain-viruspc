---
name: project_ai_news_section_on_brain_site
description: 把 AI Coding 周报做成可浏览页面时打开：做在脑仓 site/ 的 /ai-news/，不要改 VirusPC/blog。
metadata:
  edges-title: AI 周报上脑仓 Astro 站，不进 VirusPC/blog
  edges-type: project
  edges-origin-session-id: bc-486d084d-657c-5d65-bee1-06f68df3bfe1
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-11T13:04:34+00:00'
---

AI Coding 周报在脑仓 Astro 站的 `/ai-news/` 发布，不进 VirusPC/blog。

**Why:**
2026-11-11 这张可视化任务最初写成了 VirusPC/blog。那个仓是 Jekyll，周报和 Astro 站已经在同一个脑仓里，再同步过去没有必要。用户批准的方案把站点定在脑仓 `site/`。

**How to apply:**
- 周报可视化、导航和独立 RSS 都做在本仓 `site/`。不要为这件事改 VirusPC/blog。
- 新一期只要合入 `ai-news/`，Pages 工作流就会发布。首页、Archive 和全站 RSS 不收录周报。
- 没有「一、本周关键词」的期次是旧版平铺格式，列表和正文标「旧版」。
