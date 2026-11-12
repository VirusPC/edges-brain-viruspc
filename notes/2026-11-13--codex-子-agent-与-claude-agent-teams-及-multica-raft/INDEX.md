# Codex 子 agent 与 Claude Agent Teams 及 Multica Raft

## 背景

2026-11-12，用户在助手「通用」里连续问了三件事：Codex 是否支持 Agent Teams、Agent Teams 有什么优势，以及 Multica 和 Raft 这类多 agent 架构有什么优势。助手查了当时的 Codex 官方文档，并和 Claude Code 的 Agent Teams、以及 Multica / Raft 对照着讲。下面以对话里已经写出的区分为准；文档以后若改，以当时文档为准。

## 主题

这篇记下三种并不相同的协作结构：Codex 的子 agent 是主 agent 居中调度的短时帮手；Claude Code 的 Agent Teams 是一次会话里可互相沟通、共享任务清单的同事；Multica 和 Raft 则把 agent 当成团队里长期在的成员。

- 难点一：用户问的是「Codex 支持 Agent Teams 么」。答案是支持子 agent，但不是 Claude Code 那种 Agent Teams，不能把「有多 agent」写成同一种能力。
- 难点二：Agent Teams 的优势和代价要一起记，避免只写「更强」而不写适用边界。
- 难点三：Multica 和 Raft 与前两者不是同一层：前两者是一次会话里拉起帮手，后两者是长期在的团队成员，记忆和协作入口也不同。

## 过程

### 16:00 Codex 有子 agent，但不是 Agent Teams

Codex 当时默认开着 subagents：主 agent 可以并行开出几个子 agent，给运行中的子 agent 追加指令、等它们的结果、停掉它们，最后由主 agent 汇总成一个回复。内置三种角色：default、worker、explorer。也可以在 `~/.codex/agents/` 或项目里的 `.codex/agents/` 下用 TOML 定义自己的角色，每个可以配不同的模型和指令。CLI 里用 `/agent` 在各个子 agent 的会话之间切换。它只在明确要求时才会开子 agent，例如「开两个 agent 并行做」，或项目和 skill 的指令里要求这么做。

它跟 Claude Code 的 Agent Teams 差在协作结构。Codex 是主 agent 居中调度：子 agent 只跟主 agent 交流。对话里写明：助手没在文档里看到同事之间直接发消息，或共享一个任务看板自己认领。另外，子 agent 和主 agent 共用同一个工作区，改同一批文件时得在提示里先说清楚怎么分工。

参考在对话里指向 Codex Subagents 文档，以及 API 侧的 Multi-agent 指南。

### 16:04 Agent Teams 的优势和代价

Agent Teams 比主 agent 调度子 agent 强的地方，在于同事之间可以直接协作，不用每件事都经过主 agent 转一手。对话里列出的优势是：

- 同事之间直接沟通。例如前端发现接口不对，可以直接找后端，不用等主 agent 中转，信息不会在转述时走样，主 agent 的上下文也不会被这些来回撑爆。
- 共享任务清单，自己认领。做完一项就自己领下一项，有依赖的任务会等前置任务完成。主 agent 不用一个个派活，也不易成为卡住整体进度的那一环。
- 适合需要互相质疑的事。例如让几个 agent 带着不同假设各查一个 bug，再互相反驳，或让一个写、一个专门挑刺。子 agent 只能各自把结果交回去，做不到这种交锋。
- 能做长时间的并行工作。每个同事都是一个完整的独立会话，有自己的上下文，可以持续干很久，人也能直接插话指挥其中某一个。

代价也明显：token 消耗是几倍，协调本身有开销，改同一批文件容易互相冲突。对话援引 Anthropic 官方文档的建议是：任务能拆成边界清楚、又需要讨论的几块（跨层功能、多假设排查、多视角评审）时再用 Teams；只是并行查东西、把结果拿回来就够的，用子 agent 更省。

### 16:05 Multica 和 Raft 是长期团队，不是一次会话里的帮手

Multica 和 Raft 是一类东西：它们把 agent 当成团队里长期在的成员。Agent Teams 和 Codex 子 agent 只是一次会话里临时拉起几个帮手。

对话里写下的共同优势：

- 身份和上下文能持久。agent 有名字、角色和历史记录，换了会话也不会全忘，不用每次重新交代背景。
- 人和 agent 在同一个地方协作。都是看板、issue 或频道、线程，派活、汇报进度、喊卡点、交回审核都在一处，整个过程能追溯。
- 能混用不同的 agent。对话举了 Claude Code、Codex、Cursor、Kimi，跑在自己的机器上，用自己的订阅，代码不出本机。
- 不用人一直盯着。有定时任务、提醒，也能被 @ 叫醒。
- 人始终把关。产出最后都落到 PR 或任务上等人审。

两家的侧重点不同：

- Multica 是以 issue 为中心的，像给 agent 配了个 Jira。一个 issue 从需求、执行过程、决策一直连到最终的 diff 和 PR。一个 squad 里由 leader agent 决定下一步交给谁。解决过的问题可以沉淀成 skill，所有 agent 都能复用。
- Raft 是以对话为中心的，像给 agent 配了个 Slack。同事之间在频道里直接交接、互相评审，可以跨多台机器、混用不同模型。每个 agent 在自己机器上有一份 `MEMORY.md`。新人加入可以直接问之前做过这个项目的 agent 来拿上下文。它们还另做了一个 Stamp，让 agent 用自己的身份提 PR。

两家的记忆都停在单个 agent 或单个 issue 这一层：Raft 是每个 agent 自己的笔记，Multica 是 skill 和 issue 上下文。助手在它们的文档里没看到跨 agent、跨仓的经验自动汇总、经人审后晋升为团队规范的机制。对话把这一点对照到「组织级研发提效」仍然空着的那一层，并提到 open-grokbot 用登记表加房间叫醒同事，形态更接近 Raft。

## 结果

三种结构的区分已经收成这篇笔记。没有因此改 Codex、Claude Code 或 Edges 的配置，也没有新开任务卡。文档时效以 2026-11-12 的查证为准。

## 所学

- 「支持多 agent」要先问是哪一种结构。Codex 默认的是主 agent 调度子 agent，不是 Claude Code 那种可互相沟通、共享任务清单的 Agent Teams。
- 子 agent 适合并行把结果拿回来；Agent Teams 适合边界清楚又需要互相讨论或质疑的任务。Teams 的 token、协调和文件冲突代价更高。
- Multica 和 Raft 解决的是长期团队：身份和上下文能跨会话保留，人和 agent 在同一处协作，并可混用不同 agent。它们不是一次会话里临时拉起的帮手。
- Multica 以 issue 为中心，Raft 以对话为中心。两者的记忆都还停在单个 agent 或单个 issue，对话里没有看到跨 agent、跨仓、经人审后晋升为团队规范的机制。
- 子 agent 与主 agent 共用工作区时，改同一批文件要先说清分工。助手当时没在 Codex 文档里看到同事间直连或共享看板。

## 行动指南

### 主题行动指南

#### 背景

要在 Codex、Claude Code 或自建团队里选多 agent 方案时，需要先对上协作结构，而不是只问「支不支持多 agent」。

#### 核心问题

Codex 子 agent、Claude Agent Teams、Multica / Raft 各自是什么结构，以及什么时候用哪一种。

#### 核心解决方案

1. 先分类再选型。Codex 子 agent：主 agent 居中调度，子 agent 只跟主 agent 交流，适合并行探索并把压缩后的结果交回。Claude Agent Teams：同事可直连、共享任务清单、可互相质疑，适合边界清楚又需要讨论的任务。Multica / Raft：长期在的团队成员，身份和上下文可跨会话保留。可选项是把 Codex 子 agent 直接叫做 Agent Teams：对话已说明两者协作结构不同。
2. 只用并行查东西、把结果拿回来时，用子 agent 更省。要用 Teams 时，同时接受更高的 token、协调开销，以及共用或邻近文件上的冲突风险。
3. 需要跨会话的身份、统一的派活和审核入口、混用不同 agent 时，再看 Multica（issue 中心）或 Raft（对话中心）。不要指望它们已经带有跨 agent、跨仓、经人审后晋升规范的机制；对话里没在文档中看到这一层。
4. 在 Codex 里启用子 agent 前，确认这是明确要求或 skill / 项目指令要求的；自定义角色放在 `~/.codex/agents/` 或项目 `.codex/agents/` 的 TOML。共用工作区时，先在提示里写清文件分工。

#### 验收标准

- 能用一句话说清三种结构的差别，而不是把它们都叫做「多 agent」。
- 能说出 Agent Teams 相对子 agent 的四类优势，以及 token、协调、文件冲突这三项代价。
- 能区分 Multica 的 issue 中心和 Raft 的对话中心，并写明两者记忆都停在单个 agent 或单个 issue。
- 笔记标明查证日期 2026-11-12，并写明以届时文档为准。

### 细节与其他

#### 若只是要在 Codex 里开两个帮手并行做事

则用默认就开着的 subagents，必要时 `/agent` 切换会话，或在 agents 目录用 TOML 自定义角色。不要为此改成 Agent Teams 的协作预期。

#### 若要把 open-grokbot 的同事模型和这些架构对照

则对话只写到：用登记表加房间叫醒同事，形态更接近 Raft。不把 open-grokbot 写成已经具备 Raft 的频道、跨机或 Stamp 能力。

## 补充说明

- 原始材料：2026-11-12，助手「通用」。查证材料是当时的 Codex 官方文档（Subagents 文档、API 侧 Multi-agent 指南）以及对话中对 Agent Teams、Multica、Raft 的对照说明。查证日期 2026-11-12。版本会变，以届时文档为准。原始对话按助手落在本机 `/workspace/daily-scan/2026-11-13/`（按时间正序的 jsonl，永久保留，不入库）。本篇不摘录对话原文。
- 相关笔记：[Claude 多 Agent 系统设计：Sub-Agents vs Agent Teams](../Claude%20多%20Agent%20系统设计：Sub-Agents%20vs%20Agent%20Teams/INDEX.md) — 专讲 Claude 的两种范式，不含 Codex 子 agent，也不含 Multica / Raft。
- 助手写明：Codex 文档里没有看到子 agent 之间直接发消息或共享任务看板。这一条是「当时没查到」，不是已证实的永久限制。
