---
metadata:
  edges-type: task
  edges-task-project: evaluation
  edges-updated-at: '2026-10-19T18:40:35.532Z'
  edges-title: Agent Eval 接入云沙箱（干净快照重跑）
  edges-tasks-status: backlog
  edges-task-priority: none
name: agent_eval_接入云沙箱干净快照重跑
description: 给 Agent Eval 接上云沙箱，从干净快照重跑，才能公平对比有无 Edges，并把轨迹接到 Langfuse。
---
**背景：**
用户在调研云端 coding agent / Vercel Sandbox 及业界沙箱（PR #311：`projects/agent-infra/2026-10-19--云沙箱服务SDK语言与隔离技术调研.md`）后，问沙箱可能用在哪里。助手建议里包括 Agent Eval（从干净快照重跑、对比有无 Edges、接到 Langfuse）等方向；用户回复「确实，eval需要。记录个task」，决定只开这一张：给 Agent Eval 用沙箱，不做多 agent 隔离、不信任代码、面试演示、教学实验等其它用途。
- 相关现状：评测内容在 `.harness/evaluation/`；Langfuse 在 https://langfuse.viruspc.tech；此前有过要对「有无 Edges」做最小评测（重复犯错率）的意向。
- 预期收益：评测可从干净环境重复跑，有无 Edges 的对照更干净，轨迹可进观测。
- 非目标：多 agent 隔离、通用不信任代码执行、面试/教学沙箱 demos。
- 关联：Agent Eval expert agent；PR #311 调研；近邻卡 `2026-10-19--retrieval-eval-的-pi-client-会跑出被测仓库副本`（pi 越界污染，意图不同）、`2026-10-11--edges-skills-与-Agent-回归评测`。

**目标：**
Agent Eval 能在云沙箱里从干净快照反复跑同一批用例，并支持有无 Edges 对照，轨迹可接到现有 Langfuse。

**动作：**
- 选一类已调研的云沙箱能力，接到现有 `.harness/evaluation/` 评测入口。
- 每次 run 从干净快照起，避免上次残留污染样本。
- 支持同一用例在「有 Edges / 无 Edges」两臂对照（至少能跑通最小「重复犯错率」类评测）。
- 把 run 轨迹接到 Langfuse（https://langfuse.viruspc.tech）。

（完成标准待 grill-with-docs 补。）
