---
name: project_edges_skill_default_one_entry
description: 规划或新增 Edges 随包 skill 时打开：默认并进总入口 edges；只有必须单独加载的能力才拆独立 skill，不要按一模块一 skill 拆
metadata:
  edges-title: 随包 skill 默认一个 edges 总入口，特殊才拆
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-28
  edges-agent-client: grok-bot
  edges-updated-at: '2026-10-28T09:24:29+08:00'
---

随包 skill 默认一个总入口 `edges`，只把「必须单独加载」的能力拆成独立 skill；不要再按「一模块一个 skill」拆。

**Why:** 2026-10-27 用户在全栈会话里否掉了「按模块拆 skill」路线：模块级拆分既不会被人手动调用，也起不到收敛数量的作用（双输）；而一个 `edges` 总入口可以把各模块相近的 list/get/create/update/delete 写成统一指南。同日 grill 后落地为框架 [#80](https://github.com/VirusPC/edges/pull/80)（发版 0.4.1）。独立保留的典型例外：`edges-memory-ask` / `edges-memory-remember`（硬约束要求动手前单独加载）、Langfuse tracing 入口、`edges-tasks-classify`、`edges-onboarding`。

**How to apply:**
- 提议新增随包 skill 前先问：能否并进 `packages/skills/edges/` 的 references + 通用 CRUD 正文？只有「启动时必须单独出现在 skill 清单」或「硬约束点名要加载」才拆目录。
- 不要复活「一 Edges 模块一个 skill」的旧看板意图；相关旧卡应以本约定为准关闭或改写。
- 消费方（workspace / bot）以总入口 + 例外清单为准重装 `.agents/skills`，不要按旧模块表逐个安装。
