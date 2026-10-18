---
name: project_tasks_board_mutations_via_cli
description: >-
  所有层级的领域 tasks 与维护 .harness/tasks 看板变更，优先走 edges tasks CLI 和已有任务
  Skill；能力缺口明确反馈，不长期绕过工具直接改文件。
metadata:
  edges-title: Task 看板变更优先走 edges tasks CLI
  edges-type: project
  edges-origin-session-id: bc-c0103a88-0443-5dd2-8ea4-9f76501e86ab
  edges-agent-client: codex
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-10-18T05:55:14+00:00'
---

改任意层级的领域 `tasks/` 或维护 `.harness/tasks/` 看板（状态/字段/搬家等）必须优先使用 `edges tasks`（list/get/create/update/status 等）。不传 `--super` 写 `<scope>/.harness/tasks`；`--super` 写 `<scope>/tasks`。不要默认手写 Markdown 再 git push。本条是仓根 `prefer_repo_skills_and_cli` 的看板特化：已有 tasks 相关 Skill（如 `project-tasks-classify`）也要优先用；通用 CRUD Skill 仍是 backlog。

**Why:**
与 ADR 0005 及仓根「仓内优先用仓库 Skill 与 CLI」一致；避免双轨导致 frontmatter/路径漂移；暴露 CLI/Skill 缺口才能补齐。

**How to apply:**
先试 `edges tasks …`；工作流（分类、审阅等）走已有 Skill。若缺依赖、缺动词、Skill 不可用、或 CLI 只改盘不推远程导致流程断掉，向用户说明具体缺口，请用户决定补充还是临时改流程。git commit/push 若 CLI 未覆盖，可在 CLI 改盘成功后单独提交，但仍禁止跳过 CLI 直接改 Task 文件。禁止静默长期绕过。


2026-10-05 用户确认：本约定适用于所有层级的任务看板，包括维护 `.harness/tasks` 和领域 `tasks/`。共享的是任务操作与索引一致性要求，不因任务归属系统不同而改变。当前作为仓内共享约定存放于根 .harness/memory/projects/；提炼到 extensions/memory 的对外分发属于后续高优待办。
