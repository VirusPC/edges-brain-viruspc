---
name: grokbot-box-disk-residue-check
description: >-
  每周一约 09:00（Asia/Shanghai，±30 分钟）按 box-disk-cleanup 扫描 grok-bot
  工作盘残留。只扫描不自动删除。仅当用量不低于 80%、可清理残留大约超过 5G、或主仓被工作副本撑得异常大时，在该对话提醒并等用户点头再删；健康则保持安静。
---
# 日程

这条 Grok Bot routine 何时跑。做法看 [box-disk-cleanup](../../skills/managed/box-disk-cleanup/SKILL.md)，这里不抄清理步骤。这不是跨厂商共用格式。

- cron: `0 9 * * 1`
- timezone: Asia/Shanghai
- timing: flexible ±30 分钟（early/late 各 30）
- platform: Grok Bot routine
- id: automation-1795778103641
- owner: 记录员
- skill: [box-disk-cleanup](../../skills/managed/box-disk-cleanup/SKILL.md)

每周一跑。

## 定义来源与运行入口

仓库中的本入口是期望定义；外部平台负责实际调度与执行。维护这条记录不配置平台。

- repository: [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)
- entry: `.edges/routines/grokbot-box-disk-residue-check/INDEX.md`
- ref: 默认读取仓库默认分支 `main` 的最新版本；接入方明确指定的 branch、tag 或 commit 优先于默认值。

平台每次运行前必须把所选 ref 解析成一次 commit，用这一版重新读取本 `INDEX.md`，再读取这里引用的 Skill，依据本次读到的内容执行。所选 ref 不存在或任一文件读取失败就停止本次运行并报告来源、ref、路径与失败原因，不回退到默认分支，也不沿用以前保存的提示词。

`owner` 只是原有作者标签，不表示平台账号、授权状态或运行状态。

## 平台接入

平台侧已在 Grok Bot「记录员」对话挂了同名例程「工作盘残留检查」，id 为 `automation-1795778103641`。本仓库记录是期望定义与读取约定的真源。不要在平台再创建一个同名例程，也不要改已有触发器，除非仓库记录的日程变更后需要同步平台。

每次触发后，从本仓库默认分支最新内容（或接入方指定的 ref）读取本入口及其引用的 Skill，再按 Skill 执行。读不到任一必需文件时，停止本次并报告读取失败原因。

## 何时汇报

按 Skill 扫描、分类，不要自动删。

仅在以下任一情况成立时，向该对话的用户汇报，等点头后再按 Skill 的安全条件删除：

- grok-bot 工作盘 `/workspace` 用量不低于 80%
- 可清理的残留大约超过 5G
- 主仓被忽略的 `.worktrees/` 一类工作副本撑得异常大

健康则保持安静，不发消息。

本例程与每天检查剩余空间是否低于 30% 的 [grokbot-box-disk-check](../grokbot-box-disk-check/INDEX.md) 互补，不替代那条。
