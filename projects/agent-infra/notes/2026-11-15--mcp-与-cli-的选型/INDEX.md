# MCP 与 CLI 的选型

> 已有线上接口时，默认先做 CLI 或直接调 HTTP；只有要进无 shell 的客户端，或要按用户做 OAuth、按工具收窄时，再包一层 MCP。

## 背景

2026-11-15 晚上，用户在与 Grok Bot 讨论 MCP 和 CLI 的差异之后，要求形成可执行的决策方法，并追问远程服务、权限收窄、隐藏实现、Claude Code 文档服务，以及有 shell 的 Pi 后来为何仍加入 MCP。

## 主题

这场对话要解决的是：在已经有线上接口的前提下，什么时候该把能力封装成 MCP，什么时候该用 CLI，以及“没有 shell”是不是唯一理由。

- 难点一：MCP 的若干好处（按工具按用户收窄、隐藏实现、跨客户端）并不是协议独占的，HTTP 接口同样能做权限校验和隐藏源码。
- 难点二：各家 coding agent 的核心能力看起来像远程服务，但多数走私有协议，并不等于它们用了 MCP。
- 难点三：没有 shell 是上 MCP 的硬条件，但有 shell 并不能推出不必做 MCP，Pi 后来加入 MCP 就是反例。

## 过程

### 19:38 之前 现成文章与模型如何用命令行

用户不要新写长文，只要现成的对比文章，并要求分点总结。当时的共识是混合使用：本机和熟悉终端的工作流里，CLI 更便宜、也更常见；结构化工具、OAuth、按工具按用户收窄、以及没有 shell 的客户端，更适合 MCP。用户接着问模型怎么会用命令行、对一个业务 CLI 又怎么知道用法。结论是模型靠 `--help`、例子和文档学习，业务 CLI 同样如此。

用户问“权限可以按工具按用户收窄”怎么理解。按工具收窄，是服务只暴露一部分工具，协议层没有的操作模型调不到；按用户收窄，是登录后只作用于该账号的数据，而且可以撤销。CLI 一旦给了 shell 或一把密钥，爆炸半径通常是整层权限。

### 19:53 服务端会按账号发不同工具吗

用户提到“都说 server 端会按你的账号权限发不同的 tools”。说明这是常见做法，但不是协议强制：登录后可以在 `tools/list` 里只返回有权使用的工具，并可用 `tools/list_changed` 让客户端重新拉取；也有服务对所有人给出同一份名单，真正调用时再拒绝。前者在发现阶段就收窄，更干净。

### 19:54 远程服务不必用 MCP

用户指出，远程服务也可以是 CLI 加一些 HTTP 接口。确认：远程能力的本质是 HTTP，MCP 只是给模型用的一种封装。用 CLI 调这些接口，同样能在服务端按账号校验权限。MCP 多出来的是客户端约定，也就是工具怎么发现、参数怎么描述、OAuth 怎么走、会话怎么保持，换来的是多个客户端不用各写一套调用方式。如果只给自己用，而且这些客户端都有 shell，可以一直不做成 MCP。

### 19:54 决策方法

用户要求决策方法论。结论是先看使用场景，再看集成成本：默认用 CLI，只有 CLI 明显不够时再上 MCP。按四个问题判断，有两个以上答“是”，就偏向 MCP：调用方有没有可靠的 shell；权限是否必须按人、按工具分开，且能撤销；要不要一次接入、很多客户端都能用；是不是只有自己用、接口还在快速变化。两者可以并存：HTTP 继续当唯一实现，CLI 和 MCP 都做薄封装。最不划算的是接口还不稳定，就先做一套完整 MCP。

### 19:55 到 19:59 隐藏实现，以及这些例子是否走 MCP

用户先问能否把细节藏在服务端、隐藏不想暴露的服务；随后澄清，指的是隐藏不想开源的服务，并要求举例，再问这些例子是否适用 MCP。

结论：相对开源 CLI，远程服务的一个实际好处是实现可以留在自己的服务器里，不必把源码和内部接口发出来。开源 CLI 更容易把调用方式、鉴权和内部路径暴露给用户。对话里举的例子包括：Cursor 的代码索引与 Memories，Claude Code 的 auto memory 与 Dream，GitHub Copilot 和 Windsurf 的补全与检索，以及 Codex Cloud、Cursor Cloud Agent 的云端编排。但这些核心能力大多走各家自己的私有协议，不是以 MCP 对外提供的。MCP 更常见于对接 GitHub、Slack、Notion、Podwise 这类外部系统。隐藏不开源实现，靠的是远程服务加私有接口；MCP 只是其中一种对外形态，不是这些例子的实现方式。

### 20:00 已有线上接口时怎么封装

用户问：已经有线上接口了，最适合封装成 MCP 还是 CLI。结论是默认先做 CLI，或直接让 Agent 调现有 HTTP；只有明确要进多个无 shell 的客户端，或要按用户做 OAuth、按工具收窄时，再包一层 MCP。更稳的顺序是：HTTP 继续当唯一实现，CLI 做薄封装给终端和本机 Agent，需要时再加一个同样薄的 MCP，两者都只调这套 HTTP，不要在 MCP 里另写业务。

### 20:01 到 20:05 Claude Code 文档服务为何用 MCP

用户问 Claude Code 官方是否还在用 MCP，以及文档服务为什么不用 CLI，并建议做成一个查文档 CLI。最后把原因归纳为：有不支持 shell 的环境。

确认 Claude Code 仍把 MCP 当作接外部系统的正路，读文件、改代码、终端、auto memory、Dream 这些核心能力不走 MCP。官方文档服务被用作远程 MCP 的入门示例，部分账号在 `/mcp` 里还能直接看到 Anthropic 提供的 Claude Docs 连接器；在 claude.ai 加过的连接器，用 Claude 账号登录后也会同步进 Claude Code。做成 CLI 对人在终端里完全成立，Claude Code 自己也有 shell；官方不用这条路，是因为同一套服务还要给 claude.ai、移动端、桌面端用，那些地方不能指望用户安装一个命令行。用户把最硬的一条收成：没有可靠 shell 的环境，CLI 根本用不上。

### 20:05 到 20:06 有 shell 的 Pi 为何后来支持 MCP

用户问 Pi 明明有 shell，为什么后来仍支持 MCP，并要求细说。Pi 早期因为有 shell、认为 CLI 已经够用，而明确不支持 MCP。2026 年 9 月 29 日，Earendil 发表 [“You Said No MCP!”](https://earendil.com/posts/you-said-no-mcp/)，同一时期的 [0.99.0](https://pi.dev/changelog/releases/0.99.0) 把 MCP、codemode、tool search 做成内置扩展。

官方理由不是没有 shell。他们说 MCP 本身有进步，但这还不够把它收进核心，因为它本来就可以继续当社区扩展。真正促成内置的是：要做好 MCP，harness 必须改几处，而这些改动本身也有用，尤其是 codemode——在 Pi 自己的循环里跑一个 QuickJS 沙箱，让模型用 JavaScript 编排工具调用。有了它，MCP 工具也能像在 shell 里拼命令那样组合，而不必把所有工具定义一次性塞进上下文。同一套能力还能接 Jev 这类分类模型。他们还给工具加了更细的暴露方式（直接给模型、只给沙箱、延迟加载或隐藏），薄薄一层社区扩展拿不到这些元数据。另外他们也想进场影响生态，希望 MCP 更接近带智能发现的 OpenAPI，工具返回结构化数据。他们承认组合性仍是 MCP 最大的短板，许多现有 server 还按旧习惯返回文本。shell 解决本机命令怎么用，MCP 解决别人已经以标准协议提供的远程服务怎么直接接进来，两者可以并存，Pi 也仍可用 `--no-mcp` 关掉。

## 结果

形成了一套决策方法，并用 Claude Code 文档服务和 Pi，把“没有 shell”的位置说清楚：它是上 MCP 的硬条件，但不是“有 shell 就不必做 MCP”的充分理由。用户随后要求把这场讨论写成两篇笔记，本篇是其中关于 MCP 与 CLI 的一篇。笔记先写在独立工作区，尚未提交或开 PR。

## 所学

默认用 CLI，不是因为 CLI 在所有方面都更好，而是因为它更接近已有接口，维护成本更低。MCP 适合解决三类问题：没有 shell 的客户端、按人按工具收窄且可撤销的授权、以及一次接入后在多个客户端里复用。

“隐藏不开源实现”成立，但要分清对象。远程服务可以不把源码和内部接口发出来；协议一旦公开，能力边界仍然看得见。这件好事 HTTP 也能做，不必先有 MCP。各家 coding agent 把检索、记忆、补全藏在产品内部，靠的是私有接口，不是把这些核心能力先包成 MCP 再给自己用。

“没有 shell”是硬条件，不是完整判据。Claude Code 文档服务用 MCP，主要是为了跨没有 shell 的客户端复用；Pi 有 shell 仍然加 MCP，是为了接现成生态，并用沙箱解决工具组合。有 shell 只说明不是“否则没法用”，不能推出不必做 MCP。

可选项与不做原因：一开始就把业务写进 MCP，或不做 CLI 只做 MCP。对话里不采用，因为接口还可能改，封装层应保持很薄，并以 HTTP 为唯一实现。只给自己用、客户端都有 shell 时，可以一直只保留 CLI。

## 行动指南

### 主题行动指南

#### 背景

已经有线上接口，要决定怎么提供给人和 Agent，以及要不要再包一层给多个客户端用。

#### 核心问题

什么时候封装成 MCP，什么时候用 CLI 或直接调用现有 HTTP。

#### 核心解决方案

1. 把现有 HTTP 接口当作唯一实现，不要在封装层另写业务。可选项是把业务直接写进 MCP 或 CLI；不做，因为接口一改就要多处同步。
2. 默认做 CLI，或让有 shell 的 Agent 直接调 HTTP。可选项是一上来就做 MCP；只在下一步的条件出现时才做。
3. 出现以下情况再加一层薄 MCP：调用方没有可靠的 shell；需要按人、按工具分开且能撤销的 OAuth；要一次接入、很多客户端都能用。
4. 按四个问题判断，有两个以上答“是”就偏向 MCP；若只有自己用，而且接口还在快速变化，继续用 CLI。

#### 验收标准

- 能根据调用方是否有 shell、是否要按用户和工具收窄、是否要多客户端复用，说出选择，并说明不做另一方案的原因。
- 若 CLI 和 MCP 都做，它们只调用同一套 HTTP，业务逻辑不在封装层分叉。

### 细节与其他

#### 若把“隐藏不开源实现”当成选用 MCP 的理由

则：把它理解成远程服务相对开源 CLI 的好处，而不是 MCP 独有的能力。各家 coding agent 的核心检索、记忆、补全通常走私有接口，不必先包成 MCP。

#### 若环境里已经有 shell，但仍看到现成的 MCP 服务

则：可以接入 MCP 以复用生态，也可以继续只用 CLI。有 shell 不是拒绝 MCP 的充分理由。当时比较过的另一方案是坚持“有 shell 就只做 CLI”；Pi 的后续选择说明这条规则过窄。

## 补充说明

- 原始材料：Grok Bot 与 peng cheng 的对话，时间范围 2026-11-15 约 19:38 之前至 20:26（Asia/Shanghai）。本篇写到 Pi 为何加入 MCP；Code Mode 与程序性工具调用见姊妹笔记。
- 相关笔记：[Code Mode 与程序性工具调用](../2026-11-15--code-mode-与程序性工具调用/INDEX.md) — 同一场对话里对 Code Mode、程序性工具调用（PTC）和 Pi 的 `codemode` 的澄清。
- 对话中用到的参考：[On CLIs vs. MCP](https://huggingface.co/blog/nielsr/mcp-vs-cli)、[MCP vs CLI vs Skills](https://openrouter.ai/blog/insights/mcp-vs-cli-vs-skills/)、[Scale Labs MCP vs CLI](https://labs.scale.com/blog/mcp-vs-cli)、[arXiv 2610.30157](https://arxiv.org/html/2610.30157v1)、[MCP、CLI、还是直呼 API？](https://warmwater.dev/blog/mcp-cli-api-integration/)、[Descope：MCP vs CLI](https://www.descope.com/blog/post/mcp-vs-cli)、[kvg.dev：MCP vs CLIs](https://kvg.dev/posts/20260730-mcp-vs-clis/)。
- 官方说明：[Claude Code 连接 MCP](https://code.claude.com/docs/en/mcp)、[MCP 快速入门](https://code.claude.com/docs/en/mcp-quickstart)、Earendil [“You Said No MCP!”](https://earendil.com/posts/you-said-no-mcp/)、[Pi 0.99.0](https://pi.dev/changelog/releases/0.99.0)。