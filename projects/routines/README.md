# routines

Routine 调研与实现材料。现行例程定义统一登记在根 [.edges/routines/README.md](../../.edges/routines/README.md)，每条以 `INDEX.md` 记录日程并引用 Skill；外部平台每次运行重新读取定义与 Skill。平台日程字段保留各自表达，不定义跨厂商的统一日程类型。

本目录保留跨平台调研，以及带代码、npm 依赖和 git submodule 的 Grok Bot 导出实现。日复盘、周复盘的 Skill 与定义已迁入 `.edges/routines/`。

## 文档

- [2026-10-11--跨平台定义调研.md](2026-10-11--跨平台定义调研.md) — 四种形态、拆分布局，以及各家字段的分开示意

## 现行例程

- [日复盘](../../.edges/routines/daily-conversation-deposit/INDEX.md) — 每日沉淀扫描；定义引用同目录 Skill，产出经 PR 写入对应子仓。
- [周复盘](../../.edges/routines/weekly-retrospective/INDEX.md) — 回顾上一个自然周；结果写入 [`retrospectives/weekly/`](../../retrospectives/weekly/README.md)。
- [Grok Bot → Langfuse 导出](../../.edges/routines/grokbot-langfuse-export/INDEX.md) — 每小时导出全部助手会话；[Skill](grokbot-langfuse-export/SKILL.md) 与 [代码说明](grokbot-langfuse-export/README.md) 保留在现有实现目录。

## 改名对照

- `VirusPC/edges-private` → `VirusPC/edges-brain-viruspc-private`（2026-10-20 改名，旧 URL 由 GitHub 重定向）。现行文档用新名；日复盘、done 卡、ADR 等带日期的历史记录保留旧名，不回改。
