# tasks

跨 Agent 接力的工作项看板。

## 参考

设计参考 **[Multica](https://github.com/multica-ai/multica)** 的双层模型（Issue + Task/Run），再按本仓库场景裁剪：指派制、去掉多机 daemon 抢单调度态。细节依据见 `knowledge/projects/task-board-lifecycle/Conclusion.md` 与 `docs/adr/0002-knowledge-tasks-status-folders.md`。

## 两层对应（Multica → edges）

| Multica | 本仓库 | 落点 |
| --- | --- | --- |
| **Issue**（工作项本身，一个状态） | **Task 文件**（`*.md`） | `knowledge/tasks/<project-slug>/<edges-tasks-status>/` |
| Issue 状态 | `metadata.edges-tasks-status` | 与所在子目录名一致 |
| **Run / 执行任务**（一次执行尝试，可 1:N） | **Task Run Log** | 同目录 sidecar `.{stem}.log.md` |
| Run 状态 | log 表里的 `status` 列 | `pending` \| `running` \| `completed` \| `failed` \| `cancelled` |

要点：

- **Issue 层看「这件事处在哪一阶段」**；**Run 层看「某次执行试了几次、结果如何」**。Task 状态不由 Run 状态直接推导。
- 砍掉 Multica Run 侧的 `deferred` / `queued` / `dispatched` / `waiting_local_directory` 等调度态（本场景执行方是仓库内 agent 会话，不是常驻 daemon 抢单）。
- **指派制，不是抢单队列**：没有独立 Claimed；认领与开工合一为进入 `in_progress`。

## Issue 层状态夹

子目录名等于 `edges-tasks-status`：

`backlog` | `todo` | `in_progress` | `in_review` | `done` | `blocked` | `cancelled`

- 新人侧捕获默认落入 `backlog/`。
- **派发默认**：grill → research → plan → implement → validate → close。执行方先 grill（grill-with-docs：CONTEXT / ADR，定做什么/不做什么），过关后再 research（deep-research：竞品分析、开源项目调研、现成方案扫描），再 plan（writing-plans，用调研结果选路径），再 implement，再 validate（质量/设计/行为门禁；可派给非实现者；看板 `in_review` 大致对应），通过后再 close。research 不并进 grill 或 plan。未过 validate 不标 done。用户当次明确跳过除外。回环只按证伪退回，不随便跳阶段；全程可派 subagent 做浅调研，浅调研不占正式 research、不改看板。
- 改状态时：更新 frontmatter 的 `edges-tasks-status`，并把文件（及同 stem 的 `.*.log.md`）移到对应子目录。

## Issue 层 Task Project

看板分组单位是 Task Project：directory-first，路径 `knowledge/tasks/<project-slug>/<edges-tasks-status>/`，并与 frontmatter `metadata.edges-task-project` 双写。未分组用保留目录 `_default`（字段为 `default` 或不写）。与 `edges-tasks-status`、`edges-task-priority` 正交。`status` 只在同一 project 内搬家；跨 project 用 `update --project`。详见 `docs/adr/0009-edges-task-project-grouping.md`。

每个 Task Project（含 `_default`）有一份 `README.md` 组织清单（标题 + 描述，可选 Pointers，`project-entries-local` 列出 Task），不是对该目录做完整 project-memory-init。看板 `README.md` 的 `project-entries-local` 是 CLI 维护的 Task Project 列表；看板 `AGENTS.md` 只登记系统维护材料与用户 init 过的 `<project>/AGENTS.md`。读写走 `edges tasks project list|get|create|update`。跨 project 搬家仍用 `update --project`，不得改 status 或 priority。能力面是 CLI + Skill + MCP。

## Issue 层优先级

需求先后用 frontmatter `metadata.edges-task-priority`：`urgent` | `high` | `medium` | `low` | `none`。与 `edges-tasks-status` 正交：改 priority 不搬状态夹，也不用文件夹或文件名编码优先级。缺省或旧文件无字段视为 `none`。CLI：`create` / `update --priority`，`list --priority`（可重复 OR）与 `list --sort priority`。详见 `docs/adr/0007-edges-task-priority.md`。

## 文件约定

- Task 正文：
  - 开头结论 / `description` 须一句话讲清：解决什么问题 + 预期达成什么结果
  - 正文区分事实背景 vs idea（见 `.harness/tasks/.harness/memory/projects/project_task_separate_facts_from_idea/index.md`）
  - 结构：结论 → 事实背景 → Why → How；**不写**执行流水
- Run 只追加到 `.{stem}.log.md`（点文件 sidecar），不改历史行、不塞进 frontmatter。
- Task 记录员只追加 / 改状态时直接推 `main`，不提 PR。

<!-- project-entries-local:start -->
## 本层内容

- [Default](<_default/README.md>) — Ungrouped tasks that have not been assigned a named Task Project.
- [Agent Clients UX](<agent-clients-ux/README.md>) — 客户端/插件/外设与本地 UX 实验。
- [Edges Extensions](<edges-extensions/README.md>) — edges CLI/脚手架/发布/鉴权等平台层。
- [Edges Tasks](<edges-tasks/README.md>) — 看板与 Task 工作流（协作、绑定、Skill/MCP、分类与调度）。
- [Evaluation](<evaluation/README.md>) — 知识库/Agent Evaluation 评测与可重复 cases（benchmark、评测流水线等）。
- [Observation](<observation/README.md>) — 知识库/Agent Observation 观测/观察系统（与 Evaluation 分开）。
- [Project Memory](<project-memory/README.md>) — Project Memory 类型/索引/reshape/与 docs 边界等。
- [Site and Content](<site-and-content/README.md>) — 站点/posts/badge/内容整理检索。
- [Edges Routines](<edges-routines/README.md>) — routines 模块迭代（调度文件、Skill 约定与最小示例）。
- [技术阅读](<tech-reading/README.md>) — 记录所有技术阅读相关进展（论文、长文、官方文档、源码精读等）。看板管阅读工作项与进度；可读笔记仍可落 notes。
<!-- project-entries-local:end -->
