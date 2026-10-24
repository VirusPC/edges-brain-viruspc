# 日程

这条 Grok Bot routine 何时跑。意图在同目录 [SKILL.md](SKILL.md)，这里不抄提示词。这不是跨厂商共用格式。

- cron: `0 * * * *`
- timezone: Asia/Shanghai
- timing: flexible ±15 分钟（early/late 各 15）
- platform: Grok Bot routine
- owner: Grok Bot
- skill: [SKILL.md](SKILL.md)
- notes: 24/7 每小时整点；首次回填仅过去 24 小时（由脚本 cursor 控制）。频率取舍实测见 [notes/2026-10-24--grokbot-langfuse-export-frequency-usage-eval/INDEX.md](../../../notes/2026-10-24--grokbot-langfuse-export-frequency-usage-eval/INDEX.md)。
