---
name: feedback_stacked_pr_merge_order
description: >-
  合叠层 PR 或核实修复是否已在 main 时打开：底层 squash 进 main 前确认上层都已合进底层分支，合完把剩余上层改指向 main；PR
  显示已合并不等于改动在 main。缘起 #208/#211 丢失，见 https://github.com/VirusPC/edges/pull/289。
metadata:
  edges-title: 叠层 PR：底层 squash 前确认上层已合入
  edges-type: feedback
  edges-origin-session-id: sand-subagent-91de785a-85c8-d2ad-e2bf-4dd7c12708f9
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-19T05:17:29+08:00'
---

叠层 PR（上层 PR 的 base 是另一个 PR 的分支）里，底层 PR squash 合进 main 之前，先确认所有上层 PR 都已合进底层分支；底层一旦合入，还没合的上层 PR 立刻改指向 main 并重新核对差异。不要把「PR 显示已合并」当成「改动已在 main」。

**Why:**

2026-10-19 切 Edges 1.5.0 时，核对 CHANGELOG 才发现 #208（移动任务状态时保留软链登记）和 #211（`--scope` 大小写与实际目录不一致时路径不越界）虽然 2026-10-11 显示已合并，但合进的是叠层分支，而 #204 比它们早 7 秒和 20 秒就把该分支 squash 进了 main。两处修复从未进 main，也没人回滚，静默丢了八天，直到发版前才被发现，只能重新实现（#289）并开卡跟踪（#288）。

**How to apply:**

- 合底层 PR 前：列出以它的分支为 base 的所有开放或刚合的 PR，确认都已在底层分支上，再 squash。
- 合完底层后：把剩余上层 PR 的 base 改成 main，看 diff 是否仍是预期改动。
- 写 CHANGELOG 或验收「某修复已上线」时，用 `git merge-base --is-ancestor` 或在 main 上搜对应改动核实，不只看 PR 状态。
