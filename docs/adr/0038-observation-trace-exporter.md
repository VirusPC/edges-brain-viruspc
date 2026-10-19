---
status: accepted
---

# Observation 放 harness 自用的 TraceExporter

检索评测里原先有一份自包含的 Langfuse OTLP 上报。各评测以后都要能接同一条上报路径，但不能因此做成知识库 Observation 产品，也不能新增 `edges observation` 命令。

**Status:** accepted（2026-10-19）

**See also:** [ADR 0015](0015-langfuse-infra-vs-observation-product.md)（自部署 Langfuse 是基础设施，知识库 Observation 系统是产品；本决定不合并这两张卡）

## Decision

1. **代码放在 `.harness/observation/langfuse_sink/`。** 这是 harness 自用的可复用上报包，标准库 `urllib`，不安装，不引入第三方依赖。仍不做知识库 Observation 产品，不加 `edges observation` 命令。本决定不改 `.harness/observation/AGENTS.md` 的收录边界条文；目录里有什么写在该目录 README。
2. **评测只依赖 `TraceExporter`。** 工厂 `exporter_from_env()`：`LANGFUSE_HOST`（没有则 `LANGFUSE_BASE_URL`）、`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY` 齐全时返回 Langfuse OTLP exporter，否则返回 no-op exporter。评测调用 `export(trace)`，不写 Langfuse 属性名。失败不抛出；检索评测打一行 stderr，分数不变。
3. **模型分两层。** 通用层对齐 OTel span：`trace_id`、`span_id`、parent、name、start、end、status、attributes，与 Langfuse 无关。另加可选 `kind`（`span` / `generation` / `tool` 等）和 `usage`（input / output / reasoning tokens、model，以及为保持现有 generation 计数而保留的 cached input tokens）。可选的 `input` / `output` 文本也在这一层，避免和 trace metadata 混在一起。语义参考 OTel GenAI semantic conventions。OTLP 的 span kind 整数仍是 INTERNAL（1）；上面的 `kind` 不是这个整数。
4. **Langfuse 属性只在映射层产生。** `langfuse.observation.type`、`langfuse.session.id`、`langfuse.trace.name`、`langfuse.trace.metadata.*`、`langfuse.user.id`、`langfuse.observation.input` / `output`、`langfuse.observation.usage_details` 由 Langfuse exporter 从通用模型写出。`session.id` 与 `gen_ai.usage.*` 一并写出，使上传后的 session、每条 span 上的 session 与 metadata、reasoning span、tool span、generation usage、根 span 上的分数与抽离前一致。
5. **谁搬走，谁留下。** 环境配置、OTLP POST（`/api/public/otel/v1/traces`、Basic auth、User-Agent `edges-observation/1`）、通用 trace/span、session id（`{namespace}/{labels}/{stamp}/{4 hex}`）、Codex `exec --json` JSONL 适配器搬到 Observation。何时上报、R@5 / P@5 / nDCG 等分数 metadata、reasoning 配置取值、`service.name` 留在评测。检索评测传 `namespace="retrieval"` 和原来的标签，session id 与现有格式一致。
6. **依赖方向。** 评测依赖 Observation 的 `TraceExporter`。Observation 不依赖评测。import 方式：把 `.harness/observation` 放进 `sys.path`，再 `import langfuse_sink`。检索评测在 `retrieval_eval` 包初始化时做这一步。
7. **本轮只接 retrieval_eval。** LoCoMo 不接，另开任务卡。冒烟脚本 `.harness/observation/smoke/langfuse-otlp-smoke.sh` 保留为入口，内部改为 `python3 -m langfuse_sink`。

## Considered Options

- 把上报放进 `extensions/` 并加 CLI 命令：否决。`extensions/AGENTS.md` 不为 evaluation / observation 发明命令；这包是 harness 自用代码。
- 改 `.harness/observation/AGENTS.md` 的收录边界来容纳代码：否决。本轮只更新 README。
- 调用方直接填 `langfuse.*` 属性：否决。换后端时 Langfuse 名字会漏进评测。
- 目录改名为与 `TraceExporter` 一致的包名：未改。路径已定为 `langfuse_sink/`。公开类型仍叫 `TraceExporter`，不叫 Sink。

## Consequences

- 删除 `.harness/evaluation/retrieval_eval/langfuse_otlp.py`。Langfuse 线路的单测改到 `langfuse_sink` 自己的测试。
- User-Agent 从 `edges-retrieval-eval/1` 改为 `edges-observation/1`。这是传输头，不是 Langfuse 上的 span 属性。
- 密钥和实例域名仍不入库。轨迹仍不进 `reports/`。
- 自部署 Langfuse 的宿主、编排、访问面、密钥和备份（ADR 0014–0016、0018–0020、0033）不变。
- 附注（2026-10-19）：检索评测的第二个 client 是 pi-coding-agent。JSONL 适配器在 `langfuse_sink/pi.py`，`build_sample_trace` 按 `client.kind` 分派。调用需要 Node.js >= 22.19；模型是 `minimax-cn` / `MiniMax-M3`。密钥经 `MINIMAX_API_KEY` 映射，不入库。
- 附注（2026-10-19）：`usage_details.input` 写成 `input_tokens - cached_input_tokens`（下限 0），`input_cached_tokens` 单独传。Langfuse 的 total 会把这两项相加，缓存不能再留在 `input` 里。`gen_ai.usage.input_tokens` 仍是原来的 `input_tokens`。
