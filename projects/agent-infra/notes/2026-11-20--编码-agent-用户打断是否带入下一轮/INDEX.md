# 编码 Agent 用户打断是否带入下一轮

> 用户在写代码时打断当前轮，下一轮请求要不要带上已经流出的内容，会直接影响模型是否重复操作、是否认清仓库状态。这次先对 Pi 说错了，再按源码纠正，并对照了几家主流实现。文中事实判断均附当时核对提交的 GitHub permalink（含行锚点），或 Claude Code 的公开证据链接；无法核对的已标「未确认」。

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

这次回答还写了一句未经核对的判断：Claude Code、Codex、Pi 基本都是这个做法。对 Pi，更是直接说它会保留已流出的部分输出，并用 `stopReason: "aborted"` 标记后带给下一轮。这个判断后来被证明是错的，见下一节源码。

### 时刻不详 追问 Pi，核对源码后更正

用户追问：「pi是这个做法？」

对照 [`earendil-works/pi`](https://github.com/earendil-works/pi/commit/edfe6b2ef32283d31efc9e26db86fe48be19d3b2) 当时的 `main` 分支，完整提交 `edfe6b2ef32283d31efc9e26db86fe48be19d3b2`（提交时间 2026-11-20 00:06:00 +0100，合 Asia/Shanghai 为 07:06）后，结论正好相反。

[`packages/ai/src/api/transform-messages.ts`](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/ai/src/api/transform-messages.ts#L216-L223) 在组装下一轮请求时，会跳过 `stopReason` 为 `aborted` 或 `error` 的 assistant 消息。这些消息会先写入会话（[`agent-loop.ts` 在流开始时 `context.messages.push(partialMessage)`](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L428)，中止后仍随 `newMessages` 结束这一轮，见 [L254–L270](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L254-L270)），界面也会展示 aborted 状态（[`assistant-message.ts` L251–L258](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/coding-agent/src/modes/interactive/components/assistant-message.ts#L251-L258)），但不会发给模型。注释给出的理由是：这段输出可能只有 reasoning 没有正文，或者工具调用不完整；回放可能触发 API 报错，例如 OpenAI 的 “reasoning without following item”。因此让模型从上一个完整状态重新开始。

工具执行中被打断，则是另一条路径：`agent-loop.ts` 会保留已经完整的 assistant 消息，给还没执行或被中止的工具补一条 `isError: true` 的结果，内容是 `"Operation aborted"`（[L626](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L626)、[L721](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L721)、[L750](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L750)）。bash 被中止时，已经打出来的部分输出由 coding-agent 的执行器一并返回，不在 `agent-loop.ts` 里拼接：[`bash-executor.ts` 注释写明 “An aborted command still returns the output it produced so far”，并在返回值中带上已捕获的 output](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/coding-agent/src/core/bash-executor.ts#L125-L147)；[`bash.ts` 还会把已有文本与 `"Command aborted"` 拼进错误信息](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/coding-agent/src/core/tools/bash.ts#L402-L403)。若某个工具调用始终没有对应结果，例如用户直接插入了新消息，`transform-messages.ts` 还会自动补一条 `"No result provided"` 的错误结果，保证请求合法（[L196](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/ai/src/api/transform-messages.ts#L196)，插入逻辑见 [L188–L205](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/ai/src/api/transform-messages.ts#L188-L205)）。

在上述请求组装与中止补结果路径中，没有写入「上一轮被打断」这类提示。这次在 `packages/` 下检索 `turn_aborted`、`you were interrupted` 等字符串，也未发现向模型注入这类标记的实现代码。

当时据此修正了建议：丢掉半截输出更稳，不会因为格式出错；如果仍想让模型知道自己刚才准备做什么、被否定的又是什么，可以不回放原消息，而在 `PiTurnRunner` 里加一条用户侧说明。

### 时刻不详 追问其他家是否如此

用户再问：「其他家coding agent也是如此么」

### 10:55–11:03 从源码对照各家实现

随后浅克隆了开源仓库，按源码核对 Codex、OpenCode、Gemini CLI；Claude Code 因闭源只采用公开证据；Aider 和 Cline 作为可选补充。下面列出的提交时间，已从各提交自带的时区转换到 Asia/Shanghai。

核对到的版本是：

- Codex：[`openai/codex`](https://github.com/openai/codex/commit/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9) 的 `main`，提交 `e787cf7024fa66e4ec26c6c2ba9c122e045dedb9`（原时间 2026-11-20 02:42:43Z，合 Asia/Shanghai 为 10:42）
- OpenCode：[`sst/opencode`](https://github.com/sst/opencode/commit/3f51686f20e551459590ec9e11907912067fc3f3) 的 `main`，提交 `3f51686f20e551459590ec9e11907912067fc3f3`（原时间 2026-11-20 02:49:02Z，合 Asia/Shanghai 为 10:49）
- Gemini CLI：[`google-gemini/gemini-cli`](https://github.com/google-gemini/gemini-cli/commit/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd) 的 `main`，提交 `d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd`（原时间 2026-11-19 21:45:31Z，合 Asia/Shanghai 为 2026-11-20 05:45）
- Aider：[`Aider-AI/aider`](https://github.com/Aider-AI/aider/commit/5dc9490bb35f9729ef2c95d00a19ccd30c26339c) 提交 `5dc9490bb35f9729ef2c95d00a19ccd30c26339c`（原时间 2026-05-22 07:02:20 -0700，合 Asia/Shanghai 为 22:02）
- Cline：只核对了 [`main` 上 `20b042723a14412f6c1e84230b008708534d6e8c`](https://github.com/cline/cline/commit/20b042723a14412f6c1e84230b008708534d6e8c) 的 [`message-builder.ts`](https://github.com/cline/cline/blob/20b042723a14412f6c1e84230b008708534d6e8c/sdk/packages/core/src/session/services/message-builder.ts#L55-L56)，不是完整 abort 路径审计
- Claude Code：闭源，依据公开证据，不是源码

对照结果见「结果」。据此形成的 `PiTurnRunner` 取舍是：流式半截文本按 Pi 那样丢掉，再补一句 Codex 风格的 `turn_aborted` 说明，写明这次是有意打断、哪些工具被停、它们可能已经跑过一部分。

### 11:03 要求把这次讨论沉到 Project 里

用户说「沉淀笔记，沉淀project里」。本笔记就是这次整理的结果。

## 结果

做成了这些事：纠正了对 Pi 的错误判断；按源码（或公开证据）对照了各家在三类问题上的做法；明确了 `PiTurnRunner` 的建议策略。还没有改 `PiTurnRunner` 的代码。

各家对照如下。

### Pi

依据提交 [`edfe6b2ef32283d31efc9e26db86fe48be19d3b2`](https://github.com/earendil-works/pi/commit/edfe6b2ef32283d31efc9e26db86fe48be19d3b2)。

1. 流式文本中断：不带给模型。[`transform-messages.ts` L216–L223](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/ai/src/api/transform-messages.ts#L216-L223) 跳过 `stopReason` 为 `aborted` 或 `error` 的 assistant 消息。会话里会留下这条消息（[`agent-loop.ts` L428](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L428)、[L254–L270](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L254-L270)），界面也会展示 aborted（[`assistant-message.ts` L251–L258](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/coding-agent/src/modes/interactive/components/assistant-message.ts#L251-L258)）。
2. 工具执行中中断：保留完整 assistant；补 `isError` 结果 `"Operation aborted"`（[`agent-loop.ts` L626](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L626)、[L721](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L721)、[L750](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L750)）。bash 的部分输出由 [`bash-executor.ts` L125–L147](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/coding-agent/src/core/bash-executor.ts#L125-L147) 返回，[`bash.ts` L402–L403](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/coding-agent/src/core/tools/bash.ts#L402-L403) 会附加 `"Command aborted"`。孤儿 tool call 由 [`transform-messages.ts` L196](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/ai/src/api/transform-messages.ts#L196) 补 `"No result provided"`。
3. 在请求组装与中止补结果路径中，不注入「被打断了」这类标记；这次在 `packages/` 下检索也未发现向模型注入该类提示的实现。

### Codex

依据提交 [`e787cf7024fa66e4ec26c6c2ba9c122e045dedb9`](https://github.com/openai/codex/commit/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9)。

1. 未完成的流式条目不会走完成记录路径；已经完成的条目由 [`handle_output_item_done`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/stream_events_utils.rs#L351) 调用 [`record_completed_response_item`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/stream_events_utils.rs#L79-L91) 写入历史（调用点例如 [L383–L384](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/stream_events_utils.rs#L383-L384)）。[`session/turn.rs` L3623–L3624](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/session/turn.rs#L3623-L3624) 的注释针对客户端暴露：中断的响应可能丢掉未完成的 partial item，drain 期间只有 `OutputItemDone` 确认过的条目才对外暴露。这不是「写给模型的历史」函数本身，但与「未完成条目不进入完成记录路径」一致。
2. 已完成的 `function_call` 保留；仍在途的条目由 [`drain_in_flight`（L3058–L3084）](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/session/turn.rs#L3058-L3084) 经 `record_annotated_conversation_items` 写入会话。被中止调用的合成文案在 [`ToolCallRuntime::stopped_response`（L528–L545）](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tools/parallel.rs#L528-L545)：`"aborted before dispatch"`、`"aborted by user after {secs:.1}s"`；`exec_command` 为 `"Wall time: {secs:.1} seconds\naborted by user"`。另有 [`"aborted before handler start: {reason}"`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tools/registry.rs#L1016-L1018)。`stopped_response` 只构造 `AbortedToolOutput { message }`，这条合成路径不含 stdout。若 handler 在取消前已经完成，或该工具 `finishes_on_cancellation`，会先等待并采用 handler 的结果；但若此时已取消且尚无 `terminal_outcome`，仍可能改写成 `Aborted`（[L422–L455](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tools/parallel.rs#L422-L455)）。
3. 默认注入标记：[`agent_interrupt_message_enabled` 默认 `true`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/config/mod.rs#L4350-L4354)。[`handle_task_abort` 调用 `record_interrupted_turn_history`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tasks/mod.rs#L1306-L1312)（定义见 [L1166–L1183](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tasks/mod.rs#L1166-L1183)）。标记由 [`interrupted_turn_history_marker`（L123–L143）](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tasks/mod.rs#L123-L143) 构造，并用 [`<turn_aborted>` 包裹](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/context/turn_aborted.rs#L36)。普通路径写入用户消息，正文是 [`INTERRUPTED_GUIDANCE`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/context/turn_aborted.rs#L12)：「The user interrupted the previous turn on purpose. Any running unified exec processes may still be running in the background. If any tools/commands were aborted, they may have partially executed.」。[`from_config_and_version`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tasks/mod.rs#L106-L119) 在 multi-agent v2 时改为 developer 消息，此时正文改用 [`INTERRUPTED_NEUTRAL_GUIDANCE`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/context/turn_aborted.rs#L13)（「The previous turn was interrupted on purpose. …」），不是同一句 `INTERRUPTED_GUIDANCE`。

### OpenCode

依据提交 [`3f51686f20e551459590ec9e11907912067fc3f3`](https://github.com/sst/opencode/commit/3f51686f20e551459590ec9e11907912067fc3f3)。

1. 流式文本会带给模型，这一点和 Pi 相反。[`toLLMMessage` / `assistant()`](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/to-llm-message.ts#L146-L170) 在 `message.error` 为空，或 `type === "aborted"` 时保留全部 `content`（[L153–L154](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/to-llm-message.ts#L153-L154)）。被切断时：丢掉尚未跑起来的 tool，以及后面没有正文的 reasoning；非空 text 保留（[L162–L170](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/to-llm-message.ts#L162-L170)）。
2. 未结算工具由 [`failUnsettledTools(TOOLS_INTERRUPTED)`](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/step.ts#L279) 写成 error，文案是 [`"Tool execution interrupted"`](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/step.ts#L66)。Shell 已启动则保留至今输出，并附 `"Command interrupted by the user (shell ID: ...)"`（[`shell/result.ts` 的 `interrupted()`，L36–L47](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/shell/result.ts#L36-L47)）；未启动则是 [`"Command interrupted by the user before it started."`](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/tool/plugin/shell.ts#L434)。发给模型时，没跑起来的 tool 会被丢掉（见上条 cut 过滤）。
3. 没有单独的「you were interrupted」用户消息。助手上会挂 `error: { type: "aborted", message: "Step interrupted" }`（[`STEP_INTERRUPTED`](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/step.ts#L67)，[由 `failAssistant` 写入](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/step.ts#L280)），但这是消息元数据；`assistant()` 只序列化 `content`，不会把这条 error 文案变成文本发给模型。模型能直接看到的是 tool result 里的 interrupted 文案。

### Gemini CLI

依据提交 [`d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd`](https://github.com/google-gemini/gemini-cli/commit/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd)。

1. 流式文本不带给模型。模型轮只在 [`processStreamResponse`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L1603) 成功处理完流之后，才 [`agentHistory.push` 完整的 model parts（L1944–L1948）](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L1944-L1948)。中止时 `sendMessageStream` 的 finally 会在 aborted 情况下 [`rollback(promptOriginalHistoryLength)`（L877–L887）](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L877-L887)。半截文本只进 UI：INFO [`"Request cancelled."`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/cli/src/ui/hooks/useGeminiStream.ts#L1030) / [`"User cancelled the request."`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/cli/src/ui/hooks/useGeminiStream.ts#L1345)，不进下一轮模型请求。
2. [`createCancelledResult`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/scheduler/tool-executor.ts#L455) 生成 `functionResponse`，error 为 `` `[Operation Cancelled] ${reason}` ``（[L460](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/scheduler/tool-executor.ts#L460)），reason 为 [`"User cancelled tool execution."`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/scheduler/tool-executor.ts#L155) 或 [`"Operation cancelled."`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/scheduler/tool-executor.ts#L188-L189)；若取消前已有 `llmContent`，会保留输出并写入 `error`（[L472 起](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/scheduler/tool-executor.ts#L472)）。UI 侧 `createCancelledToolCall` 使用 `"[Operation Cancelled] Reason: User cancelled operation"`（[`useAgentStream.ts` L47–L48](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/cli/src/ui/hooks/useAgentStream.ts#L47-L48)）。ESC 后 `handleCompletedTools` 在 `turnCancelledRef` 为真时把这些结果 [`addHistory`，然后 `return`，不立刻续跑模型（L2193–L2215）](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/cli/src/ui/hooks/useGeminiStream.ts#L2193-L2215)。若本批工具全部取消，且不是这条 ESC 主路径（`turnCancelledRef` 为假），会 [`discardTrailingUnansweredToolCallTurn()`（调用点 L2331，定义 L1460）](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/cli/src/ui/hooks/useGeminiStream.ts#L2317-L2337) 丢掉未回答的 model functionCall 轮（定义见 [`geminiChat.ts` L1460](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L1460)）。下一轮若仍有未配对 functionCall，[`closeUnansweredToolCallsTurn`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L911) 补 `response: { error: "Response was lost or interrupted." }`（错误常量 [L129–L130](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L129-L130)，写入见 [`buildInterruptedToolResponseParts` L2079](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L2079)）。
3. 有模型可见标记：`"[The previous response was interrupted before it completed.]"`（[`INTERRUPTED_RESPONSE_PLACEHOLDER`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/utils/historyHardening.ts#L19-L20)）。[`closeUnansweredToolResponseTurn`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L962) 会在 tool response 之后插入一则合成 model 轮（[L985–L1000](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L985-L1000)），避免下一则用户消息和未闭合的工具回合粘在一起。UI 的 “Request cancelled.” 使用 `MessageType.INFO`（见上 L1030、L1345，以及 [L2320–L2323](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/cli/src/ui/hooks/useGeminiStream.ts#L2320-L2323)），不发给模型。

### Claude Code（闭源，非源码证据）

公开证据表明会把显式中断标记带进后续上下文，这一点和 Pi 不同。

- [Superlinear Academy 对系统提示的整理](https://www.superlinear.academy/c/share-your-projects-en/a-peek-inside-claude-code-and-cursor)：会话里会出现合成消息 `"[Request interrupted by user]"` 和 `"[Request interrupted by user for tool use]"`，看起来像 assistant，实际是系统在用户取消时插入的；并指示模型不要自己发出这些字符串。
- GitHub issues（如 [anthropics/claude-code#25920](https://github.com/anthropics/claude-code/issues/25920)）显示 session `.jsonl` 里有 user 消息，content 为 `"[Request interrupted by user for tool use]"`。[#78915](https://github.com/anthropics/claude-code/issues/78915)、[#29243](https://github.com/anthropics/claude-code/issues/29243)、[#111053](https://github.com/anthropics/claude-code/issues/111053) 也反复出现这两条字符串。

半截流式 assistant 正文是否保留：闭源，无法从源码确认，记为**未确认**。能确定的是：下一轮上下文里会有上述中断标记。

### Aider（可选补充）

依据提交 [`5dc9490bb35f9729ef2c95d00a19ccd30c26339c`](https://github.com/Aider-AI/aider/commit/5dc9490bb35f9729ef2c95d00a19ccd30c26339c)。

1. 保留半截 assistant，并带进下一轮。中断处理前先调用 [`add_assistant_reply_to_cur_messages()`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/coders/base_coder.py#L1534)，把 `partial_response_content` 写入 `cur_messages`（定义见 [L1702–L1706](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/coders/base_coder.py#L1702-L1706)）。官方文档也写：“The partial response remains in the conversation.”（[`commands.md` L81](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/website/docs/usage/commands.md#L81)、[`tips.md` L76](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/website/docs/usage/tips.md#L76)）。
2. 不是典型的 tool-calling 循环；shell 是回复后再确认执行，这一项不太适用。本次未把 Aider 的 shell 确认流程当作 tool-in-flight abort 来审计，不把「工具执行中中断」写成与其他家直接可比的结论。
3. 会注入标记：在用户消息末尾追加 `"^C KeyboardInterrupt"`（或新加一条该用户消息），再加一条 assistant：`"I see that you interrupted my previous reply."`（[L1575–L1581](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/coders/base_coder.py#L1575-L1581)）。

### Cline（可选补充，仅部分源码）

依据提交 [`20b042723a14412f6c1e84230b008708534d6e8c`](https://github.com/cline/cline/commit/20b042723a14412f6c1e84230b008708534d6e8c) 中的 [`message-builder.ts`](https://github.com/cline/cline/blob/20b042723a14412f6c1e84230b008708534d6e8c/sdk/packages/core/src/session/services/message-builder.ts#L55-L56)。

[`MessageBuilder.buildForApi`](https://github.com/cline/cline/blob/20b042723a14412f6c1e84230b008708534d6e8c/sdk/packages/core/src/session/services/message-builder.ts#L189) 会调用 [`addMissingToolResults`](https://github.com/cline/cline/blob/20b042723a14412f6c1e84230b008708534d6e8c/sdk/packages/core/src/session/services/message-builder.ts#L193)，给没有结果的 `tool_use` 补 `is_error: true` 的 `tool_result`（[L749–L763](https://github.com/cline/cline/blob/20b042723a14412f6c1e84230b008708534d6e8c/sdk/packages/core/src/session/services/message-builder.ts#L749-L763)），文案是 [`"Tool execution was interrupted before a result was produced."`](https://github.com/cline/cline/blob/20b042723a14412f6c1e84230b008708534d6e8c/sdk/packages/core/src/session/services/message-builder.ts#L55-L56)（有工具名时再加 `Tool: {name}.`，见 [L766–L769](https://github.com/cline/cline/blob/20b042723a14412f6c1e84230b008708534d6e8c/sdk/packages/core/src/session/services/message-builder.ts#L766-L769)）。

流式半截文本是否保留，以及普通 ESC 后会不会另注一条 “you were interrupted”：这次没有完整追踪 live abort 路径，记为**未确认**。公开 PR [cline/cline#13175](https://github.com/cline/cline/pull/13175) 的描述称，CLI 在 Escape 后复用活会话、直接发用户下一条消息，不另造合成 prompt；Resume 则可能用 `"[TASK RESUMPTION] Please continue where you left off."` 这是 PR 描述，不是这次完整源码追踪。

## 所学

下列对照均以上文「结果」中已标注的源码或公开证据为准。

各家并不都和 Pi 一样。丢掉半截流式文本的是 Pi、Codex、Gemini CLI；OpenCode 和 Aider 会带上。会给模型显式中断说明的是 Codex、Gemini CLI、Claude Code（公开证据）、Aider；Pi 和 OpenCode 不另注这类用户或系统提示，OpenCode 只在 tool result 里说明。Claude Code 半截流式正文是否保留、Cline 的 live abort 全路径，仍为**未确认**。

相关可选项当时都出现过，最终建议采用第三条：

1. 第一次未核对源码时的做法：保留已流出文本，补齐工具结果，再标「被用户打断」。好处是模型能看见自己刚才准备做什么；风险是半截 reasoning 或残缺工具调用可能让 API 报错。Pi 的源码注释专门写了这种失败模式（[`transform-messages.ts` L216–L220](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/ai/src/api/transform-messages.ts#L216-L220)），所以不再把回放半截文本当作默认策略。
2. 完全照抄 Pi：丢掉 aborted 的 assistant，只为已发出的工具补 `"Operation aborted"`，不另写说明。这样做请求更安全，但模型不知道这次是用户有意打断，也不知道哪些工具可能已经跑过一部分。
3. 流式半截文本按 Pi 丢掉，再加一条 Codex 风格的说明：写明打断是有意的、哪些工具被停、它们可能已经部分执行。这是给 `PiTurnRunner` 的建议。它不回放可能违法的半截消息，又能把「发生过什么」告诉模型。文案依据见 [`INTERRUPTED_GUIDANCE`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/context/turn_aborted.rs#L12)。
4. Gemini CLI 会在中止时回滚本轮（[`rollback` L877–L887](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L877-L887)），再用占位 model 轮补边界（[`INTERRUPTED_RESPONSE_PLACEHOLDER`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/utils/historyHardening.ts#L19-L20)）；Claude Code 则插入短标记字符串（公开证据见上）。这两条当时只作对照，没有选作 `PiTurnRunner` 的默认方案。Gemini 的回滚更彻底，模型更看不见刚才发生的事；Claude 的短标记能说明被打断，但不说明哪些工具可能已经部分执行。

还有一条方法上的教训：在陈述某个框架「就是这样做」之前，先核对源码。第一次把 Pi 说成会保留部分输出并标记 aborted，就是因为只凭推测，没有打开 `transform-messages.ts`。

## 行动指南

### 主题行动指南

#### 背景

自研或二次组装的编码 Agent，用户常常在模型还在说话、或工具正在跑的时候按停止。下一轮请求如果处理不好，不是 API 报错，就是模型重复已经做过或已被否定的操作。

#### 核心问题

打断后的内容，哪些可以安全地交给下一轮模型，哪些必须丢掉，以及要不要另写一句说明，让模型知道这次是用户有意打断。

#### 核心解决方案

以下取舍的事实依据见「结果」各节源码或公开证据链接。

1. 把打断分成两类分别处理：模型还在流式输出，以及工具已经在执行。不要混成一种策略。
2. 流式输出中途被打断时，不要把半截 assistant 文本（尤其是只有 reasoning、或工具参数不完整的片段）回放给模型。可选项是像 OpenCode、Aider 那样保留非空正文；不做这条，是因为 Pi 已经证明回放可能触发 API 错误，Codex 和 Gemini CLI 也选择不把未完成条目发给模型。
3. 工具调用一旦完整发出，就必须给每个调用配一条结果。用户中止时，写入明确的错误结果，说明操作被中止；命令类工具如果已经有部分输出，应一并带回。可选项是不补结果、或直接丢掉整轮工具调用；不做这些，是因为工具一旦执行副作用可能已经发生，而且各家都会为缺失结果补一条错误结果以保证请求合法（例如 Pi 的 `"No result provided"`、Cline 的 missing tool_result，见「结果」）。
4. 在下一轮请求里加入一条简短、明确的中断说明：告诉模型上一轮是用户有意打断，哪些工具被停止，它们可能已经部分执行；并以用户的新指令为准，不要自动续做。可选项是完全不写说明（Pi、OpenCode），或只插入一句短标记（Claude Code 的公开证据）；推荐写得更像 Codex，因为编码场景里「工具可能已经改过文件」这一条对后续判断很重要。
5. 陈述某框架的行为时，先打开对应源码或可靠的公开证据，再下结论。不要把「常见做法」直接安到未核对的产品头上。

#### 验收标准

- 流式中途打断后，下一轮发给模型的请求里没有未完成的 assistant 文本，也没有残缺的工具调用 JSON。
- 已经完整发出但未执行完的工具，在下一轮请求里都有对应的中止结果；命令类工具若有部分输出，结果里能看到。
- 下一轮请求里有一句模型可见的说明，写明这是有意打断、哪些工具被停、它们可能已经部分执行。
- 没有把某一家未核对的实现，说成所有 coding agent 的通例。

### 细节与其他

#### 若要在 `PiTurnRunner` 里落地

则： abort 时不要把 `stopReason` 为 `aborted` 的半截 assistant 放进下一轮请求，这一点与 Pi 的 [`packages/ai/src/api/transform-messages.ts` L216–L223](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/ai/src/api/transform-messages.ts#L216-L223) 一致（对照提交 [`edfe6b2ef32283d31efc9e26db86fe48be19d3b2`](https://github.com/earendil-works/pi/commit/edfe6b2ef32283d31efc9e26db86fe48be19d3b2)）。对已发出的工具，按 [`agent-loop.ts`](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L626) 补 `"Operation aborted"` 一类错误结果，命令输出能保留的就保留（[`bash-executor.ts` L125–L147](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/coding-agent/src/core/bash-executor.ts#L125-L147)）。然后额外写入一条 Codex 风格的说明，不要回放被丢掉的原文。说明里应写清：这次打断是有意的；哪些工具被停止；它们可能已经部分执行。文案可以参考 Codex 的 [`INTERRUPTED_GUIDANCE`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/context/turn_aborted.rs#L12)，不必原样复制 [`<turn_aborted>`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/context/turn_aborted.rs#L36) 标签。可选项是只做 Pi 的补结果、不加说明；不加的代价是模型不知道自己被用户打断，也不知道工具是否已经动过仓库。

#### 若对照或回归某家实现

则：以当时核对过的提交为准，路径不要凭记忆改写。下面是这次实际打开过的 permalink。

- Pi：[`edfe6b2ef32283d31efc9e26db86fe48be19d3b2`](https://github.com/earendil-works/pi/commit/edfe6b2ef32283d31efc9e26db86fe48be19d3b2)；[`transform-messages.ts`](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/ai/src/api/transform-messages.ts#L216-L223)，[`agent-loop.ts`](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/agent/src/agent-loop.ts#L626)，[`bash-executor.ts`](https://github.com/earendil-works/pi/blob/edfe6b2ef32283d31efc9e26db86fe48be19d3b2/packages/coding-agent/src/core/bash-executor.ts#L125-L147)
- Codex：[`e787cf7024fa66e4ec26c6c2ba9c122e045dedb9`](https://github.com/openai/codex/commit/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9)；[`turn_aborted.rs`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/context/turn_aborted.rs#L12)，[`tasks/mod.rs`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tasks/mod.rs#L1166-L1183)，[`parallel.rs`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/tools/parallel.rs#L528-L545)，[`session/turn.rs`](https://github.com/openai/codex/blob/e787cf7024fa66e4ec26c6c2ba9c122e045dedb9/codex-rs/core/src/session/turn.rs#L3058-L3084)
- OpenCode：[`3f51686f20e551459590ec9e11907912067fc3f3`](https://github.com/sst/opencode/commit/3f51686f20e551459590ec9e11907912067fc3f3)；[`to-llm-message.ts`](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/to-llm-message.ts#L146-L170)，[`step.ts`](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/session/runner/step.ts#L66-L67)，[`shell/result.ts`](https://github.com/sst/opencode/blob/3f51686f20e551459590ec9e11907912067fc3f3/packages/core/src/shell/result.ts#L36-L47)
- Gemini CLI：[`d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd`](https://github.com/google-gemini/gemini-cli/commit/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd)；[`geminiChat.ts`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/core/geminiChat.ts#L1944-L1948)，[`historyHardening.ts`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/utils/historyHardening.ts#L19-L20)，[`tool-executor.ts`](https://github.com/google-gemini/gemini-cli/blob/d4cb1713fd7fc30f1c03f9ca7cbfed341c97dffd/packages/core/src/scheduler/tool-executor.ts#L455)
- Aider：[`5dc9490bb35f9729ef2c95d00a19ccd30c26339c`](https://github.com/Aider-AI/aider/commit/5dc9490bb35f9729ef2c95d00a19ccd30c26339c)；[`base_coder.py`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/coders/base_coder.py#L1575-L1581)，[`commands.md`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/website/docs/usage/commands.md#L81)
- Cline：只核对了 [`message-builder.ts`](https://github.com/cline/cline/blob/20b042723a14412f6c1e84230b008708534d6e8c/sdk/packages/core/src/session/services/message-builder.ts#L55-L56)，不要把它写成完整 abort 行为
- Claude Code：只引用公开证据，不要写成已经读过源码

## 补充说明

- 原始材料：peng cheng 与 Grok Bot 在 2026-11-20 的对话，时间范围约当天至 11:03（Asia/Shanghai）。议题从「打断内容要不要带进下一轮」追问到 Pi 的真实做法，再对照其他 coding agent，最后要求沉淀到个人大脑 Project。
- 本笔记写入已有 Project「Agent 基础设施」（`projects/agent-infra/`），因为这里已有 Pi 生态和 coding agent 调研；没有为此新建 Project，也没有放进 dsh 课程 Project。
- 相关已有材料：[pi 生态与插件扩展](../../2026-10-19--pi生态与插件扩展.md) — 更早的 Pi 生态笔记，不包含本次打断策略。
- 证据原则：源码论断使用当时实际核对的完整提交 SHA，并以 GitHub permalink 加 `#Lx-Ly` 行锚点定位；Claude Code 只用公开文章和 GitHub issue。凡无法用链接支撑的判断，已标「未确认」或删去。
- Claude Code 的公开证据来源：[A Peek Inside Claude Code (and Cursor)](https://www.superlinear.academy/c/share-your-projects-en/a-peek-inside-claude-code-and-cursor)；GitHub issues [anthropics/claude-code#25920](https://github.com/anthropics/claude-code/issues/25920)、[#78915](https://github.com/anthropics/claude-code/issues/78915)、[#29243](https://github.com/anthropics/claude-code/issues/29243)、[#111053](https://github.com/anthropics/claude-code/issues/111053)。
- Cline 的 Resume 说法来自公开 PR [cline/cline#13175](https://github.com/cline/cline/pull/13175) 的描述，不是完整源码审计。
- 本次只做记录和对照，没有修改 `PiTurnRunner`，也没有合并任何既有 PR。
