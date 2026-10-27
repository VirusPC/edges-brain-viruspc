---
name: feedback_teach_public_url_prefix
description: 对外给课页地址形如 /teaching/<topic>/...；不要用站点根下的 /changelog 或 /openhands
metadata:
  edges-title: 公网 URL 必须带 /teaching/ 前缀
  edges-type: feedback
  edges-origin-session-id: bc-14e9582e-56e5-4577-835c-d9afc57e61a0
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: "2026-09-11T10:51:33+00:00"
---

对外课页站点 URL 必须带 `/teaching/` 路径前缀（主题页形如 `/teaching/<topic>/...`）。

**Why:** 用户明确要求部署路径与目录名对齐为 `/teaching/`。原先 nginx root 直接挂教学目录时，`/openhands`、`/changelog` 顶在站点根，语义不清；后又把 `/teach/` 改成 `/teaching/`。不检索就会漏前缀，所以本条同时写进本层硬约束。

**How to apply:** 收尾给在线地址时写成 `http(s)://<host>/teaching/<topic>/...`（备案前用公网 IP 的 http；备案后用 `https://teach.viruspc.tech/teaching/<topic>/...`）。不要报站点根下的 `/changelog`、`/openhands`。仓库内相对路径仍是 `knowledge/teaching/<topic>/...`。
