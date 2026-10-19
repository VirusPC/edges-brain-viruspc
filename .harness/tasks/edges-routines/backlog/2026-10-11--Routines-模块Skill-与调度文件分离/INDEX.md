---
metadata:
  edges-type: task
  edges-task-project: edges-routines
  edges-updated-at: '2026-10-18T21:17:52.368Z'
  edges-title: Routines 模块：Skill 与调度文件分离
  edges-tasks-status: backlog
  edges-task-priority: none
name: routines_模块skill_与调度文件分离
description: 落地 routines 模块约定与最小示例：调度引用 Skill，也可同目录。
---

**背景：** 日复盘对话对比各家定时形态（产品内一体 / 单文件打包 / 半拆开 / 会话工具态）。决定默认拆开：目录下放最简调度文件，内容来自 Skills；也允许 Skill 与调度文件同目录。TypeScript 只分别描述各家，不合成共享类型。调研与工作材料已随已合并的 [PR #219](https://github.com/VirusPC/edges/pull/219) 落在 [`projects/routines/`](https://github.com/VirusPC/edges/tree/main/projects/routines)：[README](https://github.com/VirusPC/edges/blob/main/projects/routines/README.md) 与 [`2026-10-11--跨平台定义调研.md`](https://github.com/VirusPC/edges/blob/main/projects/routines/2026-10-11--跨平台定义调研.md)。非目标：不实现全平台调度运行时。routines 是模块；[`projects/routines/`](https://github.com/VirusPC/edges/tree/main/projects/routines) 是相关 Project 的调研与底稿，模块本身不等于这份 projects/ 材料。
**目标：** 落地 routines 模块约定与最小示例（调度引用 Skill / 可同目录）。
**动作：** 以 [`projects/routines/`](https://github.com/VirusPC/edges/tree/main/projects/routines) 为当前调研与底稿。下一步写模块约定，并补最少一套 schedule→Skill 示例。产品模块的落点路径仍待定，本卡不新开顶层目录。
**完成标准：** 有 README+四形态对照；至少一套 schedule→Skill 示例；文档写明拆分原则且无 shared 合体类型。

**补充想法：运行时读仓库里的提示词**

**背景：** 2026-10-13 放入周复盘 routine 时记下这条想法。上面已经决定日程文件只引用 Skill、不把提示词再抄一份；日复盘示例（`projects/routines/daily-conversation-deposit/`）也是这么放的。Grok Bot 的 routine 仍可以自己存一份完整提示词，和仓库里的 Skill 各写各的。要改策略就得改两处，仓库还不是唯一事实来源。这是想法，还没在 Bot 上改。
**目标：** routine 不再在 Grok Bot 里保存完整提示词。每次运行先读仓库里对应的 routine 文件，再照着执行。调整策略只改仓库这一处，仓库是唯一事实来源。
**完成标准：**
- [ ] 至少一条已接入的 routine（日复盘或周复盘）在 Grok Bot 侧不再保存与仓库 Skill 重复的完整提示词。
- [ ] 该 routine 每次运行先读取仓库里的 `projects/routines/<slug>/SKILL.md`，再按文件执行。
- [ ] 改提示词只改仓库里的这一处；下一次运行跟上仓库里的新文本，不必再改 Bot 里的另一份。

**补充想法：routines 升为 `.harness` 模块**

**背景：** 2026-10-19 整理 Edges 1.5.0 的 CHANGELOG 时，用户说「routines 是有潜力上升为 `.harness` 模块的」，并强调「复盘是持续进化的非常非常关键的 routine」。当时只把复盘目录和日复盘、周复盘两条 routine 拆成 1.5.0 的独立一节，「潜力」没写进发布说明，也没另开卡。本卡上面写着「产品模块的落点路径仍待定」，这条想法就是落点的一个候选。
**目标：** 评估把 routines 做成与 memory、tasks、notes 并列的 `.harness` 模块：`edges init` 能建、harness 材料索引能登记，日复盘、周复盘作为首批成员。
**完成标准：** 待 grill 时再定。
