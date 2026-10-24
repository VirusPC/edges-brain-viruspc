# Grok Bot → Langfuse 导出：每小时 vs 每 10 分钟用量评测

关联项目：[`projects/routines/grokbot-langfuse-export/`](../../projects/routines/grokbot-langfuse-export/)（意图见该目录 `SKILL.md`；日程见 `schedule.md`）。

## 背景

- Routine「Grok Bot 会话每小时写入 Langfuse」（folder `grok-bot-langfuse`）原 schedule：`CRON_TZ=Asia/Shanghai 0 * * * *`，flexible ±15 分钟。
- 2026-10-24 20:41（Asia/Shanghai）起临时改为每 10 分钟：`*/10 * * * *`（automation_status 显示 flexible 约 ±2 分钟），用于对照用量。
- 评测窗口：20:50–22:50；对照基线：约 20:09 的每小时运行（对话记录称「8 点那次」第一次正式跑通）。

## 方法

- 证据来源：Grok Bot 对话 search-index、automation_status 的 last run、box 上残留的 export stdout（`/tmp/lf-summary.json`、`/tmp/lf-export.json`、cursor 文件 `last_summary`）、stage/export 基准日志（`/tmp/stage-bench.log`、`/tmp/export-bench.log`）、Langfuse v2 observations API 统计 `Grok Bot Turn` trace 数。
- **用量明细**：cursor.com/dashboard/usage 导出 CSV（`usage-events-2026-10-24.csv`；不入库）。口径：`Model = grok-bot-automation`；时间戳为 UTC，北京时间 = UTC+8。
- 成功时 routine 默认静默，主对话里没有每次唤醒的完整日志。每次唤醒按 `grok-bot-automation` 的短爆发识别；本窗口内没有其它 routine 同时跑。
- **限制**：网页 Usage 表只能按整天 UTC 筛、无模型筛选；精确数字靠 Export CSV。工具面仍不暴露逐步 tool 调用明细——不编造。

## 数据

1. **每小时基线（20:09–20:10 CST / 12:09–12:10 UTC）**：一次运行 **10** 行，**653,289** tokens（全部 Included）。对话记录称含首次回填 **247** 条，故该次偏大，不宜当稳态单次成本。
2. **每 10 分钟窗口（20:50–22:50 CST / 12:50–14:50 UTC）**：
   - CSV：`grok-bot-automation` **89** 行，合计 **3,773,640** tokens（全部 Included）。约 **12** 次唤醒，每次约 **31 万** token。
   - 构成：cache read **3,189,431**；cache-write input **345,968**；非缓存 input **219,295**；output **18,946**（约 **85%** 是缓存读取）。
   - 按 10 分钟桶大致 **23 万–44 万** token/槽。
   - 按 cron 槽位应有 **13** 次（20:50,21:00,…,22:50）。automation_status：last run **22:53:24** Asia/Shanghai，**succeeded**（落在 22:50 槽 ±2 分钟柔性窗口内）。
   - cursor `/home/box/agent-data/langfuse/grokbot-export-cursors.json`：`last_run_at` 2026-10-24T14:53:47.323Z（=22:53:47 CST），`last_summary`：bots_seen 50，turns_written **6**，turns_skipped_cursor 2556，dry_run false，failures 未列（成功形态）。
   - 残留 stdout：
     - 22:38 `/tmp/lf-summary.json`：turns_written **3**，skipped 2549，failures []
     - 22:47 `/tmp/lf-export.json`：turns_written **4**，skipped 2552，failures []
   - 未能从对话或完整 run 历史逐条核验全部 13 次唤醒（中间成功静默）；能确认的是调度仍为 `*/10`、末次成功、上述写入摘要，以及 CSV 上约 12 次短爆发。
3. **折算一天（按稳态约 31 万 token/次）**：每 10 分钟 ≈144×31 万 ≈ **4500 万** token/天；每小时 ≈24×31 万 ≈ **750 万** token/天 → 约 **6×**。
4. **当时 Spending**：Grok Bot weekly usage **40%** used，**10/26** 重置；on-demand 关闭。
5. **同窗口其它噪声（不计入本评测）**：`grok-bot-default` **24.2M**、`grok-bot-cua` **20.1M** tokens。
6. **脚本耗时（20:38 基准，非 routine 唤醒成本）**：stage wall_sec≈**0.254**（60 bots / 17161 rows）；dry-run export wall_sec≈**0.561**。相对模型唤醒可忽略。
7. **Langfuse 数据量**：评测时点 API 见 **304** 条名为 `Grok Bot Turn` 的唯一 trace（sessionId 以 `grokbot:` 开头）。相对首次 247，增量约 57 轮来自之后对话；cursor 去重下，一天内每小时与每 10 分钟写入的**净条数应接近**，差别主要是延迟（最坏约 1h vs 约 10min），不是多写一份。

## 结论

- 主要成本在 routine 每次醒来的模型轮次（实测约 31 万 token/次，约 85% 为 cache read）；脚本秒级。
- 提高频率几乎不增加 Langfuse 净写入量（cursor + 稳定 traceId），只降低延迟。
- 稳态按唤醒次数与实测单次成本折算，每 10 分钟约为每小时的 **约 6×** token。

## 建议频率

- **保留每小时**：`CRON_TZ=Asia/Shanghai 0 * * * *`，flexible，early/late 各 15 分钟。
- 仅当延迟必须 ≤10 分钟时再改密；否则不值 6× 唤醒。
