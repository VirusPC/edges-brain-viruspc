---
name: review_page_增加更丰富的辅助_filter
description: review-page 现有筛选偏基础，复杂看板不好收窄；需要更丰富的辅助 filter（如状态/优先级/指派/关键词等组合），方便审阅时定位。
metadata:
  edges-type: task
  edges-title: review-page 增加更丰富的辅助 filter
  edges-tasks-status: cancelled
  edges-task-project: agent-clients-ux
  edges-updated-at: '2026-10-11T10:22:32.359Z'
---

结论（idea）：为 review-page（含持久 /tasks/）增加更丰富的辅助 filter 能力。

**事实背景:**
- 用户 peng cheng 2026-09-21：记 todo，review page 需要增加额外的更加丰富的辅助 filter 能力。
- Tasks review 持久站已 done（`/tasks/`，ADR 0021）；现有 review-page 筛选偏基础：左侧按分组点选收窄（design A），没有状态/优先级/指派/关键词等组合辅助 filter。
- 同日另有 backlog「review-page 右侧增加 markdown 预览 panel」——勿并，filter 与预览是不同 UI 能力。
- 相关但勿并：`agent-clients-ux` backlog「Tasks review / review-page 写回仓接口」；`edges-tasks` backlog「交互式主题聚类（参考 K-means）」；`edges-tasks` backlog「Task 复杂可视化（状态、主题、调度）」。

**Why:**
review-page 现有筛选偏基础，复杂看板不好收窄；需要更丰富的辅助 filter（如状态/优先级/指派/关键词等组合），方便审阅时定位。

**How to apply:**
- grill 过滤维度与组合、与左侧分组筛选关系。
- 派发默认先 grill-with-docs，过关再实现。
- 未指派。

**合并取消（2026-09-21）：** 合并进「review-page 改造（三列布局 + 顶栏 filter）」统一卡，本卡 cancelled。
