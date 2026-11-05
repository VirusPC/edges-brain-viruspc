# MiniMax Code agent-core 与 Pi

> MiniMax Code（命令 `mcode`）没有自写 Agent 循环，而是 vendored Pi 的 loop，再在外面套回合外壳与产品能力。本笔记整理它和 Pi Coding Agent 的边界，方便以后定制自己的 coding agent 时对照。

## 背景

在学习 Pi（`earendil-works/pi`）与 Pi Coding Agent 之后，需要弄清市面上以 Pi 为底座的产品具体「多做了什么」。对话里聚焦 MiniMax Code 的 `packages/agent-core`：它是不是直接基于 Pi、相对 Pi Coding Agent 产品壳保留/丢弃了什么、回合与钩子怎样挂上去。

## 主题

弄清 MiniMax Code 的核心（`agent-core` / `PiTurnRunner`）在 Pi Coding Agent / `pi-agent-core` 之上加了哪些层，以及「直接基于 Pi」具体指什么。

- 难点一：同名易混——桌面开源项目 huangbh2020/mcode 也叫 Mcode，但本文对象是 MiniMax 的 `mcode`（`@minimax-ai/code` / `MiniMax-AI/minimax-code`）。
- 难点二：术语不对齐——Pi 的 turn 在 MiniMax 里叫 step；MiniMax 的 turn 是一整次 Agent 运行。
- 难点三：边界不在「有没有用 Pi」，而在「用了 Pi 的哪几包、不用哪几层产品壳」。

## 过程

### 07:55 对照检索

用公开资料检索「mcode / Pi Coding Agent」。两条线同时出现：huangbh2020/mcode（Electron 桌面座舱，多引擎之一接 Pi SDK），以及 MiniMax Code（CLI `mcode`，vendor `pi-mono`）。用户随后问「直接基于 pi 的？」并要详细笔记，按对话语境锁定为 **MiniMax Code**。

### 07:56–07:57 确认底座关系

结论写清：Agent 循环与模型协议层是 vendored 的 `pi-agent-core` / `pi-ai`，没有另写一套 loop；但不是整包 Pi Coding Agent 当产品——丢掉会话壳、扩展系统与官方 TUI，只借零件并套 `PiTurnRunner`。更早路径曾与 OpenCode 有关，当前 CLI 主路径已切到 Pi。

### 07:58 要求落笔记

用户要求「详细写篇笔记」。归属对齐既有学习笔记：个人大脑 `VirusPC/edges-brain-viruspc` 的 Project `2026-10-28--learning`，与既有笔记「Pi 工具包与 Pi Coding Agent」同级。

## 结果

- 本笔记成文并计划入库到 learning Project notes。
- 仍开放：是否对照读官方仓库某一版 `MINIMAX_CHANGES.md` 做补丁清单摘录；是否单独开笔记拆 huangbh2020/mcode（桌面多引擎）以免混淆。

## 所学

### 一句话定位

**Pi 提供机制（agent loop + 统一模型协议 + 若干文件工具实现）；MiniMax 的 `agent-core` 提供回合边界、事件翻译、工具契约与钩子挂载点；Plan / 权限 / 压缩 / 子 Agent 等产品策略在 `agent-runtime` + `agent-modules` + `local-runtime-v2`，不在 core 里重写 loop。**

### 直接基于 Pi：指什么、不指什么

指：

- `third_party/pi-mono` 放入 `agent`、`ai`、`coding-agent`、`tui` 四包源码（解读基准常见为 v0.79.1 一带），与第一方代码一起编译进 `mcode`。
- 真正跑「调模型 → 工具 → 再调模型」的是 `pi-agent-core` 的 `runLoop` / `Agent`。
- 模型侧走 `pi-ai`（统一 provider / `streamSimple` 等）。

不指：

- 不把 `@earendil-works/pi-coding-agent` 的交互产品当外壳用：`AgentSession`、扩展系统、JSONL 会话管理、print/RPC 产品路径基本不用。
- 第一方几乎不 import vendored 的 `pi-tui`；产品 TUI 是另一份 fork（基线常新于 vendor 的 pi-tui）。
- 从 `pi-coding-agent` 主要借零件：`createReadTool` / `createWriteTool` / `createEditTool` / `createBashTool`、`convertToLlm`、部分 compaction 辅助、`AuthStorage` 等；grep/find/ls 等常由自研 ripgrep 路径承担。

补充取舍：也可以像早期那样继续二次开发 OpenCode，或像部分产品只 fork TUI、Agent 自研。MiniMax 选的是 **loop 与协议跟 Pi，会话与策略自建**——为了能打补丁、不跟上游发布节奏绑死，所以 vendor 源码而不是纯 npm 依赖。

### agent-core 加了什么

`packages/agent-core` 规模大约一万行量级，核心是 `PiTurnRunner`。

**回合模型**

- 每次 `runTurn()` 新建：Pi `Agent`、事件桥、串行事件队列、历史游标。
- 可变状态跟本回合走；跨回合要留下的交给 Session 层。
- 注释里常见八步：组装回合状态 → 发 `session.status` running → `newAgent` 注入系统提示/模型/工具/历史 → 装工具与 LLM 钩子 → 订阅事件入队 → 接好取消（宿主 `AbortSignal` → `agent.abort()`）→ `prompt` 或 `continue` 并等空闲 → 排空队列、补历史、写终态。

**术语映射（必记）**

| Pi | MiniMax Code |
| --- | --- |
| turn（`turn_start`…`turn_end`：一次 assistant + 其工具） | **step** |
| 一整次 Agent 运行 | **turn** |
| Session / 产品会话壳 | 自建 Session（SQLite 等），不用 Pi JSONL 外壳 |

**工具契约**

- 宿主侧是 `RuntimeTool`：`def`（模型可见）与 `impl`（执行）分离，带来源标记等。
- `newTools` 转成 Pi 的 `AgentTool`；重名直接失败；可声明 `executionMode`（parallel / sequential），并注入回合上下文与 `toolCallId`。

**流与钩子**

- 在 `streamSimple`（或宿主替换）外包装超时、重试、maxTokens、缓存保留等。
- 宿主钩子挂到 Pi 接缝：`transformContext` / before·after tool / 历史变更 / step 结束等；部分能力依赖对 vendored Pi 的本地补丁（例如 `onToolExecutionStart`、`shouldStopAfterTurn`，见仓库内 `MINIMAX_CHANGES.md`）。

**明确不在 core 里做的事**

- 会话持久化、权限链终裁、Plan/Goal、插件市场语义、子 Agent 任务图：由上层模块与 runtime 装配。
- `agent-runtime`：每回合按 profile 装配扩展贡献的工具、提示、钩子。
- `agent-modules/*`：权限、压缩、失控保护、MCP 披露、技能、后台任务等横切能力。

### 和「桌面 Mcode」的对照（防混）

huangbh2020/mcode：桌面 ADE，**不重写 Agent**，用 Claude Agent SDK / Codex / Pi Coding Agent SDK 当可切换引擎，自己做 IDE 座舱（流式、审批 UI、Plan、Monaco、终端、内嵌浏览器等）。那是「多引擎 GUI」；MiniMax 这条是「单底座 vendored Pi + 自研 harness」。定制自己的 coding agent 时，两条路线都可参考，但机制层更该读 MiniMax 的 `PiTurnRunner` 与 Pi 上游 loop。

### 对定制自己的 agent 的含义

若目标是「基于 Pi 定制、不绑死 Codex」：

1. 先分清要用 **Pi 的哪一层**：只要 `pi-agent-core`+`pi-ai`，还是连 `pi-coding-agent` 的会话/扩展一起用。
2. MiniMax 证明：可以只用 loop + 零件工具，自建 Session/权限/Plan；代价是维护 vendor 补丁与事件翻译。
3. 若只要桌面座舱、引擎可换，huangbh 路线更接近「SDK 消费者」，而不是 fork loop。

## 行动指南

### 主题行动指南

#### 背景

要在 Pi 之上做自己的 coding agent，需要一张清晰的「Pi 提供什么 / 产品层应自己提供什么」地图；MiniMax Code 是公开可对照的完整样例。

#### 核心问题

如何判断一个产品是「包了一层 Pi」还是「重写了 Agent」？自己定制时应跟到哪一层？

#### 核心解决方案

1. 先查它是否调用 `pi-agent-core` 的 `Agent`/`runLoop`（或等价 vendor）；有则 loop 基于 Pi。
2. 再查是否使用 `AgentSession`、Pi 扩展系统、官方 TUI/JSONL：用则偏「Pi 产品定制」；不用则偏「MiniMax 式自建壳」。
3. 列一张表：会话存储、权限、Plan、子 Agent、工具清单来源——逐项标「Pi 默认 / 自建 / 借零件」。
4. 若需打补丁又不想等上游：评估 vendor 源码（MiniMax）vs npm + 上游 PR；当时未比较其它方案时至少记下补丁点。
5. 写笔记或 ADR 时固定术语：Pi turn ≠ 产品 turn。

相关可选项与不做原因：整包用 Pi Coding Agent 扩展系统——上手快，但产品语义受 Pi 扩展模型约束；完全自研 loop——可控但丢统一协议与社区修复；只做多引擎 GUI——不碰 loop，适合座舱产品，不适合要改 harness 语义时。

#### 验收标准

- 能用一段话说明 MiniMax `agent-core` 相对 Pi 多了什么、没多什么。
- 能正确解释 step/turn 映射。
- 能指出从 `pi-coding-agent` 借了哪些零件、丢了哪些产品壳。
- 能区分 MiniMax `mcode` 与 huangbh2020/mcode。

### 细节与其他

#### 若要对照源码

则：以 `MiniMax-AI/minimax-code` 的 `packages/agent-core/src/pi-turn-runner/`、`third_party/pi-mono/MINIMAX_CHANGES.md`、`packages/agent-runtime` 为准；解读文可作索引，以仓库为准。

#### 若笔记要放进个人大脑

则：与 Pi 笔记同放在 `2026-10-28--learning` Project notes 下，互链；不要误写到框架仓 `VirusPC/edges` 根知识树，除非明确要公开框架向沉淀。

#### 若只想快速口头对齐

则：说「直接基于 Pi 的 loop，自建回合与会话；不是整包 Pi CLI」。

## 补充说明

- 原始材料：DIY Coding Agent 会话（约 2026-11-05 07:55–07:58 Asia/Shanghai）；公开解读 [pi 的 Agent 循环与回合执行器](https://daiw.org/manual/minimax-code/pi-agent)、[内置的 pi-mono](https://daiw.org/manual/minimax-code/pi-mono)、[Agent 模块](https://daiw.org/manual/minimax-code/agent-modules)、[仓库全景](https://daiw.org/manual/minimax-code/monorepo-map)；官方 [Harness 技术博文](https://agent.minimax.io/docs/techblog/minimax-code-harness)；上游 [earendil-works/pi](https://github.com/earendil-works/pi)；易混项目 [huangbh2020/mcode](https://github.com/huangbh2020/mcode)。
- 相关笔记：[Pi 工具包与 Pi Coding Agent](../2026-11-04--pi-工具包与-pi-coding-agent/INDEX.md) — 上游 Pi 分层与定制面；本篇接在其后讲「谁在 Pi 上加了产品壳」。
- 解读文基准提交与版本会漂移；细节以当时仓库为准，本笔记抓架构边界而非行号担保。