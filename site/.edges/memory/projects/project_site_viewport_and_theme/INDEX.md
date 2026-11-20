---
name: project_site_viewport_and_theme
description: 改 site/ 的样式、组件、排版或交互时打开：验收必须覆盖手机和电脑，以及浅色和暗色。
metadata:
  edges-title: 站点验收要同时看手机、电脑、浅色和暗色
  edges-type: project
  edges-origin-session-id: bc-52802554-41dd-557d-ac56-c979782c164f
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-20T14:49:24+00:00'
---

改 site/ 的样式、组件、排版或交互时，验收必须同时覆盖移动端和 PC 端，以及 light 和 dark。只改一种视口或一种颜色模式不算完成。这是站点验收标准。

**Why:**
2026-11-20 用户把这条定成站点层的验收标准。暗色信息块曾经因为浅色底混进深色页面而看不清；只在浅色或只在桌面上看过，就会漏掉。

**How to apply:**
改样式、组件、排版或交互之后，用手机宽度和桌面宽度各看一遍，再分别打开 light 和 dark。四种都要能读、能用。规则本身写在 site/AGENTS.md 的本层硬约束里，打开入口就能看到。
