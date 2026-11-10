---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-10T21:21:19.237Z'
  edges-title: '把 edges 的 super 材料面识别收成一条简单原则，并按它重构 PR #120 涉及的 skill'
  edges-tasks-status: backlog
  edges-task-priority: none
name: 把_edges_的_super_材料面识别收成一条简单原则并按它重构_pr_120_涉及的_skill
description: 'edges #120 的 skill 把 super 材料面识别写成了分散规则。定稿一条简单原则，并按它收口 CLI 与相关 skill。'
---
**背景：**
2026-11-10 全栈开发专家对话里，用户围绕 edges PR #120 收口 super 材料面的识别方式。用户嫌 #120 的 skill 里识别规则分散，像一堆 if/else，防御性措辞多。中间讨论过用 `--scope @super` 做保留词，也讨论过直接取消 `--super`。最后倾向由 `--scope` 指向的目录决定材料位置，越具体越优先。表达顺序为：先确定要 harness 的目录（先看 `--scope`，没传按默认规则往上找）→ 再确定材料位置（先看给定路径，再看该目录 AGENTS.md 有无 `<edges-harness mode="super" />` 标记，都没有用 `.edges/`）→ 在该位置读写。设计未定稿，代码未改。
- 现状：edges #120 仍是打开的 PR；上面的顺序是对话倾向，不是已经落地的实现。
- 关联：https://github.com/VirusPC/edges/pull/120 ；2026-11-11 日复盘。

**目标：**
定稿这条原则，并按它收口 CLI 与 #120 涉及的 skill（edges、edges-onboarding、memory-init、edges-memory-remember、edges-conversation-to-tasks、edges-conversation-to-notes、edges-memory-add-type、edges-tasks-classify），各子 skill 只留自己的步骤。
