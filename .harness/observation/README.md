# Observation

职责、收录边界与导航见 [AGENTS.md](AGENTS.md)。

本目录里现在有：

- [`logs/`](logs/README.md)：脱敏后的 run / 使用记录
- [`metrics/`](metrics/README.md)：指标定义与仪表盘笔记
- [`smoke/`](smoke/README.md)：不含密钥的 Langfuse OTLP 冒烟
- [`langfuse_sink/`](langfuse_sink/)：harness 自用的可复用上报包。调用方依赖 `TraceExporter` 和 `exporter_from_env()`，见 [ADR 0038](../../docs/adr/0038-observation-trace-exporter.md)。这不是知识库 Observation 产品，也不提供 `edges observation` 命令。

调用方把本目录放进 `sys.path`，再 `import langfuse_sink`。包不安装，无第三方依赖。检索评测在 import `retrieval_eval` 时做这件事。
