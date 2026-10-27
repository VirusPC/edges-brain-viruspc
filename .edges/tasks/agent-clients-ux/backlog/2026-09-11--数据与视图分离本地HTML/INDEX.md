---
name: data_view_separation_local_html
description: 从复杂系统角度，可能需要数据与视图分离，并提供本地 HTML
metadata:
  edges-type: task
  edges-title: 数据与视图分离 + 本地 HTML
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-17T14:09:11.259Z"
  edges-task-project: agent-clients-ux
---

从复杂系统角度，可能需要数据与视图分离，并提供本地 HTML（作为视图层之一）。

**Why:**
tasks / memory 的真相源是仓库里的结构化文件；若浏览、看板、筛选都绑死在某一种编辑器或目录约定上，视图一变就要改数据。数据（markdown/frontmatter）与视图（本地 HTML 等）分离后，同一份数据可多视图呈现，也更接近复杂系统里「状态与观测」拆开的做法。

**How to apply:**
- 细聊：哪些算数据层（tasks 文件、log、memory），哪些算视图（Obsidian、本地 HTML 看板、Astro posts）。
- 设计本地 HTML：读仓内数据生成/静态打开的看板或索引页；是否提交进仓还是 `.gitignore` 生成物。
- 与「云端电脑 Obsidian 预览」「posts→Astro」对照，避免三套视图各改一份数据。
