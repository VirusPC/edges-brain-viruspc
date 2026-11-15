# Code Mode 与程序性工具调用

> Code Mode 和程序性工具调用（PTC）是同一类思路，但不是同一个产品，也不是 Pi 先提出的。

## 背景

2026-11-15 晚上，在谈完 Pi 为何加入 MCP 之后，用户追问 Code Mode 和 MCP 的关系，并确认 Code Mode 是不是就是 PTC、是不是 Pi 提出的。需要把名称、提出方和职责边界写清楚，避免和上一篇的 MCP 与 CLI 选型混在一起。

## 主题

这场讨论要分清三件事：Code Mode 在工具链里处在哪一层，它和 MCP 是什么关系，以及它和 Anthropic 的程序性工具调用、Pi 的 `codemode` 是不是同一个东西。

- 难点一：容易把“给模型用的工具从哪来”和“这些工具怎么组合”看成一件事。
- 难点二：同一类思路有多个名字和实现，容易把后加入的产品当成提出者。

## 过程

### 20:20 Code Mode 和 MCP 是什么关系

用户问 Code Mode 和 MCP 什么关系。说明 Code Mode 不是 MCP 的一部分，它是 Pi 自己的工具编排层；MCP 是被编排的一种工具来源。

MCP 负责把外部服务变成可调用的工具。Code Mode（在 Pi 里叫 `codemode`）是跑在 Pi 循环里的 JavaScript 沙箱，模型在里面写一小段代码，按自己的顺序调用这些工具，并把中间结果留在沙箱里，而不必每一步都打回主对话。没有 MCP 时，它也可以编排本机工具或接 Jev；配了 MCP 后，Pi 会自动加载它，这样远程工具也能像在脚本里组合函数一样用。关系可以记成：MCP 解决“工具从哪来”，Code Mode 解决“怎么组合这些工具”。官方把两者一起做进核心，是因为只接 MCP、仍把所有工具倒进上下文，组合问题还在；有了沙箱，MCP 才比较接近 shell 里拼命令的体验。

### 20:24 Code Mode 是不是 PTC，是不是 Pi 提出的

用户问：Code Mode 就是 PTC 吧？是 Pi 提出的吗？核对公开资料后的结论是：对，是同一类思路，但不是同一个东西，也不是 Pi 先提出的。

这一类做法都是：不要让模型一轮只调一个工具、每次结果都进上下文，而是让它写一段代码，在沙箱里组合调用，只把最终结果送回模型。Cloudflare 在 2025 年 9 月的 [Code Mode](https://blog.cloudflare.com/code-mode/) 里把这个模式说清楚，并且是针对 MCP 工具的。Anthropic 随后推出 [Programmatic Tool Calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)，做法相近，但跑的是 Python，并且嵌在 Claude 的 code execution 里，不叫 Code Mode。

Pi 的 `codemode` 是后来跟进的实现：用 QuickJS 跑 JavaScript，官方也写明和 Codex 的做法类似。Codex、OpenCode 等也有同类能力。因此：PTC 是 Anthropic 的名字，Code Mode 这名字主要来自 Cloudflare，Pi 是采用者，不是提出者。对话结束时，用户要求把这场讨论写成两篇笔记，本篇是其中关于 Code Mode 与 PTC 的一篇。

## 结果

澄清了名称和提出方，也分清了 MCP 与 Code Mode 的职责。笔记先写在独立工作区，尚未提交或开 PR。

## 所学

MCP 和 Code Mode 叠在一起时，容易被看成“一种新协议”。实际上一层是工具来源，一层是编排方式。没有 Code Mode，MCP 仍可把工具直接暴露给模型，只是组合成本高、中间结果容易撑爆上下文；没有 MCP，Code Mode 仍可编排本机工具或其他能力。

名称上不要把 Pi 的 `codemode` 当成源头。Code Mode 这名字主要来自 Cloudflare 在 2025 年 9 月的文章；程序性工具调用（PTC）是 Anthropic 在其后给出的产品名，实现是 Python 和官方 code execution。各家 harness 后来跟进，Pi、Codex、OpenCode 都属于采用或并行实现，细节（语言、沙箱、是否默认开启）不同。

可选项与不做原因：把 Code Mode 和 PTC 当成完全等同的一个功能。对话里不这样写，因为共同的是“用代码编排工具调用”这一思路，产品和运行环境并不相同。把 Pi 写成提出者也不做，因为公开时间线和 Pi 自己的说明都不支持。

## 行动指南

### 主题行动指南

#### 背景

讨论 Agent 工具设计时，会同时遇到 MCP、Code Mode、程序性工具调用这些词，需要先对齐含义再做选择。

#### 核心问题

如何区分工具从哪来、工具怎么组合，以及不要把后出现的实现误认为提出者。

#### 核心解决方案

1. 先问工具从哪来：外部系统用 MCP 或 CLI 或 HTTP；这是来源层。
2. 再问多个工具怎么组合：若让模型一轮调一个工具，中间结果会进上下文；若让模型写代码在沙箱里编排，只回传最终结果，这就是 Code Mode 或程序性工具调用这一类做法。可选项是只接 MCP、不做编排层；对话里指出，这样组合问题还在。
3. 称呼上分开写：Code Mode 优先对应 Cloudflare 提出的名称和思路，PTC 对应 Anthropic 的实现，Pi 的 `codemode`、Codex 等写为后来的实现。不要把它们说成同一个产品，也不要把 Pi 写成提出者。

#### 验收标准

- 能用一句话说清：MCP 解决工具从哪来，Code Mode 或 PTC 解决怎么组合这些工具。
- 能正确指出 Code Mode 的名称主要来自 Cloudflare，PTC 来自 Anthropic，Pi 是采用者。

### 细节与其他

#### 若要解释 Pi 为什么把 MCP 和 codemode 一起做进核心

则：按 Earendil 的说明，只接 MCP 仍难以组合工具；codemode 提供解释器形态的沙箱，MCP 工具才能像 shell 里拼命令那样编排，并且同一套沙箱还能接其他能力。细节见姊妹笔记《MCP 与 CLI 的选型》。

## 补充说明

- 原始材料：Grok Bot 与 peng cheng 的对话，时间范围 2026-11-15 20:20–20:26（Asia/Shanghai）；前置讨论 Pi 加入 MCP 的原因见姊妹笔记。
- 相关笔记：[MCP 与 CLI 的选型](../2026-11-15--mcp-与-cli-的选型/INDEX.md) — 同一场对话里关于何时用 MCP、何时用 CLI，以及 Pi 为何在有 shell 的情况下仍加入 MCP。
- 相关笔记：[Anthropic Agent Memory 四层与做梦](../../../../notes/2026-11-13--anthropic-agent-memory-四层与做梦/INDEX.md) — 此前对 Anthropic 做梦机制的笔记，与本篇的 Code Mode 不是同一件事。
- 官方与原始文章：[Code Mode: the better way to use MCP](https://blog.cloudflare.com/code-mode/)、[Programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)、Earendil [“You Said No MCP!”](https://earendil.com/posts/you-said-no-mcp/)。