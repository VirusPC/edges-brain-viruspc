---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-25T21:24:32.424Z'
  edges-title: 验收并标 done：evaluation 迁移 Langfuse Agent skills 卡
  edges-tasks-status: backlog
  edges-task-priority: none
name: 验收并标_doneevaluation_迁移_langfuse_agent_skills_卡
description: edges#45 / brain#382 已落地，但 Skill 子卡仍 backlog；验收完成标准后标 done，并决定母卡状态。
---
**背景：**
2026-10-25 evaluation 母卡下，子卡「评测 Skill：收集用户数据并产生 Dataset」经 grill 纠正为「迁移 Langfuse 接入 Agent 的 skills」。落地已合入框架 [VirusPC/edges#45](https://github.com/VirusPC/edges/pull/45) 与脑仓 [VirusPC/edges-brain-viruspc#382](https://github.com/VirusPC/edges-brain-viruspc/pull/382)（hub + 四份子 skill；brain 旧三份删除）。助手明确说看板状态未改、要标 done 需再拍板；窗口内未再开卡或改状态。框架看板路径仍为 `.edges/tasks/evaluation/backlog/2026-10-25--评测-Skill收集用户数据并产生-Dataset/`（标题已改，目录名未改）。

**目标：**
在框架仓 evaluation 看板验收该卡完成标准后，将其标为 done；并就是否收口母卡「框架附带可接入评测能力」给出明确状态（done 或继续留 backlog 及原因）。

**完成标准：**
- [ ] 按卡内完成标准核对（`pnpm skills:link --check`、临时目录 `edges skills init` 与源一致、脱敏 rg 无命中、brain 旧三份已不存在；tag 五条若仍要求则打上或在卡上注明豁免）。
- [ ] 该卡经 `edges tasks status`（或等价 PR）进入 `evaluation/done/`，`edges-tasks-status: done`。
- [ ] 母卡状态有书面决定：标 done，或留 backlog 并在进展里写清还缺什么。
- [ ] 变更以开到 main 的 PR 合入，不直推 main。
