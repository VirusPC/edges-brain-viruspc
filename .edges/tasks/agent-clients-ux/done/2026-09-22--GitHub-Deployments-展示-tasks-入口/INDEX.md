---
name: github_deployments_show_tasks_entry
description: "production Deployments 原先只显示 /teaching/。PR #113 合入后 workflow Deploy（.github/workflows/deploy.yml）成功时并行登记 site-teaching 与 site-tasks，入口为 https://edges.viruspc.tech/teaching/ 与 https://edges.viruspc.tech/tasks/。2026-09-22 确认收尾。"
metadata:
  edges-type: task
  edges-title: GitHub Deployments 展示 /tasks/ 入口
  edges-tasks-status: done
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-21T17:33:05.732Z"
---

结论（idea）：让 GitHub Deployments（production）也能展示 /tasks/ 入口（改 url、加说明、或拆 environment 等）。

**结论（2026-09-22）:**
IT资产管理 / 用户确认收尾。PR #113 squash 合入 main（`94bad88`）后，Deployments 并行展示 site-teaching 与 site-tasks。本卡 done。

**事实背景:**
- 用户 peng cheng 2026-09-22：GitHub production 界面只显示 teaching，不显示 tasks；确认后要求记待办。
- 已改域名。合入前 `.github/workflows/deploy.yml`（原 `deploy-teach.yml`）曾设 `environment.name: production` 且 `url: http://182.92.131.89/teaching/`；同 job 已生成 tasks `_site`，但 GitHub 每个 environment 只展示一个 url。
- /tasks/ 公网已可用；问题是 Deployments UI 登记入口，不是站点没部署。
- 相关勿并：`agent-clients-ux` done「Tasks review 持久站点（始终反映 main）」；`agent-clients-ux` backlog「Artifacts 预览改走专用仓 + GitHub Pages」；`agent-clients-ux` backlog「edges 衍生站点统一鉴权」。另勿并 `_default` done「仓库主页展示teach站点部署状态」（当时只挂了 teaching 入口）与 `site-and-content` backlog「仓库主页增加更多 badge」。
- IT资产管理 / 用户 2026-09-22 确认收尾。
- PR #113 squash merge main `94bad88`：workflow 改名 Deploy，文件 `.github/workflows/deploy.yml`；一个 deploy job；成功后并行 site-teaching / site-tasks 两个 environment，URL 分别为 https://edges.viruspc.tech/teaching/ 与 https://edges.viruspc.tech/tasks/。
- 合入后 run success：https://github.com/VirusPC/edges/actions/runs/35632146194
- Tunnel 入口同上；不要 teach.*；aliyun.viruspc.tech 暂留。

**Why:**
production Deployments 只显示 /teaching/，看不到 /tasks/；需要改 deploy 工作流的 environment.url（或拆 environment），让 Deployments 也能点到 tasks 站。

**How to apply:**
- 已收尾，不再 grill。落地见 PR #113：`.github/workflows/deploy.yml`，一个 deploy job，成功后并行 site-teaching / site-tasks。
- 入口：https://edges.viruspc.tech/teaching/ 与 https://edges.viruspc.tech/tasks/。不要 teach.*；aliyun.viruspc.tech 暂留。
