---
name: cross_agent_client_messaging
description: 共享记忆与工作区不够；跨不同 Agent 客户端还要独立通信层。现用 GitHub 仓当通道会强制绑工作区且延迟高，需另开方案。
metadata:
  edges-type: task
  edges-title: 跨 Agent 客户端通信层（解绑工作区）
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-task-priority: none
  edges-updated-at: "2026-09-25T00:56:18.693Z"
---

结论（idea）：在「共享记忆」「共同工作空间」之外，为不同 Agent 客户端补一层**通信**（消息/事件/唤醒），且通信通道不强制绑定某一 git 工作区；目标延迟低于「靠推仓/PR 传话」。

**事实背景:**
- 来源：peng cheng 2026-09-25 口述记 todo（经任务记录员落盘）。
- 用户判断：多客户端协作除共享记忆、共同工作空间外，还需要某种通信方式。
- 对现状的质疑（用户原意，记为待验证假设，非已测 SLA）：以 GitHub 仓库当通信方式会**强制绑定工作区**，且**沟通延迟较高**（push/Actions/轮询/等人拉仓）。
- 相关但勿合并：
  - `agent-clients-ux` backlog「跨设备同步桌面宠物与留言板」（产品形态上的轻量留言，不是通用 agent 间通信层）
  - `agent-clients-ux` backlog「review页结果回传Agent客户端」
  - `agent-clients-ux` backlog「edges 站点统一 agent 助手模块」
  - `agent-clients-ux` backlog「Electron 桌面端作为 edges 操作台」
- 本卡范围是架构能力（通信原语与通道选型），不是实现某一具体 UI。

**Why:**
共享记忆与工作区解决「共同看见什么」；协作还要「谁何时跟谁说什么」。若通信只能经 git 工作区，客户端就被绑在同一仓模型上，且延迟像异步批处理而不像会话。

**How to apply:**
- 出栈前 grill-with-docs：通信与记忆/工作区三层边界；通道候选（自建消息、现有 IM、平台原生 agent message、websocket 等）；是否允许跨工作区寻址；延迟与可靠性目标；与 tasks Issue/Run、SendToAgent 类能力的关系。
- 明确「GitHub 仍可作审计/落盘，但不应当唯一实时通道」是否成立。
- 保持 backlog，不指派，直至用户出栈。
