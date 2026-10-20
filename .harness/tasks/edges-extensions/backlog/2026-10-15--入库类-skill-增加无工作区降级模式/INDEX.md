---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-14T21:12:11.158Z'
  edges-title: 入库类 skill 增加无工作区降级模式
  edges-tasks-status: backlog
  edges-task-priority: low
name: 入库类_skill_增加无工作区降级模式
description: 聊天窗口没有工作区时，skill 只输出完整 Markdown 和目标路径，交给有工作区的 Agent 入库
---
## 背景

2026-10-14 下午，用户发现 `extensions/skills/` 下的入库类 skill（如 `conversation-to-notes`）在 ChatGPT 网页聊天、YouMind 这类窗口里跑不通：这些窗口没有持久工作区，也没有 git、shell 和 `edges` CLI，入库和开 PR 的步骤做不了。讨论中提出过「skill 降级模式」作为兜底：没有仓库环境时只输出完整 Markdown 和目标路径，由有工作区的 Agent 入库。长期方案 edges connector 已开卡（`.harness/tasks/agent-clients-ux/backlog/2026-10-14--edges-connector自建远程-MCP-让各聊天窗口读写-edges/`），但那张卡明确把降级模式列为非目标、另行处理；笔记 `notes/2026-10-14--skill跨聊天窗口使用与edges-connector/` 的结果里也记着「降级模式尚未加入 skill」。

## 目标

入库类 skill 在没有工作区的窗口里也能产出可直接入库的结果，作为不支持 connector 窗口的兜底。

## 动作

- 梳理哪些 skill 依赖 CLI / git（至少 `conversation-to-notes`、`conversation-to-tasks`）。
- 在这些 skill 里写明环境判断和降级输出格式：完整 Markdown（含 frontmatter）+ 目标路径 + 交给有工作区 Agent 入库的说明。
- 更新对应 CHANGELOG。

## 完成标准

- [ ] 在无工作区的聊天窗口加载 skill，能得到可直接入库的 Markdown 和目标路径。
- [ ] 有工作区的 Agent 拿到该输出，按原流程入库无需改写。
