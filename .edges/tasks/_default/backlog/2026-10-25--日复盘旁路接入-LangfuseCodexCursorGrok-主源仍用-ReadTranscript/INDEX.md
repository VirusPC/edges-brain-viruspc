---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-25T16:52:45.769Z'
  edges-title: 日复盘旁路接入 Langfuse（Codex/Cursor），Grok 主源仍用 ReadTranscript
  edges-tasks-status: backlog
  edges-task-priority: none
name: 日复盘旁路接入_langfusecodexcursorgrok_主源仍用_readtranscript
description: 对照过自建 Langfuse 与现有日复盘落盘后，主路径不换；给 Skill 加一条旁路，只补扫 Codex/Cursor 里已有 I/O 的 turn。
---

**背景：**
2026-10-25 在日复盘里对照了自建 Langfuse（`langfuse.viruspc.tech`，v4 events_only）与 `/workspace/daily-scan/`。结论：Grok Bot 沉淀仍以 ReadTranscript 落盘为主——Langfuse 里缺日复盘、minigtr 等助手，Grok Bot Turn 几乎无工具链，Cursor Turn 无 I/O。Langfuse 多出来的是 Codex（local/cloud）和 Cursor Cloud，这些本就不在日复盘扫描里。用户要求把后续动作记成任务。
- 非目标：不把日复盘主源改成只读 Langfuse；不在本卡里做全助手导出补齐（见「Grok Bot 会话每小时写入 Langfuse」）。
- 关联：父向卡「统一收集并统计所有 Agent 的 Session」；「Grok Bot 会话每小时写入 Langfuse」；Skill `.edges/routines/daily-conversation-deposit/`。

**目标：**
日复盘在保留 ReadTranscript 主路径的前提下，能从 Langfuse 旁路捞到 Codex/Cursor 会话里该沉淀的约定与坑，并写进当日 PR。

**动作：**
- 在 `daily-conversation-deposit` Skill 加一小节：何时查 Langfuse、筛哪些 environment/name、如何与 daily-scan 去重
- 实现旁路拉取（CLI/`v2/observations` + `fields` 含 io），只收已有 input/output 的 Codex/Cursor turn
- 候选仍按根 AGENTS.md 落公开/私密脑，和当日 INDEX 同一套 PR 流程

完成标准待 grill-with-docs 补。
