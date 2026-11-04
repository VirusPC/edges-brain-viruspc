# ADR 0009: 结果遗留项逐点转 edges-conversation-to-tasks

## Status
Accepted

## Context
复盘笔记「结果」常留下未闭环事项。只入库不追问，遗留会沉没；一次把全部遗留烤成任务又会问卷轰炸。

## Decision
整理入库后，若结果仍有未闭环项：默认按优先级一次 1～2 条向用户逐点问清（至少背景与目标），再调用 `edges-conversation-to-tasks` 开卡；批次落库后再问下一批。用户明确说先不转任务可跳过。

## Consequences
edges-conversation-to-notes 与 edges-conversation-to-tasks 形成交接；笔记 skill 负责发现遗留并提问，开卡格式仍以 tasks skill 为准。
