# Observation

职责、收录边界与导航见 [AGENTS.md](AGENTS.md)。

本目录里现在有：

- [`logs/`](logs/README.md)：脱敏后的 run / 使用记录
- [`metrics/`](metrics/README.md)：指标定义与仪表盘笔记
- [`smoke/`](smoke/README.md)：不含密钥的 Langfuse OTLP 冒烟
- [`langfuse_sink/`](langfuse_sink/)：harness 自用的可复用上报包。调用方依赖 `TraceExporter` 和 `exporter_from_env()`，见 [ADR 0038](../../docs/adr/0038-observation-trace-exporter.md)。这不是知识库 Observation 产品，也不提供 `edges observation` 命令。JSONL 适配器有两个：`codex.py`（Codex `exec --json`）和 `pi.py`（pi-coding-agent `--mode json`，Node.js >= 22.19）。pi 把 assistant `message_end` 里的 thinking / text 收成 `reasoning` 与 `agent_message` span，每条消息再收成一个 `generation` span（`input+cacheRead+cacheWrite`、`output`、`reasoning`、`cacheRead`；`cost.total` 进 `Usage.cost`）。有 `timestamp` 和 `durationMs` 时 span 用真实时间，工具的 `durationMs` 接在上一段结束时刻上；缺时间则仍按 1 ms 错开。`tool_execution_end` 收成 `tool` span。上报时 `usage_details.input` 是 `input_tokens` 减去缓存（下限 0），`gen_ai.usage.input_tokens` 保持原值，避免 Langfuse 的 total 把缓存算两次。`stopReason` 为 `error` / `aborted` 或工具 `isError` 时 span 状态是 error。未知事件忽略，最多 40 个 span。检索评测按 `client.kind` 选择适配器。

调用方把本目录放进 `sys.path`，再 `import langfuse_sink`。包不安装，无第三方依赖。检索评测在 import `retrieval_eval` 时做这件事。
