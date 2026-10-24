---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-24T09:22:02.507Z'
  edges-title: 统一收集并统计所有 Agent 的 Session
  edges-tasks-status: backlog
  edges-task-priority: none
name: 统一收集并统计所有_agent_的_session
description: 把各 Agent 客户端的会话收成可查询数据源，支撑沉淀、评测、成本和跨 Agent 接力。
---
**背景：**
用户本来就在尝试用各种方法记录个人上下文。2026-10-24 用户再次强调：非常重要的一点是统计自己在使用的所有 Agent 的 Session；用户认为这些数据非常重要，并要求开卡。
- 现状：自建 Langfuse（`langfuse.viruspc.tech`，项目 grok-bot）已就绪，但当时仍在等第一条 trace；日复盘目前主要扫 Grok Bot，其它客户端会话未统一入库。
- 预期收益：各 Agent 的会话能接到已有的个人上下文记录里，可统一检索与分析，并为 dashboard / 日复盘提供事实源。
- 非目标：本次不规定具体 schema、导入管道或必须用 Langfuse；不要求立刻打通每一个客户端。
- 关联：看板卡「统计个人 skill 使用频率」；「Edges 将 dashboard 定为通用系统输出」；「routines 目录下增加 Project 分组层」里的问题追踪方向。

**目标：**
用户使用的各 Agent 的 Session 能被统一收集，并可被查询、统计，作为沉淀与改进的基础数据。

完成标准待 grill-with-docs 补。
