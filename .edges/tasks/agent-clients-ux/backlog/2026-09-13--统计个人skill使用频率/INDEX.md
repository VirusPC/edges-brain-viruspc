---
name: count_personal_skill_usage
description: 统计个人 skill 使用频率并收集数据
metadata:
  edges-type: task
  edges-title: 统计个人 skill 使用频率
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-17T14:09:12.177Z"
  edges-task-project: agent-clients-ux
---

需要统计个人 skill 使用频率，并收集数据。

**Why:**
不知道哪些 skill 真在被用、用多频繁，就很难决定保留、改、或删。现有 backlog「runa-memory-ask 调用结果统计」只盯一条 skill 的结果好不好；本条是跨 skill 的使用次数/频率与数据采集。也和知识库 Observation 不同：那条看知识库怎么被检索，本条看 skill 怎么被调用。

**How to apply:**
- 细聊统计范围：Grok Bot workflows、仓内 extensions/skills、本机 ~/.agents/skills，以及跨 Agent。
- 先定最小采集：skill 名、调用时间、调用方；频率从这笔数据算。
- 隐私：个人使用数据默认不进公开仓库明文；落盘位置细聊后再定。
- 未指派。派发时默认先 grill-with-docs。
