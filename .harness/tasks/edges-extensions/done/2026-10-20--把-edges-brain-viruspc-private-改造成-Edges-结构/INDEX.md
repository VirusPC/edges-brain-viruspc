---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-21T17:28:44.706Z'
  edges-title: 把 edges-brain-viruspc-private 改造成 Edges 结构
  edges-tasks-status: done
  edges-task-priority: none
name: 把 edges-brain-viruspc-private 改造成 Edges 结构
description: >-
  私密仓改名后内部仍是旧 Obsidian vault，套上 .harness/ 结构，保住 vault 可用，并与公开大脑
  edges-brain-viruspc 配对。
---

**背景：**
私密仓刚由 `edges-private` 改名为 `edges-brain-viruspc-private`，但内部结构还是旧的 Obsidian vault：没有 `.harness/`，记忆在根目录的 `MEMORY.md`，内容放在拼错的 `knowlege/projects/` 下，根目录散着截图和草稿，`edges` CLI 不认识它。

**目标：**
让私密仓符合 Edges 结构，和公开大脑 `edges-brain-viruspc` 配对。

**用户已定的前提：**
1. 套 `.harness/` 结构，让 `edges` CLI 能管它。
2. 保住 Obsidian vault 可用，路径和图片链接不能断。
3. 和公开大脑 `edges-brain-viruspc` 配对，约定好私密内容放在哪里。

细节 grill 后补。

## 进展

- **2026-10-22 完成：** VirusPC/edges-brain-viruspc-private PR #1 squash 合入（merge commit `40947c2`）。
- 去掉 `knowlege/`；`projects/` 平铺；原 `knowlege/edges` 笔记进 `notes/`；套上 `.harness/` + project-harness AGENTS；`MEMORY.md` 迁入 `.harness/memory`；memory doctor ok。
