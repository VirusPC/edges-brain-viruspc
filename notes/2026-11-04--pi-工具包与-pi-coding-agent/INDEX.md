# Pi 工具包与 Pi Coding Agent

> 核实日期：2026-11-04。对照 [pi.dev](https://pi.dev/) 文档（How Pi Works、Quickstart、SDK、CLI Integration、Configuration、Skills、Extensions、Packages、Security）和 [earendil-works/pi](https://github.com/earendil-works/pi) 当天 `main`。相关包版本读到的是 **1.5.0**。命令、默认工具和文件名会变，动手前再对一次文档。

## 背景

后续如果要「基于 Pi 定制一个 coding agent」，先把两层名字分开。口语里的 Pi、命令 `pi`、npm 包 `@earendil-works/pi-coding-agent` 经常被当成同一个东西。仓库 README 开篇就写 “Pi is a minimal, extensible agent harness”，紧接着讲的 extensions、skills、四种用法，文档都在 `packages/coding-agent/docs/` 下面。pi.dev 的文档首页又把终端里的 `pi` 叫做 minimal terminal coding harness。包自己的 `description` 则是 “Coding agent CLI with read, bash, edit, write tools and session management”。

本文用固定叫法：

- **Pi 工具包**：`earendil-works/pi` 这个 monorepo 里、不预设「改代码」的底座库。
- **Pi Coding Agent**：`@earendil-works/pi-coding-agent`，命令行入口是 `pi`。

本仓已有两份相邻材料，范围不同，这里不重复它们的结论：

- [pi 生态与插件扩展](../../projects/agent-infra/2026-10-19--pi生态与插件扩展.md) 记的是 2026-10-19 的插件下载量、omp 硬分叉和 OpenClaw。那天的「除 OpenClaw 外没有成熟产品」没有在本次重做。
- [Pi 沙箱不等于文件系统隔离](../../.edges/memory/projects/project_pi_sandbox_not_fs_isolation/INDEX.md) 仍适用。下文只补官方现在怎么写权限，以及 codemode 那个 sandbox 限制的是什么。

## 定义对比

| | Pi 工具包 | Pi Coding Agent |
| --- | --- | --- |
| 是什么 | monorepo 里的底座库：统一模型 API、通用 agent loop、终端组件，外加若干旁路包 | 装上就能对一个工作目录开工的 coding agent |
| 包 / 入口 | `@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`、`@earendil-works/pi-tui` 等，在自己的程序里 import | `@earendil-works/pi-coding-agent`；命令 `pi`；也可被 SDK import |
| 是否绑定写代码 | 不绑定。`pi-agent-core` 的 package 描述是 general-purpose agent。Quick start 只给一句 system prompt，工具由调用方注册 | 绑定工作目录。默认工具就是 `read`、`bash`、`edit`、`write`，并带会话管理 |
| 项目说明、技能、扩展 | 底座不发现 `AGENTS.md`，也没有 `pi install` | 有。extensions、skills、prompt templates、themes、packages 都是这一层的资源 |
| 官方「Pi」一词 | 仓库把整套产品叫 harness | 网站和 CLI 文档里的 Pi，多数时候已经是这一层 |

`pi-agent-core` 不依赖 `pi-tui`。终端界面是 Coding Agent（以及它加载的扩展）去用的库，不是 agent loop 的一部分。

## 架构分层

```text
@earendil-works/pi-ai
        │  统一 LLM API
        ▼
@earendil-works/pi-agent-core          @earendil-works/pi-tui
 general-purpose agent loop              终端组件库
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
        @earendil-works/pi-coding-agent
        命令 pi：默认工具、项目上下文、会话树、
        交互 TUI、print / JSON / RPC、SDK、
        extensions / skills / prompts / themes / packages
```

仓库根 README 的包表另外列出 `@earendil-works/chord`（跨进程对象运行时）、`@earendil-works/pi-telemetry`（厂商中立的 telemetry 契约）、`@earendil-works/pi-durable`（durable 的对话 / 任务 / 文档运行时）。1.5.0 的依赖里还能看到两份包表没单列、但 Coding Agent 直接依赖的库：`@earendil-works/pi-codemode`、`@earendil-works/pi-mcp`。`pi-agent-core` 还依赖 `@earendil-works/pi-schema`。下面只展开定制 coding agent 时会碰到的边界。

### Pi 工具包：不预设改仓库

**`@earendil-works/pi-ai`** 是统一的多厂商 LLM API：provider 与模型目录、auth、流式 tool call、token 和费用、会话中途换模型。聊天目录只收支持 tool calling 的模型。它发请求，不负责「调用工具后再问一轮」。

**`@earendil-works/pi-agent-core`** 建在 `pi-ai` 上。`Agent` 保存状态，`prompt()` 驱动循环，并向外发事件。调用方传入 system prompt、model 和 tools。消息可以带应用自己的类型；发给模型前经过可选的 `transformContext`，再由 `convertToLlm` 收成模型认识的 `user` / `assistant` / `toolResult`。工具执行默认并行，也可以改成顺序。`beforeToolCall` / `afterToolCall` 能拦住一次调用。steer 在当前回复之后进入，follow-up 等这一轮待办结束。

这一层没有 `read` / `write` / `edit` / `bash`，不扫描 `AGENTS.md`，不渲染 TUI，也不发现 skill。持久化的会话树也不是它的职责。它管的是一次运行里的消息、工具结果和事件。

**`@earendil-works/pi-tui`** 是给交互 CLI 用的组件库：差分渲染、编辑器、Markdown、选择列表等。扩展要做自己的界面时用它，不要在扩展里再开一套终端渲染器。

旁路，定制 Coding Agent 时通常先不用：

- **`pi-codemode`**：沙箱里的 JavaScript，唯一能力是调用注入进去的工具。这是「把多次工具调用收成一段脚本」的执行器，不是文件系统隔离。
- **`pi-mcp`**：可单独使用的 MCP client。Coding Agent 的内置 MCP 走它。
- **`pi-durable`**：另一套 durable agent harness，建在 `pi-ai` 和 `chord` 上。README 标明 experimental，API 会在版本之间变。对话、回合和工具调用先落存储再展示，进程中途死掉可以接着跑。它有自己的 extension、工具和 compaction，和 Coding Agent 的 `ExtensionAPI`、JSONL `SessionManager` 不是同一套。

### Pi Coding Agent 多出来的一层

安装（Node.js 22.19 或更新）：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

安装器会钉住传递依赖，并用 `pi update` 升级。也可以 `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`（不钉传递依赖；正常安装不需要依赖的生命周期脚本）。Nix 用 `nix profile add github:earendil-works/pi/stable`。

在要它工作的目录里执行 `pi`。这个目录用来发现文件、说明和配置，也用来给保存的会话分组。`/login` 接订阅或 API key，然后直接给任务。它会展示每次读文件、搜索、命令和编辑，**不会在每次工具调用前询问**。

#### 默认工具

`defaultTools` 的默认值是 `read`、`bash`、`edit`、`write`：

| 工具 | 作用 |
| --- | --- |
| `read` | 读文本和受支持的图片 |
| `bash` | 跑 shell |
| `edit` | 对已有文件做精确文本替换 |
| `write` | 创建或覆盖文件 |

同包还内置 `grep`、`find`、`ls`，以及 Windows 上的 `powershell`，默认不打开。`codemode` 和 `tool_search` 由内置扩展注册，默认不活跃；在 `defaultTools` 里写 `+codemode` 才会在保留其余默认工具的同时打开它。命令行会加载内置 MCP 扩展。SDK 的 `createAgentSession()` **不会**默认加载 codemode、tool search 和 MCP，要自己把 `createCodemodeExtension()`、`createToolSearchExtension()`、`createMcpExtension()` 放进 `DefaultResourceLoader`。

#### 项目上下文

用户级配置在 agent 目录，默认 `~/.pi/agent`，可用环境变量 `PI_CODING_AGENT_DIR` 或 SDK 的 `agentDir` 换位置。项目级配置在工作目录的 `.pi/`，授予 project trust 之后才加载。

Context file 和 `.pi/` 是两条线：

- `AGENTS.md`（以及同目录的 `AGENTS.override.md`、`AGENTS.MD`、`CLAUDE.md`、`CLAUDE.MD`）从 agent 目录、当前目录和父目录加载。某一级放了 `AGENTS.override.md`，只替换**同一目录**里的 `AGENTS.md` / `CLAUDE.md`，不压制别的目录。发现这些文件**不需要** project trust。`--no-context-files` 关掉 `AGENTS.md` 和 `CLAUDE.md` 的发现。
- `SYSTEM.md` 替换 Pi 自带的 system prompt。`APPEND_SYSTEM.md` 在系统提示上追加。agent 目录和受信任的 `.pi/` 都可以放。同名文件以项目那份为准，**不合并**。项目里的这两份要 trust。

`.pi/settings.json`、`.pi/mcp.json`、`.pi/extensions`、`.pi/skills`、`.pi/prompts`、`.pi/themes`，以及项目里的 `.agents/skills`，都在 project trust 的保护下。拒绝 trust 会跳过它们。Context file 仍会加载，所以目录里的 `AGENTS.md` 仍要当成不可信输入。

#### 会话和交互 TUI

会话是一棵树，持久化成 JSONL。每个条目有 id 和 parent，当前条目决定活动分支。从较早的条目继续，会在同一文件里长出另一枝；fork / clone 把选中的历史抄到新文件。compaction 插入一条摘要，之后的模型请求用摘要代替更早的消息，原条目仍留在树上。`/tree` 在分支间移动，`pi --continue` 恢复该工作目录最近的会话，`/resume` 另选一份。

交互界面是对话、编辑器和页脚（当前目录、模型、会话状态）。`Enter` 送 steering：当前工具结束后进入，并打断还没跑的工具。`Alt+Enter` 送 follow-up：等这一轮做完。`/reload` 在改完设置、说明或资源后重新加载。

#### print、JSON、RPC、SDK

CLI Integration 把交互、print、JSON、RPC 定义为命令行模式，并写明 SDK 是进程内嵌入，不占一种 CLI 模式。pi.dev 首页则把 interactive、print/JSON、RPC、SDK 算成四种用法。两边划的边界不同：模式决定输入输出和进程是否留着；SDK 去掉进程边界。几条路径用的是同一套 agent 和会话。

| 用法 | 寿命 | 输入输出 |
| --- | --- | --- |
| 交互 | 直到人退出 | 终端 UI |
| print：`pi -p "query"` | 一次调用 | stdout 上的最终文本。stdin/stdout 被管道重定向时，默认也走 print |
| JSON：`--mode json` | 一次调用 | stdout 上的 JSONL 事件 |
| RPC | 长驻 | stdin 上的 JSONL 命令，stdout 上的响应和事件 |
| SDK：`createAgentSession()` | 宿主进程内 | TypeScript 直接拿 session、工具、资源和事件 |

Node 或 TypeScript 若仍想要子进程，用包里的 `RpcClient`，不要自己拼 RPC 帧。

#### 权限

Pi 没有内置的文件系统、进程、网络或凭据权限系统，工具和扩展以启动 `pi` 的那个进程的操作系统权限运行。官方给出的隔离是容器化：Gondolin 扩展把内置工具和 `!` 命令送进本机 Linux micro-VM，而 `pi` 与 provider 认证留在宿主机；或者整进程放进 Docker / OpenShell。`pi-codemode` 的 sandbox 只限制脚本能调用哪些已注入工具。

本仓因此把「干净基线」放在 Docker、干净 worktree 或自托管 E2B 上，而不是放在 Pi 自带沙箱上。见上面的记忆条目。

官方明确不做成内置功能、留给扩展、skill、包或外部工具的，包括 sub-agents、权限弹窗、plan mode、内置 todo、后台 bash。MCP 曾经也在这份清单里，后来改成内置；Codemode 用来在 JavaScript sandbox 里组合工具调用。MCP 扩展仍然可以用。

## 使用场景

### 交互 `pi`

人在终端里，要看见每一步读、改、跑，并且可能中途改口。适合改仓库、整理研究笔记、写作、处理数据文件。Quickstart 的例子是总结一份会议笔记并写出 action items、解释仓库怎么跑检查、比较两份 CSV。需要从半路另走一条而不丢掉历史时，用会话树，而不是新开一个丢掉上下文的进程。

不适合无人值守。它不会逐步确认工具调用。不可信仓库、不可信扩展、没人看着的自动化，先放进容器。

### print 与 JSON

一次任务，调用方只要结果，不要 TUI。

- shell 脚本要模型最后说了什么：`pi -p`。
- 下游要工具进度、流式事件：`--mode json`，按 JSONL 读。

管道进或管道出时，不显式选模式也会落到 print。多轮插话、要 steer、要 `/tree`，留在交互模式。

### SDK 与 RPC

要嵌进别的程序时，先看宿主语言和要不要进程边界。

- 宿主是 Node.js 或 Bun，希望复用 Coding Agent 的工具、`AGENTS.md` 发现、会话、扩展和事件：用 SDK。`createAgentSession()` 默认带上当前工作目录、发现到的资源、已存设置和凭据。`cwd` 决定项目资源、context file、会话分组和内置工具的路径。可以换成内存里的 `SessionManager.inMemory()`、自己的 `resourceLoader`，或用 `tools` / `customTools` 改工具集。`prompt()` 在这一轮（含自动重试）结束后返回。流式输出要在 `prompt()` 之前 `subscribe`。已经在跑时再 `prompt()`，必须显式指定 steer 还是 follow-up，否则直接拒绝。
- 宿主不是 Node，或者要把 agent 关在子进程里：用 RPC。隔离边界是进程，不是 SDK 对象。
- 产品根本不是「对着一个目录改代码」（聊天渠道里的个人助理、自有工具循环）：官方 README 把 [OpenClaw](https://github.com/OpenClaw/OpenClaw) 当作真实集成例子。这种情况下可以只依赖 `pi-ai` + `pi-agent-core`，自己注册工具，不必背上 `read` / `write` / `bash`。本仓 [云沙箱 Agent 内核](../../projects/agent-infra/2026-10-19--云沙箱Agent开源产品的Agent内核.md) 把「用 `pi-agent-core` 做内核」记成一条路线；那篇是 2026-10-19 的检索，本次没有重核 Kortix。

### 用 extensions / skills 定制

相对 Codex、Claude Code 这类终端 coding agent：日常加能力，多半停在 skill、配置、hooks / plugin 和 MCP。循环、默认工具和界面收在产品里，要换循环通常是分叉或在外面再包一层。Pi 把这条路拆开了，Quickstart 要求从**能力最小**的机制开始：

| 需求 | 从这里开始 | 落点 |
| --- | --- | --- |
| 某个目录下一直要遵守的说明 | `AGENTS.md` | 工作目录或其父目录；不经 project trust |
| 换掉或追加 Pi 自带的系统提示 | `SYSTEM.md` / `APPEND_SYSTEM.md` | agent 目录，或受信任的 `.pi/` |
| 从 `/` 菜单反复贴同一段提示 | prompt template | `prompts/` 下的 Markdown，输入 `/name` 展开 |
| 某类任务的说明，加上脚本、参考和素材，但不要新的可执行集成点 | skill | 目录 + `SKILL.md`。启动时系统提示里只有 name、description 和 path，全文等模型去读，或用 `/skill:name` 强制加载 |
| 新工具、斜杠命令、快捷键、拦截工具调用、换 provider、改 TUI | extension | 跑在 Pi 进程里的 TypeScript。权限与进程相同 |
| 把上面几样打包给别人 | Pi package | `pi install npm:…`、`pi install git:…` 或本地路径 |

Skill 实现的是 Agent Skills 规范。除了 Pi 自己的 skills 目录，也发现 `~/.agents/skills/` 和 `.agents/skills/`。项目技能从工作目录向上找，遇到仓库根就停。description 要写清做什么、何时用，它决定模型会不会去读全文。

Extension 用 `pi.registerTool()`、`pi.registerCommand()` 和生命周期事件工作。可以改写上下文、自定义 compaction、接 provider 和 MCP server，也可以用 `ctx.ui` 做选择、确认和自定义组件。只从信任的来源加载：扩展能看到提示、工具参数、文件、凭据和会话历史。

Package 是一个普通目录或 npm 包，约定放 `extensions/`、`skills/`、`prompts/`、`themes/`，也可以在 `package.json` 的 `pi` 字段里写显式路径。扩展 import 的 `@earendil-works/pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 和 `typebox` 由宿主提供，声明成 `peerDependencies` 的 `"*"`，不要放进 `dependencies`，也不要打包进扩展。物理副本会绕过 Pi 的模块映射，造成重复的 class 和 registry。

改完本地资源执行 `/reload`。官方的用法是缺 sub-agent、plan mode 或权限确认时，让 Pi 写一个扩展，或安装别人的包。本仓 2026-10-19 的结论仍然可以当约束：走插件 / SDK 并锁版本；硬分叉 core 会和上游扩展 API 分开（omp 是当时的例子）。

## 定制一个 coding agent 时的起点

按这个顺序加，避免一上来分叉：

1. 在目标仓库里跑交互 `pi`，确认默认的 `read` / `bash` / `edit` / `write` 和已有 `AGENTS.md` 够不够。
2. 仓库规矩写进 `AGENTS.md`。只有要换掉 Pi 自己的系统提示时，才写受信任的 `.pi/SYSTEM.md` 或 `APPEND_SYSTEM.md`。
3. 重复出现的流程做成 prompt template 或 skill。需要随任务带上脚本和参考文件时用 skill。
4. 需要新工具、要拦住某类 tool call、或要改界面，再写 extension，并用 package 分发。
5. 要嵌进自己的服务：Node / Bun 用 SDK，并记得自行挂上 MCP / codemode（如果需要）；其它语言或需要进程隔离时用 RPC。
6. 工作目录、默认读写工具和 JSONL 会话都是负担时，退回 `pi-ai` + `pi-agent-core`，自己注册工具和 system prompt。
7. 不可信代码或多租户不要依赖 Pi 的项目 trust 或 codemode sandbox。项目 trust 只决定加载哪些项目资源；codemode 只限制脚本能调用的工具。文件系统隔离另做。

## 参考

- 产品与文档首页：<https://pi.dev/> 、<https://pi.dev/docs/latest>
- 快速开始（含定制方式选择表）：<https://pi.dev/docs/latest/quickstart>
- 循环、上下文、会话、四种界面：<https://pi.dev/docs/latest/how-pi-works>
- 命令行模式与 RPC：<https://pi.dev/docs/latest/cli-integration>
- SDK：<https://pi.dev/docs/latest/sdk>
- 配置、context file、`SYSTEM.md`：<https://pi.dev/docs/latest/configuration>
- Skills：<https://pi.dev/docs/latest/skills>
- Extensions：<https://pi.dev/docs/latest/extensions>
- Packages：<https://pi.dev/docs/latest/packages>
- 安全与 project trust：<https://pi.dev/docs/latest/security>
- 仓库：<https://github.com/earendil-works/pi>
- 包 README：[`packages/ai`](https://github.com/earendil-works/pi/blob/main/packages/ai/README.md)、[`packages/agent`](https://github.com/earendil-works/pi/blob/main/packages/agent/README.md)、[`packages/tui`](https://github.com/earendil-works/pi/blob/main/packages/tui/README.md)、[`packages/coding-agent`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md)、[`packages/durable`](https://github.com/earendil-works/pi/blob/main/packages/durable/README.md)

本仓：

- [pi 生态与插件扩展](../../projects/agent-infra/2026-10-19--pi生态与插件扩展.md)
- [云沙箱 Agent 开源产品的 Agent 内核](../../projects/agent-infra/2026-10-19--云沙箱Agent开源产品的Agent内核.md)
- [Pi 沙箱不等于文件系统隔离](../../.edges/memory/projects/project_pi_sandbox_not_fs_isolation/INDEX.md)