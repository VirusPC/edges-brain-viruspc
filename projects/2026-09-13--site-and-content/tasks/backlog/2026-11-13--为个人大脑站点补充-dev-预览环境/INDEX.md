---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-13T03:32:09.915Z'
  edges-title: 为个人大脑站点补充 dev 预览环境
  edges-tasks-status: backlog
  edges-task-priority: none
name: site_dev_preview_env
description: 站点现在合并即上线，PR 阶段看不到真实效果；补一个 dev 预览环境，先看预览再合。
---
**背景：**
个人大脑站点（`site/`）现在 PR 合进 main 就直接部署到线上 GitHub Pages；PR 阶段只跑构建、不部署。样式和交互改动（例如 2026-11-13 的全站目录 brain#474、AI News 标题标签）合并前看不到真实效果，有问题只能在线上发现。用户认为都直接发线上不太好，需要补 dev 环境。

**目标：**
加一个 dev（预览）环境：PR 改动先在预览地址上看过，再决定是否合并上线。

**动作：**
1. 选定预览方案（候选：Cloudflare Pages / Vercel PR 预览、GitHub Pages 下 `/preview/pr-<n>/` 子路径、单独的 dev 分支站点）。
2. 在 CI 里为改动 `site/` 或 `ai-news/` 的 PR 自动部署预览，并把链接回帖到 PR。
3. PR 关闭后清理对应预览。
4. 把「先看预览再合」写进仓库 AGENTS.md 或 PR 流程说明。

**完成标准：**
- 任意改动 `site/` 的 PR 都能自动得到可访问的预览链接，内容与合并后线上一致。
- 现有线上部署流程不受影响。
