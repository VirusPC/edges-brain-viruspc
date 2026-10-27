---
name: ecs_上_cloudflare_tunnel_对外teachingtasksartifacts
description: >-
  域名直连阿里云因未备案 Beaver + TLS1.2+SNI 不可用；采用 ECS + Cloudflare Tunnel 作为当前最简单对外方案，用域名
  HTTPS 进站并保留动态服务。
metadata:
  edges-type: task
  edges-title: ECS 上 Cloudflare Tunnel 对外（teaching/tasks/artifacts）
  edges-tasks-status: done
  edges-task-project: agent-clients-ux
  edges-task-assignee: IT资产管理
  edges-task-assignee-id: 5fcd37e7-eacb-4cc8-b9ed-b96a8ef4e344
  edges-updated-at: '2026-10-11T10:22:36.144Z'
---

结论（idea）：域名直连阿里云因未备案不可用；在现有 ECS 上部署 Cloudflare Tunnel（或同等），用域名 HTTPS 进站并保留动态服务，避开公网回源 Beaver。

**结论（2026-09-22）:**
Tunnel `aliyun-ecs`（id `6f320832-6128-4438-9815-7e807d1a3c84`）已在 ECS 落地，协议 http2（QUIC 在阿里云超时）。当前对外入口只有：
- https://edges.viruspc.tech/teaching/
- https://edges.viruspc.tech/tasks/

`aliyun.viruspc.tech` 仍挂在同一条 tunnel 上，本次未改、未删。`teach.viruspc.tech` 已从 tunnel ingress 与 DNS 移除，不是当前入口。

**事实背景:**
- 2026-09-22 DNS 结论曾记：用户放弃域名 HTTPS/Flexible/隧道等绕过，入口维持裸 IP；备案或以后 Tunnel 再议。见 done「teaching 与 tasks 站点挂 DNS」（`knowledge/tasks/agent-clients-ux/done/2026-09-22--teaching-与-tasks-站点挂-DNS.md`）。该「放弃隧道」已作废为对外策略；历史不删。
- 用户 peng cheng 2026-09-22 改口：按 ECS+Tunnel 来，好像是目前最简单的方案（相对迁 minigtr、或整段改 Pages 放弃动态服务端）。
- 建卡时曾把目标写成 edges.viruspc.tech（或既有 teach/edges 主机名）下 /teaching/ /tasks/，以及 Artifacts 动态能力可留 ECS。**已取代：** 当前入口只有 `https://edges.viruspc.tech/teaching/` 与 `https://edges.viruspc.tech/tasks/`。
- Pages 专用仓方案仍 backlog，不并、不出栈。见 backlog「Artifacts 预览改走专用仓 + GitHub Pages」（`knowledge/tasks/agent-clients-ux/backlog/2026-09-21--Artifacts-预览改走专用仓-GitHub-Pages.md`）。
- IT资产管理 2026-09-22 回报落地：Tunnel 名 `aliyun-ecs`，id `6f320832-6128-4438-9815-7e807d1a3c84`，协议 http2（QUIC 在阿里云超时）。
- DNS：`edges.viruspc.tech` 与 `aliyun.viruspc.tech` CNAME 到该 tunnel，proxied。`teach.viruspc.tech` 已从 ingress 与 DNS 移除。
- Ingress：仍在 tunnel 上的主机名 → `http://127.0.0.1:80`（本机 nginx）。
- 验收 HTTPS 200 的当前入口：`https://edges.viruspc.tech/teaching/` 、`https://edges.viruspc.tech/tasks/`。
- 进程：cheng-dev `~/bin/cloudflared`，crontab `@reboot`；user systemd 已 enable（可靠开机需要 lingering）。裸 IP HTTP 仍可用。

**Why:**
域名直连阿里云因未备案 Beaver + TLS1.2+SNI 不可用；采用 ECS + Cloudflare Tunnel 作为当前最简单对外方案，用域名 HTTPS 进站并保留动态服务。

**How to apply:**
- 已落地。当前入口仅 `https://edges.viruspc.tech/teaching/` 与 `https://edges.viruspc.tech/tasks/`。
- `aliyun.viruspc.tech` 仍在同一条 tunnel；用户未说移除就保持不动。
- 不要使用 teach.* 主机名。`teach.viruspc.tech` 已从 ingress 与 DNS 移除，不是当前入口。
- 不并 Pages 专用仓 backlog，不出栈那张卡。
- 保活：cheng-dev `~/bin/cloudflared` + crontab `@reboot`；user systemd 已 enable，可靠开机需要 lingering。裸 IP HTTP 仍可用。
