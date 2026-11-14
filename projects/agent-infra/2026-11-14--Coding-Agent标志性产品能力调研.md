# 近六个月 Coding Agent 标志性产品能力补充调研

## 结论摘要

把 **2026-05-14 至 2026-11-14** 这半年 Coding Agent 产品的演进放在一起看，最重要的变化已经不是“哪个模型更会写代码”，而是 **Agent Harness 正在成为新的竞争核心**：谁能更可靠地保持目标、跨 context 延续工作、并行调度多个执行单元、隔离工作区、自动验证、被事件重新唤醒、在崩溃后恢复，谁就更接近真正的“软件工程执行系统”。Cursor 的 `/goal`、Subscriptions 与 Projects，Amp 的 Orbs / Agent-to-Agent / Automations / Spaces，Google Antigravity 2.0 的多 Agent Manager，Factory Missions，以及 pi 的 `@earendil-works/pi-durable` 都集中指向这个方向。citeturn497160search5turn497160search6turn516578search4turn516578search5turn516578search3turn850364search2turn281173search0turn941014search0

第二条明显趋势是 **上下文管理正在从“扩大 context window”转向“状态工程”**。Amp 选择自动 compaction；Claude Code、GitHub Copilot CLI、Cline、Kimi Code CLI 都提供某种 compaction；Augment 把重点放在检索式 Context Engine；pi 则同时提供树状 session、compaction、durable document/task state；这比单纯增加 token window 更值得借鉴，因为长任务真正的问题是“什么状态需要长期保存、什么信息只在当前 reasoning window 中存在”。citeturn516578search6turn375864search4turn818670search0turn731008search4turn281173search3turn488304search0turn283990search0

第三条是 **Agent 正从同步 CLI 会话升级成 event-driven / async worker**。Cursor Cloud Agent 可以订阅 PR、Slack 和 schedule 并在事件发生时醒来；Amp Automation 能让同一 thread 在未来继续执行；Codex Cloud/App 支持 background cloud task 和 automation；Jules 一直以异步 VM agent 为核心；Devin、Factory、Antigravity 都把后台执行和并发 agent 提到产品一级。这个方向比“再做一个 chat UI”重要得多。citeturn497160search5turn516578search5turn497160search1turn814524search3turn494145search7turn516578search8turn108035search0turn850364search2

第四条是 **Agent Skills / Hooks / Subagents 正逐渐标准化为 Harness 的三个基础扩展面**。Claude Code、GitHub Copilot、Gemini/Antigravity、Qwen Code、Amp、pi 都已有相近概念；GitHub 甚至明确推动 Agent Skills 跨 Claude Code、Cursor、Copilot 等客户端复用。真正值得积累的资产因此不再是某个产品的 prompt，而是可版本管理的 **Skill + Hook + Agent definition + verification policy**。citeturn814524search0turn494145search4turn375864search5turn375864search10turn731008search1turn516578search6turn488304search3

如果只选这半年最值得研究的产品级创新，我会排为：**pi Durable、Cursor Goal/Subscriptions/Projects、Amp Orbs/Agent-to-Agent/Automations/Spaces、Antigravity 2.0、Factory Missions、Codex 多 Agent+Automations、Augment Context Engine MCP、GitHub Copilot 的跨客户端 Skills/Hooks 体系**。它们代表的是 Harness 架构变化，而不是 UI 功能增量。citeturn941014search0turn497160search5turn497160search6turn516578search3turn516578search4turn516578search5turn850364search2turn281173search0turn497160search1turn281173search4turn375864search5

## pi durable 专项核验

你提到的 **“pi durable”确实存在，而且现在已经是正式的包名/技术名，不是社区口语误传**。当前官方仓库已从早期 `badlogic/pi-mono` 演进到 `earendil-works/pi`；对应包为 **`@earendil-works/pi-durable`**，官方描述是 “Durable conversation, task, and document runtime for Pi”，关键词直接包含 `durable-execution`。citeturn283990search6turn996289search1

最关键的区别是：它并不只是“把聊天记录保存到磁盘”。官方定义是 **durable agent harness**：conversation、model turn、tool call 和自定义状态在暴露结果前先 commit 到 storage；如果进程在执行中死亡，重新打开 storage 后可以从已经持久化的任务状态继续执行。一个执行中的 model request 如果进程死亡会被视为失败尝试并重试，而不是假设它成功。citeturn996289search5turn941014search0

其核心抽象值得直接抄到自己的 Agent Runtime 设计里：`Conversation` 是逻辑会话；`Entry` 是不可变 transcript；`Commit` 是原子事务；`Document` 保存结构化运行状态；`Task` 是**每一步都 checkpoint 的 durable state machine**；`Submission` 表示一次输入；generation 与 tool call 自身也是 task。换句话说，它把传统 Agent loop：

`LLM → tool → LLM → tool`

重新建模成了：

`durable task graph + persisted state transitions`。citeturn283990search0

持久层目前支持 memory、IndexedDB、SQLite、JSONL 和 Cloudflare Durable Object SQLite；SQLite 使用 WAL，JSONL 可选 `fsync`。`Harness.open()` 后调用 `resume()` 可以恢复上一次未完成任务；`requestId` 提供 submission 级幂等，使调用方在进程重启后重复提交同一 request 时得到原 submission，而不是重复执行。citeturn941014search0

从时间线上看，2026 年夏季仓库仍在推进 “harness v2” 和 SQLite/session backend；到 **2026-10-01 的 1.0.0**，durable runtime 被从 `pi-agent-core` 中拆出并明确要求使用独立的 `@earendil-works/pi-durable`；当前官方 package 已到 **1.5.2**。这意味着你听到“pi durable”大概率对应的就是这套 2026 年下半年成熟起来的新 runtime。citeturn941014search6turn941014search5turn996289search0turn996289search1

它现在仍然被官方标为 **Experimental**；API 可以在 release 间变化。并且它与经典 `pi-coding-agent AgentSession` 还没有完全 feature parity：2026-10 的官方 issue 明确指出 coding-agent extensions、compaction hooks、动态 tool loadout 等能力还不能无缝运行在 Durable Harness 上。也就是说，当前它更像 **Agent Runtime SDK / infrastructure primitive**，而不是普通用户日常运行 `pi` CLI 时自动享受到的“durable mode”。citeturn996289search3turn996289search5

Pi 还有另一个非常值得关注、但与 durable 不同的能力：**`codemode`**。模型写 JavaScript，在 QuickJS sandbox 中调用多个工具；内部 nested tool calls 不进入 LLM context，只有脚本最终输出进入模型，因此可以并行调用工具、过滤大量结果、减少 tool transcript token。这个机制非常接近你原调研里 PTC/Programmatic Tool Calling 类思想的工程实现，而且是一个很好的“工具调用压缩层”参考。citeturn283990search1turn283990search3turn283990search4

所以准确地说：

> **pi durable = durable execution/runtime；pi codemode = programmatic tool orchestration/context filtering。两者是两条不同但高度互补的 Agent Harness 技术线。**

## 产品 × 标志性特性矩阵

下表只把真正有辨识度的能力列为 signature feature。Skills、MCP、Plan Mode 这种已经高度通用的功能，除非某产品做出了明显不同的机制，否则不单独算“招牌”。

| 产品 | 最具辨识度能力 | 核心机制 / 与同类区别 | 时间证据 |
|---|---|---|---|
| **pi / pi-mono** | **`@earendil-works/pi-durable`**, `codemode`, tree sessions | durable task state machine；事务式 state；crash resume；QuickJS 中 programmatic tool calls，只把最终结果送回 LLM | Durable 1.0.0 **2026-10-01**；当前 1.5.2。citeturn996289search0turn996289search1turn283990search4 |
| **Cursor** | **`/goal`**, Subscriptions, Projects, `/in-cloud` | Goal 长期保持；PR/Slack/schedule event wake-up；Projects coordinator 可长期管理大量 cloud agents | `/goal`、Subscriptions **2026-08-19**；Projects **2026-09-10**；Cloud subagents **2026-06-17**。citeturn497160search4turn497160search5turn497160search6 |
| **Amp** | **Orbs**, Agent-to-Agent, Automations, Spaces, compaction-first | thread→remote machine；agent 可创建另一个 thread/agent；同 thread 定时 wake；Space 本身是 agent coordinator | Rebuilt **2026-05-06**；Orbs **06-30**；Spaces **11-06**。citeturn516578search6turn516578search7turn516578search3 |
| **Google Antigravity** | **Manager Surface / Antigravity 2.0**, Managed Agents | desktop manager 管多个异步 agent；dynamic subagents；scheduled tasks；同一 harness 暴露为 CLI/SDK/API managed agent | Antigravity 2.0 **2026-05-19**。citeturn850364search2turn850364search4 |
| **Factory Droid** | **Missions / Mission Control** | 先结构化成 milestones/features/skills，再由 orchestration layer 管 workers 与 validation；面向几十到数百 feature 的长任务 | Factory 2.0 **2026-06-15**；Missions 为当前官方核心能力。citeturn281173search2turn281173search0 |
| **OpenAI Codex** | **multi-agent Worktrees**, Cloud Tasks, Automations, Memory | 每 agent 独立 worktree/cloud workspace；后台任务电脑休眠仍可运行；automation 可复用旧 thread 并未来 wake | Codex App 历史始于 **2026-02-02**；当前官方已加入 multi-agent/worktrees/automation/memory。citeturn814524search5turn814524search3turn814524search4turn497160search1 |
| **GitHub Copilot** | **cross-surface Agent Skills**, Coding Agent, repo memory | Skill 可跨 coding agent、CLI、VS Code；`.claude/skills` 也可被 Copilot 识别；coding agent 云端 issue→PR | Skills 历史 **2025-12-18**；Code Review Skills+MCP GA **2026-07-29**。citeturn375864search3turn375864search2turn375864search5 |
| **Claude Code** | **Hooks + Skills + Custom Subagents + Checkpointing** | lifecycle hooks 可阻止 agent stop/tool；skill 按需加载；subagent 独立 context；每 prompt 自动 checkpoint `/rewind` | 大多是历史能力；2026 中期官方继续系统化 Skills/Hooks/Subagents 的组合范式。citeturn814524search0turn814524search1turn814524search2 |
| **Gemini CLI** | **Hooks / isolated Subagents / Extensions** | subagent 有独立 context、tool/MCP/system prompt；extension 可整体打包 MCP+commands+GEMINI.md+hooks | Subagents **2026-04-15**；随后 Google 在 **2026-05-19** 引导消费用户迁移 Antigravity CLI。citeturn375864search6turn494145search6turn850364search6 |
| **Google Jules** | **async VM agent / Scheduled Tasks** | clone repo→remote VM→后台执行；可同时派多个 bug；GitHub branch/PR 回传 | 异步能力历史；Jules CLI tools **2025-10-02**，后加入 scheduled/proactive tasks。citeturn494145search8turn375864search11 |
| **OpenCode** | **session ↔ worktree primitives**, scripted worktree runs | agent 自己可创建 worktree、移动 session；CLI 可 `opencode run -w` 直接把 scripted run 放进 worktree | `run -w` **2026-11-06**。citeturn335044search4turn335044search5 |
| **Qwen Code** | **Fork Subagent + background continuation + external-agent executor** | fork 可继承父 context；背景 agent 完成后还能 `send_message` 继续；还能把 Claude Code/Codex 当外部 agent executor | 当前 2026 官方文档已提供完整机制；具体首次发布日期未在文档页标明。citeturn731008search1 |
| **Kimi Code CLI** | **persistent subagent runtime state** | resume 不只恢复 chat，还恢复 approval、plan mode、subagent instances/context、additional dirs | 旧 Kimi CLI **2026-09-21** 停止维护并迁往 Kimi Code CLI。citeturn731008search3turn731008search4turn731008search6 |
| **Kilo Code** | **Agent Manager + Multi-Version Mode + Git snapshots** | 多 worktree 并行 agent；同 prompt 最多并行不同实现；独立 Git snapshot repo 做可逆状态 | snapshot 重构文档于 2026-04；当前 Agent Manager 为现行能力。citeturn818670search3turn818670search4turn818670search5 |
| **Cline** | **Task as persisted execution unit + Git checkpoints** | task 记录 conversation、commands、decisions、cost；可中断/恢复；Git-based checkpoints；Auto-Compact | 当前官方 Task 模型；无明确近 6 月首次发布日期。citeturn818670search0turn818670search1 |
| **Aider** | **Repo Map + Architect/Editor split** | graph/tree-sitter 风格 repo map 提供压缩代码结构；architect 与 editor 两次模型调用分离 reasoning 与 edit | 属历史经典特性，并非近六个月新发布。citeturn335044search6turn335044search7turn335044search8 |
| **Goose** | **Recipes + MCP/ACP interoperability** | workflow 用 portable YAML；MCP 深度集成；同时可作为 ACP server 并把 Claude Code/Codex 当 provider | 当前官方能力，近期发布日期未在主页标明。citeturn818670search7 |
| **Augment Code** | **Context Engine / Context Engine MCP** | semantic index + ranking + context compression；可作为 MCP 给其他 coding agent 使用 | Context Engine MCP **2026-02-06**，页面更新 **2026-06-18**；相关资产 **2026-10-08** 宣布加入 Harness。citeturn281173search4turn281173search5 |
| **Devin** | **Cloud parallel agents + automations + Wiki** | laptop 关闭后继续；任务拆给 parallel cloud agents；事件/定时 automation；code map/wiki 做长期代码库理解 | 当前产品官方能力，未找到明确近六个月首次发布日期。citeturn516578search8 |
| **TRAE / SOLO** | **SOLO workspace / Code + MTC** | 同项目 workspace 横跨代码、文档、数据与文件资产；Skills/Commands/Memories/Rules 统一上下文 | 新 SOLO beta **2026-03-31**，早于本次窗口约六周。citeturn850364search7 |

这里有一个很重要的判断：**2026 年的新一代 Coding Agent 已经开始从“产品 Feature”转向“Agent OS primitives”竞争**。Cursor 的 Project、Amp 的 Space、Factory 的 Mission、Antigravity 的 Manager Surface，本质上都在引入一个 **Coordinator / Supervisor 层**；而 pi Durable、Codex Cloud、OpenCode Worktree 则分别在解决 **runtime durability、execution environment、workspace isolation**。citeturn497160search6turn516578search3turn281173search0turn850364search5turn941014search0turn814524search3turn335044search4

## 最值得借鉴的具名功能

以下不是简单“功能排行榜”，而是按 **你自己实现 Coding Agent / 企业内部 Agent Harness 时的架构价值**排序。

| Feature | 来源 | 技术含义 | 为什么值得迁移 | 迁移难度 |
|---|---|---|---|---|
| **Durable Harness** | pi | tool/model/state 每一步持久化并可 crash-resume | 长任务可靠性的基础能力 | ★★★★★ |
| **`/goal`** | Cursor | 独立于单次 prompt 的长期 objective | 解决 agent context 被压缩后 goal drift | ★★ |
| **Subscriptions** | Cursor | agent 对 PR/Slack/event source 订阅，事件触发 wake | 把 agent 从 request-response 升级到 event-driven worker | ★★★★ |
| **Projects** | Cursor | coordinator 长期管理 project context 和多个 agent | 从“单任务 Agent”迈向“持续工程 Agent” | ★★★★★ |
| **Orbs** | Amp | 每 agent 独立远程机器/workspace | 并发与 isolation 的工程底座 | ★★★★ |
| **Agent-to-Agent** | Amp | agent 可以创建 agent/thread 并交换结果/文件 | 真正可组合的 hierarchical agents | ★★★★ |
| **Automations** | Amp | thread 本身携带 schedule 并在未来恢复上下文 | async agent 最简洁的产品抽象之一 | ★★★ |
| **Spaces** | Amp | 用户只和 coordinator 对话，由其管理 threads | supervisor UI/UX 的优秀抽象 | ★★★★ |
| **Mission Control** | Factory | feature/milestone/worker/validation 四层任务模型 | 大项目比普通 Todo List 更结构化 | ★★★★★ |
| **Managed Agents** | Antigravity | 一次 API 启动带持久 sandbox 的完整 agent | Agent-as-a-Service 基础设施 | ★★★★★ |
| **Cloud Subagent `/in-cloud`** | Cursor | local parent + remote isolated worker | 把 sync 和 async agent 混合在一个 workflow | ★★★★ |
| **Worktrees** | Codex/OpenCode/Cursor/Kilo | agent ↔ Git worktree 一一隔离 | 多 Agent 编码避免 file collision 的事实标准 | ★★ |
| **Multi-Version Mode** | Kilo | 同 prompt 并行多个实现，再人工/agent 选择 | 很适合 feature implementation A/B search | ★★★ |
| **Compaction-first** | Amp | harness 自动 compaction，不要求用户人工管理 context | 长 session 默认行为应由 runtime 接管 | ★★ |
| **Tree Session** | pi | JSONL entry `parentId` 形成单文件分叉 conversation tree | 比“复制聊天”更自然地支持 branch/backtrack | ★★★ |
| **Codemode** | pi | LLM 生成程序来调用 tools；nested calls 不进 context | PTC 最值得复制的工程模式之一 | ★★★ |
| **Context Engine MCP** | Augment | semantic retrieval 作为独立 MCP 服务提供给任意 agent | 将 context system 与 agent runtime 解耦 | ★★★★ |
| **Repository Memory** | GitHub Copilot | repo conventions 跨 session 保存 | 对长期 codebase agent 很有价值 | ★★★ |
| **Checkpoint / Rewind** | Claude/Cursor/Kilo/Cline | agent edit 前后保存 workspace state | 大幅降低 autonomous editing 风险 | ★★ |
| **Hooks** | Claude/GitHub/Gemini/Windsurf/Qwen | deterministic lifecycle middleware | policy、validation、audit 不应依赖 LLM 自觉 | ★★ |
| **Agent Skills** | Claude/GitHub/Gemini/Codex | `SKILL.md` + scripts/assets 的按需 capability | 最值得长期沉淀的跨-agent资产 | ★★ |
| **Fork Subagent** | Qwen Code | child 继承父 context，可裁剪 turns/tools | 比“完全 fresh subagent”多一种 useful isolation level | ★★★ |
| **Persistent Subagent State** | Kimi Code CLI | resume session 后 child agent context 也恢复 | hierarchical agent 真正 durable 的关键 | ★★★★ |
| **Architect / Editor** | Aider | reasoning model 与 editing model 拆分 | 模型 specialization / routing 的经典模板 | ★★ |
| **Recipes** | Goose | workflow 作为 portable YAML | agent workflow GitOps 化、可审查、可共享 | ★★ |

其中我认为最容易被低估的是 **Hooks**。Claude、GitHub、Gemini、Windsurf、Qwen 都在形成相近的 lifecycle interception 模式：`SessionStart → Prompt → PreTool → Tool → PostTool → Stop`。这实际上已经类似 Web Server middleware。把权限、lint、tests、secret scanning、telemetry 放到 deterministic hook 层，而不是 prompt 里，是 agent engineering 从“提示词工程”迈向“软件工程”的标志。citeturn814524search2turn494145search1turn375864search9turn494145search0turn731008search2

第二个最值得长期下注的是 **Skills 标准化**。Claude Code 的 skill 是目录 + `SKILL.md` + scripts/resources；GitHub Copilot 已兼容 `.claude/skills`，并在 2026-11-12 的官方文章中明确讨论“一次构建、多个 agent 运行”；Gemini CLI 同样将 Skill 做成按需 discovery/activation 的 capability。对工程团队而言，这意味着未来最有复利的 Agent 资产很可能不是某个平台配置，而是 **vendor-neutral Skill library**。citeturn814524search0turn375864search5turn375864search10

第三个是 **programmatic tool calling / code mode**。Pi 的实现尤其清晰：模型不是连续发十几个 JSON tool call，而是写一段受限 JavaScript，在 QuickJS 中组合、并发、筛选工具结果；模型只看到最终需要的信息。这解决两个现实问题：tool call latency 与 context pollution。对于 MCP server 特别多的企业 Agent，这会比单纯“加更多 tools”有效得多。citeturn283990search3turn283990search4

## 与 Goal、PTC、Async Agent 的统一技术图景

你原来的 Goal / PTC / Async Agent 可以进一步抽象成一个完整的 **长期 Agent Runtime 五层模型**。

**第一层是 Goal State。** `/goal` 的价值不是多一个 slash command，而是把“用户当前最高层目标”从 transcript 中抽离，成为 runtime 可以稳定读取的 durable state。Cursor 在 2026-08-19 明确加入 `/goal`，并将其与 `/loop`、custom mode 和 long-running cloud agent 联动。citeturn497160search5

**第二层是 Working Context。** Amp compaction、Claude/Copilot/Cline/Kimi compaction、Augment retrieval 和 pi tree session 都是在解决“当前 model window 中应该保留什么”。这层应被视为一个 cache，而不是唯一 source of truth。citeturn516578search6turn375864search4turn818670search0turn731008search4turn281173search3turn488304search0

**第三层是 Execution Program。** PTC / Code Mode 的核心是把多次离散 tool invocation 提升为小程序：`LLM → generate code → runtime executes N tool operations → summarized result → LLM`。Pi `codemode` 是当前非常干净的产品实现。citeturn283990search3turn283990search4

**第四层是 Durable Runtime。** Pi Durable 把 generation/tool call/task 当成 checkpointed state machine；Codex Cloud 保存 VM state；Antigravity Managed Agents 使用 persistent isolated environment；Amp Orb 保留 agent thread 与远程机器。这一层负责“进程挂掉、电脑关掉、context 刷新以后还能继续”。citeturn941014search0turn814524search3turn850364search2turn516578search7

**第五层是 Scheduler / Event Bus。** Cursor Subscriptions、Amp Automations、Codex Automations、Jules Scheduled Tasks、Devin automations 都在把 Agent 接入事件源和时间系统。此时 Agent 不再是“调用一次 API”，而是一个 **sleep → event → wake → act → verify → sleep** 的长期进程。citeturn497160search5turn516578search5turn497160search1turn375864search11turn516578search8

因此如果你自己设计下一代 Coding Agent，我更推荐的 runtime state 大致是：

```text
Agent
├── GoalState              # 长期目标 / success criteria
├── DurableState           # task graph / checkpoints / documents
├── WorkingContext         # 当前 LLM window，可 compaction
├── Knowledge/Retrieval    # repo index / memory / history
├── ToolRuntime
│   ├── direct tools
│   └── programmatic tool execution / code mode
├── Workers
│   ├── local subagents
│   └── isolated worktree/cloud agents
├── Verification
│   ├── tests
│   ├── browser
│   └── reviewer/verifier agent
└── Scheduler
    ├── events
    ├── cron
    └── external triggers
```

这比目前常见的：

```text
while (true) {
  response = llm(messages, tools)
  execute(response.tool_calls)
}
```

多出来的部分，基本就是 2026 年上半年到下半年 Agent 产品正在集中补齐的东西。citeturn497160search5turn497160search6turn516578search3turn281173search0turn941014search0

## 产品深挖与使用边界

**Claude Code** 的最大价值不在某一个单点 feature，而在它形成了目前最成熟的一套 **“配置即 Agent 行为”**：`CLAUDE.md` 管 always-on policy，Skills 管按需 workflow，Custom Subagents 管隔离 specialist，Hooks 管 deterministic lifecycle，Checkpointing 管回滚。这套分层非常适合直接借鉴到内部 Agent 平台。它的限制也明显：这些 abstraction 大量围绕 Claude Code harness，跨产品迁移时需要将 Hooks 和 agent definition 重新适配。citeturn814524search0turn814524search1turn814524search2

**Codex** 当前最有价值的是 **multi-agent execution surface**：Worktrees 用于本地隔离，Cloud Tasks 用隔离 workspace 执行后台工作，App 负责同时观察多个 agents，Automations 又把 thread 扩展到未来继续执行；2026 年后续版本还加入 memory、computer use、remote devbox 等，让 Codex 从 coding CLI 向 general developer agent workspace 演进。citeturn814524search4turn814524search3turn497160search1

**Cursor** 这半年变化非常大。6 月的 `/in-cloud` 已经允许 parent agent 启动独立 VM 的 cloud subagent；8 月加入 Subscriptions 与 `/goal`；9 月 Projects 又在之上引入 coordinator，长期共享 context 并管理大量 subagents。这是一条非常清晰的演进路线：

`Chat → Subagent → Cloud Agent → Event-driven Agent → Project Coordinator`。citeturn497160search4turn497160search5turn497160search6

**Amp** 在 Agent runtime 架构上非常激进。2026-05 的 CLI rewrite 明确采用 “compaction-first、plugin-powered、remote-controllable”；6 月 Orbs 把 thread 映射到云机器；Agent-to-Agent 让 thread 创建 thread；Automations 让 thread 在未来 wake；11 月 Spaces 再把许多 thread 提升到由 coordinator agent 管理。Amp 是观察 **Agent-native UX** 最值得研究的产品之一。citeturn516578search6turn516578search7turn516578search4turn516578search5turn516578search3

**Antigravity** 最值得研究的是“同一 Harness 多 surface”。Google 在 2026-05 同时推出 Antigravity 2.0、CLI、SDK、Managed Agents：desktop 是 manager，CLI 是 terminal surface，SDK 是 self-host interface，Managed Agents 是 cloud API。它说明一个成熟 Agent Harness 不应该绑定 IDE，而应该成为一个独立 runtime。citeturn850364search2turn850364search4

**Factory Missions** 的核心创新是任务模型。它并不把“大任务”理解为一条很长的 prompt，而是显式构造 **features → milestones → skills → workers → validation**，再交给 Mission Control 调度。这比普通 todo list 更接近项目管理 DAG，也是目前最值得借鉴的“大任务 decomposition”产品设计之一。citeturn281173search0

**Augment Context Engine** 则走了完全不同的路线：不重点创新 agent loop，而是优化 Agent 的 retrieval plane。其 Context Engine 做代码 semantic indexing、ranking、跨 repo/history retrieval，并通过 MCP 直接服务 Claude Code、Cursor、Codex 等其他 agents。2026 年 10 月相关资产宣布加入 Harness，因此它仍值得研究，但如果你要做长期产品选型，应注意其组织归属正在变化。citeturn281173search3turn281173search4turn281173search5

**Qwen Code** 的 subagent 设计很值得源码级阅读。它既支持普通独立 subagent，也支持 **Fork Subagent**：fork 可以继承父 conversation 的全部或最近 N 个 user turns，并通过 `fork_tools` 收窄工具；background agent 完成后仍可通过 `send_message` 继续。它甚至支持把 Claude Code / Codex 本身当作 external executor。这个模型比很多“spawn agent 返回 summary”式实现更完整。citeturn731008search1

## 资深开发者最值得亲自试的产品与三十天 A/B 方案

如果目标是 **提升你自己的 AI Coding 能力，而不是收集产品体验**，我会只试七个：**Claude Code、Codex、Cursor、Amp、pi、Antigravity、Factory Droid**。Augment Context Engine 可以作为所有实验的横向增强变量，而不是单独当主 agent；Qwen/OpenCode 更适合源码研究和架构对照。这个组合基本覆盖当前所有关键路线：本地 CLI、IDE、Cloud Agent、多 Agent、Durable Runtime、PTC、Event-driven、Mission orchestration。相关能力均已在上述官方资料中确认。citeturn814524search0turn497160search1turn497160search5turn516578search3turn941014search0turn850364search2turn281173search0

不要用“感觉哪个更聪明”来比较。30 天实验应固定仓库、任务、模型档位、验收测试和计分方式，否则你比较的是不同任务而不是 Agent Harness。

| 周期 | 实验 | 核心观察指标 |
|---|---|---|
| Day 1–3 | 建立 10–15 个真实 benchmark tasks | baseline 人工耗时、测试、预期 diff、风险等级 |
| Day 4–8 | Claude Code vs Codex vs Cursor | 单 Agent coding quality |
| Day 9–13 | Amp vs Cursor Cloud vs Antigravity | async / parallel execution |
| Day 14–18 | pi vs Claude/Gemini hooks | context、PTC、runtime extensibility |
| Day 19–23 | Factory Missions vs Cursor Projects vs Amp Spaces | large-task orchestration |
| Day 24–27 | 所有产品加/不加 Context Engine MCP | retrieval 的真实增益 |
| Day 28–30 | 固化自己的最佳 Harness workflow | 形成 Skill/Hook/AGENTS.md/验证模板 |

每个任务至少记录九个数据：**Task Success、Human Intervention Count、Wall-clock Time、LLM Cost、Token Count、Tool Calls、Context Compactions、Regression Count、Review Time**。其中最重要的不是生成速度，而是：

\[
\text{Effective Engineering Throughput}
=
\frac{\text{通过验收的任务价值}}
{\text{人工介入时间}+\text{Review 时间}}
\]

这比“agent 花了多少分钟”更接近真正的工程效率。

对于并发 Agent，再单独记录：

\[
\text{Parallel Efficiency}
=
\frac{\text{串行估算耗时}}
{\text{实际 Wall Clock} \times \text{并行 Agent 数}}
\]

如果开了 5 个 agent，但 review、merge conflict 和重复探索把收益全部吃掉，那么并行度只是成本放大器。Gemini CLI 官方甚至明确提醒 parallel subagents 同时编辑代码可能产生冲突，这也是为什么 Worktree isolation 已经成为 Codex、Cursor、Kilo、OpenCode 等产品共同采用的模式。citeturn375864search6turn814524search5turn497160search4turn818670search5turn335044search4

对你这种本身做 AI Coding / 全栈研发的人，30 天实验最终最应该沉淀的不是“我喜欢 Cursor 还是 Claude Code”，而是一个**可跨 Agent 的个人工程体系**：

```text
AGENTS.md / CLAUDE.md
        ↓
Reusable Skills
        ↓
Deterministic Hooks
        ↓
Goal / Acceptance Criteria
        ↓
Agent or Agent Team
        ↓
Worktree / Sandbox
        ↓
Tests + Browser Verification
        ↓
Independent Reviewer
        ↓
PR
```

Skills 已经开始跨 Claude、GitHub Copilot、Gemini 等生态趋同；Worktree、Hooks、Subagents、Compaction 也越来越成为通用 primitive。因此长期复利最高的投入是 **Skill、验证脚本、Agent-ready repo、自动测试和评测数据集**，而不是某个产品私有的 prompt collection。citeturn375864search5turn814524search0turn375864search10turn494145search4

最终如果只提炼五个值得你在自己的 Agent / AI Coding 基础设施里直接实现的模式，我会选：**GoalState、Durable Task State Machine、Programmatic Tool Calling、Worktree-isolated Subagents、Event-driven Scheduler**。它们分别对应 Cursor `/goal`、pi Durable、pi Codemode、Codex/Cursor/Amp 等多 Agent 隔离，以及 Cursor Subscriptions/Amp Automations；这五个组合起来，基本就是从“Coding Chatbot”跨越到“长期自治软件工程 Agent”的最短技术路径。citeturn497160search5turn941014search0turn283990search4turn814524search4turn516578search7turn516578search5