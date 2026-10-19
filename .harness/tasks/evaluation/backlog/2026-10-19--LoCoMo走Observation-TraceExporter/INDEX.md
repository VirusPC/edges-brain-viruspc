---
metadata:
  edges-type: task
  edges-task-project: evaluation
  edges-updated-at: '2026-10-19T03:30:00.000Z'
  edges-title: LoCoMo 走 Observation TraceExporter
  edges-tasks-status: backlog
  edges-task-priority: none
name: locomo_observation_trace_exporter
description: LoCoMo 评测改走 Observation 的 TraceExporter 上报轨迹，调用方不依赖 Langfuse。
---
**背景：**
把检索评测里的可观测上报抽到 Observation 时，讨论过 LoCoMo 要不要一起接。本轮只改 retrieval_eval。LoCoMo（`run_locomo_official.py` 和 `cases/locomo-smoke`）现在没有上报。
- 现状：检索评测已经只调用 `TraceExporter.export(trace)`；LoCoMo 仍只打分、不导出轨迹。
- 非目标：不改知识库 Observation 产品卡，不加 `edges observation` 命令，不把 LoCoMo 分数写成 Benchmark Proof。
- 关联：ADR 0038；ADR 0008（LoCoMo 冒烟不是公开基准证明）。

**目标：**
LoCoMo 评测通过 Observation 的 TraceExporter 上报轨迹，调用方不知道 Langfuse。

**动作：**
- 复用 `.harness/observation/langfuse_sink` 的 `exporter_from_env()` 与 `export(trace)`。import 方式与检索评测相同：把 `.harness/observation` 放进 `sys.path`。
- 何时上报、分数 metadata、`service.name` 留在 LoCoMo 评测侧。
- 三个 Langfuse 环境变量不齐时走 no-op；失败只打一行 stderr，不影响分数。

**完成标准：**
- [ ] LoCoMo 冒烟在三个变量齐全时经 `TraceExporter` 上报，缺变量或失败不影响分数。
- [ ] LoCoMo 代码不写 `langfuse.*` 属性名。
