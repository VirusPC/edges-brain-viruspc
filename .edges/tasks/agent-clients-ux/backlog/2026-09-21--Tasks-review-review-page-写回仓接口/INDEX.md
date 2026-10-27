---
name: tasks_review_review_page_writeback
description: 本轮 /tasks/ 持久站只读于 git，人在页上改完无法写回仓库；需要通用 review-page 写回仓接口，并一并想清拖拽是否与 classify 审阅页分模式。
metadata:
  edges-type: task
  edges-title: Tasks review / review-page 写回仓接口
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-21T07:40:25.299Z"
---

结论（idea）：为 Tasks review 持久站 / 通用 review-page 提供写回仓接口；grill 时同时定：拖拽是否与 classify 审阅页分模式。

**事实背景:**
- Coding 专家 2026-09-21 转述：来源 Tasks review 持久站点 grill Q8；本轮 `/tasks/` 只读于 git。
- 现有 classify 路径：review-page 渲 HTML → 人拖拽 → 复制导出 JSON 贴回聊天 → CLI 落地；持久站若只读则无写回。
- 相关但勿并：`agent-clients-ux` in_progress「Tasks review 持久站点（始终反映 main）」（本轮只读）；`agent-clients-ux` backlog「review页结果回传Agent客户端」；`edges-tasks` backlog「看板状态可视化 Skill（review-page/HTML + artifacts publish）」；`agent-clients-ux` backlog「edges 衍生站点统一鉴权」；`agent-clients-ux` backlog「云端服务统一入口（tmp + persistent 部署目录）」。

**Why:**
本轮 `/tasks/` 持久站只读于 git，人在页上改完无法写回仓库；需要通用 review-page 写回仓接口，并一并想清拖拽是否与 classify 审阅页分模式。

**How to apply:**
- grill 写回通道（PR vs 直接 main、鉴权、与贴 JSON 兼容）、模式拆分。
- 派发默认先 grill-with-docs，过关再实现。
- 未指派。
