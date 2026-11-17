# Codex 的 Code Mode

> Codex CLI 0.164.0 可以把工具收进一次 JavaScript 执行里编排。省下来的主要是反复读进上下文的工具定义和中间结果；省多少取决于挂了多少工具，以及模型会不会把独立调用并成一批。

## 背景

2026-11-17，peng cheng 与 Grok Bot 核对 Codex 自己的 Code Mode：怎么打开、公开资料里能省多少 token、源码里 `tools` 怎么注入、模型凭什么决定写脚本，以及工具检索为什么用 BM25。上一篇已经分清 Code Mode 这个名字和程序性工具调用的关系；这一篇只记 Codex 这一份实现，方便以后单独查开启方式和源码路径。

## 主题

把 Codex Code Mode 从配置、token、执行机制到「模型何时写脚本」记成可以单独阅读的说明。

- 难点一：OpenAI 没有发布 Codex 开或不开 Code Mode 的官方对比，公开百分比来自别的产品和社区 issue。
- 难点二：省多少同时取决于 MCP 工具的数量，以及模型会不会批量调用。
- 难点三：exec 工具的描述几乎只讲怎么用，「何时用」只有首行，模型因此经常不写脚本，或一次只调一个工具。

## 过程

### 时刻不详 怎么打开

核对的版本是 Codex CLI 0.164.0。在 `~/.codex/config.toml` 增加：

```toml
[features.code_mode]
enabled = true
```

官方配置文档把这项标成 under development，默认关闭。打开后 `codex features list` 里可以看到 `code_mode=true`。

同组还有实验开关，包括 `code_mode_only`、`code_mode_tool_search`。`features.code_mode.excluded_tool_namespaces` 用来排除整个命名空间。MCP server 自己也可以用 `omit_tools_from = ["direct", "deferred", "code_mode"]` 控制出现在哪一面；这条行为来自 commit [`51c9ed6`](https://github.com/openai/codex/commit/51c9ed6d4f6665faa6c443dfa10a8460fd0edbdd)。

Codex Cloud 的 Codex home 是只读的。本机这份配置拿到云端不一定生效。这一点没有实测。

### 时刻不详 公开资料里的省 token 数字

OpenAI 没有给出 Codex 开、关 Code Mode 的官方对比。对话里核对过的数字是：

- Anthropic 的 [code execution with MCP](https://www.anthropic.com/research/code-execution-with-mcp)：两个 server 的示例从 150k token 降到 2k，减少 98.7%。这是挑选过的场景。
- Cloudflare 的 [Code Mode](https://blog.cloudflare.com/code-mode-mcp/)：大约 2500 个端点的 API，从 1.17M token 压到大约 1000 token。
- Bifrost 的 [Code Mode](https://docs.getbifrost.ai/mcp/code-mode)：96 个工具时输入 token 减少 58.2%，251 个减少 84.5%，508 个减少 92.8%，通过率没有下降。工具越多，省得越多。
- AIMultiple 的 [code execution with MCP](https://aimultiple.com/code-execution-with-mcp)：总 token 减少 77.4%，输出 token 增加 120%，延迟增加 7%。
- Codex 社区里，模型经常把本来独立的调用排成串行。在 `AGENTS.md` 里要求用 `Promise.allSettled` 批量之后，[issue #35050](https://github.com/openai/codex/issues/35050) 记下模型轮次减少 52% 到 55%，原始 token 减少 53% 到 63%，额度减少 27% 到 45%。[issue #41450](https://github.com/openai/codex/issues/41450) 里，高上下文任务的累计输入减少 81.6%，检查项 50/50 没有丢。

当时的判断：这些节省主要来自少读缓存上下文的轮次。挂的 MCP 工具越多、模型越愿意一次发出一批调用，省得越多。

Code Mode 不动 skill 的常驻开销。skill 的名字和描述每个会话都在；去读 `SKILL.md` 正文，读到的内容也不会变少，最多是把几次读取并进同一轮。要减 skill 的 token，靠少装、把描述写短、正文分到 `references/`，以及把确定的步骤写成脚本。

Code Mode 可以串 CLI。`exec_command` 本身是 nested tool，可以在一个 exec 块里 `await` 串行，或用 `Promise.allSettled` 并行，并在脚本里过滤输出。沙箱和审批还在。

### 时刻不详 一次 exec 里工具怎么变成函数

源码核对点是 openai/codex 的 `main`，提交 `46f5a1d`，日期 2026-11-17。

`codex-rs/code-mode-runtime/src/runtime/globals.rs` 的 `install_globals`：每次 exec 在一个新的 V8 isolate 里跑。运行时去掉 `console`、`Atomics`、`SharedArrayBuffer`、`WebAssembly`，挂上 `text`、`content`、`image`、`audio`、`generatedImage`、`store`、`load`、`notify`、`setTimeout`、`clearTimeout`、`yield_control`、`exit`。`tools` 和 `ALL_TOOLS` 用 `set_lazy_data_property` 懒加载，第一次读取时才由 `catalog_global` 建出来。

`build_tools_object` 遍历 `enabled_tools`。每个工具一个函数，对象的键是 `global_name`。函数只绑定工具序号，调用链是 `tool_function` 到 `tool_callback`。

`global_name` 由 `code-mode-protocol/src/description.rs` 的 `normalize_code_mode_identifier` 生成：不能出现在 JavaScript 标识符里的字符换成 `_`。MCP 工具原来的名字带 `mcp__服务名__` 前缀，例如 `tools.mcp__ologs__get_profile`。

`runtime/callbacks.rs` 的 `tool_callback` 把参数转成 JSON，生成 `tool-N` 这个 id，创建一个 Promise 交回 JavaScript，并记入 `pending_tool_calls`。事件经 channel 以 `RuntimeEvent::ToolCall` 发给 Rust 宿主。宿主走原来的工具执行链，同一套沙箱、审批和 MCP，完成后再 resolve 这个 Promise。这一层是 RPC，审批仍在宿主那边。

`ALL_TOOLS` 是 `[{name, description}]` 的目录，不能当函数调用。

### 时刻不详 模型凭什么决定写脚本

没有一段硬判断去决定「现在该写脚本」。引导来自 exec 工具的描述。`description.rs` 里 `EXEC_DESCRIPTION_TEMPLATE` 的首行是 “Run JavaScript code to orchestrate/compose tool calls”。后面主要是用法：有 `tools` 这个全局对象；没有 Node、文件系统、网络和 `console`；原始 JavaScript 不要包进 code fence；第一行可以写 pragma `// @exec: {"yield_time_ms":..., "max_output_tokens":...}`；`max_output_tokens` 默认 10000；结束时还没 `await` 的 promise 会被丢掉；helper 里的 `store` / `load` 可以跨 exec 保存数据。

描述后面接 `DEFERRED_NESTED_TOOLS_GUIDANCE`：一部分 deferred 工具不写在描述里，用 `ALL_TOOLS` 按 name 和 description 过滤。打开 tool search 时再追加 `TOOL_SEARCH_GUIDANCE`：`await tools.tool_search({query, limit: 8})`，按 BM25 排序，返回名字和完整的 TypeScript 声明，下一次 exec 再调用。

这份描述可以被按模型准备的 `CodeModeToolMessages` 盖掉。issue #41450 提到 Astra 加上了 `Promise.allSettled` 的批量说法。打开 `code_mode_only` 之后，工具不再直接暴露给模型，描述里会附上 MCP 共用的 TypeScript 类型和每个工具的签名。

对话里的判断是：描述几乎只教怎么用，「何时用」只有第一行，所以模型经常不写脚本，或者一次只调一个。要改变这一点，可以在 `AGENTS.md` 写明何时写脚本、何时批量，也可以打开 `code_mode_only`。当时建议写进 `AGENTS.md` 的规则是：独立的只读命令合并到同一个 exec 块里，用 `Promise.allSettled` 并行；有依赖，或者会改动东西的命令，按顺序执行。

### 时刻不详 工具检索为什么用 BM25

模型通常知道要做什么，不知道工具叫什么名字。grep 做的是精确匹配，也不排序：要么一个都没有，要么一次返回太多。BM25 按词的命中次数和稀有程度排序，只返回 top-limit，token 有上限。它不需要 embedding，也不需要网络，结果确定、可以复现，适合几十到几百条的工具目录。

grep 还在。默认描述就让模型在脚本里自己对 `ALL_TOOLS` 做 filter 或正则。BM25 的 `tool_search` 是多出来的一个入口。目录再大时，常见做法是再加一层 embedding 语义检索。

## 结果

记下了 Codex CLI 0.164.0 的打开方式、上述公开来源里的 token 数字、`46f5a1d` 上从懒加载 `tools` 到宿主 RPC 的路径、描述如何软引导写脚本，以及 BM25 和 `ALL_TOOLS` 过滤各管什么。

仍然没有的两件事：OpenAI 官方的开/关对比；Codex Cloud 上本机 `config.toml` 是否生效。后者未实测。没有回退已核对的结论。

## 所学

省下来的是工具定义和中间结果反复进入上下文的那一部分。少一轮调用，就少读一次已经缓存的上下文，所以社区 issue 里的降幅出现在「把独立调用并成一批」之后。工具面越大，Bifrost 那组输入 token 降得越多。脚本本身也会多写 token：AIMultiple 在总 token 下降的同时，输出 token 增加 120%，延迟增加 7%。

skill 的名字和描述每个会话都在，读 `SKILL.md` 的正文也不因 Code Mode 变短。可选项是指望 Code Mode 削掉 skill 开销；不做，因为那部分不在工具 schema 里。减 skill token 的做法是少装、缩短描述、正文放到 `references/`、确定步骤写成脚本。

每次 exec 都是新的 V8 isolate。`tools` 上的函数只记住工具序号，真正执行回到 Rust 宿主原来的沙箱、审批和 MCP。脚本可以组合、过滤、并行，审批仍由宿主做。`ALL_TOOLS` 只是目录。

模型没有「该不该写脚本」的硬分支。默认描述的首行点出用途，其余是用法，所以常见行为是不写，或一次只调一个。可选项是只开 `code_mode`、继续让工具可以直接调；社区里的批量降幅，是在 `AGENTS.md` 要求 `Promise.allSettled` 之后才出现的。要让脚本成为默认路径，可以写这条规则，也可以开 `code_mode_only`，让工具不再直接暴露。描述还可以按模型用 `CodeModeToolMessages` 覆盖，Astra 就是在描述里加了批量说法。

检索分成两条。名字未知时用 BM25：按词命中和稀有度排出 top-limit，不必联网，几十到几百条目录够用。名字已知时，在脚本里对 `ALL_TOOLS` 做 filter 或正则。可选项是用 grep 代替 BM25 做发现；精确匹配既不排序，也容易一次返回过多。目录规模再上去，再加 embedding；Codex 这份实现用的是 BM25 这一档。

## 行动指南

### 主题行动指南

#### 背景

本机 Codex 挂了不少 MCP 工具，希望少把工具定义和中间结果打进上下文，并让独立的只读调用一次发完。

#### 核心问题

怎样打开 Codex Code Mode，并让模型把该合并的调用写进同一个脚本。

#### 核心解决方案

1. 在 Codex CLI 0.164.0 打开 `features.code_mode`，用 `codex features list` 确认 `code_mode=true`。官方文档标为 under development，默认关闭。可选项是保持关闭；工具很少、调用本来就不连续时，打开的收益有限。
2. 需要工具只出现在脚本里时，打开 `code_mode_only`。可选项是只开 `code_mode`、工具仍然可以直接调；默认描述几乎不讲何时写脚本，模型会继续一轮一个工具。
3. 在 `AGENTS.md` 写明规则：独立的只读命令合并到同一个 exec 块里，用 `Promise.allSettled` 并行；有依赖或会改动东西的命令按顺序执行。可选项是只依赖默认工具描述；issue #35050 的降幅出现在写了批量要求之后。
4. 工具很多、模型不知道名字时，打开 `code_mode_tool_search`，用 `tools.tool_search` 做 BM25 检索，下一次 exec 再调用。名字已经知道时，在脚本里过滤 `ALL_TOOLS` 即可。
5. skill 的常驻 token 另算。要减那部分，少装 skill、缩短描述、正文放到 `references/`，确定步骤写成脚本。

#### 验收标准

- `codex features list` 显示 `code_mode=true`。若要求只走脚本，对应的 only 开关也已打开。
- 独立的只读调用出现在同一个 exec 里，并用 `Promise.allSettled`。有依赖或会改状态的调用仍按顺序执行，审批仍走原来的工具链。
- 能说明省下的是少注入工具定义、少读缓存上下文的轮次，并知道公开百分比来自不同产品和社区 issue，不是 OpenAI 对 Codex 的官方对比。

### 细节与其他

#### 若在本机 Codex CLI 0.164.0 打开 Code Mode

则：编辑 `~/.codex/config.toml`，写入 `[features.code_mode]` 和 `enabled = true`。要排除某些命名空间时设置 `features.code_mode.excluded_tool_namespaces`。某个 MCP server 不想出现在直接调用、延迟目录或 Code Mode 里时，在该 server 上设置 `omit_tools_from = ["direct", "deferred", "code_mode"]`。实验开关还包括 `code_mode_only` 和 `code_mode_tool_search`。

#### 若要在 Codex Cloud 沿用这份本机配置

则：不要假设它已经生效。Codex Cloud 的 Codex home 只读，本机 `~/.codex/config.toml` 在云端不一定生效。这一点未实测。当时没有核对云端是否另有等价开关，所以这里不写云端配置步骤。

#### 若要在一个 exec 里串 CLI

则：`exec_command` 是 nested tool。同一个 exec 块里可以 `await` 串行，或用 `Promise.allSettled` 并行，并在脚本里过滤输出。沙箱和审批仍由宿主执行。

#### 若要在脚本里按名字调用 MCP 工具

则：使用 `normalize_code_mode_identifier` 之后的 `global_name`。不能作为 JavaScript 标识符的字符会变成 `_`。MCP 原名带 `mcp__服务名__` 前缀，例如 `tools.mcp__ologs__get_profile`。`ALL_TOOLS` 只有 name 和 description，不能调用。

## 补充说明

- 原始材料：2026-11-17 peng cheng 与 Grok Bot 的对话。源码核对点为 openai/codex `main` `46f5a1d`（2026-11-17）。曝光面见 commit [`51c9ed6d4f6665faa6c443dfa10a8460fd0edbdd`](https://github.com/openai/codex/commit/51c9ed6d4f6665faa6c443dfa10a8460fd0edbdd)。
- 相关笔记：[Code Mode 与程序性工具调用](../2026-11-15--code-mode-与程序性工具调用/INDEX.md) — 名称从哪来、程序性工具调用和 Pi 的 `codemode` 各指什么，以及 MCP 与 Code Mode 的分工。本篇只写 Codex 的实现。
- 官方配置：[Config reference](https://learn.chatgpt.com/docs/config-file/config-reference) — `features.code_mode` 标注 under development，默认关闭。
- 省 token 的出处（都不是 Codex 官方的开/关对比）：[Anthropic](https://www.anthropic.com/research/code-execution-with-mcp)（150k→2k，-98.7%，挑选场景）、[Cloudflare](https://blog.cloudflare.com/code-mode-mcp/)（约 2500 端点，1.17M→约 1000）、[Bifrost](https://docs.getbifrost.ai/mcp/code-mode)（96 / 251 / 508 个工具）、[AIMultiple](https://aimultiple.com/code-execution-with-mcp)（总 token -77.4%，输出 +120%，延迟 +7%）、[openai/codex#35050](https://github.com/openai/codex/issues/35050)、[openai/codex#41450](https://github.com/openai/codex/issues/41450)。
- 源码位置（`46f5a1d`）：`codex-rs/code-mode-runtime/src/runtime/globals.rs`（`install_globals`、`build_tools_object`）、`codex-rs/code-mode-runtime/src/runtime/callbacks.rs`（`tool_callback`）、`code-mode-protocol/src/description.rs`（`normalize_code_mode_identifier`、`EXEC_DESCRIPTION_TEMPLATE`）。
