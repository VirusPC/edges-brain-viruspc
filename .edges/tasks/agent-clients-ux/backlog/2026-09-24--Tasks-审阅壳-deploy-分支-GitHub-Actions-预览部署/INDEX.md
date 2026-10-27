---
name: tasks_review_shell_deploy_branch_gha_preview
description: deploy 分支 + GHA 预览 + beta 域名；合 main/ECS 前可看效果；宿主与现有 deploy 关系待 grill
metadata:
  edges-type: task
  edges-title: Tasks 审阅壳 — deploy 分支 + GitHub Actions 预览部署
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-task-priority: medium
  edges-updated-at: "2026-09-23T17:26:43.000Z"
---

用户在审 PR #126（三列审阅壳）时提出：想搞个 deploy 分支并配上 GitHub Actions，方便合 main / ECS 之前也能看效果。Coding 专家只记 todo，未开实现、未做产品决策。

**Why:**
合 main / 上 ECS 前需要可预览的静态产物，并挂 beta 域名，避免只能本地看或等生产部署。

**How to apply:**
- 单独 deploy 分支（名待定）
- GitHub Actions：构建 `apps/tasks-review-app` + 生成 `/tasks/`（或等价预览产物）并发布
- 宿主待定：GitHub Pages / 现有 ECS / 其它（grill 时定）
- **配 beta 域名**（名待定；指向预览部署，与生产域名分开）
- 与现有 `deploy.yml` / ECS `/tasks/` 的关系要写清，避免双源冲突
- 派发前默认先 grill-with-docs

**关联：**
- 实现 PR：https://github.com/VirusPC/edges/pull/126
- 已合文档 ADR：#124
- Plan：#125
- 相关进行中：`in_review/2026-09-21--review-page-改造三列布局-顶栏-filter`（本条不改其状态）
