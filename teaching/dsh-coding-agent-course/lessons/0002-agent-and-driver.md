# 0002 · 控制接口与执行驱动

目标：判断某个架构问题应该先去 `agent` 还是 `agent-loop` 找证据，为比较 Coding Agent 建立一个稳定维度。预计 10 分钟；不要求先运行 DSH。

## 一个具体问题

“换模型之后，谁决定何时调用模型、何时执行工具、何时继续？”先写下你的判断，再阅读下方说明。若没有相关经验，写“不清楚”即可。

## 只分清两个职责

`core/agent` 提供公开 Agent 控制面及 live registry。调用者通过 `ctx.agents` 创建或恢复 Agent，再通过 Agent 交互。它本身不创建模型请求；registry 把构造委派给已注册 factory。[包契约](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent/README.md) · [AgentRegistry 源码](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent/src/index.ts#L366-L430)

`core/agent-loop` 提供默认 driver，具体驱动模型请求、响应和工具执行。`ReactLoopAgent.step` 在收到模型消息后，检查 tool-call 内容并把调用批交给 `ctx.tools.execute`；没有工具调用时该分支结束为 completed。这里是局部正常分支，不是所有停止条件的完整规则。[包契约](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent-loop/README.md) · [step 分支源码](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent-loop/src/agent.ts#L570-L610)

公开控制面 → 注册的 factory → 默认 driver → 模型流与工具执行服务。

这是简化的职责图，不是完整启动流程或所有生命周期细节。工具执行的具体行为还需继续追踪 tools 服务，不能把循环调用了执行服务等同于循环自己执行 shell。[架构包职责](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/architecture.md#core-packages)

## 比较时能问什么

对另一个 Coding Agent 问相同问题：控制面和执行循环在哪里？哪些证据证明职责可分开？有公开接口不自动证明替换 driver 很容易，更不能由此推断性能更好。当前只完成 DSH 静态证据的一小部分。

## 主动回忆与定位练习

1. 暂时合上说明：描述 `agent` 与 `agent-loop` 各自负责什么。
2. 打开 `AgentRegistry`，定位 `setFactory` 与 `create`。写下调用如何委派给 factory。
3. 打开 `ReactLoopAgent.step`，定位 `toolCalls` 与 `tools.execute`。解释模型提出调用与工具实际执行之间的边界。
4. 用两句话解释：“更换模型不等于更换执行循环”。写明这是基于本课职责划分的推断，不是效果对比结论。

## 即时反馈标准

合格答案应分别指出公开控制面、默认驱动和工具服务，并为至少两个判断给出固定版本的文件/符号。只答“有插件、可扩展”还不足以说明边界。若仍混淆，回到包契约，向 Agent 追问后再试。

## 下次复习

不看材料再画职责图，用另一款 Coding Agent 找同一职责的源码位置。先完成本课，再决定下一课与复测时间。

[概念速查](../reference/architecture-boundary.html) · [资料基线](../RESOURCES.md) · [当前进度](../progress/README.md)
