---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-23T09:44:22.692Z'
  edges-title: routines 目录下增加 Project 分组层
  edges-tasks-status: backlog
  edges-task-priority: none
name: routines_目录下增加_project_分组层
description: 给长期问题追踪等常驻流程加一层归属分组，避免 routines 扁平堆叠。
---
**背景：**
讨论 AI 时代长期问题（记忆、自进化、长程任务、沙箱、多 agent、安全、HITL、可观测、评估等）时，想到用定时追踪解法演进；进而提出 Routines 是否也要像 Tasks 一样有 Projects。澄清后：不是 GitHub 项目，而是 `routines/` 文件夹下再加一层分组目录，用一个 Project（例如「问题追踪」）收这类 routine。
- 现状：Tasks 已有 project 分组；Routines 侧目录是否支持同类归属，尚未定。
- 预期收益：问题追踪类 routine 可按域归类，和「问题卡 + 定时扫进展」配套。
- 非目标：不另开 GitHub 仓；不把 routine 执行机制改成看板工作项。
- 关联：2026-10-23 与 Grok Bot 的对话（问题追踪与 routines 分组）。

**目标：**
`routines/` 支持类似 Tasks 的 Project 分组目录，长期问题追踪等 routine 能挂到对应分组下。
