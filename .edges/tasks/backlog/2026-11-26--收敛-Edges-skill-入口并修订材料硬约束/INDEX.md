---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-25T21:27:50.845Z'
  edges-title: 收敛 Edges skill 入口并修订材料硬约束
  edges-tasks-status: backlog
  edges-task-priority: none
name: 收敛_edges_skill_入口并修订材料硬约束
description: >-
  完成整体 grill 后，把对外 skill 入口收敛为 edges-onboarding、edges-langfuse-agent-tracing
  和日常入口 edges，并把 AGENTS.md 硬约束改为覆盖全部已登记材料类型。
---
**背景：**
2026-11-26 00:44–00:52（Asia/Shanghai），peng cheng 在 Grok Bot 提出把 Edges 对外 skill 入口收敛，并马上开始整体 grill。对话里已经对齐的方向如下，实现尚未改。

- 对外只保留两个一次性入口，其余日常能力并进 `edges`：
  - `edges-onboarding`：首次接入，后续重装、迁移也能用；
  - `edges-langfuse-agent-tracing`：接通可观测性，具体平台适配按需读取；
  - `edges`：日常使用，统一包含记忆、笔记、任务、项目、例程等能力。
- 其余能力并入 `edges` 的按需读取文档，不再各占一个 skill，也不把正文全塞进一份 SKILL.md。
- 入口变少，自动检索和沉淀不能变弱。现有 AGENTS 点名 `edges-memory-ask` / `remember`，迁移时要改成指向 `edges` 内的对应流程，否则旧调用约定会断。
- AGENTS.md 硬约束目前只提到 Memory，应覆盖已登记的各类材料（记忆、笔记、任务、项目、技能、例程等）。检索按相关性，不是每次把所有类型全读一遍；需要沉淀时按材料性质写入对应类型并维护入口索引。
- 第一轮整体 grill 已发出，四个问题分别是：合并范围、材料如何发现、何时必须检索、沉淀的授权边界。推荐项已预选，等用户答复。旧名称兼容和批量迁移留到这些边界确定后再问。
- 查到现有 ADR 明确保留 ask/remember 独立，这次需要正式修订旧决策，不只是合并文件。用户答案确认后，应先落 ADR 和术语，再进入下一轮；目前未改实现。

**目标：**
完成这次整体 grill，按确认后的决定修订相关 ADR 与术语，把对外 skill 入口收敛为 `edges-onboarding`、`edges-langfuse-agent-tracing` 和日常入口 `edges`，并把 AGENTS.md 硬约束改为覆盖全部已登记材料类型，同时保持自动检索与沉淀不弱于现在。

**动作：**
- 等用户回复第一轮四个问题。
- 先修订旧 ADR 和术语，再进入后续轮次；边界确定前不改实现、不批量迁移。
