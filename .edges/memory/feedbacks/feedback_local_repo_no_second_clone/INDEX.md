---
name: feedback_local_repo_no_second_clone
description: 在本机对某个仓库做任何操作之前打开：先找已有的本地 clone，从这份仓库开 worktree；不要再克隆第二份，包括云端 Agent 不可用的时候。
metadata:
  edges-title: 本机已有 clone 时不要再开第二份克隆
  edges-type: feedback
  edges-origin-session-id: daily-retro-2026-11-28
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-11-29T00:39:41+08:00'
---

在本机对某个仓库做任何操作之前，先找已经存在的本地 clone，并核对本机 Git 规矩（每个项目本机只留一份仓库；要改就从这份开独立 worktree 和分支，改完推 PR，用完删掉 worktree）。任何情况下都不要再克隆第二份，包括云端 Agent 额度用完或不可用、需要「找一个隔离环境」的时候。隔离由 worktree 完成，不由新 clone 完成。

**Why:**
2026-11-27 16:29（Asia/Shanghai），云端 Cursor 额度用完后，日复盘为解决公开脑 #598、#614 的合并冲突，打算在本机新 clone 一份仓库。用户指出本地已经有这个仓库，并说「这个问题很严重」。这条规矩此前已存在，但换方案时没有先查本地现状，也没有对一遍已有约定。#598 曾用临时 clone 解冲突，随后已删除该 clone；#614 改在已有仓库上单开 worktree 处理。

**How to apply:**
本机处理 PR、解冲突或改代码之前，先定位已有 clone。给每个任务开独立 worktree 和分支，不要新建第二份克隆。云端 Agent 不可用时同样如此。
