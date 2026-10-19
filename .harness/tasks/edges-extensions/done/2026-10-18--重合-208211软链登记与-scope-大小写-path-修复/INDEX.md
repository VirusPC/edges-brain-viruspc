---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-19T01:34:59.986Z'
  edges-title: '重合 #208/#211：软链登记与 scope 大小写 path 修复'
  edges-tasks-status: done
  edges-task-priority: none
name: 重合_208211软链登记与_scope_大小写_path_修复
description: >-
  PR #208 的父级软链登记和 #211 的 scope 大小写 path 修复只留在叠层分支，main 上从未落地。本卡跟踪把这两处丢失的修复重新合进
  main。
---

**背景：**
PR #208（挪任务状态时保留父级软链登记）和 #211（`--scope` 大小写与实际目录不一致时，任务 path 不越界）在 2026-10-11 合进了叠层分支 `codex/cli-remaining-tests-20261011`，但 #204 squash 合进 main 时这两条还没进该分支（晚了约 8s / 21s），所以 main 上从未落地，也不是后来被回滚。证据：`82a69642` / `be871728` 仍只在该叠层分支；main 无 firstSymlink 守卫、无 `services/tasks/realpath.ts`。peng cheng 要求先修这些问题再打 Edges 1.5.0。全栈开发专家会直接开修复 PR；本卡只跟踪把这两处修复重新合进 main。
- 关联：#208、#211、叠层分支 `codex/cli-remaining-tests-20261011`、提交 `82a69642` / `be871728`；约束：不改 1.5.0 发布卡状态

**目标：**
把这两处修复重新合进 main。

**完成标准：**
- [x] `edges tasks status` 移动时保留父级软链登记，不再因软链报错；有回归测试
- [x] `--scope` 大小写不一致时，list/get/update/project list/`--all` 返回的 path 不带 `..`、不把看板判到作用域外；有回归测试
- [x] PR 合入 main
