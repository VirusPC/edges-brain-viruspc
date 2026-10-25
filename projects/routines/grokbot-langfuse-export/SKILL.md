---
name: grokbot-langfuse-export
description: >-
  把全部 Grok Bot 助手会话导出到自建 Langfuse（与本机 Codex/Pi 同一项目）。从 box 本地消息索引
  search-index.db（或 ReadTranscript）落 staging，再用 vendored
  langfuse/cursor-observability-plugin 的 emitTurn 经 OTLP 写入。运行频率见
  .harness/routines/grokbot-langfuse-export/INDEX.md。
---

# Grok Bot → Langfuse 导出

## 目标与范围

把 peng cheng 名下全部 Grok Bot 助手（含记录员）的会话，按真实发生时间写入自建 Langfuse 项目 Edges（`https://langfuse.viruspc.tech`），与本机 Codex / Pi 插件共用同一对 key。

- 范围：全部助手（`/home/box/agent-data/agents/*/profile.json`），含记录员。
- 运行频率见 [Routine INDEX.md](../../../.harness/routines/grokbot-langfuse-export/INDEX.md)。
- 代码结构、文件用途、升级插件见 [README.md](README.md)。

## 数据流

对话信息 → `search-index.db` → 本目录生成的 staging JSONL → Langfuse（adapter + vendored `emitTurn`）。换源时仍须产出同形状的 staging，再走 `export`。

| 来源 | 能力 | 在本流程中的用法 |
|---|---|---|
| `/home/box/agent-data/search-index.db`（`messages`） | 可见 user/assistant 文本；真实毫秒时间戳；**无 tool 名** | **默认增量源**。`stage`（`adapter/stage-from-search-index.mjs`）写 `/workspace/langfuse-export-staging/<botId>.jsonl`：按 `timestamp_ms, seq, id` 排序；行形状 `{ "role", "message": { "content": [...] } }`；user 行带 `_ts`（Asia/Shanghai 分钟墙钟，如 `2026-10-24T19:51:00`） |
| `ReadTranscript` | 可带 tool 名；user 侧常有分钟时间戳 | **替代源**：routine 里可能不可用；可用时每个 bot 仍写全量、正序、同形状的 `<botId>.jsonl`；某个 bot 读不到就跳过，不中断其它 bot |
| `/workspace/daily-scan/` | 有时间信息 | 仅冒烟 / 补数（`--source daily-scan`） |
| `/home/box/agent-data/agent-transcripts/<agentId>/<agentId>.jsonl` | 格式同 `{role, message}`；常可见 `tool` 角色 | **不默认当作增量源**。覆盖是否齐全、mtime 是否随新对话前进，须在目标环境自行核对后再决定是否用于补历史 tool |

本环境（VirusPC Grok Bot box）取舍见 [`notes/2026-10-24--grokbot-langfuse-export-transcript-sources-on-grok-bot-box/INDEX.md`](../../../notes/2026-10-24--grokbot-langfuse-export-transcript-sources-on-grok-bot-box/INDEX.md)；勿把单次实测写进本 skill。

## 前置条件

- 依赖：本目录 `npm ci`；`vendor/cursor-observability-plugin` submodule 已 init（首次或插件更新后）。
- 凭证：环境变量 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`；与本机 Codex / Pi 插件同一 Langfuse 项目。
- Host：`--host` > `LANGFUSE_HOST` > `LANGFUSE_BASE_URL` > `https://langfuse.viruspc.tech`。
- Environment：`LANGFUSE_TRACING_ENVIRONMENT`（若设且非空）> 固定回退 `grok-bot`。脚本**不会**让 Langfuse 静默落成 `default`。设备维度继续用 tags（`device:grokbot`），不写进 environment。

## 步骤

1. **准备**（首次或插件更新后）：

   ```bash
   cd /workspace/edges-brain-viruspc/projects/routines/grokbot-langfuse-export
   git submodule update --init vendor/cursor-observability-plugin && npm ci
   ```

2. **stage**：按[数据流](#数据流)从默认源落全量 staging。

   ```bash
   npm run -s stage
   ```

3. **export**：读 staging，经 adapter + vendored `emitTurn` 写入 Langfuse。

   ```bash
   npm run -s export -- --source staging --staging-dir /workspace/langfuse-export-staging
   ```

   每批 `emitTurn` 后 flush。Cursor 写在 `/home/box/agent-data/langfuse/grokbot-export-cursors.json`（勿提交 git）。stdout 为 JSON summary，失败在 `summary.failures`，退出码 1。

## 输出约定

- 时间：分钟精度；metadata `time_precision: minute`。不发明秒级精度。
- Trace：一轮 user 到该轮 assistant 最终可见回复为一条 trace，根 observation 名 `Grok Bot Turn`。
- Session：同一 bot，与上一轮 user 消息间隔 ≤3 小时为同一 session，否则新 session。`sessionId = grokbot:<botId>:<首条 user message 的稳定 id>`。
- 内容：可见 user / assistant 文本 + tool 名称（来源有才写）。不要 tool args / results，不要 reasoning。
- Tags：`agent:grok-bot`、`device:grokbot`、`bot:<助手显示名>`；userId `peng-cheng`。
- Environment：`grok-bot`（可用 `LANGFUSE_TRACING_ENVIRONMENT` 覆盖；勿与本机 `*-local` / 云端 `*-cloud` 混用）。
- Model：turn/LLM 的 `model` / `providedModelName` 有真实模型名则写真实名；否则写字面量 `default`（勿留空，看板会显示 n/a；与「忘记加模型名」的空值区分）。

## 去重与失败

- 去重：box 本地 cursor + 稳定 traceId（`grokbot:<botId>:<turnPos>`）。`turnPos` 是该 bot 全量时间线上的位置，所以 staging 必须是全量历史。
- 首次：只回填过去 24 小时。
- 失败：只推进写成功的 cursor；失败批次及之后不推进，留给后续运行。

## 校验

- 全部助手都尝试导出；cursor 按 bot 递增；重复跑不产生重复 trace。
- Langfuse 上能按 tag `device:grokbot` / `bot:<名>` 筛到；根 observation 名为 `Grok Bot Turn`；起止时间为分钟整点。
- 失败 bot / 批次出现在 `summary.failures`，且 cursor 未越过失败点。
- Langfuse 是 v4 `events_only` 模式：写入走 `POST /api/public/otel/v1/traces`，核对用 `GET /api/public/v2/observations?traceId=<id>`。
