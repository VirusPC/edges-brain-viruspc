# 日程

这条 Grok Bot routine 何时跑。意图在同目录 [SKILL.md](SKILL.md)，这里不抄提示词。这不是跨厂商共用格式。

- cron: `0 * * * *`
- timezone: Asia/Shanghai
- timing: flexible ±15 分钟（early/late 各 15）
- platform: Grok Bot routine
- owner: Grok Bot
- skill: [SKILL.md](SKILL.md)
- notes: 24/7 每小时整点；首次回填仅过去 24 小时（由脚本 cursor 控制）。导出 traces 的 Langfuse environment 为 `grok-bot`（可用 `LANGFUSE_TRACING_ENVIRONMENT` 覆盖）。频率取舍见 [evaluations/frequency-usage/](evaluations/frequency-usage/)（当前结论与历次报告；2026-10-24 实测见 [evaluations/frequency-usage/2026-10-24.md](evaluations/frequency-usage/2026-10-24.md)）。
