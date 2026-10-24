---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-24T11:19:34.700Z'
  edges-title: Grok Bot 会话每小时写入 Langfuse
  edges-tasks-status: backlog
  edges-task-priority: none
name: grok_bot_会话每小时写入_langfuse
description: 本地插件抓不到 Grok Bot；用定时任务按真实时间线把会话写进 Langfuse。
---
**背景：**
谈 Observation / Langfuse 接入时发现，本机插件只能抓 Codex、Cursor 本地、Claude Code、OpenCode、Pi，抓不到 Grok Bot（跑在 24 小时主机上）和 Cursor 云端。讨论过三种导出：会话结束立刻写、定时写、手动拉。用户选定「最好是定时任务，每小时写一次」。又确认：写入时可带上消息原本的开始结束时间，时间线不会因为导出时刻挤在一起；只有「哪天出现在 Langfuse」会晚一点。用户要求先开卡，再想清范围、项目、tag 与去重。
- 现状：自建 Langfuse 在 `langfuse.viruspc.tech`；本机多 Agent 已用 tags 打设备；Grok Bot 尚无自动上报。
- 预期收益：Grok Bot 会话进入同一观测面，方便和别的 Agent 一起查、做评测与复盘。
- 非目标：不在这张卡里做 Cursor 云端 session；不要求立刻接通所有客户端（那是父卡）。
- 关联：父卡「统一收集并统计所有 Agent 的 Session」；Observation 概念（首版绑 Langfuse）。

**目标：**
Grok Bot 的会话按小时定时写入 Langfuse，时间线按真实发生时间排列，可被检索与统计。

**动作：**
- 每小时跑一次导出，写入 Langfuse（observation 带原始起止时间）
- 开做前先定：导出哪些助手、进哪个 Langfuse 项目、打什么 tag、如何避免重复写入

**完成标准：** 待 grill-with-docs 补（范围、项目、tag、去重尚未拍板）
