---
name: grokbot-langfuse-export
description: 每小时把全部 Grok Bot 助手会话导出到自建 Langfuse（与本机 Codex/Pi 同一项目）。用 ReadTranscript 拉分钟级时间线，再跑 export_to_langfuse.py 经 OTLP 写入。
---

# Grok Bot → Langfuse 小时导出

把 peng cheng 名下**全部** Grok Bot 助手（含记录员）的会话，按真实发生时间写入自建 Langfuse 项目 **Edges**（`https://langfuse.viruspc.tech`），与本机 Codex / Pi 插件共用同一对 key。

日程见同目录 [schedule.md](schedule.md)。实现脚本：[export_to_langfuse.py](export_to_langfuse.py)。

## 已锁定规则（R1 / R2）

- **范围：** 全部助手（`/home/box/agent-data/agents/*/profile.json`），含记录员。
- **项目：** 与本机插件同一 Langfuse 项目；环境变量 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST=https://langfuse.viruspc.tech`。
- **时间：** 分钟精度；metadata `time_precision: minute`。不要发明秒级精度。
- **Session：** 同一 bot，与上一轮 user-message 间隔 ≤3 小时 = 同一 session；>3 小时 = 新 session。`sessionId = grokbot:<botId>:<首条 user message 的稳定 id>`。
- **Trace：** 一轮 user → 该轮 assistant 最终可见回复 = 一条 Langfuse trace。
- **内容：** 可见 user / assistant 文本 + **tool 名称列表**（不要 tool args / results，不要 reasoning / thinking）。
- **Tags（每条 trace）：** `agent:grok-bot`、`device:grokbot`、`bot:<助手显示名>`。
- **去重：** box 本地 cursor（见下）+ 稳定 hashed `traceId`（`botId + turn_pos`）。
- **首次：** 只回填过去 24 小时。
- **失败：** 只推进写成功的 cursor；失败批次留给下一小时；要在回复里报告失败。

## 为何是 ReadTranscript + 脚本（不是裸读 agent-transcripts）

| 来源 | 分钟时间戳 | 覆盖 |
|---|---|---|
| `ReadTranscript`（本 routine / 日复盘用法） | 有（user 消息） | 全部助手 |
| `/workspace/daily-scan/` | 有（日复盘落盘产物） | 仅当日扫到的助手，非小时级 |
| `/home/box/agent-data/agent-transcripts/<id>/*.jsonl` | **无** | 部分助手；时间线不可靠 |

本机 Langfuse 已开 `LANGFUSE_MIGRATION_V4_WRITE_MODE=events_only`，旧 `POST /api/public/ingestion` 的 `trace-create` / `span-create` 会被拒。脚本走公共 OTLP：`POST /api/public/otel/v1/traces`（带 `x-langfuse-ingestion-version: 4`）。

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
- assistant / tool 行保持原结构；脚本只会取可见 text 与 tool **name**

若某个 bot 的 `ReadTranscript` 不可读，记入失败列表，跳过该 bot，不要中断其它 bot。

### 3. 跑导出脚本

```bash
export LANGFUSE_HOST="${LANGFUSE_HOST:-https://langfuse.viruspc.tech}"
# keys 已在 box 环境 / secrets 中

python3 /workspace/edges-brain-viruspc/projects/routines/grokbot-langfuse-export/export_to_langfuse.py \
  --source staging \
  --staging-dir /workspace/langfuse-export-staging
```

Cursor 默认写在（**勿提交 git**）：

`/home/box/agent-data/langfuse/grokbot-export-cursors.json`

脚本只推进成功写入的 `next_turn_pos`。stdout 是 JSON summary；stderr 是进度。

### 4. 只回摘要

向用户（或例行日志）报告：扫了几个 bot、写了几条 trace、失败列表（bot + 错误摘要）。不要贴对话正文。

## 手工一次调用（box）

```bash
# 冒烟：用已有 daily-scan（有分钟时间戳）dry-run
python3 projects/routines/grokbot-langfuse-export/export_to_langfuse.py \
  --source daily-scan \
  --daily-scan /workspace/daily-scan \
  --dry-run --max-turns 5

# 真写一小批（会更新 cursor）
python3 projects/routines/grokbot-langfuse-export/export_to_langfuse.py \
  --source daily-scan \
  --daily-scan /workspace/daily-scan \
  --max-turns 3 --bot "Grok Bot"
```

工作树里相对路径如上；若仓检出在 `/workspace/edges-brain-viruspc`，把路径换成该仓下同相对路径。Routine 跑时优先用本仓已拉到的 checkout。

## 成功标准

- 每小时全量助手都尝试导出；cursor 按 bot 递增；重复跑不产生重复 trace（同 `traceId`）。
- Langfuse 上能按 tag `device:grokbot` / `bot:<名>` 筛到；observation 起止时间为分钟整点。
- 失败 bot / batch 出现在 summary.failures，且 cursor 未越过失败点。
