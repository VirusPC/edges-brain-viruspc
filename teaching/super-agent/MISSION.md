# Mission: 吃透 Super-agent 设计探索

## Why
peng cheng 想先把 DeepSeek Harness 团队这篇[《Super-agent 设计探索：迈向更自主的 Agent 系统》](https://www.bilibili.com/opus/1265361021143351318)吃透：不看原文，也能讲清 Super-agent 是一种怎样的架构形态，四个基础特征各自指什么，五个模块各自撑住哪一类能力，以及这篇文章声称了什么、没有声称什么。吃透之后，再去判断或设计持续在线的多任务 Agent 时，才有自己的尺子。这一阶段先不盯某个产品。

## Success looks like
- 不看原文，能用自己的话复述四个基础特征——连续、高效、主动、持久——并且说的是原文里的意思，而不是望文生义。
- 能按顺序说出五个模块的名字，以及原文给它们的职责指向：双层架构兼顾连续与高效，事件驱动实现主动，面向人的交互让连续和高效同时落在交互体验上，计算、状态与环境的分离与 Watchdog 一起支撑跨设备的持久在线与异常自愈。不要求在第 1 课就讲出各节内部机制。
- 能分清这篇文章做了什么、没有做什么：它是面向工程实践的架构思路探讨，不是 DeepSeek Harness 现有产品功能的介绍；文中的内部实例和开源原型是在说明技术路线，不等于正式产品；第 8 节的问题要保持开放，不编造答案。

## Constraints
- 用平常的中文、完整的句子、不堆术语。这些词保持英文或原文写法：Super-agent、Session、ReAct Loop、Router、Worker、Trigger、Thread、Watchdog、Inline、Spill、BYOM、A2A。其余统一用 reference/glossary.html 里的说法。
- 每课约 10 分钟，要能在手机上看。
- 以这篇中文原文为唯一主来源；英文是官方放出的机器翻译，只作对照。延伸资料只做补充，并标明出处。
- 需要时可以简单引用 Anthropic 的《Building always-on agents》，以及原文第 5.2 节点名的「脑手分离」。这不是一门对比课，不要按并列对照来组织课文。
- 不编造原文没有的说法；推断处要标明。第 8 节的开放问题保持开放。

## Out of scope
- 映射到具体产品（DeepSeek Harness 的产品功能、Grok Bot、open-grokbot 等），或按产品使用说明来讲。
- 动手实现一个 Super-agent。
- 把本课写成与 always-on agents 的系统对比课程。
