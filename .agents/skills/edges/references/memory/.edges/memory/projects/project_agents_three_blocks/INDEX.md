---
name: project_agents_three_blocks
description: 改 AGENTS.md 记忆形状、增减受管区块、或决定区块外留什么时：只保留 constraints / local / descendants；不要独立 auto 区块；硬约束种子是 ask/remember 聚光灯加「写在本区块」；区块外只留身份与指针。
metadata:
  edges-title: AGENTS.md 入口只留三类：硬约束、本层组成、下层节点
  edges-type: project
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-10-06T14:30:00+00:00"
---

`AGENTS.md` 作为层入口只含三类：本层硬约束、本层组成、下层节点（没有下层则整块不出现）。表面标记是 `edges` / `edges-constraints` / `edges-local` / `edges-descendants`。运行时不读 `project-memory`、`project-memory-important`、`project-memory-local`、`project-memory-children`。不要独立的 `project-memory-auto` 区块；迁移仍会剥掉这段旧区块，运行时不认它。硬约束种子只有两句：ask / remember 聚光灯，以及「硬约束写在本区块，不要通过记忆正文链接代替」。各层仓规手写追加。区块外只留标题、身份和指向真理源的指针。

**Why:** 协议写的就是这三类。独立 auto 是第四块，和协议打架。ask / remember 必须常驻点名，否则会淹在海量 skill 里；点名即可，不写用法、不编排 init。硬约束写什么见 `project_important_block`。三章名称服务于 Project Harness，不是 Project Memory 目录。

**How to apply:** 改 LAYOUT / 模板 / 脚本时只写 `edges` / `edges-*`。不要生成 auto。已有硬约束正文不覆盖。区块外压到身份与指针，不检索就会做错的进 constraints 区块，和 README 重复的删掉。`project-memory-doctor` 与 `project-memory-reshape` 已删除，不要再调用。旧层注释用 `scripts/migrations/rewrite-project-harness-markers.mts` 改写后再解析。翻案过程见 `project_design_decisions`。
