---
name: project_self_hosted_langfuse_at_v4_71
description: >-
  谈自建 Langfuse 版本或 open-grokbot 可观测时打开：截至 2026-10-29 已是 v4.71.0（原 v4.38.0）；项目
  open-grokbot 仍在；升因 SDK 6 需 ≥4.59
metadata:
  edges-title: 自建 Langfuse 已升到 v4.71.0；项目 open-grokbot 仍在
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-30
  edges-agent-client: grok-bot
  edges-username: VirusPC
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-30T05:24:38+08:00'
---

自建 Langfuse（minigtr Docker + Cloudflare Tunnel 公网入口）截至 **2026-10-29** 已升到 **v4.71.0**（健康检查 `/api/public/health` 返回该版本）。升级前为 **v4.38.0**。项目 **open-grokbot** 仍在，未因升级丢失。

**Why:** open-grokbot 合入 Peer-room Langfuse tracing（公开仓 PR #4）使用 `@langfuse/tracing` / `@langfuse/otel` 6.x，官方要求自建 ≥ v4.59.0；不升可能收不到 trace。同日升到官方 latest（实测 v4.71.0）后，再给生产 Worker 配齐 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL` 三件套（缺一则 tracing 静默、聊天不变）。

**How to apply:**
- 谈自建 Langfuse 版本或 open-grokbot 可观测时，以本条为准（v4.71.0；项目 open-grokbot 仍在），不要再写「仍是 v4.38.0」。
- 升镜像：保留 named volume，**不要** `compose down -v`（见 `project_langfuse_data_named_volumes_survive_restart`）。
- 不把 API Key、Secret、未公开内网 IP 写入公开仓；Worker secrets 只报有/无。
- 日复盘拉 observations 仍只用 `GET /api/public/v2/observations`；本条不改变该约定。
