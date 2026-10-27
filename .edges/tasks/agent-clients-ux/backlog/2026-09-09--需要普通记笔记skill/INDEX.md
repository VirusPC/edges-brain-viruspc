---
name: 需要普通记笔记skill
description: 除 conversation-to-notes 外，还需要一个面向日常记事的普通笔记 skill
metadata:
  edges-type: task
  edges-title: 需要普通记笔记 skill
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: Task 记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-17T14:09:10.824Z"
  edges-task-project: agent-clients-ux
---

仅有 conversation-to-notes 不够覆盖记事场景，需要新增一个普通记录笔记的 skill（非「整理对话」触发的日常记事）。

**Why:**
conversation-to-notes 适合对话归档；日常速记/待办/碎片应有独立 skill，结构和触发都应更轻。

**How to apply:**
- 设计并实现「普通记笔记」skill：接收用户直接丢来的内容，整理为可落盘笔记，并按 edges-publish 写入 knowledge/notes/（或 edges-brain-viruspc-private）。
- 与 conversation-to-notes 分工：对话整理 vs 普通记事。
