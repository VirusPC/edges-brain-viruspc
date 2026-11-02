# tasks

跨 Agent 接力的工作项看板。

## 参考

设计参考 **[Multica](https://github.com/multica-ai/multica)** 的双层模型（Issue + Task/Run），再按本仓库场景裁剪：指派制、去掉多机 daemon 抢单调度态。细节依据见本仓 [`projects/task-board-lifecycle/Conclusion.md`](../../projects/task-board-lifecycle/Conclusion.md)，状态夹决策见框架仓 [ADR 0002](https://github.com/VirusPC/edges/blob/main/docs/adr/0002-knowledge-tasks-status-folders.md)。

## 两层对应（Multica → edges）

| Multica | 本仓库 | 落点 |
| --- | --- | --- |
| **Issue**（工作项本身，一个状态） | **Task 文件**（`*.md`） | `.edges/tasks/<project-slug>/<edges-tasks-status>/`（领域板在 `tasks/`） |
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

看板分组单位是 Task Project：directory-first，路径 `<project-slug>/<edges-tasks-status>/`，并与 frontmatter `metadata.edges-task-project` 双写。未分组用保留目录 `_default`（字段为 `default` 或不写）。与 `edges-tasks-status`、`edges-task-priority` 正交。`status` 只在同一 project 内搬家；跨 project 用 `update --project`。详见框架仓 [ADR 0009](https://github.com/VirusPC/edges/blob/main/docs/adr/0009-edges-task-project-grouping.md)。

每个 Task Project（含 `_default`）有一份 `README.md` 组织清单（标题 + 描述，可选 Pointers，`edges-entries-local` 列出 Task），不是对该目录做完整 edges-memory-init。看板 `README.md` 的 `edges-entries-local` 是 CLI 维护的 Task Project 列表；看板 `AGENTS.md` 只登记系统维护材料与用户 init 过的 `<project>/AGENTS.md`。读写走 `edges tasks project list|get|create|update`。跨 project 搬家仍用 `update --project`，不得改 status 或 priority。能力面是 CLI + Skill + MCP。

## Issue 层优先级

需求先后用 frontmatter `metadata.edges-task-priority`：`urgent` | `high` | `medium` | `low` | `none`。与 `edges-tasks-status` 正交：改 priority 不搬状态夹，也不用文件夹或文件名编码优先级。缺省或旧文件无字段视为 `none`。CLI：`create` / `update --priority`，`list --priority`（可重复 OR）与 `list --sort priority`。详见框架仓 [ADR 0007](https://github.com/VirusPC/edges/blob/main/docs/adr/0007-edges-task-priority.md)。

## 文件约定

- Task 正文：
  - 开头结论 / `description` 须一句话讲清：解决什么问题 + 预期达成什么结果
  - 正文区分事实背景 vs idea（见框架仓 [project_task_separate_facts_from_idea](https://github.com/VirusPC/edges/blob/main/.edges/tasks/.edges/memory/projects/project_task_separate_facts_from_idea/INDEX.md)）
  - 结构：结论 → 事实背景 → Why → How；**不写**执行流水
- Run 只追加到 `.{stem}.log.md`（点文件 sidecar），不改历史行、不塞进 frontmatter。
- Task 记录员只追加 / 改状态时直接推 `main`，不提 PR。

<!-- edges-entries-local:start -->
## 本层内容

- [routines\_目录下增加\_project\_分组层](<backlog/2026-10-23--routines-%E7%9B%AE%E5%BD%95%E4%B8%8B%E5%A2%9E%E5%8A%A0-Project-%E5%88%86%E7%BB%84%E5%B1%82/INDEX.md>) — 给长期问题追踪等常驻流程加一层归属分组，避免 routines 扁平堆叠。
- [edges\_将\_dashboard\_定为通用系统输出](<backlog/2026-10-24--Edges-%E5%B0%86-dashboard-%E5%AE%9A%E4%B8%BA%E9%80%9A%E7%94%A8%E7%B3%BB%E7%BB%9F%E8%BE%93%E5%87%BA/INDEX.md>) — 把 dashboard 提升为与 notes、artifacts 同级的通用输出形态，问题追踪只是第一个消费者。
- [grok\_bot\_会话每小时写入\_langfuse](<backlog/2026-10-24--Grok-Bot-%E4%BC%9A%E8%AF%9D%E6%AF%8F%E5%B0%8F%E6%97%B6%E5%86%99%E5%85%A5-Langfuse/INDEX.md>) — 本地插件抓不到 Grok Bot；用定时任务按真实时间线把会话写进 Langfuse。
- [统一收集并统计所有\_agent\_的\_session](<backlog/2026-10-24--%E7%BB%9F%E4%B8%80%E6%94%B6%E9%9B%86%E5%B9%B6%E7%BB%9F%E8%AE%A1%E6%89%80%E6%9C%89-Agent-%E7%9A%84-Session/INDEX.md>) — 把各 Agent 客户端的会话收成可查询数据源，支撑沉淀、评测、成本和跨 Agent 接力。
- [日复盘旁路接入\_langfusecodexcursorgrok\_主源仍用\_readtranscript](<backlog/2026-10-25--%E6%97%A5%E5%A4%8D%E7%9B%98%E6%97%81%E8%B7%AF%E6%8E%A5%E5%85%A5-LangfuseCodexCursorGrok-%E4%B8%BB%E6%BA%90%E4%BB%8D%E7%94%A8-ReadTranscript/INDEX.md>) — 对照过自建 Langfuse 与现有日复盘落盘后，主路径不换；给 Skill 加一条旁路，只补扫 Codex/Cursor 里已有 I/O 的 turn。
- [补齐或标明\_opencodepi\_的\_langfuse\_设备维度tags缺口](<backlog/2026-10-25--%E8%A1%A5%E9%BD%90%E6%88%96%E6%A0%87%E6%98%8E-OpenCodePi-%E7%9A%84-Langfuse-%E8%AE%BE%E5%A4%87%E7%BB%B4%E5%BA%A6tags%E7%BC%BA%E5%8F%A3/INDEX.md>) — OpenCode/Pi 当前无 tags 写入口，设备维度缺失；调研可写路径或在文档标明限制。
- [验收并标\_doneevaluation\_迁移\_langfuse\_agent\_skills\_卡](<backlog/2026-10-26--%E9%AA%8C%E6%94%B6%E5%B9%B6%E6%A0%87-doneevaluation-%E8%BF%81%E7%A7%BB-Langfuse-Agent-skills-%E5%8D%A1/INDEX.md>) — edges\#45 / brain\#382 已落地，但 Skill 子卡仍 backlog；验收完成标准后标 done，并决定母卡状态。
- [harness\_memory\_ablation\_题库\_v1\_1与线上扩库流水线](<backlog/2026-10-27--harness-memory-ablation-%E9%A2%98%E5%BA%93-v1.1%E4%B8%8E%E7%BA%BF%E4%B8%8A%E6%89%A9%E5%BA%93%E6%B5%81%E6%B0%B4%E7%BA%BF/INDEX.md>) — 对齐 Compose→顶层 submodule 后的题库真源，补齐数据集说明，并落地「线上 trace→候选→人审→upsert」流水线，供后续正式消融使用。
- [edges\_官网知识问答\_rag\_服务edges\_rag](<backlog/2026-10-28--Edges-%E5%AE%98%E7%BD%91%E7%9F%A5%E8%AF%86%E9%97%AE%E7%AD%94-RAG-%E6%9C%8D%E5%8A%A1edges-rag/INDEX.md>) — 建 VirusPC/edges\-rag：用 LlamaIndex\+Chroma\+FastAPI 为官网知识问答 Agent 提供带引用的 Edges 框架问答服务，可在 minigtr 对接 compose edges 与 4070ts Ollama。
- [个人视频剪辑工作流马尔代夫成片](<backlog/2026-10-31--%E4%B8%AA%E4%BA%BA%E8%A7%86%E9%A2%91%E5%89%AA%E8%BE%91%E5%B7%A5%E4%BD%9C%E6%B5%81%E9%A9%AC%E5%B0%94%E4%BB%A3%E5%A4%AB%E6%88%90%E7%89%87/INDEX.md>) — 按个人视频剪辑工作流产出马尔代夫旅行成片。
- [已有资料沉淀进\_edges\_工作流](<backlog/2026-10-31--%E5%B7%B2%E6%9C%89%E8%B5%84%E6%96%99%E6%B2%89%E6%B7%80%E8%BF%9B-Edges-%E5%B7%A5%E4%BD%9C%E6%B5%81/INDEX.md>) — 把已有资料系统地沉淀进 Edges 的工作流。
- [收口周复盘\_pr\_370统一\_readmeskill\_文案后合入](<done/2026-10-25--%E6%94%B6%E5%8F%A3%E5%91%A8%E5%A4%8D%E7%9B%98-PR-370%E7%BB%9F%E4%B8%80-READMEskill-%E6%96%87%E6%A1%88%E5%90%8E%E5%90%88%E5%85%A5/INDEX.md>) — 消除「补记改 INDEX」与「正文写定后不改、评论记 COMMENTS.md」矛盾，再合 \#370。
- [ai资讯工作流改为\_rss\_并优化数据格式与\_token\_对比](<in_progress/2026-10-31--AI%E8%B5%84%E8%AE%AF%E5%B7%A5%E4%BD%9C%E6%B5%81%E6%94%B9%E4%B8%BA-RSS-%E5%B9%B6%E4%BC%98%E5%8C%96%E6%95%B0%E6%8D%AE%E6%A0%BC%E5%BC%8F%E4%B8%8E-token-%E5%AF%B9%E6%AF%94/INDEX.md>) — AI 资讯周报改为以自维护 OPML 的 RSS 为先，列表页只作退路，并留下 2026\-10\-30 窗口的覆盖与体积对比。
<!-- edges-entries-local:end -->

<!-- edges-migrated-task-default:start -->
## 原未分组任务说明

# Default

Ungrouped tasks that have not been assigned a named Task Project.

## 本层内容
<!-- edges-migrated-task-default:end -->
