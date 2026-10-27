---
name: tasks_review_persistent_site
description: 临时 artifacts URL 会过期且每次 publish 新 UUID；需要像 teaching 一样有一个持久部署的 Tasks review/状态站，始终反映 main 上的看板。
metadata:
  edges-type: task
  edges-title: Tasks review 持久站点（始终反映 main）
  edges-tasks-status: done
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-21T08:55:48.671Z"
  edges-task-assignee: Coding 专家
  edges-task-assignee-id: 099e84df-06c3-4c5d-9e29-fc255dce3d56
---

结论（idea）：建持久 Tasks review（或状态总览）站点：固定公网路径（如 `/tasks/` 或子域），CI 在 main 更新时重建并部署到 teach 同机 ECS（或同类），内容始终来自 main 看板。

**事实背景:**
- teaching 已有同机 ECS 持久站 + GitHub Action 拉 main 部署先例（`deploy.yml`：SSH 整仓 `git fetch` + `reset --hard origin/main`）。
- Artifacts 预览是短 TTL UUID 路径（ADR-0013），适合一次性审阅页；每次 `publish` 新 UUID 且会过期，不适合当固定入口「永远打开同一 URL 看主分支看板」。
- `edges tasks project review-page` 只渲本地/临时 HTML（ADR-0012 render-only）；`edges artifacts publish` 产出临时公网 URL。
- 已有相关但不同的卡，勿并：`agent-clients-ux` done「自建云服务器临时托管 artifacts」与「Artifacts预览服务部署到ECS」（临时托管 / ECS）；`edges-tasks` backlog「看板状态可视化 Skill（review-page/HTML + artifacts publish）」偏 Skill 封装临时 publish。另勿并 changelog CLI、大一统 CRUD Skill/MCP。
- 用户 2026-09-21 原话意图：要一个始终体现主分支状态的持久部署站点，像 teaching。

**Why:**
临时 artifacts URL 会过期且每次 publish 新 UUID；需要像 teaching 一样有一个持久部署的 Tasks review/状态站，始终反映 main 上的看板。

**How to apply:**
- grill 范围（仅 status 总览 vs 含 project review-page 交互）、与 artifacts TTL 服务边界、nginx 路径（teaching.conf 只认 `/teaching/`，本站另开 `/tasks/` 或子域）、是否只读、鉴权。
- 派发默认先 grill-with-docs，过关再实现。
- 未指派。
