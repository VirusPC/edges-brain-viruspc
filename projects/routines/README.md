# routines

Routine 专项工作区：跨平台 routine 的形态调研，以及 skill 与日程怎么放。不定义跨厂商的统一类型。

默认把日程和内容分开。打进同一份文件不再是首选。两种放法：一个目录里放极简日程文件，内容来自 Skill（日程引用 Skill）；或者一份 Skill 和它的日程文件放在同一目录。四种形态是业界分类，见调研笔记。定义不放进 `notes/`。

## 文档

- [2026-10-11--跨平台定义调研.md](2026-10-11--跨平台定义调研.md) — 四种形态、拆分布局，以及各家字段的分开示意

## 示例

- [daily-conversation-deposit/SKILL.md](daily-conversation-deposit/SKILL.md) — 日复盘。意图在 `SKILL.md`，日程在同目录 [schedule.md](daily-conversation-deposit/schedule.md)，只引用 Skill。扫描出的候选按根 AGENTS.md 直接落文件，与当日 [`retrospectives/daily/`](../../retrospectives/daily/README.md) 同一个 PR（个人内容在 edges-brain-viruspc-private 另开 PR）。审阅在 PR 上，不自动合并。
- [weekly-retrospective/SKILL.md](weekly-retrospective/SKILL.md) — 周复盘。意图在 `SKILL.md`，日程在同目录 [schedule.md](weekly-retrospective/schedule.md)，只引用 Skill。结果写入 [`retrospectives/weekly/`](../../retrospectives/weekly/README.md)。
- [grokbot-langfuse-export/SKILL.md](grokbot-langfuse-export/SKILL.md) — 每小时把全部 Grok Bot 助手会话写入自建 Langfuse（OTLP）。日程 [schedule.md](grokbot-langfuse-export/schedule.md)；脚本 [export_to_langfuse.py](grokbot-langfuse-export/export_to_langfuse.py)。

## 改名对照

- `VirusPC/edges-private` → `VirusPC/edges-brain-viruspc-private`（2026-10-20 改名，旧 URL 由 GitHub 重定向）。现行文档用新名；日复盘、done 卡、ADR 等带日期的历史记录保留旧名，不回改。
