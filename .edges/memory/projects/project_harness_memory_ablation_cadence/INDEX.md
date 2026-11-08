---
name: project_harness_memory_ablation_cadence
description: 规划记忆消融跑批时打开：不必日更全量；真实 harness、题库先对齐；用户要求 trial 并行，资源预检后固定并发并披露时延条件
metadata:
  edges-title: Harness 记忆实验的频率与并行约定
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-27
  edges-agent-client: grok-bot
  edges-username: VirusPC
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-11-09T00:50:47+08:00'
---

harness-memory-ablation **不必每天全量跑**。题库与 memory/约定没大变时，日更只会烧钱、噪声大。更合适：memory 或约定大改、发版前跑正式 A/B；平时用线上 trace 抽错题扩 Dataset；全量正式可周更或按里程碑。

现有 `evaluations/harness-memory-ablation/2026-10-25.md` 是内容级 smoke（全文注入 prompt），**不是**正式证明；正式版应走真实 harness（Agent 在隔离环境自己读文件）+ 题库对齐现行约定后再写报告。

批量 trial 应并行执行。2026-11-09 用户明确要求「并行执行trial」，并追问能否全部并行。用户重视跑批吞吐，后续不要在没有资源或隔离理由时默认串行耗时。

**Why:** 2026-10-27 用户问「有必要每天都采样跑实验吗」；助手建议否，用户未反对，并转向「先处理数据集 / 起 task grill」，随后叫停未审完的云端改库。2026-11-09 的真实 Harbor 消融又明确了并行偏好；当次通过开发试跑确定固定并发，避免在正式结果出来后按质量改变运行条件。

**How to apply:**
- 不要为「证明系统能力」每天重跑 30×A/B×N。
- 跑正式前先对齐 Dataset 真源（Compose→顶层 submodule 等过期口径），见对应 backlog 卡。
- 不为凑题量造无关合成闲聊题；conflict 过期 memory 只进实验隔离环境。
- 批量采用相互隔离的 trial 与有上限的并发队列；先在 dev 确认资源和基础设施稳定，再固定本轮并发数，不把某台机器的一次测试值当永久上限。
- 速度报告同时写清并发条件、单 trial Agent 时延和整批墙钟时间；并发测得的时延不能说成单独运行时延。
