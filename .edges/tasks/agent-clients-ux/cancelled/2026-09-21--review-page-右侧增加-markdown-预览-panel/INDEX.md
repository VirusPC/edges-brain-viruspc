---
name: review_page_markdown_preview_panel
description: review-page 现在主要靠拖拽分组，缺右侧 markdown 预览；需要在右侧加 panel 预览当前选中 Task 的正文，方便边看边改归属。
metadata:
  edges-type: task
  edges-title: review-page 右侧增加 markdown 预览 panel
  edges-tasks-status: cancelled
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-21T09:06:11.960Z"
---

结论（idea）：在 review-page（含持久 /tasks/ 与本地渲页）右侧增加 markdown 预览 panel。

**事实背景:**
- 用户 peng cheng 2026-09-21：记 todo，review page 右侧增加一个 markdown 预览 panel。
- Tasks review 持久站已 done（`/tasks/`，ADR 0021）；现有 review-page 以分组/拖拽为主。
- 相关但勿并：`agent-clients-ux` backlog「Tasks review / review-page 写回仓接口」；`agent-clients-ux` backlog「edges 站点统一 agent 助手模块」；`agent-clients-ux` backlog「edges 衍生站点统一鉴权」（不同能力）。

**Why:**
review-page 现在主要靠拖拽分组，缺右侧 markdown 预览；需要在右侧加 panel 预览当前选中 Task 的正文，方便边看边改归属。

**How to apply:**
- grill 选中态、是否只读、与 classify 模式关系。
- 派发默认先 grill-with-docs，过关再实现。
- 未指派。

**合并取消（2026-09-21）：** 合并进「review-page 改造（三列布局 + 顶栏 filter）」统一卡，本卡 cancelled。
