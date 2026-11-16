# Mission: 吃透 Building always-on agents

## Why
peng cheng 想先把 Anthropic 这篇 [Building always-on agents](https://claude.com/resources/articles/building-always-on-agents)（William Hu）吃透：不看原文，也能讲清 always-on 只是体验上的「一直在」，底下其实是睡了再醒的 run / session 循环，以及五个原语各自为什么存在、怎么协作。这一阶段先不盯某个产品。

## Success looks like
- 不看原文，用 60 秒复述整体循环：Agent 大半时间在睡；一次 run 从 event inbox 醒来，在一份 session 里做完活、把该留的写下，再睡回去；循环可以一直转。
- 对每个原语都能说出它挡住的失败（或原文给它的位置）：event inbox 防争跑与丢事件；timer 自己不开 run，把未到期的事留在 inbox 外，并让 Agent 能主动醒来；memory 接住多次断裂 run 之间的连续性，且只存查不回来的东西；permissions 约束无人值守时的行动与凭证；outbox 控制何时把结果交给用户，并可用来控制节奏、从投递错误里恢复。
- 能画出一次 deferred tool call 的完整往返：这次 run 结束并保存 session → 请求给用户 → 答复作为事件回到 inbox → 新 run 接着原来的 session；等待期间 worker 仍可处理别的事件。
- 能说出 memory 的规则（只存查不回来的东西，外部系统用指针）和四类记忆：user instructions、user notes、past messages、task progress。

## Constraints
- 用平常的中文、完整的句子、不堆术语。这些词保持英文：Agent、run、session、event inbox、worker、handler、timer、scheduler、memory、outbox、dispatcher、deferred tool call、auto mode、credential proxy。其余统一用 reference/glossary.html 里的说法。
- 每课约 10 分钟，要能在手机上看。
- 以这篇原文为唯一主来源；延伸资料只做补充，并标明出处。
- 不编造原文没有的说法；推断处要标明。

## Out of scope
- 映射到具体产品（open-grokbot、Grok Bot 等）。
- 写代码实现。
- 深挖 dreaming（原文只点到，并指向另一篇 agent memory 文章；需要时再单开一课）。
