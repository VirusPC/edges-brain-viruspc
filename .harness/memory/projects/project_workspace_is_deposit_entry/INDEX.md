---
name: project_workspace_is_deposit_entry
description: >-
  往两脑沉淀笔记、任务、记忆，或跑日复盘、周复盘前打开：先读 edges-workspace-viruspc 根 AGENTS.md，正文写进 composed
  子仓，不写工作区根
metadata:
  edges-title: 沉淀以 Compose 工作区根为入口
  edges-type: project
  edges-origin-session-id: sand-subagent-ce7b2d5e-de1c-ad6f-6451-4f15d78beee6
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-24T23:53:00+08:00'
---

沉淀（笔记、任务、记忆、日复盘、周复盘）默认以 Compose 工作区根 [`VirusPC/edges-workspace-viruspc`](https://github.com/VirusPC/edges-workspace-viruspc) 为入口：先读它的根 `AGENTS.md`，再把正文写进挂在 `.harness/compose/` 下的子仓（默认公开脑 `edges-brain-viruspc`，敏感内容只写私密脑 `edges-brain-viruspc-private`），PR 开在子仓，不在工作区根堆正文。

**Why:** 2026-10-21 用户对 Grok Bot 说「你现在默认不都是记在这里吗？把这个地方当做入口」；同日日复盘也和用户确认按这个入口走，5:00 定时任务的交接文案已经改了。工作区根挂着公开脑、私密脑和框架仓，从这里进来，一次能看到全部去向和各自的硬约束。Compose 子仓从 ADR 0045 起可写（框架仓 #26）。2026-10-24 周复盘例程改为同一入口。

**How to apply:**
- 动手前先 `git submodule update --init`（或 `edges compose update`），确认要写的子仓已经检出。
- 在工作区根直接跑 `edges notes create`，文件会落在工作区自己的 `notes/`，不会自动进子仓。要写进哪个脑，就把 `--scope` 指到 `.harness/compose/<name>`，或者直接在那个子仓的 clone 里操作。2026-10-21 云端 Agent 的验证里，落到哪个子仓是 Agent 读了规则自己判断的，CLI 不会自动路由。
- 子仓的 PR 合入后，工作区里的 submodule 指针要单独推一次，并且指向子仓 main 上的提交，不能指向只在分支上的提交。
- 日复盘的流程见 `projects/routines/daily-conversation-deposit/SKILL.md`。
- 周复盘的流程见 `projects/routines/weekly-retrospective/SKILL.md`。
