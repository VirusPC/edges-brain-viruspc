---
name: project_weekly_overview_wait_for_two_tracks
description: >-
  本周概览的架构已写入 CONTEXT.md 和 docs/adr；实现须等编排重构和 GitHub Trending
  每周总榜改动完成。不要现在动手，也不要把三件事混进同一个变更。
metadata:
  edges-title: 本周概览已定，等另外两件事做完再实现
  edges-type: project
  edges-origin-session-id: sand-subagent-823990b0-e409-f7fa-14fe-659769c4b238
  edges-agent-client: cursor
  edges-username: Cheng Peng
  edges-email: 30697592+VirusPC@users.noreply.github.com
  edges-updated-at: '2026-11-23T16:24:25+08:00'
---

本周概览的已定架构写在本技能的 CONTEXT.md 和 docs/adr 里。动手实现之前，先等 skill 编排重构和「GitHub Trending 只采用每周总榜」做完。不要现在开实现分支，也不要把这三件事混进同一个变更。

**Why:**

两轮 grill（2026-11-23）已经定下产物、接入、章序和锚点。用户把推荐的「本周概览可以单独现在做」改成了「等另外两个事做完先」。GitHub Trending 只看每周总榜是用户在第二轮新定的、属于编排重构的事项。没有这些记录，后来的人容易在本周概览的改动里顺手改 Trending，或在另外两件事没完成时就开始改站点。

**How to apply:**

修改本技能前先读 docs/adr（0001 产物与接入、0002 章序与锚点、0003 每周总榜）和 CONTEXT.md。实现本周概览时按 ADR 执行，不要把编排重构或 Trending 改动放进同一个变更。那两件事完成之前不要开始本周概览的代码。
