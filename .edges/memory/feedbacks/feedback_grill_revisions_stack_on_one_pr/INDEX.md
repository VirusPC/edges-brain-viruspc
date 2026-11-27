---
name: feedback_grill_revisions_stack_on_one_pr
description: 多回合设计讨论（grill）时打开：文档修订都叠在同一个分支和 PR，讨论全部结束后一次性合并，不要每回合合一次。
metadata:
  edges-title: 一轮 grill 的修订叠在同一个 PR，讨论完再合并
  edges-type: feedback
  edges-origin-session-id: daily-retro-2026-11-27
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-11-27T05:26:12+08:00'
---

对一轮多回合的设计讨论（grill），文档修订都叠在同一个分支和 PR 上，讨论全部结束后一次性合并，不要每回合合一次。

**Why:**
2026-11-26 13:29（Asia/Shanghai）peng cheng 说「接着继续吧，可以grill完再一起合」「不用每轮合一次，太散了」。每回合各合并一次会把同一次讨论拆开，审阅和上下文都散。

**How to apply:**
grill 还在进行时，把文档修订继续提交到当前分支和同一个 PR。讨论全部结束后再一次性合并。不要每回合合一次。
