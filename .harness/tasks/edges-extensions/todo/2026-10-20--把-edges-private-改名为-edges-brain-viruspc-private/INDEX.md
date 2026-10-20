---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-20T11:37:48.245Z'
  edges-title: 把 edges-private 改名为 edges-brain-viruspc-private
  edges-tasks-status: todo
  edges-task-priority: none
name: 把 edges-private 改名为 edges-brain-viruspc-private
description: >-
  公开拆仓后命名已对齐；私仓仍叫 edges-private，改为 edges-brain-viruspc-private，并改完 Compose
  与文档引用。
---
**背景：**
公开拆仓后命名已对齐为 `VirusPC/edges`（框架）与 `VirusPC/edges-brain-viruspc`（个人公开大脑）；私仓仍叫 `VirusPC/edges-private`，与现命名不一致。命名模式应是：edges（系统）+ edges-brain-viruspc（公开大脑）+ edges-brain-viruspc-private（私密大脑）。

**目标：**
按最新双仓 + Compose 架构，把 `VirusPC/edges-private` 重命名为 `VirusPC/edges-brain-viruspc-private`，并改完 Compose 登记、文档与本地 remote 等引用。不发明新架构，沿用当前 Compose 与双仓边界；动手前先 grill。

**动作：**
- 先 `grill-with-docs`（或 grill）确认影响面：Compose 登记、技能文案、日复盘存款路径、本机 / ECS clone remote、GitHub redirects。
- 再执行 GitHub rename。
- 再开 PR 修引用。历史笔记里的旧名可保留，并在迁移对照里说明。

**完成标准：**
- [ ] GitHub 上仓库名为 `VirusPC/edges-brain-viruspc-private`，且旧 URL 可重定向
- [ ] 个人公开仓与框架仓中的 Compose / README / AGENTS / skills 等持久引用已更新（或明确无需更新）
- [ ] 本机与常用环境的 git remote 已指向新名（或清单列明待用户改）
