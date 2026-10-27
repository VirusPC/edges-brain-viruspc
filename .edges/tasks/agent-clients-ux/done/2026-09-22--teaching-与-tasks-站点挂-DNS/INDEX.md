---
name: teaching_与_tasks_站点挂_dns
description: >-
  DNS 已挂 edges.viruspc.tech，域名 HTTPS/Flexible 因未备案不可用；2026-09-22 稍后改口采用
  ECS+Tunnel，此前「放弃隧道」作废为对外策略。本卡保持 done。
metadata:
  edges-type: task
  edges-title: teaching 与 tasks 站点挂 DNS
  edges-tasks-status: done
  edges-task-project: agent-clients-ux
  edges-updated-at: '2026-10-11T10:22:38.031Z'
  edges-task-assignee: IT资产管理
  edges-task-assignee-id: 5fcd37e7-eacb-4cc8-b9ed-b96a8ef4e344
---

结论（idea）：为 teaching 与 tasks 两个页面配置 DNS（可由 IT资产管理 定主机名方案：同域路径 vs 子域）。

**结论（2026-09-22）:**
DNS 已挂 edges.viruspc.tech，但域名 HTTPS/Flexible 因未备案 Beaver+TLS1.2+SNI 不可用；对外入口维持裸 IP。

**结论（2026-09-22 稍后，取代上条的对外策略）:**
2026-09-22 稍后用户改口采用 ECS+Tunnel（见新卡 `knowledge/tasks/agent-clients-ux/done/2026-09-22--ECS-上-Cloudflare-Tunnel-对外teachingtasksartifacts.md`）；此前「放弃隧道」作废为对外策略。本卡仍 done：上面的 DNS 已挂与 Beaver/TLS 事实保留不删；Tunnel 落地不在本卡。

**事实背景:**
- 已改域名：现行入口是 https://edges.viruspc.tech/teaching/ 与 https://edges.viruspc.tech/tasks/。下面的裸 IP 是当时记录，不是当前 BASE_URL。
- 公网原入口：http://182.92.131.89/teaching/ 、http://182.92.131.89/tasks/（同机 ECS）。
- 用户 peng cheng 2026-09-22：要不先让 IT资产管理 给这两个页面挂 DNS。
- 相关：GitHub Deployments 只显示 teaching url 的 backlog 另卡；本卡只做 DNS。
- DNS：`edges.viruspc.tech` A → 182.92.131.89 Proxied 仍在；`teach.viruspc.tech` 同。
- CF Full/strict HTTPS → 525：外网 TLS1.2+域名 SNI 在阿里云入口被掐；TLS1.3+同 SNI 外网可通；非 nginx 未开 TLS1.2。
- CF SSL=Flexible 后 525→403：回源 HTTP 带 Host=teach|edges.viruspc.tech 时阿里云 Beaver「Non-compliance ICP Filing」；裸 IP 或不带这些 Host 仍 nginx 200。
- 用户口头放弃域名 HTTPS/Flexible/隧道等绕过；对外入口维持：
  - http://182.92.131.89/teaching/
  - http://182.92.131.89/tasks/
- 备案或以后 Tunnel 再议。
- 2026-09-22 稍后用户改口采用 ECS+Tunnel（见新卡 `knowledge/tasks/agent-clients-ux/done/2026-09-22--ECS-上-Cloudflare-Tunnel-对外teachingtasksartifacts.md`）；此前「放弃隧道」作废为对外策略。上两条是当轮原话，保留不删。

**Why:**
现用裸 IP 访问 /teaching/ 与 /tasks/；先给这两个页面挂 DNS（主机名），方便 Deployments/书签/证书，再谈其它入口展示。

**How to apply:**
- **已取代：** 2026-09-22 稍后「放弃隧道、入口维持裸 IP」不再是对外策略。现行方向是 ECS + Cloudflare Tunnel（见上面新卡）。下面三条是被取代前的当轮结论，留作历史。
- 对外入口维持裸 IP：http://182.92.131.89/teaching/ 与 http://182.92.131.89/tasks/。已改域名：现行入口是 https://edges.viruspc.tech/teaching/ 与 https://edges.viruspc.tech/tasks/。
- DNS 记录保留，但域名 HTTPS / Flexible 不可用，不作为对外入口。
- 备案或以后 Tunnel 再议。已出栈指派 IT资产管理；用户口头放弃域名 HTTPS/Flexible/隧道等绕过。
