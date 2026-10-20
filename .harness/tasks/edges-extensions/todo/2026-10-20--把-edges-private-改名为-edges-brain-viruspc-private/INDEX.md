---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-20T12:40:00.000Z'
  edges-title: 把 edges-private 改名为 edges-brain-viruspc-private
  edges-tasks-status: todo
  edges-task-priority: none
name: 把 edges-private 改名为 edges-brain-viruspc-private
description: >-
  公开拆仓后命名已对齐；私仓仍叫 edges-private，改为 edges-brain-viruspc-private，并改完 Compose
  与文档引用。
---
**背景：**
公开拆仓后命名已对齐为 `VirusPC/edges`（框架）与 `VirusPC/edges-brain-viruspc`（个人公开大脑）；私仓仍叫 `VirusPC/edges-private`，与现命名不一致。命名模式应是：edges（系统）+ edges-brain-viruspc（公开大脑）+ edges-brain-viruspc-private（私密大脑）。

**目标：**
按最新双仓 + Compose 架构，把 `VirusPC/edges-private` 重命名为 `VirusPC/edges-brain-viruspc-private`，并改完 Compose 登记、文档与本地 remote 等引用。不发明新架构，沿用当前 Compose 与双仓边界；动手前先 grill。

**动作：**
- 先 `grill-with-docs`（或 grill）确认影响面：Compose 登记、技能文案、日复盘存款路径、本机 / ECS clone remote、GitHub redirects。
- 再执行 GitHub rename。
- 再开 PR 修引用。历史笔记里的旧名可保留，并在迁移对照里说明。

**grill R1 拍板（2026-10-20）：**
- 改的范围？选项：只改现行引用 + 写迁移说明 / 连历史一起替换 / 只改现行引用不写说明。结论：只改现行引用，历史保留旧名，加一条旧名 → 新名说明（放在 `projects/routines/README.md`「改名对照」）。理由：任务卡允许历史保留；ADR 0003、CONTEXT.md:117 写的是被否决的「edges-private 当真源」，改名会扭曲历史决策。
- Compose 要不要登记私仓？选项：本次不登记 / 本次登记 / 不登记并另开卡。结论：不登记，Compose 项标「明确无需更新」。理由：私仓是 Obsidian 知识库，不是 harness 仓；登记会把私仓名、用途和 remote 写进公开 AGENTS.md，也违背拆仓卡「不登记进公开系统仓」。
- 框架仓 `conversation-to-notes` 里的私仓名？选项：不点名个人仓、改通用写法 / 直接换新名 / 不动。结论：改成「私密内容写入你自己的私密仓」，顺手修掉过时的「仓：`VirusPC/edges`」和 CLI 路径；不移动 skill tag。理由：框架仓开源，不应依赖个人 / 私密仓。
- 本机 clone？选项：只改 remote / 连文件夹一起改 / 都不改。结论：只 `git remote set-url`，文件夹名不变；Mac 那步给用户一条命令。理由：Obsidian 按路径记 vault，改文件夹会断。
- 私仓自身？选项：改 README / AGENTS 自称并补 description / 只改自称 / 都不动；直推 main 还是开 PR。结论：改自称、补 description，直推 main。理由：description 原为空；私仓 main 无保护。

**完成标准：**
- [x] GitHub 上仓库名为 `VirusPC/edges-brain-viruspc-private`，且旧 URL 可重定向（2026-10-20 已改名；`gh api repos/VirusPC/edges-private` 解析到新名，旧 URL `git ls-remote` 可用）
- [x] 个人公开仓与框架仓中的 Compose / README / AGENTS / skills 等持久引用已更新（或明确无需更新）
  - Compose：明确无需更新（私仓从未登记，R1 决定不登记）
  - 个人公开仓：日复盘 routine SKILL、`projects/routines/README.md`、`retrospectives/daily/README.md`、记笔记 backlog 卡改为新名，并加改名对照
  - 框架仓：`conversation-to-notes` 不再点名个人仓（VirusPC/edges#12）
  - 私仓：README / AGENTS 自称改为新名，补了 repo description
- [x] 本机与常用环境的 git remote 已指向新名（或清单列明待用户改）
  - box `/workspace/edges-private`：已改
  - Mac（路径为推测）：待用户执行 `git -C ~/Documents/projects/agent/edges-private remote set-url origin https://github.com/VirusPC/edges-brain-viruspc-private.git && git -C ~/Documents/projects/agent/edges-private remote -v`
  - ECS：没有私仓检出，无需更新
  - 各助手记忆 / 定时任务 prompt 中的旧名：仓外，靠 GitHub 重定向过渡，由共享记忆更正
