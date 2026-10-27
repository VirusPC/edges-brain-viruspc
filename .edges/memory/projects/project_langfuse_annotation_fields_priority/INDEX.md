---
name: project_langfuse_annotation_fields_priority
description: >-
  给 Langfuse / OTEL 上报选标注字段时打开：先专用字段，再可过滤的 metadata，再枚举式 tags，其余才挂裸 attributes
metadata:
  edges-title: Langfuse 标注字段优先级（专用 → metadata → tags → attributes）
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-27
  edges-agent-client: grok-bot
  edges-username: VirusPC
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-27T05:21:00+08:00'
---

给 Langfuse 选标注时按这个优先级：已有**专用字段**（userId / sessionId / environment / release / version；LLM 用 model / usage / cost / input / output）→ 要带键名且需过滤的业务维度用 **metadata**（`langfuse.trace.metadata.*` / `langfuse.observation.metadata.*`）→ 少量枚举式「打个戳」用 **tags**（`langfuse.trace.tags`，string[]）→ 框架自带或不打算当筛选维度的挂**裸 OTEL attributes**（多半进 `metadata.attributes` 兜底，不好按键筛）。

Observation ≈ 一条 OTEL span；Trace 是共享 `traceId` 的一组 span（不单独 ingest）；Session 是多 Trace 的 `sessionId` 标签，也不是 span。tags 与顶层 metadata 都能过滤，互不替代。

**Why:** 2026-10-26 与 Grok Bot 对照 Langfuse v4 observations-first 与 OTLP 上报后定下的选用规则，避免把设备名塞进 environment、或把该过滤的键值丢进裸 attributes。

**How to apply:**
- 设备维度继续走 tags（与既有 environment 命名约定一致：environment 只表 product-locus）。
- 自定义键值要能在 UI 过滤时，用 `langfuse.*.metadata.*`，不要只挂裸 attribute。
- 上报终点用 OTLP `/api/public/otel/v1/traces`；旧 `/api/public/ingestion` 已弃用。
