---
name: project_important_block
description: 改 AGENTS.md 记忆形状、或决定一条规则该常驻还是进 .edges/memory 时：点名 ask/remember，加上不检索就会做错的仓规，直接写进 edges-constraints；目录细则不进这里也不进 .edges/memory。
metadata:
  edges-title: 本层硬约束写在 AGENTS.md 区块里
  edges-type: project
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-10-06T14:30:00+00:00"
---

本层硬约束写在 `AGENTS.md` 的 `edges-constraints` 区块里，规则直接列出，不进 `.edges/memory`、不做成索引行。不读旧标记 `project-memory-important`。区块装两样：点名 ask / remember，以及该目录不检索就会做错的仓规。init 与 `edges memory doctor` 只保证区块存在，缺失时补种子，不覆盖已有正文。

**Why:** 入口文件每次都会加载，硬约束必须不靠检索就生效。放进记忆文件等于多一跳，ask 按说明挑文件时可能打不开，等于没写。ask / remember 也必须写在这里：skill 列表里那句说明不够可靠，技能一多就会被挤掉。目录约定、交互口吻不是硬约束，也不要为了「清掉」硬塞进 `.edges/memory`。

**How to apply:** 写规则前先问「不打开 `.edges/memory` 会不会做错」。会，就改该层硬约束区块正文（允许手改这一块）。不会，要么已有真理源（README），要么走 remember。不要在硬约束区块里放链接指向记忆文件，不要写 init 的用法，不要把 skill 用法抄进来。缺失区块交给 `edges memory doctor` 的 `missing-important`，不要整份重渲染入口。`project-memory-doctor` 与 `project-memory-reshape` 已删除。
