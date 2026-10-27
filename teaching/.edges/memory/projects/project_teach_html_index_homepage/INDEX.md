---
name: project_teach_html_index_homepage
description: 改 teach 站点首页或 Topics 时：公网 /teaching/ 由 knowledge/teaching/index.html 做主题索引，与 README Topics 同步重建
metadata:
  edges-title: 公网 /teaching/ 用 HTML 主题首页
  edges-type: project
  edges-origin-session-id: bc-9315e6f7-7dbe-4b61-8215-470efa08cca2
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: "2026-09-11T10:51:33+00:00"
---

公网 `/teaching/` 的产品形态是 `knowledge/teaching/index.html` 主题首页，不是 nginx 目录列表；README Topics 与该页必须同步。

**Why:** 这是站点怎么给人打开的决策，代码和 git 历史推不出「为什么要有首页、交付后为什么要重建」。用户已纠正：这类约定归 project，不是某次行为纠正后的禁止模式。目录与公网前缀已对齐为 teaching。

**How to apply:** 新建主题、改 Topics 文案或课页入口后，同步重建 `knowledge/teaching/index.html`。条目与 README Topics 一一对应，链接用 `./<topic>/`。不要只改 Markdown。
