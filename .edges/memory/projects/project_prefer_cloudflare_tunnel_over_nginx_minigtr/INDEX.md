---
name: project_prefer_cloudflare_tunnel_over_nginx_minigtr
description: >-
  给 minigtr 上自托管 HTTP 服务做公网入口时打开：长期维护优先 Cloudflare Tunnel，不优先单独上 nginx 扛公网
metadata:
  edges-title: minigtr 公网入口优先 Cloudflare Tunnel
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-27
  edges-agent-client: grok-bot
  edges-username: VirusPC
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-27T05:21:00+08:00'
---

在 minigtr-ubuntu 上为自托管 HTTP 服务（如 E2B Embed、Langfuse）做**对外入口**时，长期维护优先 **Cloudflare Tunnel**（已有、不开公网端口、证书/DNS 跟现有 `*.viruspc.tech` 一套）。nginx 适合机内多服务整理路由，但对外仍常要再叠一层；单独用 nginx 扛公网会多端口、证书、防火墙一手。

**Why:** 2026-10-26 用户问「用 nginx 统一反代还是 Cloudflare Tunnel，从长期维护角度」；助手倾向 Tunnel，用户采纳并完成 E2B 三域名接入（笔记见 `projects/agent-infra/2026-10-26--E2B-Embed-Cloudflare公网接入.md`）。

**How to apply:**
- 新服务先查现有 Tunnel ingress，再加 hostname → 本机端口；不要默认新装 nginx 做公网入口。
- 域名与密钥细节以台账 / agent-infra 笔记为准；公开仓不写 API key。
