---
name: CrewAI概念与协作边界
description: >-
  用 teach 流程学 CrewAI：先建概念模型，再对照 LangChain / Claude Code Agent
  Teams，理清声明式小队与开放讨论的边界。
---
# 2026-10-11--CrewAI概念与协作边界

> 用 teach 流程学 CrewAI：先建概念模型，再对照 LangChain / Claude Code Agent Teams，理清声明式小队与开放讨论的边界。

## 背景

peng cheng 用 teach skill 学 CrewAI，Mission 定为**先概念、暂不写代码**。教学工作区在 `teach-crewai`，已写第一课（Agent / Task / Crew / Flow）并发布 Artifacts。随后围绕 `context`、纯 Flow、`allow_delegation`、与 LangChain / Claude Code Agent Teams 的差异连问，需要把结论沉淀成笔记。

## 主题

建立 CrewAI 的核心概念图，并判断它适不适合「多 Agent 自由讨论协商出结论」这类目标。

- 难点一：`context` 是 Task 依赖还是「输出接口」依赖；多种上游都能产出同类结果时如何兼容。
- 难点二：Crew / Flow / Agent Teams（Claude Code）三者边界容易混。
- 难点三：`allow_delegation` 全开是否等于开放讨论，以及如何设结束条件。

## 过程

### 教学开场与 Mission

调用 teach，创建 `/workspace/teach-crewai`。用户选择「先弄清概念，暂不写代码」。写入 `MISSION.md`：成功标准是能口述 Agent / Task / Crew / Process / Flow 关系，能读官方示例叙述执行顺序，能说何时用 Crew vs Flow。

### 第一课与 Artifacts

按官方文档（约 v1.15.27）写 `lessons/0001-agent-task-crew-flow.html`、术语表、共享样式与测验；发布 Artifacts。用户要代码体感后，补上官方 JSONC / Flow 片段并重发。

### Task 依赖与「依赖输出」

用户起初觉得课里没声明依赖；实际依赖是下游 Task 的 `"context": ["research_task"]`。确认：这就是简单的任务依赖声明。进一步问：若只依赖某种输出、多个 Task 都能产该输出怎么办？官方 `context` 只能挂 Task，不能挂输出类型；形状可用 `output_pydantic` / `output_json` 对齐，真正按输出接线需抬到 Flow `state`。用户概括：Crew 本质是声明 Task Workflow；Crew 像 subflow；Flow 也可不嵌 Crew 直接串步骤——均确认，并给出官方纯 Flow 示例（城市 → 趣闻）。

### 协作与 Agent Teams

用户问是否支持 Agent Teams（指 Claude Code：多独立会话、lead、共享任务板、队友点对点消息）。CrewAI 无等概念是 Crew；`allow_delegation` 为同 Crew 内委派/提问；无公开路线图承诺对齐 Claude Code Agent Teams。开放讨论需在 Flow 自建。用户感觉与 LangChain 本质接近；差异主要在声明式 Crew 模板 vs 通用状态图。

### allow_delegation 与结束

`allow_delegation` 是**允许分活**（及提问），开在会甩活的 Agent 上；接活的是队友。全开可能破坏 sequential 观感，且易 Delegation Loop。官方推荐经理开、专家关。结束靠：委派结构 + `max_iter` + goal/Task 完成标准文案 + 可选 guardrail / Flow 收口——没有单独「协商收敛系数」。

## 结果

- 教学工作区与第一课（含代码片段、测验、术语表）已就绪；Artifacts 曾发布（TTL 有限期）。
- Mission 仍为概念优先；用户对「无原生开放讨论 / Agent Teams」边界已对齐。
- 本笔记入库 edges `knowledge/notes/`（公开，已脱敏）。
- 未闭环：是否改 Mission 纳入「评估是否用于 edges 栈」；是否开第二课精读 Quickstart `main.py` / `crew.jsonc`。

## 所学

- **CrewAI 分层**：Agent（谁）→ Task（做什么 + `context` 读谁）→ Crew（小队 + Process）→ Flow（应用编排 + state）。Crew ≈ 固定 Task 图的子流程。
- **`context`**：Task→Task 依赖；sequential 默认可接力，显式 `context` 可指多个非相邻上游。不是对输出 schema 编程。
- **对输出编程**：结构化输出统一形状；跨路径归一化进 Flow `state`。
- **与 LangChain/LangGraph**：同代编排范式；CrewAI 优势在角色化小队 + JSONC 声明；LangGraph 优势在通用细粒度状态图。
- **与 Claude Code Agent Teams**：后者是多会话 mesh；CrewAI 无对等能力，公开重心偏生产 Flow / A2A / 可观测，非开放协商。
- **`allow_delegation`**：同 Crew 内分活/提问；全开≠圆桌；结束用结构 + `max_iter` + 完成标准，非单一系数。

## 行动指南

### 主题行动指南

#### 背景

在「要不要用 CrewAI、怎么教/怎么选」时，需要稳定心智模型，避免把 Task 流水线误当成 Agent Teams。

#### 核心问题

如何用官方概念区分：任务依赖、小队编排、应用 Flow、以及开放多会话协作。

#### 核心解决方案

1. 先画四层：Agent / Task(+context) / Crew(+Process) / Flow(+state)。
2. 需要「依赖某种产物」时：Crew 内挂 Task + 统一 schema；跨路径写入 Flow state。
3. 需要「自由讨论出共识」时：不默认选 CrewAI 原生能力；自建 Flow 环，或换产品（如 Claude Code Agent Teams）。
4. 用 `allow_delegation` 时：默认经理开、专家关；配 `max_iter` 与明确完成标准。
5. 与 LangGraph 选型：要声明式小队脚手架选 CrewAI；要细图控制选 LangGraph。

可选方案与为何不做：

- **只用 Crew、不用 Flow**：适合单段小队任务；跨步骤状态与分支弱，生产官方更推 Flow。
- **全员 `allow_delegation=True` 当 Agent Teams**：表面像互聊，实为委派环风险高，且无独立会话/共享任务板；官方也不推荐。
- **指望 `context` 挂输出类型**：官方不支持；应抬 state 或改 Task 图。

#### 验收标准

- [ ] 能口述四层关系及 `context` 含义
- [ ] 能说明「依赖输出」时的两条兼容路径
- [ ] 能对比 CrewAI vs LangGraph vs Claude Code Agent Teams 各一句话
- [ ] 能说出委派结束的三件套（结构 / max_iter / 完成标准）

### 细节与其他

#### 若要续学官方代码骨架

则下一课可读 [Quickstart](https://docs.crewai.com/en/quickstart) 的 `main.py` + `crew.jsonc`，对照第一课图讲解数据流；仍可概念优先、不强制本机安装。

#### 若要打开已发布课

则使用 Artifacts 域名 `edges.viruspc.tech` 下对应 artifact id（TTL 到期需重发）；本地路径 `/workspace/teach-crewai/`。

#### 若公开笔记需脱敏

则不写 Tailscale `100.x`、token、本机私有路径以外的可识别凭证；教学目录路径可保留为工作区相对说明。

## 补充说明

### 关键官方链接

- [Introduction](https://docs.crewai.com/en/introduction)
- [Tasks（含 context / 结构化输出）](https://docs.crewai.com/en/concepts/tasks)
- [Collaboration（allow_delegation）](https://docs.crewai.com/en/concepts/collaboration)
- [Flows](https://docs.crewai.com/en/concepts/flows)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)

### 原始材料引用

- 助手：Agent Memory 专家（Grok Bot）；会话约 2026-10-11（Asia/Shanghai）
- 教学工作区：`/workspace/teach-crewai/`（`MISSION.md`、`lessons/0001-agent-task-crew-flow.html`、`RESOURCES.md`）
- 对话主题：teach CrewAI → Artifacts → context/输出依赖 → Flow 无 Crew → Agent Teams / LangChain 对比 → allow_delegation 结束条件
