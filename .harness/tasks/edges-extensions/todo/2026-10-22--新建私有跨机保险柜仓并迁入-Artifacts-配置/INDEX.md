---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-21T17:05:52.119Z'
  edges-title: 新建私有跨机保险柜仓并迁入 Artifacts 配置
  edges-tasks-status: todo
  edges-task-priority: none
  edges-task-assignee: 全栈开发专家
name: 新建私有跨机保险柜仓并迁入 Artifacts 配置
description: 新建私有跨机保险柜仓，迁入 Artifacts 配置的可安全分发形式
---
**背景：**
peng cheng 想开一个独立私有 GitHub 仓，专门在各机器间安全传递配置与密钥类信息（比备忘录、聊天更通用）；不要混进 edges-brain-viruspc-private 个人脑。首批可迁 Artifacts 客户端配置（`EDGES_ARTIFACTS_TOKEN` 与 `BASE_URL`）。
- 非目标：不把保险柜内容写进公开脑或框架仓
- 关联：由全栈开发专家提出开卡

**目标：**
新建私有「跨机保险柜」仓，写清放什么/不放什么与本机用法约定，并把现有 Artifacts 配置从零散位置迁入该仓可安全分发的形式；各常用机器可 clone/pull 使用。

**前提：**
- 新私有仓，不挂进公开脑 Compose；挂在 edges-workspace-viruspc 的 Compose 下（与两脑、框架仓同层），不必另开独立根仓工作流
- 聊天与 Artifacts 预览链接禁止贴明文 token
- 框架仓/公开脑禁止个人仓名与密钥
- 实施与命名细节 grill 后再定

细节 grill 后补
