---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-24T12:00:00.000Z'
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
- 在 `projects/routines/grokbot-langfuse-export/` 落地 skill + `export_to_langfuse.py`（Grok Bot 小时 routine 调用；本卡不负责在产品里点创建 routine）
- 每小时：对全部助手 `ReadTranscript` → staging JSONL → 脚本经 OTLP 写入 Langfuse（自建实例 `events_only`，不用已拒绝的 `/api/public/ingestion` trace 写入）
- 范围：全部助手含记录员；同一 Langfuse 项目 Edges；tags `agent:grok-bot` / `device:grokbot` / `bot:<显示名>`；分钟精度 + metadata `time_precision: minute`
- Session：同 bot、与上一轮 user-message 间隔 ≤3h 同 session，否则新 session；`sessionId=grokbot:<botId>:<首条 user 稳定 id>`
- 一轮 user→assistant 最终可见回复 = 一条 trace；内容仅可见文本 + tool 名（无 args/results/reasoning）
- 去重：box 本地 cursor `/home/box/agent-data/langfuse/grokbot-export-cursors.json`（不进 git）+ 稳定 hashed trace id（botId + turn_pos）
- 首次回填仅过去 24h；写失败只推进成功批次的 cursor，失败留待下一小时并报告

**完成标准：**
- PR 合入后，box 上可用文档中的命令单次跑通导出（dry-run / 小批量真写）
- cursor 文件只在 box 本地；重复跑不重复造 trace
- Langfuse 能按 `device:grokbot` / `bot:<名>` 筛到，observation 时间为分钟整点
- 小时 routine 创建后可按 `schedule.md`（`0 * * * *` Asia/Shanghai）挂上本 skill（routine 创建本身是后续一步）
