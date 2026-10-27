---
name: grokbot-langfuse-export
description: 每小时调用现有导出 Skill，把全部 Grok Bot 助手会话按真实时间写入 Langfuse。
---
# 日程

这条 Grok Bot routine 何时跑。意图在现有导出目录 [SKILL.md](../../../projects/routines/grokbot-langfuse-export/SKILL.md)，这里不抄提示词。这不是跨厂商共用格式。

- cron: `0 * * * *`
- timezone: Asia/Shanghai
- timing: flexible ±15 分钟（early/late 各 15）
- platform: Grok Bot routine
- owner: Grok Bot
- skill: [SKILL.md](../../../projects/routines/grokbot-langfuse-export/SKILL.md)
- notes: 24/7 每小时整点；首次回填仅过去 24 小时（由脚本 cursor 控制）。导出 traces 的 Langfuse environment 为 `grok-bot`（可用 `LANGFUSE_TRACING_ENVIRONMENT` 覆盖）。频率取舍见 [evaluations/frequency-usage/](../../../projects/routines/grokbot-langfuse-export/evaluations/frequency-usage/)（当前结论与历次报告；2026-10-24 实测见 [evaluations/frequency-usage/2026-10-24.md](../../../projects/routines/grokbot-langfuse-export/evaluations/frequency-usage/2026-10-24.md)）。

## 定义来源与运行入口

仓库中的本入口是期望定义；外部平台负责实际调度与执行。

- repository: [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)
- entry: `.edges/routines/grokbot-langfuse-export/INDEX.md`
- ref: 默认读取仓库默认分支的最新版本；接入方明确指定的 branch、tag 或 commit 优先于默认值。

平台每次运行前必须按所选 ref 重新读取本 `INDEX.md`，再读取这里引用的 Skill，依据本次读到的内容执行。默认分支或显式 branch/tag 应先解析为本次 commit，入口与 Skill 使用同一版本。所选 ref 不存在或任一文件读取失败就停止本次运行并报告来源、ref、路径与失败原因，不回退到默认分支，也不沿用以前保存的提示词。

`owner` 只是原有作者标签，不表示平台账号、授权状态或运行状态。
