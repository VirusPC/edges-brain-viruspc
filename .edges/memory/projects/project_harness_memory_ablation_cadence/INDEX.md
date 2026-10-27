---
name: project_harness_memory_ablation_cadence
description: >-
  规划 harness-memory-ablation 跑批时打开：题库与 memory 未大变时不要日更全量；大改/发版前跑正式 A/B，全量可周更或按里程碑
metadata:
  edges-title: harness memory 消融不必日更全量
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-27
  edges-agent-client: grok-bot
  edges-username: VirusPC
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-27T05:21:00+08:00'
---

harness-memory-ablation **不必每天全量跑**。题库与 memory/约定没大变时，日更只会烧钱、噪声大。更合适：memory 或约定大改、发版前跑正式 A/B；平时用线上 trace 抽错题扩 Dataset；全量正式可周更或按里程碑。

现有 `evaluations/harness-memory-ablation/2026-10-25.md` 是内容级 smoke（全文注入 prompt），**不是**正式证明；正式版应走真实 harness（Agent 在 A/B worktree 自己读文件）+ 题库对齐现行约定后再写报告。

**Why:** 2026-10-27 用户问「有必要每天都采样跑实验吗」；助手建议否，用户未反对，并转向「先处理数据集 / 起 task grill」，随后叫停未审完的云端改库。

**How to apply:**
- 不要为「证明系统能力」每天重跑 30×A/B×N。
- 跑正式前先对齐 Dataset 真源（Compose→顶层 submodule 等过期口径），见对应 backlog 卡。
- 不为凑题量造无关合成闲聊题；conflict 过期 memory 只进实验 worktree。
