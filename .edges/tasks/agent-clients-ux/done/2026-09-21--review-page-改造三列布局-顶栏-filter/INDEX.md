---
name: review_page_redesign
description: 现有 review-page 不够用；改造成顶栏 filter + 左 project / 中看板 / 右 markdown 预览三列，中间看板参考 Linear 风格状态列；可复用开源看板组件。
metadata:
  edges-type: task
  edges-title: review-page 改造（三列布局 + 顶栏 filter）
  edges-tasks-status: done
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-24T02:02:02.053Z"
  edges-task-assignee: Coding 专家
  edges-task-assignee-id: 099e84df-06c3-4c5d-9e29-fc255dce3d56
---

结论（idea）：改造 review-page 为顶栏 filter + 左 project / 中看板 / 右 markdown 预览三列；中间看板参考 Linear 风格状态列，可复用开源看板组件。

**事实背景:**
- 用户 2026-09-21 合并两条待办为 review page 改造：`agent-clients-ux` backlog「review-page 右侧增加 markdown 预览 panel」与「review-page 增加更丰富的辅助 filter」。
- 目标布局：左 project 选择；中状态看板（Backlog / Todo / In Progress / In Review / Blocked…；卡片含编号 / 标题 / 项目标签 / 更新时间）；右选中 Task 的 markdown 预览；三列之上为 filter / display。
- 中间看板参考 Linear：横向状态列、列内卡片叠放（编号、标题、项目标签、更新时间）、列头为状态名与计数；可找开源抄或依赖现成看板组件，不必从零自绘。本轮未收到附件图，以这段文字为准。
- 来源两卡已 cancelled；`/tasks/` 持久站已 done（ADR 0021）。
- 相关但勿并：`agent-clients-ux` backlog「Tasks review / review-page 写回仓接口」；`agent-clients-ux` backlog「edges 站点统一 agent 助手模块」；`agent-clients-ux` backlog「edges 衍生站点统一鉴权」。

**Why:**
现有 review-page 不够用；改造成顶栏 filter + 左 project / 中看板 / 右 markdown 预览三列，中间看板参考 Linear 风格状态列；可复用开源看板组件。

**How to apply:**
- grill 组件选型与 classify 模式。
- 派发默认先 grill-with-docs，过关再实现。
- 已出栈指派 Coding 专家。
