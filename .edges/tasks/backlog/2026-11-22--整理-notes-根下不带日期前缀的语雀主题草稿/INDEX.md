---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-22T21:22:17.231Z'
  edges-title: 整理 notes 根下不带日期前缀的语雀主题草稿
  edges-tasks-status: backlog
  edges-task-priority: none
name: 整理_notes_根下不带日期前缀的语雀主题草稿
description: notes/ 根下 22 个不带日期前缀的语雀式主题目录既不在笔记索引里，也不像项目。逐个定去向并完成迁移，索引登记齐全。
---
**背景：**
2026-11-22，用户认为 `notes/` 根下很多从语雀迁来的主题草稿应该改成 projects。助手核对后认为不是全部都改：`ai-training` 与 `ai-training-inbox` 已是课程模块，更适合放 `teaching/`；`markdown-and-agents` 这类主题容器适合做 project。嵌套 Project 的站点展示已在 [#565](https://github.com/VirusPC/edges-brain-viruspc/pull/565) 合入：根与子项目共用同一套高密度列表，并去掉教学文案。Teaching 站内闭环已在 [#566](https://github.com/VirusPC/edges-brain-viruspc/pull/566) 合入，所以 `teaching/` 也是可落地的去向。
- 这些目录在 2026-10-06 随 [#161](https://github.com/VirusPC/edges-brain-viruspc/pull/161) 迁入。它们没有日期前缀，不在 `notes/README.md` 的笔记索引里。站点只收带日期的笔记，所以它们既不像笔记，也不像项目。
- 2026-11-23 核对时，`notes/` 根下不以 `YYYY-MM-DD` 开头的目录有 22 个：`1. memory`、`2. harness`、`Agent Trace`、`Claude Code 贡献指标`、`Claude 多 Agent 系统设计：Sub-Agents vs Agent Teams`、`Harness Engineering`、`OpenSpec & 串流程的思考`、`Untitled`、`ai-training`、`ai-training-inbox`、`jd`、`kimi agent swarm`、`markdown  ext`、`markdown-and-agents`、`memory`、`obsidian-daily-notes`、`openclaw-tmux-permissions`、`save-token`、`to-learn`、`业务技术的核心`、`浏览器检索benchmark`、`职业规划`。
- 上面课程模块与主题容器的去向是助手建议，还没有逐个拍板。
- 预期：每个目录有明确去向，笔记索引、项目索引或教学索引跟得上，站点不再把它们留在两边都不是的状态。
- 非目标：不把 22 个目录全部改成 project。不重做已经合入的嵌套 Project 展示。
- 关联：[#161](https://github.com/VirusPC/edges-brain-viruspc/pull/161)、[#565](https://github.com/VirusPC/edges-brain-viruspc/pull/565)、[#566](https://github.com/VirusPC/edges-brain-viruspc/pull/566)。

**目标：**
逐个判断上述目录的去向（新建 project、并入已有 project、移入 teaching，或保留），并完成迁移。

**完成标准：**
- [ ] 上面列出的每个目录都有一条去向：project、并入已有 project、teaching，或保留，并写明理由。
- [ ] 决定迁走的目录已经迁到目标位置，原路径不再残留一份未登记的副本。
- [ ] 留下的和迁入的材料都出现在对应索引里（笔记、项目或教学），站点能按该去向找到它们。
