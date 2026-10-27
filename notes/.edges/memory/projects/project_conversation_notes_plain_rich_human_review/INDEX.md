---
name: project_conversation_notes_plain_rich_human_review
description: 写 knowledge/notes：2.3.2 结构；结果遗留逐点问清后交 conversation-to-tasks（一次1～2条）。
metadata:
  edges-title: 对话笔记：主题难点、过程结果、取舍补充、遗留转任务
  edges-type: project
  edges-origin-session-id: local-it-asset-2026-09-27
  edges-agent-client: grok-bot
  edges-username: IT资产管理
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-27T10:23:42+08:00"
---

`knowledge/notes` 对话笔记按 `conversation-to-notes` **2.3.2** 执行。章节 `背景 → 主题 → 过程 → 结果 → 所学 → 行动指南 → 补充说明`。结果有未闭环项时，默认逐点问清后交 `conversation-to-tasks`（一次 1～2 条）。

**Why:**
只入库不追问，遗留会沉没；一次烤光又会问卷轰炸。

**How to apply:**
- 结构与取舍规则见 2.3.1/2.3.0 与 ADR 0007–0008。
- 结果有遗留：一次 1～2 条问清背景/目标 → `conversation-to-tasks`；用户说先不转任务可跳过。见 ADR 0009。
