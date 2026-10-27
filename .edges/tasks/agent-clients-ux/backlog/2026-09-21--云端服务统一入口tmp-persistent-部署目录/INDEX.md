---
name: cloud_service_unified_entry
description: 系统绑定的云端托管现在路径心智分散；需要提供 tmp 与 persistent 两个部署目录作为统一入口——短生命周期对标 Artifacts UUID+TTL，持久固定路径对标 teaching 与规划中的 /tasks/。
metadata:
  edges-type: task
  edges-title: 云端服务统一入口（tmp + persistent 部署目录）
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-21T04:41:55.531Z"
---

结论（idea）：后续提供 **tmp** 与 **persistent** 两套部署目录，作为系统绑定云端服务的统一入口。

**事实背景:**
- peng cheng 在 Tasks review 持久站点 grill 过程中提出（经 Coding 专家 2026-09-21 转述记入看板）。
- 现有：Artifacts 预览 = 短 TTL UUID；teaching / 规划中 `/tasks/` = 持久固定路径；各站路径心智不统一。
- 相关但勿并：`agent-clients-ux` done「自建云服务器临时托管 artifacts」与「Artifacts预览服务部署到ECS」；`agent-clients-ux` in_progress「Tasks review 持久站点（始终反映 main）」；`agent-clients-ux` backlog「edges 衍生站点统一鉴权」；`edges-tasks` backlog「看板状态可视化 Skill（review-page/HTML + artifacts publish）」。

**Why:**
系统绑定的云端托管现在路径心智分散；需要提供 tmp 与 persistent 两个部署目录作为统一入口——短生命周期对标 Artifacts UUID+TTL，持久固定路径对标 teaching 与规划中的 `/tasks/`。

**How to apply:**
- grill 目录约定、与 nginx/CI/鉴权卡边界、迁移路径。
- 派发默认先 grill-with-docs，过关再实现。
- 未指派。
