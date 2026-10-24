# Grok Bot → Langfuse 导出：每小时 vs 每 10 分钟用量评测

关联项目：[`projects/routines/grokbot-langfuse-export/`](../../projects/routines/grokbot-langfuse-export/)（意图见该目录 `SKILL.md`；日程见 `schedule.md`）。

## 背景

- Routine「Grok Bot 会话每小时写入 Langfuse」（folder `grok-bot-langfuse`）原 schedule：`CRON_TZ=Asia/Shanghai 0 * * * *`，flexible ±15 分钟。
- 2026-10-24 20:41（Asia/Shanghai）起临时改为每 10 分钟：`*/10 * * * *`（automation_status 显示 flexible 约 ±2 分钟），用于对照用量。
- 评测窗口：20:50–22:50；对照基线：约 20:09 的每小时运行（对话记录称「8 点那次」第一次正式跑通）。

## 方法

- 证据来源：Grok Bot 对话 search-index、automation_status 的 last run、box 上残留的 export stdout（`/tmp/lf-summary.json`、`/tmp/lf-export.json`、cursor 文件 `last_summary`）、stage/export 基准日志（`/tmp/stage-bench.log`、`/tmp/export-bench.log`）、Langfuse v2 observations API 统计 `Grok Bot Turn` trace 数。
- 成功时 routine 默认静默，主对话里没有每次唤醒的完整日志。
- **拿不到**：Grok Bot 账户真实 Usage/credit 数字、每次运行的模型步骤数/工具调用数（工具面未暴露）。不编造。

## 数据

1. **每小时基线（~20:09）**：对话记录：过去 24h 回填 **247** 轮写入 Langfuse；失败未报。
2. **每 10 分钟窗口（20:50–22:50）**：
   - 按 cron 槽位应有 **13** 次（20:50,21:00,…,22:50）。
   - automation_status：last run **22:53:24** Asia/Shanghai，**succeeded**（落在 22:50 槽 ±2 分钟柔性窗口内）。
   - cursor `/home/box/agent-data/langfuse/grokbot-export-cursors.json`：`last_run_at` 2026-10-24T14:53:47.323Z（=22:53:47 CST），`last_summary`：bots_seen 50，turns_written **6**，turns_skipped_cursor 2556，dry_run false，failures 未列（成功形态）。
   - 残留 stdout：
     - 22:38 `/tmp/lf-summary.json`：turns_written **3**，skipped 2549，failures []
     - 22:47 `/tmp/lf-export.json`：turns_written **4**，skipped 2552，failures []
   - 未能从对话或完整 run 历史逐条核验全部 13 次唤醒（中间成功静默）；能确认的是调度仍为 `*/10`、末次成功，以及上述几次写入摘要。
3. **脚本耗时（20:38 基准，非 routine 唤醒成本）**：stage wall_sec≈**0.254**（60 bots / 17161 rows）；dry-run export wall_sec≈**0.561**。相对模型唤醒可忽略。
4. **Langfuse 数据量**：评测时点 API 见 **304** 条名为 `Grok Bot Turn` 的唯一 trace（sessionId 以 `grokbot:` 开头）。相对首次 247，增量约 57 轮来自之后对话；cursor 去重下，一天内每小时与每 10 分钟写入的**净条数应接近**，差别主要是延迟（最坏约 1h vs 约 10min），不是多写一份。
5. **用量倍数估算（仅按唤醒次数）**：每小时 24 次/天；每 10 分钟 144 次/天 → **约 6×**。真实 credit 未测到。

## 结论

- 主要成本在 routine 每次醒来的模型轮次；脚本秒级。
- 提高频率几乎不增加 Langfuse 净写入量（cursor + 稳定 traceId），只降低延迟。
- 在拿不到 Usage 明细的前提下，用唤醒次数估稳态约 6×。

## 建议频率

- **保留每小时**：`CRON_TZ=Asia/Shanghai 0 * * * *`，flexible，early/late 各 15 分钟。
- 仅当延迟必须 ≤10 分钟时再改密；否则不值 6× 唤醒。