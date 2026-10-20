---
name: tasks_review_shell_mobile_narrow
description: "#126 三列桌面可用；390×844 横向溢出。2026-09-24 grill 已锁窄屏纵向长滚动与双端「移到项目…」，见 ADR 0023"
metadata:
  edges-type: task
  edges-title: Tasks 审阅壳 — 手机 / 窄屏适配
  edges-tasks-status: done
  edges-task-project: agent-clients-ux
  edges-task-priority: medium
  edges-updated-at: "2026-09-24T15:21:03.000Z"
---

#126（三列审阅壳）已合入 main。桌面可用；Coding 专家在 390×844 手机视口实测不可用——固定三列（约 240px 项目栏 + 状态板 + 380px 详情）横向溢出，中间卡片板几乎看不见，点不开详情；顶栏筛选尚可点。当前实现未做 responsive，与「桌面审阅壳」定位一致。用户只说「记个 task」，未开实现。

**Why:**
手机 / 窄屏需要另开一版可用布局，否则移动端打不开详情、看板几乎不可用。

**How to apply:**
- 另开手机可用布局（抽屉 / 单栏切换等），**不是**微调栏宽
- 派发前默认先 grill-with-docs
- 实现时以本卡截图 + 实机/视口复核为准（临时预览链接可能已过期）

**证据（390×844，Coding 专家 2026-09-24 截于 box）：**

附件目录：`img/2026-09-24--Tasks-审阅壳手机-窄屏适配/`

![01 看板：左项目栏占大半宽，中间状态板几乎看不见，底有横向滚动条](../img/2026-09-24--Tasks-%E5%AE%A1%E9%98%85%E5%A3%B3%E6%89%8B%E6%9C%BA-%E7%AA%84%E5%B1%8F%E9%80%82%E9%85%8D/01-board.png)

![02 顶栏筛选可点；优先级下拉可开，中间板仍被挤成细缝](../img/2026-09-24--Tasks-%E5%AE%A1%E9%98%85%E5%A3%B3%E6%89%8B%E6%9C%BA-%E7%AA%84%E5%B1%8F%E9%80%82%E9%85%8D/02-scroll-or-filters.png)

![03 详情占位「选择一张卡片查看正文」可见，中间卡片仍点不开](../img/2026-09-24--Tasks-%E5%AE%A1%E9%98%85%E5%A3%B3%E6%89%8B%E6%9C%BA-%E7%AA%84%E5%B1%8F%E9%80%82%E9%85%8D/03-detail.png)

![04 项目栏交互态；三列仍未折叠为手机布局](../img/2026-09-24--Tasks-%E5%AE%A1%E9%98%85%E5%A3%B3%E6%89%8B%E6%9C%BA-%E7%AA%84%E5%B1%8F%E9%80%82%E9%85%8D/04-project.png)

**关联：**
- 已 done：`done/2026-09-21--review-page-改造三列布局-顶栏-filter`
- 实现 PR：https://github.com/VirusPC/edges/pull/126
- 相关 backlog：`backlog/2026-09-24--Tasks-审阅壳-deploy-分支-GitHub-Actions-预览部署`（本条不改其状态）

**Grill（2026-09-24，peng cheng，accepted）：** 完成标准已锁在 [ADR 0023](https://github.com/VirusPC/edges/blob/main/docs/adr/0023-review-shell-narrow-vertical-layout.md)。窄于 Tailwind `md`（`<768px`）是同一壳的纵向长滚动（项目筛选 → 状态板 → 详情接在下方），双端卡片菜单「移到项目…」只改页内 JSON。上面「抽屉 / 单栏」是开卡时的想法，以 ADR 为准。本卡不改成实现计划，也不动 deploy 预览那张 backlog。
