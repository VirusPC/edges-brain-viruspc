---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-25T16:52:45.983Z'
  edges-title: '收口周复盘 PR #370：统一 README/skill 文案后合入'
  edges-tasks-status: backlog
  edges-task-priority: medium
name: 收口周复盘_pr_370统一_readmeskill_文案后合入
description: '消除「补记改 INDEX」与「正文写定后不改、评论记 COMMENTS.md」矛盾，再合 #370。'
---

**背景：**
周复盘入口改为 Compose 工作区根的 PR [#370](https://github.com/VirusPC/edges-brain-viruspc/pull/370) 仍 OPEN。2026-10-25 约 00:48 用户问「merge了吗」；助手回报未合，并指出 README / skill 文案可能仍与「正文写定后不改，后续评论记同目录 COMMENTS.md」不一致（旧习惯是补记改 INDEX）。对话里已谈清「先统一文案再合」或「按用户指示直接合」这一步，但没有单独任务卡。

**目标：**
#370 合入 main，且周复盘 README 与 skill 对「写定后是否改 INDEX」口径一致（以 COMMENTS.md 为准）。

**动作：**
- 核对 `retrospectives/weekly/README.md` 与 `.harness/routines/weekly-retrospective/SKILL.md`：凡写「补记改 INDEX」的改为「正文写定后不改；评论记 COMMENTS.md」
- 若 #370 分支已含正确文案，则在 PR 上确认后合入；若缺，先推修补再合
- 合入后 bump 工作区 compose 指针（若流程需要）

**完成标准：**
- #370 为 MERGED
- README 与 skill 均不再出现与 COMMENTS.md 约定冲突的「补记改 INDEX」表述
- 公开脑 main 可按新入口跑下周复盘
