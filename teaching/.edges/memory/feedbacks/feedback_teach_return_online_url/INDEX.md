---
name: feedback_teach_return_online_url
description: 跑完 teach skill、产出或更新课页后：回复里必须给可在浏览器打开的在线 URL；不要只丢仓库路径、file:// 或 Mesh 主机名。
metadata:
  edges-title: teach skill 跑完必须回在线 URL
  edges-type: feedback
  edges-origin-session-id: bc-ddc4765d-ef4c-42d9-9ae1-1fd473a2c7fc
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: "2026-09-11T10:51:33+00:00"
---

每次跑完 teach skill，回复里必须带上对应课页的在线 URL。

**Why:** 课是给人在浏览器里上的。仓库相对路径和 `file://` 对方打不开；把 Tailscale MagicDNS / 机器名当成网址，用户已经当面纠正过。不检索就会漏报，所以本条同时写进本层硬约束。

**How to apply:** 把 `knowledge/teaching/<topic>/lessons/<file>.html`（或 `reference/` 下的 HTML）映射到公网站点同一相对路径（前缀 `/teaching/`），把完整 http(s) URL 写进当轮回复。没有课页产出时说明为什么没有在线 URL。禁止只报本地路径或内网主机名。
