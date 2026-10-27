---
name: artifacts_preview_deploy_ecs
description: ADR-0013 服务+CLI 已合但 publish 只上传不部署；要把同一套 edges-artifacts-preview 挂到现有 teach 同机阿里云 ECS，经 nginx 对外提供 /artifacts 与 /health。
metadata:
  edges-type: task
  edges-title: Artifacts预览服务部署到ECS
  edges-tasks-status: done
  edges-task-project: agent-clients-ux
  edges-task-assignee: Coding 专家
  edges-task-assignee-id: 099e84df-06c3-4c5d-9e29-fc255dce3d56
  edges-updated-at: "2026-09-21T02:32:08.402Z"
---

结论（idea）：完成 Artifacts 预览服务在 teach 同机 ECS 上的部署与对外入口，使客户端可用稳定公网 URL 打开 artifacts。

**事实背景:**
- PR #94 已合 main（merge 3a7f469，ADR-0013）：Artifacts 预览服务 + `edges artifacts` CLI 落地；publish 只上传，不负责部署。父卡「自建云服务器临时托管 artifacts」已 done。
- 已改域名：现行入口是 https://edges.viruspc.tech。用户同意：同一套 edges-artifacts-preview 挂到现有 teach 同机阿里云 ECS（当时公网 http://182.92.131.89）：GitHub Action SSH 拉 main → Node 服务 → nginx 反代 `/artifacts` 与 `/health`；一次 nginx/sudo 可能需本机手工（同 teach 先例）。
- 云端 agent 进行中：bc-03eab9e8-f0e7-5b5c-93d1-5b97661749f2（Deploy artifacts-preview on ECS），产出部署脚本/workflow/文档 PR；合并前不上线。
- 执行方 Coding 专家；完成后回任务记录员 PR 链接与结果。
- 2026-09-21 Coding 专家请任务记录员记入看板（用户刚要求）。

**Why:**
ADR-0013 服务+CLI 已合但 publish 只上传不部署；要把同一套 edges-artifacts-preview 挂到现有 teach 同机阿里云 ECS，经 nginx 对外提供 /artifacts 与 /health。

**How to apply:**
- 等/审部署 PR；合并后按 workflow 上线；nginx 手工步骤按 teach 同机惯例；看板由任务记录员改状态。
- 勿改其他任务状态。
