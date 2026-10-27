---
name: electron_桌面端作为_edges_操作台
description: 缺少统一的桌面操作台来操作 edges（看板/记忆/审阅等仍散落在聊天与临时 HTML）；用 Electron 做桌面客户端，作为 edges 的操作台。
metadata:
  edges-type: task
  edges-title: Electron 桌面端作为 edges 操作台
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-updated-at: '2026-10-11T10:22:42.090Z'
---

结论（idea）：做一个 Electron 桌面应用，作为操作 edges 的统一工作台（任务看板、记忆、审阅/artifacts、后续可接 CLI/本地服务）。

**事实背景:**
- 用户 peng cheng 2026-09-20：开发一个 Electron 桌面端，作为 edges 的操作台。（「这个土豆」按口语记需求，不指派具体人；仓内无名为土豆的助手。）
- 看板无已有「Electron 操作台」卡（2026-09-20 文件名检索）；相近但不同：本地 memory 可视化、数据与视图分离本地 HTML、review 页回传 Agent 客户端、评估 Agent Plugins、自建 artifacts 托管——都是客户端/预览碎片，不是统一 Electron 操作台。
- 现行主交互仍偏聊天客户端 + CLI/Skill；审阅页依赖本机或临时托管 URL。

**Why:**
看板、记忆、审阅仍散落在聊天与临时 HTML，没有统一桌面入口，后续能力会继续碎片化；需要一个 Electron 客户端把这些操作面收成工作台。

**How to apply:**
- grill：信息架构（哪些面先进桌面）、与现有 agent-clients-ux 卡边界、是否包本地 edges CLI、鉴权与多仓、和 Grok Bot/Cursor 的分工。
- 勿并卡：仅 HTML 本地视图、仅 artifacts 托管、仅 review 回传。
- 未指派；派发默认 grill-with-docs。
