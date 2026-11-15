---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-15T09:51:46.534Z'
  edges-title: 给个人大脑单独的 tasks 看板页
  edges-tasks-status: backlog
  edges-task-priority: none
name: 给个人大脑单独的_tasks_看板页
description: 现在的 /tasks/ 只展示框架仓库的任务。给个人大脑单独一页，展示大脑自己的任务（含 routines 等子 scope）。
---
**背景：**
2026-11-15，peng cheng 说个人大脑应该要单独的 task 页，并接着澄清：现在部署的 tasks 页其实是 edges 框架的，不是 edges 大脑的。于是先记这张卡，把「大脑自己的任务没有页面」从框架看板里拆出来。做法还没定。
- 已核实：https://edges.viruspc.tech/tasks/ 由框架仓库 VirusPC/edges 的 `.github/workflows/deploy.yml`（仅 `workflow_dispatch`）生成。流程在 ECS 的 `/home/cheng-dev/projects/edges-framework` checkout 里运行 `generate-tasks-site.ts --scope "$PWD"`，输出 `tasks/_site/index.html`。nginx 的 `/tasks/` 指向该目录，因此页面只展示框架仓库的任务。
- 个人大脑仓库的 `deploy.yml` 只 fast-forward ECS 上 `/home/cheng-dev/projects/edges`，并服务 `/teaching/`。
- `pages-site.yml` 发布 GitHub Pages 博客（https://viruspc.github.io/edges-brain-viruspc/）。栏目是 notes、posts、projects、ai-news，没有 tasks。
- 大脑仓库的 `.edges/tasks`、根 `tasks/`、`routines/.edges/tasks`，以及 projects 下的任务卡，目前没有任何页面展示。
- 候选做法（未定案，供以后选择）：A. 在大脑仓库的部署流程里，用框架 CLI 的 `generate-tasks-site`，以大脑 checkout 为 scope 生成页面，挂到新路径（例如 `/brain/tasks/`），并在服务器加一条 nginx 配置。B. 在 Astro 博客站加 tasks 栏目。当前倾向 A，复用现成审阅页，改动小。
- 预期：打开大脑自己的任务时，不用再从框架仓库的看板里找。
- 非目标：这张卡只记录需求。开卡时不改部署、不改代码、不改 nginx。
- 关联：用户原话「个人大脑应该要单独的task页吧」「我是说，现在部署的tasks页，其实是edges框架的，不是edges大脑的」。

**目标：**
给个人大脑提供独立的 tasks 看板页，展示大脑自己的任务（含 routines 等子 scope）。

完成标准待确认，留待后续 grill-with-docs 再补。
