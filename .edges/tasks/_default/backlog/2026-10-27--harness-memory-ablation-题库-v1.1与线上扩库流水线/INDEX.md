---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-27T05:21:00+08:00'
  edges-title: harness-memory-ablation 题库 v1.1 与线上扩库流水线
  edges-tasks-status: backlog
  edges-task-priority: medium
name: harness_memory_ablation_题库_v1_1与线上扩库流水线
description: 对齐 Compose→顶层 submodule 后的题库真源，补齐数据集说明，并落地「线上 trace→候选→人审→upsert」流水线，供后续正式消融使用。
---
**背景：**
2026-10-27 谈「证明系统能力」时落到 harness memory 消融。现有 `evaluations/harness-memory-ablation/2026-10-25.md` 只是全文注入的内容级 smoke，不能回答「在真实 harness 里划不划算」。审 Dataset v1（约 12/10/8）后认为结构可用，但：Compose 路径仍写 `.edges/compose/`（workspace#10 后已过期）、dependent 题扎堆、irrelevant 几乎全是 Langfuse 域。用户否决为凑量做合成闲聊题；同意后续要从线上持续扩库。曾开云端改库后用户叫停，并说「需要起个 task，grill 下」；窗口内任务草稿已口头写出，**未落库**（随后转 html-plan，对话在计划页中断）。
- 关联：`evaluations/harness-memory-ablation/`；Langfuse Dataset `harness-memory-ablation/v1`；框架仓评测 Skill→Dataset 兄弟卡（不做本卡范围）。
- 非目标：本次不跑正式消融全量；不做合成无关闲聊题；不在本卡代写 grill 完成标准。

**目标：**
题库与真源对齐现行 workspace（顶层 submodule 等），文档说清版本与扩库规则，并有可 dry-run 的「线上 trace → 候选题 → 人审 → upsert Dataset + changelog」辅助，供后续正式 A/B 使用。

**动作：**
完成标准与细动作留给 grill-with-docs。方向已谈清的有：
- 修订 cases / 真源：去掉过期 Compose 口径；酌情补 10-25 后真实会话题（须有 memory/skill 真源）
- 写 `DATASET.md`（或等价）：版本、类别、人审门槛、脱敏
- 扩库流水线文档 + 可 dry-run、不自动发布的 helper（抽纠错/返工信号 → 候选 → 人审 → upsert）
- conflict 过期 memory 只进实验 worktree，不为凑量造题

**完成标准：**
待 grill-with-docs 补。
