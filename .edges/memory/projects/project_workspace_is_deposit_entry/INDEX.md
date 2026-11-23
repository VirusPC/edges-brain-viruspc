---
name: project_workspace_is_deposit_entry
description: >-
  助手要记下长期约定、偏好、事实，或沉淀笔记、任务、记忆、日复盘、周复盘前打开：正文写进公开脑或私密脑，助手自身记忆只作次要索引；入口仍是工作区根
  AGENTS.md
metadata:
  edges-title: 沉淀以工作区根为入口（顶层 git submodule）
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-27
  edges-agent-client: grok-bot
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-23T04:41:19+00:00'
---

沉淀（笔记、任务、记忆、长期约定、偏好、事实、日复盘、周复盘）默认以工作区根 [`VirusPC/edges-workspace-viruspc`](https://github.com/VirusPC/edges-workspace-viruspc) 为入口：先读它的根 `AGENTS.md`，再把正文写进顶层内容子模块（默认公开脑 `edges-brain-viruspc/`，敏感内容只写私密脑 `edges-brain-viruspc-private/`，框架改动写 `edges/`），PR 开在子仓，不在工作区根堆正文。助手和 bot 要记住的长期约定、偏好、事实必须优先写进这两脑；助手自身记忆只作次要索引，不代替仓库正文。

自 2026-10-26（workspace [#10](https://github.com/VirusPC/edges-workspace-viruspc/pull/10)）起，三仓是**顶层普通 git submodule**，不再登记在 Edges Compose（`.edges/compose/` 登记区为空）。它们是内容库，不是 workspace 自己的 harness。

**Why:** 2026-10-21 用户对 Grok Bot 说「你现在默认不都是记在这里吗？把这个地方当做入口」；同日日复盘也确认按这个入口走。2026-10-26 用户纠正：三仓「本身不是这个 workspace 的 harness，应该是子目录」「Compose 卸载，改成子目录的 git submodule」。工作区根仍是入口与索引；人读 `README.md`，Agent 读 `AGENTS.md`，细则去读各子仓自己的 README / AGENTS，不在 workspace 根重复展开模块表。2026-11-23 peng cheng 约定：所有助手和 bot 要记住的长期约定、偏好、事实必须优先写进公开脑或私密脑，助手自身记忆只作次要索引。根 `AGENTS.md` 硬约束写了同一条，在本仓工作的 Agent 都会读到。

**How to apply:**
- 长期约定、偏好和事实按同一入口落仓。可公开的进公开脑，私密的只进私密脑。助手自身记忆可以留一条指向仓库条目的索引，正文以仓库为准。
- 动手前先 `git submodule update --init`，确认要写的子仓已经检出（路径在工作区根下的 `edges/`、`edges-brain-viruspc/`、`edges-brain-viruspc-private/`，**不是** `.edges/compose/<name>`）。
- 在工作区根直接跑 `edges notes create` 会落在工作区自己的 `notes/`，不会自动进子仓。要写进哪个脑，就把 `--scope`（或 `--target-dir`）指到对应顶层子模块绝对路径。
- 子仓的 PR 合入后，工作区里的 submodule 指针要单独推一次，并且指向子仓 main 上的提交。
- 日复盘流程见公开脑 `.edges/routines/daily-conversation-deposit/SKILL.md`；周复盘见同目录 weekly routine。
- Compose 卸载 CLI 能力另有框架仓 backlog 卡（edges#53 已合入看板，实现未做）；去掉登记目前仍是手改 Compose 区块。
