---
name: grokbot-langfuse-export
description: 每小时把全部 Grok Bot 助手会话导出到自建 Langfuse（与本机 Codex/Pi 同一项目）。从 box 本地消息索引 search-index.db（或 ReadTranscript）落 staging，再用 vendored langfuse/cursor-observability-plugin 的 emitTurn 经 OTLP 写入。
---

# Grok Bot → Langfuse 小时导出

把 peng cheng 名下全部 Grok Bot 助手（含记录员）的会话，按真实发生时间写入自建 Langfuse 项目 Edges（`https://langfuse.viruspc.tech`），与本机 Codex / Pi 插件共用同一对 key。

代码结构、每个文件的用途、准备和升级插件见 [README.md](README.md)；日程见 [schedule.md](schedule.md)。

## 已锁定规则

- 范围：全部助手（`/home/box/agent-data/agents/*/profile.json`），含记录员。
- 项目：与本机插件同一 Langfuse 项目；环境变量 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`；host 取 `--host` > `LANGFUSE_HOST` > `LANGFUSE_BASE_URL` > `https://langfuse.viruspc.tech`。
- 时间：分钟精度；metadata `time_precision: minute`。不发明秒级精度。
- Session：同一 bot，与上一轮 user 消息间隔 ≤3 小时为同一 session，否则新 session。`sessionId = grokbot:<botId>:<首条 user message 的稳定 id>`。
- Trace：一轮 user 到该轮 assistant 最终可见回复为一条 trace，根 observation 名 `Grok Bot Turn`。
- 内容：可见 user / assistant 文本 + tool 名称（来源有才写）。不要 tool args / results，不要 reasoning。
- Tags：`agent:grok-bot`、`device:grokbot`、`bot:<助手显示名>`；userId `peng-cheng`。
- 去重：box 本地 cursor + 稳定 traceId（`grokbot:<botId>:<turnPos>`）。`turnPos` 是该 bot 全量时间线上的位置，所以 staging 必须是全量历史。
- 首次：只回填过去 24 小时。
- 失败：只推进写成功的 cursor；失败批次留给下一小时。

## 对话来源

一句话：对话信息 → SQLite 索引（`search-index.db`）→ 我们生成的 staging JSONL → Langfuse；**不是**直接读 `agent-transcripts`。

| 来源 | 时间戳 | 说明 |
|---|---|---|
| `/home/box/agent-data/search-index.db`（`messages` 表） | 真实毫秒时间戳 | **正式导出默认链路**。可见 user/assistant 文本，**没有 tool 名**。`npm run -s stage`（`adapter/stage-from-search-index.mjs`）写成 `/workspace/langfuse-export-staging/<botId>.jsonl`；行形状对齐 Cursor 插件：`{ "role", "message": { "content": [...] } }`，user 行带 `_ts`（Asia/Shanghai 分钟墙钟）。再由 `export` 读这些 JSONL，经 adapter + vendored `emitTurn` 写 Langfuse |
| `ReadTranscript` | user 消息有分钟时间戳 | **替代源**：可带 tool 名；routine 里经常不可用。可用时也可写成同形状的 `<botId>.jsonl` |
| `/workspace/daily-scan/` | 有 | 日复盘产物，仅冒烟 / 补数用（`--source daily-scan`） |
| `/home/box/agent-data/agent-transcripts/<agentId>/<agentId>.jsonl` | 本机有 | **明确不用**。格式也是 `{role, message}`，且能看到 `tool` 角色；但 2026-10-24 21:00（UTC+8）实测：**不实时**（全部文件 mtime 停在 box 恢复时约 09:29，之后对话不追加，是快照不是实时日志）；**不全**（对照 search-index.db 的 60 个助手，15 个没有 JSONL，含主 Grok Bot、日复盘、周复盘、设备助手、Agent Memory 专家等）。增量导出只用 search-index.db；原生 JSONL 至多在补历史时补 tool 过程 |

## 步骤（每小时）

1. 进目录并确保依赖就绪（首次或插件更新后）：

   ```bash
   cd /workspace/edges-brain-viruspc/projects/routines/grokbot-langfuse-export
   git submodule update --init vendor/cursor-observability-plugin && npm ci
   ```

2. 落 staging：从本地消息索引导出每个 bot 的全量对话。

   ```bash
   npm run -s stage
   ```

   写 `/workspace/langfuse-export-staging/<botId>.jsonl`，按 `timestamp_ms, seq, id` 排序；user 行带 `_ts`（Asia/Shanghai 分钟墙钟，如 `2026-10-24T19:51:00`）。若改用 `ReadTranscript`，仍须每个 bot 写全量、正序、同形状的 `<botId>.jsonl`；某个 bot 读不到就跳过，不中断其它 bot。

3. 导出：

   ```bash
   npm run -s export -- --source staging --staging-dir /workspace/langfuse-export-staging
   ```

   每批 `emitTurn` 后 flush；失败批次及之后不推进。Cursor 写在 `/home/box/agent-data/langfuse/grokbot-export-cursors.json`（勿提交 git）。stdout 为 JSON summary，失败在 `summary.failures`，退出码 1。

## 成功标准

- 每小时全部助手都尝试导出；cursor 按 bot 递增；重复跑不产生重复 trace。
- Langfuse 上能按 tag `device:grokbot` / `bot:<名>` 筛到；根 observation 名为 `Grok Bot Turn`；起止时间为分钟整点。
- 失败 bot / 批次出现在 `summary.failures`，且 cursor 未越过失败点。

Langfuse 是 v4 `events_only` 模式：写入走 `POST /api/public/otel/v1/traces`，核对用 `GET /api/public/v2/observations?traceId=<id>`。
