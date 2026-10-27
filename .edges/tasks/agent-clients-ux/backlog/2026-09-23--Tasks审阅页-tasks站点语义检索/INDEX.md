---
name: tasks_review_semantic_search
description: 字面搜索不够用；在 Tasks 审阅页（含 /tasks/）顶栏或同页入口支持按标题/正文/描述做语义检索，需另开索引与嵌入方案。
metadata:
  edges-type: task
  edges-title: Tasks 审阅页 / `/tasks/` 支持语义检索
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-task-priority: none
  edges-updated-at: "2026-09-23T15:39:45.977Z"
---

结论（idea）：在 Tasks 审阅页（含持久站 `/tasks/`）顶栏或同页入口支持语义检索任务（标题/正文/描述）；索引、嵌入、运行位置另开方案，不并进本轮字面 filter。

**事实背景:**
- 来源：peng cheng 在 grill「review-page 改造（三列布局 + 顶栏 filter）」时明确要求记独立 backlog；由 Coding 专家转告任务记录员。
- 本轮 in_progress 卡 `knowledge/tasks/agent-clients-ux/in_progress/2026-09-21--review-page-改造三列布局-顶栏-filter.md` 顶栏只做字面搜索 + priority + assignee + status 筛选；语义检索明确不进本轮实现。
- 与下列 backlog 分开、勿合并：`2026-09-21--Tasks-review-review-page-写回仓接口`、`2026-09-21--edges-衍生站点统一鉴权`、以及站点 agent 助手模块等。
- 仓内另有「Task Project 分类接入真正 Embedding」类工作项时只作相关引用，本卡范围是审阅页/看板检索 UX，不是 classify 管线。

**Why:**
字面搜索不够用；要在 Tasks 审阅页（含 `/tasks/`）用语义检索找任务（标题/正文/描述），并单独决定索引、嵌入与跑在哪。

**How to apply:**
- 出栈前先 grill-with-docs：检索入口（顶栏 vs 同页）、索引范围、嵌入模型、跑在哪（站点侧 / CLI / 离线批）、与字面 filter 的关系。
- 实现与「写回仓」「统一鉴权」解耦。
