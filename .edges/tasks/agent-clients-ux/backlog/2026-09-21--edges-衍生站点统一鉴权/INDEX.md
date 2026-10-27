---
name: edges_derived_sites_unified_auth
description: teaching、/tasks/ 与未来同机衍生站各管各的访问控制会重复且不一致；需要一套统一鉴权，本轮持久 Tasks 站先公开只读，鉴权后做。
metadata:
  edges-type: task
  edges-title: edges 衍生站点统一鉴权
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-21T04:34:17.461Z"
---

结论（idea）：为全 edges 衍生站（teaching、/tasks/、未来同机站点）设计并落地统一鉴权。

**事实背景:**
- Coding 专家 2026-09-21 在「Tasks review 持久站点」grill Q5 结论：本轮先公开只读，鉴权另开后续卡。
- 同机已有/将有：teaching 站、计划中的 /tasks/ 持久站、以及未来其它 edges 衍生站。
- 请勿并入持久站点 in_progress 卡正文当已完成项；独立 backlog。

**Why:**
teaching、/tasks/ 与未来同机衍生站各管各的访问控制会重复且不一致；需要一套统一鉴权。本轮持久 Tasks 站先公开只读，鉴权后做。

**How to apply:**
- grill 方案（SSO / Basic / Tailscale-only / token）以及与公开只读过渡的关系。
- 派发默认先 grill-with-docs，过关再实现。
- 未指派。
