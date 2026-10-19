# smoke/

可复现的观测冒烟。这里只放不含密钥的脚本和用法；一次跑出来的轨迹不要当成评测分数。

## Langfuse OTLP 冒烟

[`langfuse-otlp-smoke.sh`](langfuse-otlp-smoke.sh) 向自建 Langfuse 发一条根 span（name 为 `edges-langfuse-smoke`），再用 v2 observations 按 traceId 回查。POST 走同目录上一级的 [`langfuse_sink`](../langfuse_sink/)：壳脚本设置 `PYTHONPATH` 后执行 `python3 -m langfuse_sink`，stdout 只打 trace id；回查仍用 `curl`。User-Agent 是 `edges-observation/1`（Cloudflare 1010 会拦 Python urllib 的默认标识）。2026-10-11 17:18（北京时间）从 Grok Bot 云电脑用同一条 OTLP 路径跑通，grok-bot 项目不再停在 Waiting for first trace。

在仓库根执行前，先在当前环境里准备三个变量。取值来自 Langfuse 项目的 API key 和公网 HTTPS 域名（经 Cloudflare Tunnel），不要写进仓库、笔记或命令历史：

- `LANGFUSE_HOST`：实例的 origin，不含路径
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`

```bash
bash .harness/observation/smoke/langfuse-otlp-smoke.sh
```

脚本依赖 `curl` 和 `python3`（标准库，无第三方包）。成功时打印 `OK: trace landed`。它每次生成新的 traceId，不复用某一次的历史 id。

## v4 events_only

2026-10-11 核实：这台实例是 Langfuse v4.38.0，写模式为 events_only。

- `POST /api/public/ingestion` 只收 score。trace-create、span-create 会被 400 拒绝。
- 发 trace 用 `POST /api/public/otel/v1/traces`。Basic auth 是 `公钥:私钥`。
- 该模式下 `GET /api/public/traces/{id}` 返回 404。回查用 `GET /api/public/v2/observations?traceId=...`。

健康检查是另一条路径：`GET /api/public/health` 返回 OK 只说明进程在，不代替上面这条冒烟。

访问面见 [ADR 0033](../../../docs/adr/0033-langfuse-public-https-via-cloudflare-tunnel.md)。密钥仍只留在宿主磁盘，见 [ADR 0018](../../../docs/adr/0018-langfuse-secrets-stay-on-minigtr.md)。
