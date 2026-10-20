---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-20T15:27:21.709Z'
  edges-title: 把 edges-brain-viruspc-private 改造成 Edges 结构
  edges-tasks-status: todo
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
