---
name: project_langfuse_traces_immutable_keep_dirty
description: 自建 Langfuse 上已写入的 environment 与 model 不可事后 PATCH；命名规范落地前的脏数据保留，不按同 id 重灌。
metadata:
  edges-title: Langfuse 历史 trace 不可改 environment/model，脏数据保留
  edges-type: project
  edges-origin-session-id: sand-subagent-92a59a87-01e9-2d5a-d25a-193a102f8566
  edges-agent-client: cursor
  edges-updated-at: '2026-10-25T05:10:57+08:00'
---

## What
自建 Langfuse（v4）上，已落盘 trace 的 `environment`、`model` 等核心字段不可通过 API 事后改正。`PATCH` 仅支持 bookmarked / public / tags 一类元数据。命名规范（`*-local` / `*-cloud` / `grok-bot`；model 缺省写 `default`）落地之前产生的脏数据应保留，不要指望清洗，也不要按同一 id 重灌覆盖。

## Why
2026-10-25 对话核对过：用户问「已有的 langfuse 数据还能清洗下吗」。查证后结论是 traces 基本 immutable；强行重灌同 id 会冲突或制造重复。保留脏数据便于对照「规范前后」差异，也避免误删观测。

## How to apply
- 新写入严格按已合入的 environment / model 命名约定。
- 发现历史脏数据：不清洗、不删、不重灌同 id；需要对照时用时间窗或 tags 过滤。
- 若上游日后提供可改字段的 API，再另开卡评估迁移，不在本条约默认假设可改。
