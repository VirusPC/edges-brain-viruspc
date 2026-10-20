# 复盘

阶段性回看。周复盘覆盖过去一周，日复盘覆盖过去一天。正文记事先与实际、差距原因、下次做什么，以及建议补充进 Harness 的候选。

## 边界

复盘记录回看。「建议补充内容清单」里每条只留一句话、建议去处和处理结果（已写入路径、不做原因，或留待触发条件）。正文写到建议去处，不复制进复盘。

| 候选 | 建议去处 |
| --- | --- |
| Memory | 所属作用域的 `.harness/memory/`，命令 `edges memory remember` |
| Skill | 所属作用域的 `.harness/skills/managed/`，命令 `edges skills` |
| Note | [`notes/`](../notes/README.md)，命令 `edges notes` |
| Task | 领域 [`tasks/`](../tasks/README.md) 或维护 [`.harness/tasks/`](../.harness/tasks/README.md)，命令 `edges tasks` |
| `AGENTS.md` 硬约束 | 目标作用域 `AGENTS.md` 的「本层硬约束」 |

可复用的判断先记成笔记，再按 [`edges/README.md`](../edges/README.md) 提炼成 Edge。单次对话整理成笔记时用四栏结构（背景、过程、所学、行动指南），术语见 [`CONTEXT.md`](https://github.com/VirusPC/edges/blob/main/CONTEXT.md) 的「复盘四栏」。周复盘和日复盘的章节见 [`weekly/README.md`](weekly/README.md) 与 [`daily/README.md`](daily/README.md)。

## 约定

- 周复盘的命名和章节见 [`weekly/README.md`](weekly/README.md)。
- 日复盘的命名和章节见 [`daily/README.md`](daily/README.md)。
- 一篇内容是一个目录，正文入口是 `INDEX.md`。附件与入口放在同一目录。
- 本仓公开。复盘遵守根 [`README.md`](../README.md) 的「隐私与脱敏」。
- 写入就是编辑 `INDEX.md`。

<!-- project-entries-local:start -->
## 本层内容

- [周复盘](weekly/README.md) — 按周起始日（周一）成篇的回看。
- [日复盘](daily/README.md) — 按日历日成篇；必写范围与建议补充内容清单。
<!-- project-entries-local:end -->
