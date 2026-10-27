# tasks — Task 模块专项

跨 Agent 看板、TaskGraph、依赖抽取与自动派发等 **Task 模块** 的在研与调研材料。

## 与其它目录的关系

| 位置 | 职责 |
| --- | --- |
| 本目录 `knowledge/projects/tasks/` | Task 模块的研究、方案对照、长文调研 |
| [`../task-board-lifecycle/`](../task-board-lifecycle) | 早期看板状态机 / Multica 对照结论 |
| [`../../tasks/`](../../.edges/tasks) | 工作项看板本身（Issue 状态夹 + Run log） |

## 文档

- [2026-09-14--nl-task-dependency-extraction-deep-report.md](2026-09-14--nl-task-dependency-extraction-deep-report.md) — NL task 依赖抽取深化报告（论文十问 + 项目卡 + 关键点对比）
- [2026-09-15--issue-priority-words-vs-p0.md](2026-09-15--issue-priority-words-vs-p0.md) — Issue 优先级用词档 vs P0–P3 一手对照；Multica 无书面 why

- [2026-09-17--task-project-classify-no-fake-embedding.md](2026-09-17--task-project-classify-no-fake-embedding.md) — 为何不做 LLM prompt 假 embedding；真 Embedding / NCC 调研与产品决定（撤 PR #78 NCC 文案）

## 相关看板 backlog（指针）

- `knowledge/tasks/backlog/2026-09-14--落盘时推荐相关task并问依赖.md`
- `knowledge/tasks/backlog/2026-09-15--按消息队列自动推送就绪task.md`
- `knowledge/tasks/in_progress/2026-09-13--tasks补充需求优先级.md`
