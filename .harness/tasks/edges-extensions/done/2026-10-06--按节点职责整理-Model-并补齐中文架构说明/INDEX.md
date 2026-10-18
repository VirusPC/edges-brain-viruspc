---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-06T12:00:00.000Z'
  edges-title: 按节点职责整理 Model 并补齐中文架构说明
  edges-tasks-status: done
  edges-task-priority: none
name: model_by_node_responsibility
description: >-
  把分散的模型类按 core/agents/tasks/memory/notes/skills 归组，通用 Markdown 回 utils，并补
  domain 架构与中文 CLI README；commands↔Service 解耦另开卡。
---
**背景：**
递归节点架构（#161）落地后，models 根目录与多子目录职责仍混杂，通用 Markdown 工具曾被 Internal 转出，架构说明不足。整理 Model 后再做 commands 与 Service 解耦（当时登记为后续卡，即后来的 #165 主题）。
- 非目标：本卡不实施 commands↔Service 解耦
- 关联：PR https://github.com/VirusPC/edges/pull/163；后续卡 `解耦 CLI commands 与 Service`

**目标：**
Model 按节点职责清晰归组，公开节点接口与 TaskDoc 契约保留；中文架构 / CLI README 反映当前实现。

**动作：**
- 按 core/agents/tasks/memory/notes/skills 归组；格式能力回 utils/markdown；Task 集合操作入 operations
- 补齐 domain/models/operations 架构 README，重写中文 CLI README
- 为看板旧 task-projects 迁移与解耦后续卡做登记（解耦本身不在本 PR）

**完成标准：**
- [x] Node 22 下 CLI 全量测试、类型检查与 build 通过；Schema 生成物与迁移前一致
- [x] 无新增运行时循环；TS 迁移脚本可预览、可重复、冲突前置拒绝
- [x] 变更经 PR #163 squash 合入 main（`6f82d0fb`）
