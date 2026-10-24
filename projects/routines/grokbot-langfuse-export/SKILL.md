---
name: grokbot-langfuse-export
description: 每小时把全部 Grok Bot 助手会话导出到自建 Langfuse（与本机 Codex/Pi 同一项目）。用 ReadTranscript 拉分钟级时间线，再用薄适配层调用 vendored langfuse/cursor-observability-plugin 的 emitTurn 经 OTLP 写入。
---

# Grok Bot → Langfuse 小时导出

把 peng cheng 名下**全部** Grok Bot 助手（含记录员）的会话，按真实发生时间写入自建 Langfuse 项目 **Edges**（`https://langfuse.viruspc.tech`），与本机 Codex / Pi 插件共用同一对 key。

日程见同目录 [schedule.md](schedule.md)。实现：[adapter/](adapter/)（薄适配层）+ [vendor/cursor-observability-plugin](vendor/cursor-observability-plugin)（官方插件，git submodule，未改动）。

## 写入路径：复用官方 cursor-observability-plugin

不自己写 emit 逻辑。官方插件 [langfuse/cursor-observability-plugin](https://github.com/langfuse/cursor-observability-plugin) 以 **git submodule** 挂在 `vendor/cursor-observability-plugin`，**钉在 commit `a36d39a7c5cf9da34662159b70d51b6b36855abc`**（2026-10-24，`chore(deps): bump zizmorcore/zizmor-action … (#16)`）。插件源码一行不改，用 `tsx` 直接 import 其 TS 源：

| 文件 | 作用 |
|---|---|
| `adapter/transcript.mjs` | 解析 staging / daily-scan JSONL → 轮次（分钟时间戳、可见文本、tool 名、3h session 规则、turnPos 编号） |
| `adapter/turn.mjs` | 轮次 → 插件自己的 `Turn`（`src/types.ts`）+ `Config`（`src/config.ts`） |
| `adapter/rewrite-processor.mjs` | 极小的 SpanProcessor 包装：只改插件写死的三处（见下） |
| `adapter/instrumentation.mjs` | 与插件 `setupInstrumentation` 同构（LangfuseSpanProcessor batched + 插件的 `DeterministicIdGenerator` + `createSecretMask`），只多套一层 rewrite processor、`service.name=grok-bot` |
| `adapter/cli.mjs` | cursor / 24h 回填 / 分批 flush / 部分推进；每轮调插件原版 `emitTurn` |

**经 Config / Turn 字段实现的覆盖（不改插件）：**

- traceId：`config.trace_seed = grokbot:<botId>`，`turn.turnNumber = turnPos` → 插件算 `sha256("grokbot:<botId>:<turnPos>")[:32]`
- sessionId：`turn.conversationId` = 3h 规则 session id
- tags：`config.tags = [agent:grok-bot, device:grokbot, bot:<名>]`，`skill_tags=false`
- userId：`config.user_id = peng-cheng`
- trace metadata：`config.metadata` 的 `grokbot.*`（bot_id / bot_name / turn_pos / time_precision=minute / source）
- tool 只要名字：`toolCalls[].input/output = undefined`，`capture_tool_output=false`
- 分钟时间：`startTime/endTime` = user 消息分钟整点（ms）

**只能靠 adapter 包装改的（插件写死）：** trace / 根 observation 名 `Cursor Turn` → `Grok Bot Turn`；去掉强制的 `cursor` tag；metadata 键 `cursor.*` → `grokbot.*`（`timing_source` 改为 `user-message-minute`）。插件 `setupInstrumentation()` 内部 new 处理器、无挂钩，所以 `adapter/instrumentation.mjs` 镜像了它约 30 行。

结果形状：每轮一条 trace，根 `Grok Bot Turn`（agent）→ `LLM`（generation，ChatML `{role, content}`）+ 同级 tool observation（只有名字）；span id 由插件按 `${traceId}:${label}` 确定性生成。

依赖版本按插件 `pnpm-lock.yaml` 精确钉住（`@langfuse/*` 5.11.1、`@opentelemetry/*` 2.11.0 / api 1.9.1 / exporter 0.222.0）。

### 更新插件版本

```bash
cd projects/routines/grokbot-langfuse-export/vendor/cursor-observability-plugin
git fetch origin && git checkout <新 commit>
cd ../..   # 回到 grokbot-langfuse-export
# 对照新版 package.json / pnpm-lock.yaml 调整 package.json 里的钉版本，然后：
npm install && npm run export -- --source daily-scan --dry-run --max-turns 3 --dump-spans
# 检查：根名仍为 Grok Bot Turn、无 cursor tag、tool 无 input/output；若插件改了
# emitTurn 签名 / Turn 字段 / 写死名字，相应改 adapter/turn.mjs 或 rewrite-processor.mjs
git add vendor/cursor-observability-plugin package.json package-lock.json
git commit -m "chore: bump cursor-observability-plugin to <sha>"
```

并把本节里的钉住 commit 改成新值。

### 首次准备（新 checkout）

```bash
git submodule update --init projects/routines/grokbot-langfuse-export/vendor/cursor-observability-plugin
cd projects/routines/grokbot-langfuse-export && npm ci
```

## 已锁定规则（R1 / R2）

- **范围：** 全部助手（`/home/box/agent-data/agents/*/profile.json`），含记录员。
- **项目：** 与本机插件同一 Langfuse 项目；环境变量 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`；host 取 `--host` > `LANGFUSE_HOST` > `LANGFUSE_BASE_URL` > `https://langfuse.viruspc.tech`。
- **时间：** 分钟精度；metadata `time_precision: minute`。不要发明秒级精度。
- **Session：** 同一 bot，与上一轮 user-message 间隔 ≤3 小时 = 同一 session；>3 小时 = 新 session。`sessionId = grokbot:<botId>:<首条 user message 的稳定 id>`。
- **Trace：** 一轮 user → 该轮 assistant 最终可见回复 = 一条 Langfuse trace。
- **内容：** 可见 user / assistant 文本 + **tool 名称列表**（不要 tool args / results，不要 reasoning / thinking）。
- **Tags（每条 trace）：** `agent:grok-bot`、`device:grokbot`、`bot:<助手显示名>`。
- **去重：** box 本地 cursor（见下）+ 稳定 hashed `traceId`（`grokbot:<botId>:<turnPos>`）。
- **userId：** `peng-cheng`。
- **首次：** 只回填过去 24 小时。
- **失败：** 只推进写成功的 cursor；失败批次留给下一小时；要在回复里报告失败。

## 为何是 ReadTranscript + 适配层（不是裸读 agent-transcripts）

| 来源 | 分钟时间戳 | 覆盖 |
|---|---|---|
| `ReadTranscript`（本 routine / 日复盘用法） | 有（user 消息） | 全部助手 |
| `/workspace/daily-scan/` | 有（日复盘落盘产物） | 仅当日扫到的助手，非小时级 |
| `/home/box/agent-data/agent-transcripts/<id>/*.jsonl` | **无** | 部分助手；时间线不可靠 |

本机 Langfuse 是 v4 `events_only` 模式：旧 `POST /api/public/ingestion` 与 `GET /api/public/traces` 都不可用。写入走插件同款 `@langfuse/otel` → `POST /api/public/otel/v1/traces`；核对用 `GET /api/public/v2/observations?traceId=<id>`。

## 步骤（每小时）

### 1. 列助手

读 `/home/box/agent-data/agents/*/profile.json`，得到 `(botId, displayName)` 全表。不要跳过记录员。

### 2. ReadTranscript → staging

对每个 `botId` 调 `ReadTranscript`（`in=<botId>`），从最新往前翻 `before`，直到：

- 超过 cursor 已导出窗口，或
- 超过首次回填的 24 小时窗（仅当 cursor 文件尚不存在 / 该 bot 无 `next_turn_pos`）。

把窗口内消息写成正序 JSONL（与日复盘相同形状）：

- 路径：`/workspace/langfuse-export-staging/YYYY-MM-DD/<displayName>.jsonl`（日期取 Asia/Shanghai 当天）
- 每条 user 消息保留 `<timestamp>…</timestamp>`，并写 `_ts` 为分钟精度本地墙钟（如 `2026-10-24T19:51:00`，Asia/Shanghai，**秒固定为 00**）
- assistant / tool 行保持原结构；适配层只取可见 text 与 tool **name**

若某个 bot 的 `ReadTranscript` 不可读，记入失败列表，跳过该 bot，不要中断其它 bot。

### 3. 跑导出

```bash
# keys 已在 box 环境（LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY）；host 默认 https://langfuse.viruspc.tech
cd /workspace/edges-brain-viruspc/projects/routines/grokbot-langfuse-export
git submodule update --init vendor/cursor-observability-plugin && npm ci   # 首次 / 更新后
npm run -s export -- --source staging --staging-dir /workspace/langfuse-export-staging
# 等价：node --import tsx adapter/cli.mjs --source staging …
```

参数：`--source staging|daily-scan`、`--staging-dir`、`--daily-scan`、`--agents-dir`、`--cursor-file`、`--host`、`--backfill-hours 24`、`--batch-size 20`、`--max-turns N`、`--bot <id|名>`（可重复）、`--dry-run`、`--dump-spans`（dry-run 打印完整 span 属性）、`--force-reexport`。退出码：有失败 = 1。

Cursor 默认写在（**勿提交 git**）：

`/home/box/agent-data/langfuse/grokbot-export-cursors.json`

每批 `emitTurn` 后 `forceFlush`；OTLP 导出失败经 OpenTelemetry 全局 error handler 捕获，该批及之后不推进，只推进到最后一个成功批的 `next_turn_pos`。stdout 是 JSON summary；stderr 是进度。

### 4. 只回摘要

向用户（或例行日志）报告：扫了几个 bot、写了几条 trace、失败列表（bot + 错误摘要）。不要贴对话正文。

## 手工一次调用（box）

```bash
cd projects/routines/grokbot-langfuse-export
# 冒烟：daily-scan dry-run（真 LangfuseSpanProcessor + 内存 exporter，不发 HTTP、不写 cursor）
npm run -s export -- --source daily-scan --dry-run --max-turns 5 --dump-spans

# 真写一小批（用临时 cursor，避免污染正式 cursor）
npm run -s export -- --source daily-scan --max-turns 2 --bot 全栈开发专家 \
  --backfill-hours 72 --cursor-file /tmp/grokbot-smoke-cursor.json
```

工作树里相对路径如上；若仓检出在 `/workspace/edges-brain-viruspc`，把路径换成该仓下同相对路径。Routine 跑时优先用本仓已拉到的 checkout。

## 成功标准

- 每小时全量助手都尝试导出；cursor 按 bot 递增；重复跑不产生重复 trace（同 `traceId`）。
- Langfuse 上能按 tag `device:grokbot` / `bot:<名>` 筛到；根 observation 名为 `Grok Bot Turn`；observation 起止时间为分钟整点。
- 失败 bot / batch 出现在 summary.failures，且 cursor 未越过失败点。
