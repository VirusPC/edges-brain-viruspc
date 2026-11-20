# 编码 Agent 用户打断是否带入下一轮

> 用户在写代码时打断当前轮，下一轮请求要不要带上已经流出的内容，会直接影响模型是否重复操作、是否认清仓库状态。这次先对 Pi 说错了，再按源码纠正，并对照了几家主流实现。

## 背景

peng cheng 直接基于 Pi 自研编码 Agent，vendoring `pi-agent-core` 与 `pi-ai`，并用自己的 `PiTurnRunner` 组装循环。2026-11-20，他问：编码场景里用户可能打断会话，打断出来的内容要不要带进下一轮对话。随后又追问 Pi 是否真是那样做，以及其他家 coding agent 是否相同。这次对话只讨论打断后的上下文策略，没有改 `PiTurnRunner` 的代码。

## 主题

把「用户中途打断当前轮」拆成两段来看：模型还在流式输出时被打断，以及模型已经给出完整工具调用、工具正在执行时被打断。要弄清各家会把什么交给下一轮模型，以及 `PiTurnRunner` 该怎么选。

- 难点一：半截 assistant 文本回放可能不合法。只有 reasoning、工具参数不完整，或格式残缺，都可能让 API 报错。
- 难点二：工具一旦开始执行，副作用已经发生。上下文里如果没有对应结果，模型对仓库状态的判断会和实际情况不一致。
- 难点三：各家并不统一。有的丢掉半截文本，有的保留，有的再注入一句「被打断了」的说明。不能把一家的做法说成行业通例。

## 过程

### 时刻不详 提出问题，第一次回答未核对源码

用户问：编码场景可能会打断会话，要不要把打断的内容带进下一轮。

当时的第一次回答没有去查源码，给出的建议是：要带，但只带已经真实发生的部分，并在末尾标明「被用户打断」。理由是：打断常常是在纠正方向；工具一旦执行，副作用已经发生；许多模型 API 还要求每个 tool_use 都配一条 tool_result。当时还按这个思路写了细则，例如保留已流出的文本并标 aborted、给未执行的工具补合成结果、正在执行的工具回填部分输出，并建议在新消息前加一句系统提示。

这次回答还写了一句未经核对的判断：Claude Code、Codex、Pi 基本都是这个做法。对 Pi，更是直接说它会保留已流出的部分输出，并用 `stopReason: "aborted"` 标记后带给下一轮。这个判断后来被证明是错的。

### 时刻不详 追问 Pi，核对源码后更正

用户追问：「pi是这个做法？」

对照 `earendil-works/pi` 当时的 `main` 分支，提交 `edfe6b2` 后，结论正好相反。

`packages/ai/src/api/transform-messages.ts` 在组装下一轮请求时，会跳过 `stopReason` 为 `aborted` 或 `error` 的 assistant 消息。这些消息可以留在会话记录和界面上，但不会发给模型。注释给出的理由是：这段输出可能只有 reasoning 没有正文，或者工具调用不完整；回放可能触发 API 报错，例如 OpenAI 的 “reasoning without following item”。因此让模型从上一个完整状态重新开始。

工具执行中被打断，则是另一条路径：`agent-loop.ts` 会保留已经完整的 assistant 消息，给还没执行或被中止的工具补一条 `isError: true` 的结果，内容是 `"Operation aborted"`。bash 被中止时，已经打出来的部分输出会一并返回。若某个工具调用始终没有对应结果，例如用户直接插入了新消息，`transform-messages.ts` 还会自动补一条 `"No result provided"` 的错误结果，保证请求合法。

Pi 不会再额外注入「上一轮被打断」这类提示。

当时据此修正了建议：丢掉半截输出更稳，不会因为格式出错；如果仍想让模型知道自己刚才准备做什么、被否定的又是什么，可以不回放原消息，而在 `PiTurnRunner` 里加一条用户侧说明。

### 时刻不详 追问其他家是否如此

用户再问：「其他家coding agent也是如此么」

### 10:55–11:03 从源码对照各家实现

随后浅克隆了开源仓库，按源码核对 Codex、OpenCode、Gemini CLI；Claude Code 因闭源只采用官方文档风格的公开证据；Aider 和 Cline 作为可选补充。时间均为 Asia/Shanghai。

核对到的版本是：

- Codex：`openai/codex` 的 `main`，提交 `e787cf7024fa66e4ec26c6c2ba9c122e045dedb9`（2026-11-20 10:42）
- OpenCode：`sst/opencode` 的 `main`，提交 `3f51686f20e551459590ec9e11907912067fc3f3`（2026-11-20 10:49）
- Gemini CLI：`google-gemini/gemini-cli` 的 `main`，提交 `d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd`（2026-11-20 05:45）
- Aider：`Aider-AI/aider` 提交 `5dc9490bb35f9729ef2c95d00a19ccd30c26339c`（2026-05-22 22:02）
- Cline：只核对了 `main` 上 `20b042723a14412f6c1e84230b008708534d6e8c` 的 `message-builder.ts`，不是完整 abort 路径审计
- Claude Code：闭源，依据公开证据，不是源码

对照结果见「结果」。据此形成的 `PiTurnRunner` 取舍是：流式半截文本按 Pi 那样丢掉，再补一句 Codex 风格的 `turn_aborted` 说明，写明这次是有意打断、哪些工具被停、它们可能已经跑过一部分。

### 11:03 要求把这次讨论沉到 Project 里

用户说「沉淀笔记，沉淀project里」。本笔记就是这次整理的结果。

## 结果

做成了这些事：纠正了对 Pi 的错误判断；按源码（或公开证据）对照了各家在三类问题上的做法；明确了 `PiTurnRunner` 的建议策略。还没有改 `PiTurnRunner` 的代码。

各家对照如下。

### Pi

1. 流式文本中断：不带给模型。`transform-messages.ts` 跳过 `stopReason` 为 `aborted` 或 `error` 的 assistant 消息，只留在会话和界面。
2. 工具执行中中断：保留完整 assistant；补 `isError` 结果 `"Operation aborted"`；bash 保留部分输出；孤儿 tool call 补 `"No result provided"`。
3. 不注入「被打断了」这类标记。

### Codex

1. 未完成的流式条目不带给模型；已经 `OutputItemDone` 的完整条目会写入历史。`handle_output_item_done`（`codex-rs/core/src/stream_events_utils.rs`）只在条目完成时调用 `record_completed_response_item`。`codex-rs/core/src/session/turn.rs` 的注释写：中断的响应可能丢掉未完成的 partial item，drain 期间只有 `OutputItemDone` 确认过的条目才对外暴露。
2. 已完成的 `function_call` 保留；未完成或被中止的调用由 `drain_in_flight` 写入合成 `function_call_output`。文案在 `ToolCallRuntime::stopped_response`（`codex-rs/core/src/tools/parallel.rs`）：`"aborted before dispatch"`、`"aborted by user after {secs:.1}s"`；`exec_command` 为 `"Wall time: {secs:.1} seconds\naborted by user"`。另有 `"aborted before handler start: {reason}"`。这条 abort 合成路径默认不含 stdout；若 handler 自己先返回，才会是 handler 的结果。
3. 默认注入标记（`agent_interrupt_message_enabled` 默认 `true`）。`handle_task_abort` 调用 `record_interrupted_turn_history`，写入带 `<turn_aborted>` 包裹的用户消息（multi-agent v2 则为 developer 消息）。正文是：`"The user interrupted the previous turn on purpose. Any running unified exec processes may still be running in the background. If any tools/commands were aborted, they may have partially executed."`（`codex-rs/core/src/context/turn_aborted.rs` 中的 `INTERRUPTED_GUIDANCE`）。

### OpenCode

1. 流式文本会带给模型，这一点和 Pi 相反。`toLLMMessage` / `assistant()`（`packages/core/src/session/runner/to-llm-message.ts`）在 `message.error` 为空，或 `type === "aborted"` 时保留全部 `content`。被切断时：丢掉尚未跑起来的 tool，以及后面没有正文的 reasoning；非空 text 保留。
2. 未结算工具由 `failUnsettledTools(TOOLS_INTERRUPTED)` 写成 error，文案是 `"Tool execution interrupted"`（`packages/core/src/session/runner/step.ts`）。Shell 已启动则保留至今输出，并附 `"Command interrupted by the user (shell ID: ...)"`（`packages/core/src/shell/result.ts` 的 `interrupted()`）；未启动则是 `"Command interrupted by the user before it started."`。发给模型时，没跑起来的 tool 会被丢掉。
3. 没有单独的「you were interrupted」用户消息。助手上会挂 `error: { type: "aborted", message: "Step interrupted" }`，但这是消息元数据，`toLLMMessage` 不会把它变成文本发给模型。模型能直接看到的是 tool result 里的 interrupted 文案。

### Gemini CLI

1. 流式文本不带给模型。模型轮只在流成功结束后才 `agentHistory.push`（`packages/core/src/core/geminiChat.ts`）。中止时 `sendMessageStream` 的 finally 会 `rollback(promptOriginalHistoryLength)`。半截文本只进 UI（pending item，以及 INFO `"Request cancelled."` / `"User cancelled the request."`），不进下一轮模型请求。
2. `createCancelledResult`（`packages/core/src/scheduler/tool-executor.ts`）生成 `functionResponse`，error 为 `"[Operation Cancelled] User cancelled tool execution."` 或 `"[Operation Cancelled] Operation cancelled."`；若取消前已有 `llmContent`，会保留输出并写入 `error`。UI 侧 `createCancelledToolCall` 使用 `"[Operation Cancelled] Reason: User cancelled operation"`。ESC 后 `handleCompletedTools` 在 `turnCancelledRef` 为真时把这些结果 `addHistory`，但不立刻续跑模型。若本批工具全部取消，且不是这条 ESC 主路径，会 `discardTrailingUnansweredToolCallTurn()` 丢掉未回答的 model functionCall 轮。下一轮若仍有未配对 functionCall，`closeUnansweredToolCallsTurn` 补 `response: { error: "Response was lost or interrupted." }`。
3. 有模型可见标记：`"[The previous response was interrupted before it completed.]"`（`INTERRUPTED_RESPONSE_PLACEHOLDER`，定义在 `packages/core/src/utils/historyHardening.ts`）。`closeUnansweredToolResponseTurn` 会在 tool response 之后插入一则合成 model 轮，避免下一则用户消息和未闭合的工具回合粘在一起。UI 的 “Request cancelled.” 不发给模型。

### Claude Code（闭源，非源码证据）

公开证据表明会把显式中断标记带进后续上下文，这一点和 Pi 不同。

- Superlinear Academy 对系统提示的整理：会话里会出现合成消息 `"[Request interrupted by user]"` 和 `"[Request interrupted by user for tool use]"`，看起来像 assistant，实际是系统在用户取消时插入的；并指示模型不要自己发出这些字符串。
- GitHub issues（如 anthropics/claude-code#25920）显示 session `.jsonl` 里有 user 消息，content 为 `"[Request interrupted by user for tool use]"`。#78915、#29243、#111053 也反复出现这两条字符串。

半截流式 assistant 正文是否保留：闭源，无法从源码确认，记为未知。能确定的是：下一轮上下文里会有上述中断标记。

### Aider（可选补充）

1. 保留半截 assistant，并带进下一轮。中断处理前先调用 `add_assistant_reply_to_cur_messages()`，把 `partial_response_content` 写入 `cur_messages`（`aider/coders/base_coder.py`）。官方文档也写：The partial response remains in the conversation.
2. 不是典型的 tool-calling 循环；shell 是回复后再确认执行，这一项不太适用。
3. 会注入标记：在用户消息末尾追加 `"^C KeyboardInterrupt"`（或新加一条该用户消息），再加一条 assistant：`"I see that you interrupted my previous reply."`

### Cline（可选补充，仅部分源码）

`MessageBuilder.buildForApi`（`sdk/packages/core/src/session/services/message-builder.ts`）会给没有结果的 `tool_use` 补 `is_error: true` 的 `tool_result`，文案是 `"Tool execution was interrupted before a result was produced."`（有工具名时再加 `Tool: {name}.`）。

流式半截文本是否保留，以及普通 ESC 后会不会另注一条 “you were interrupted”：这次没有完整追踪 live abort 路径，记为未知。公开 PR #13175 的描述称，CLI 在 Escape 后复用活会话、直接发用户下一条消息，不另造合成 prompt；Resume 则可能用 `"[TASK RESUMPTION] Please continue where you left off."` 这是 PR 描述，不是这次完整源码追踪。

## 所学

各家并不都和 Pi 一样。丢掉半截流式文本的是 Pi、Codex、Gemini CLI；OpenCode 和 Aider 会带上。会给模型显式中断说明的是 Codex、Gemini CLI、Claude Code、Aider；Pi 和 OpenCode 不另注这类用户或系统提示，OpenCode 只在 tool result 里说明。

相关可选项当时都出现过，最终建议采用第三条：

1. 第一次未核对源码时的做法：保留已流出文本，补齐工具结果，再标「被用户打断」。好处是模型能看见自己刚才准备做什么；风险是半截 reasoning 或残缺工具调用可能让 API 报错。Pi 的源码注释专门写了这种失败模式，所以不再把回放半截文本当作默认策略。
2. 完全照抄 Pi：丢掉 aborted 的 assistant，只为已发出的工具补 `"Operation aborted"`，不另写说明。这样做请求更安全，但模型不知道这次是用户有意打断，也不知道哪些工具可能已经跑过一部分。
3. 流式半截文本按 Pi 丢掉，再加一条 Codex 风格的说明：写明打断是有意的、哪些工具被停、它们可能已经部分执行。这是给 `PiTurnRunner` 的建议。它不回放可能违法的半截消息，又能把「发生过什么」告诉模型。
4. Gemini CLI 会在中止时回滚本轮，再用占位 model 轮补边界；Claude Code 则插入短标记字符串。这两条当时只作对照，没有选作 `PiTurnRunner` 的默认方案。Gemini 的回滚更彻底，模型更看不见刚才发生的事；Claude 的短标记能说明被打断，但不说明哪些工具可能已经部分执行。

还有一条方法上的教训：在陈述某个框架「就是这样做」之前，先核对源码。第一次把 Pi 说成会保留部分输出并标记 aborted，就是因为只凭推测，没有打开 `transform-messages.ts`。

## 行动指南

### 主题行动指南

#### 背景

自研或二次组装的编码 Agent，用户常常在模型还在说话、或工具正在跑的时候按停止。下一轮请求如果处理不好，不是 API 报错，就是模型重复已经做过或已被否定的操作。

#### 核心问题

打断后的内容，哪些可以安全地交给下一轮模型，哪些必须丢掉，以及要不要另写一句说明，让模型知道这次是用户有意打断。

#### 核心解决方案

1. 把打断分成两类分别处理：模型还在流式输出，以及工具已经在执行。不要混成一种策略。
2. 流式输出中途被打断时，不要把半截 assistant 文本（尤其是只有 reasoning、或工具参数不完整的片段）回放给模型。可选项是像 OpenCode、Aider 那样保留非空正文；不做这条，是因为 Pi 已经证明回放可能触发 API 错误，Codex 和 Gemini CLI 也选择不把未完成条目发给模型。
3. 工具调用一旦完整发出，就必须给每个调用配一条结果。用户中止时，写入明确的错误结果，说明操作被中止；命令类工具如果已经有部分输出，应一并带回。可选项是不补结果、或直接丢掉整轮工具调用；不做这些，是因为多数模型 API 要求 tool_use 和 tool_result 成对，而且副作用可能已经发生。
4. 在下一轮请求里加入一条简短、明确的中断说明：告诉模型上一轮是用户有意打断，哪些工具被停止，它们可能已经部分执行；并以用户的新指令为准，不要自动续做。可选项是完全不写说明（Pi、OpenCode），或只插入一句短标记（Claude Code 的公开证据）；推荐写得更像 Codex，因为编码场景里「工具可能已经改过文件」这一条对后续判断很重要。
5. 陈述某框架的行为时，先打开对应源码或可靠的公开证据，再下结论。不要把「常见做法」直接安到未核对的产品头上。

#### 验收标准

- 流式中途打断后，下一轮发给模型的请求里没有未完成的 assistant 文本，也没有残缺的工具调用 JSON。
- 已经完整发出但未执行完的工具，在下一轮请求里都有对应的中止结果；命令类工具若有部分输出，结果里能看到。
- 下一轮请求里有一句模型可见的说明，写明这是有意打断、哪些工具被停、它们可能已经部分执行。
- 没有把某一家未核对的实现，说成所有 coding agent 的通例。

### 细节与其他

#### 若要在 `PiTurnRunner` 里落地

则： abort 时不要把 `stopReason` 为 `aborted` 的半截 assistant 放进下一轮请求，这一点与 Pi 的 `packages/ai/src/api/transform-messages.ts` 一致（对照提交 `edfe6b2`）。对已发出的工具，按 `agent-loop.ts` 补 `"Operation aborted"` 一类错误结果，命令输出能保留的就保留。然后额外写入一条 Codex 风格的说明，不要回放被丢掉的原文。说明里应写清：这次打断是有意的；哪些工具被停止；它们可能已经部分执行。文案可以参考 Codex 的 `INTERRUPTED_GUIDANCE`，不必原样复制 `<turn_aborted>` 标签。可选项是只做 Pi 的补结果、不加说明；不加的代价是模型不知道自己被用户打断，也不知道工具是否已经动过仓库。

#### 若对照或回归某家实现

则：以当时核对过的提交为准，路径不要凭记忆改写。

- Pi：`earendil-works/pi`，`edfe6b2`；`packages/ai/src/api/transform-messages.ts`，`agent-loop.ts`
- Codex：`openai/codex`，`e787cf7024fa66e4ec26c6c2ba9c122e045dedb9`；`codex-rs/core/src/context/turn_aborted.rs`，`codex-rs/core/src/tasks/mod.rs`，`codex-rs/core/src/tools/parallel.rs`，`codex-rs/core/src/session/turn.rs`
- OpenCode：`sst/opencode`，`3f51686f20e551459590ec9e11907912067fc3f3`；`packages/core/src/session/runner/to-llm-message.ts`，`packages/core/src/session/runner/step.ts`，`packages/core/src/shell/result.ts`
- Gemini CLI：`google-gemini/gemini-cli`，`d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd`；`packages/core/src/core/geminiChat.ts`，`packages/core/src/utils/historyHardening.ts`，`packages/core/src/scheduler/tool-executor.ts`
- Aider：`Aider-AI/aider`，`5dc9490bb35f9729ef2c95d00a19ccd30c26339c`；`aider/coders/base_coder.py`
- Cline：只核对了 `message-builder.ts`，不要把它写成完整 abort 行为
- Claude Code：只引用公开证据，不要写成已经读过源码

## 补充说明

- 原始材料：peng cheng 与 Grok Bot 在 2026-11-20 的对话，时间范围约当天至 11:03（Asia/Shanghai）。议题从「打断内容要不要带进下一轮」追问到 Pi 的真实做法，再对照其他 coding agent，最后要求沉淀到个人大脑 Project。
- 本笔记写入已有 Project「Agent 基础设施」（`projects/agent-infra/`），因为这里已有 Pi 生态和 coding agent 调研；没有为此新建 Project，也没有放进 dsh 课程 Project。
- 相关已有材料：[pi 生态与插件扩展](../../2026-10-19--pi生态与插件扩展.md) — 更早的 Pi 生态笔记，不包含本次打断策略。
- Claude Code 的公开证据来源：[A Peek Inside Claude Code (and Cursor)](https://www.superlinear.academy/c/share-your-projects-en/a-peek-inside-claude-code-and-cursor)；GitHub issues [anthropics/claude-code#25920](https://github.com/anthropics/claude-code/issues/25920)、[#78915](https://github.com/anthropics/claude-code/issues/78915)、[#29243](https://github.com/anthropics/claude-code/issues/29243)、[#111053](https://github.com/anthropics/claude-code/issues/111053)。
- Cline 的 Resume 说法来自公开 PR [cline/cline#13175](https://github.com/cline/cline/pull/13175) 的描述，不是完整源码审计。
- 本次只做记录和对照，没有修改 `PiTurnRunner`，也没有合并任何既有 PR。
