---
name: project_weekly_overview_wait_for_two_tracks
description: >-
  本周概览已在 0.0.8 落地为独立的 summary/overview.json。架构仍以 CONTEXT.md 与
  docs/adr 为准；不要把它和编排重构或 GitHub Trending 改动混进同一个变更。
metadata:
  edges-title: 本周概览已在 0.0.8 落地
  edges-type: project
  edges-origin-session-id: sand-subagent-823990b0-e409-f7fa-14fe-659769c4b238
  edges-agent-client: cursor
  edges-username: Cheng Peng
  edges-email: 30697592+VirusPC@users.noreply.github.com
  edges-updated-at: '2026-11-23T16:24:25+08:00'
---

本周概览的已定架构写在本技能的 CONTEXT.md 和 docs/adr 里。编排重构和「GitHub Trending 只采用每周总榜」已经完成，概览已在技能 0.0.8 落地：`summary/overview.json` 是总结阶段的独立产物，站点第一章先词云后总结。

**Why:**

两轮 grill（2026-11-23）已经定下产物、接入、章序和锚点。用户把推荐的「本周概览可以单独现在做」改成了「等另外两个事做完先」。GitHub Trending 只看每周总榜是用户在第二轮新定的、属于编排重构的事项。没有这些记录，后来的人容易在本周概览的改动里顺手改 Trending，或在另外两件事没完成时就开始改站点。

**How to apply:**

修改本技能前先读 docs/adr（0001 产物与接入、0002 章序与锚点、0003 每周总榜、0004 先主线后关键词）和 CONTEXT.md。概览已经上线，不要再等编排重构或 Trending。0.0.9 起每条主线有一枚 tag，规则以 0004 为准，不在这份记忆里展开。以后改它仍按 ADR 执行，不要把编排重构或 Trending 改动放进同一个变更。
