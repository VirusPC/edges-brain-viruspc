# 导出频率与用量评估

比较本 routine 按每小时运行与按更高频率（例如每 10 分钟）运行时的额度代价与时效收益，据此决定日程。

## 评估目的

回答两个问题：提高运行频率会多消耗多少 Cursor Ultra 周额度；多消耗的额度换来了什么延迟改善。结论写入本目录，并回写 [`schedule.md`](../../schedule.md)。

## 实验方法与计量口径

以下口径固定，历次重测沿用，除非额度产品或模型标签发生变化并在当次报告中说明。

1. **对照组与实验组**：对照组为每小时日程（`CRON_TZ=Asia/Shanghai 0 * * * *`）；实验组为临时提高后的日程（例如 `*/10 * * * *`）。两组窗口同时记录 CST 与 UTC。
2. **用量数据源**：cursor.com/dashboard/usage 的 Export CSV。网页表格只能按整天 UTC 筛选且无模型筛选，精确数字以 CSV 为准。
3. **模型标签**：只统计 `Model = grok-bot-automation` 的行，即本 routine 唤醒产生的用量。用量计入 Cursor Ultra 周额度池（CSV 中 `Kind` / `Cost` 为 `Included`）。
4. **唤醒识别**：routine 成功时默认静默。每次唤醒在 CSV 中表现为一两分钟内连续出现的一组 `grok-bot-automation` 行（短爆发）。窗口内应确认没有其它 routine 同时运行。
5. **排除项**：同窗口的 `grok-bot-default`（交互对话）与 `grok-bot-cua`（桌面 / 浏览器）不计入本评估，可在报告中单列噪声。
6. **汇总指标**：按组汇总 `Cache Read`、`Input (w/ Cache Write)`、`Input (w/o Cache Write)`、`Output Tokens`、`Total Tokens`；计算单次唤醒均值、10 分钟桶区间、日折算（单次 × 每日唤醒次数）与构成占比。
7. **辅助证据**：automation_status 末次运行、box 上 cursor 文件与 export stdout、Langfuse 中 `Grok Bot Turn` trace 数、脚本耗时基准。这些用于核对导出侧行为，不替代 CSV 用量。

具体测量数字只写在按日期命名的报告里，本 README 不重复长表。

## 如何重测

1. 将日程临时改为目标频率，保留足够长的观测窗口（建议不少于 2 小时）。
2. 从 cursor.com/dashboard/usage 导出当日 CSV，按上述口径汇总。
3. 在本目录新增 `YYYY-MM-DD.md`，按正式实验报告结构书写（摘要、背景、设计、结果、分析、局限、建议、附录）。数字以 CSV 与当次运行记录为准，不编造。
4. 更新本 README 的「当前结论」与「历次报告」；若结论影响日程，同步 [`schedule.md`](../../schedule.md)。
5. CSV 留在本机或 box，不提交仓库。

## 当前结论

**保留每小时运行。** 2026-10-24 实测：每 10 分钟相对每小时约为 6 倍 token 消耗，主要成本是每次唤醒的固定上下文开销；时效收益（最大延迟约 60 分钟降到约 10 分钟）对事后观测场景价值有限。详见 [2026-10-24.md](2026-10-24.md)。

## 历次报告

| 日期 | 报告 | 要点 |
|---|---|---|
| 2026-10-24 | [2026-10-24.md](2026-10-24.md) | 每小时 vs 每 10 分钟；建议保留每小时 |
