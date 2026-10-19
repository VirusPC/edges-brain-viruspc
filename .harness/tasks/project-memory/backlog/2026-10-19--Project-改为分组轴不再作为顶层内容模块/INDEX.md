---
metadata:
  edges-type: task
  edges-task-project: project-memory
  edges-updated-at: '2026-10-19T16:57:00.852Z'
  edges-title: Project 改为分组轴，不再作为顶层内容模块
  edges-tasks-status: backlog
  edges-task-priority: none
name: project_改为分组轴不再作为顶层内容模块
description: 把 Project 从与 Notes/Tasks/Memory 平级的类型，改成横切分组；Tasks 已有的 projects/ 目录成为统一归属方式。
---
**背景：**
今天在聊 `.harness` 时，判断 Project 本身不该是顶层模块，更像分组：围绕一个 Project 可以挂 Notes、Tasks 等；根 notes 下也可以再用 `projects/` 划目录。Tasks 下面已经有 Projects。现状拧巴在于：Tasks（以及可预期的 Notes）用路径做项目分组，Memory 却另有一类顶层类型叫 `projects`，两边同名不同义；另有 backlog 卡仍把 projects 当根 harness 模块补 CLI（如「projects CLI 对齐 notes」「CLI 与根 harness 补齐 notes/projects」），方向需对齐本次判断。
- 相关：`.harness/tasks/*/projects/` 已是分组实践；`memory/projects/` 多为「关于某项目的记忆」
- 非目标：本卡不要求立刻迁完所有业务仓目录，也不改 Task Project 看板分组机制本身的产品语义
- 关联：`厘清 Harness 模块在知识流转中的位置`；`projects CLI 对齐 notes…`；`CLI 与根 harness 补齐 notes/edges/projects/archive`

**目标：**
约定与实现上，Project 只作归属/分组轴；Notes、Tasks、Memory 仍是内容类型，不再把 Project 当成第四类顶层模块。

**动作：**
- 在 edges 文档/AGENTS 写清：分组轴 vs 内容类型；Tasks/Notes 用 `projects/<slug>/` 或 `project:` 归属
- Memory 里原 `projects` 类型改名或降为带 `project:` 的普通条目，避免与目录分组抢名
- 回看并把「projects 作顶层模块」类 backlog 改口或取消，避免和本约定打架

**完成标准：**
待 grill-with-docs 补
