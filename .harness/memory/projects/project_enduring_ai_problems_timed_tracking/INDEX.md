---
name: project_enduring_ai_problems_timed_tracking
description: 要把记忆管理、多 agent、评估等长期问题时打开：先写成稳定问题定义，再用 Routines 定时扫公开进展，对照本仓实践记差异
metadata:
  edges-title: 长期 AI 问题写成稳定定义，用定时追踪看解法演进
  edges-type: project
  edges-origin-session-id: sand-subagent-55c25cf9-6a9f-155e-a764-e1442ed72b12
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-24T05:22:35+08:00'
---

把 AI 时代里长期存在、但解法不断演进的问题（记忆管理、自进化、长程任务、云端沙箱、多 agent 协作、安全、human in the loop、可观测、评估等）先写成稳定的问题定义，再用 AI 定时追踪相关最新进展；不要当成一次性调研或追热点。

**Why:** 2026-10-23 用户在 Grok Bot 里明确提出：这些关键问题始终存在，变的是解决方案；应该不断定义这类问题，并用 AI 定时去追踪进展。随后收窄落地形态：不是另开 GitHub 仓，而是在 `routines/` 下加一层类似 Tasks 的 Project 分组，用一个「问题追踪」类分组收这类常驻流程。看板卡已落在 `.harness/tasks/_default/backlog/2026-10-23--routines-目录下增加-Project-分组层/`（#352 已合）。这条记忆记的是判断轴本身，不是目录改造任务。

**How to apply:**
- 新开长期问题时，先写清范围、成功标准、不在范围内；问题卡保持稳定，解法与边界随追踪更新。
- 用 Routines 做定期扫描（周/月），产出对照本仓 Edges 实践的差异与可借点，写进笔记或记忆，而不是只堆链接。
- 目录归属等 `routines/` Project 分组落地后再挂；在那之前先把问题定义和追踪节奏定清楚，不要等文件夹结构。
- 与「追一篇新文章 / 开一次调研」区分：后者可以是笔记；前者是常驻问题轴。
