# Building always-on agents Resources

## Knowledge

### 一手资料（优先）
- [Article: Building always-on agents（William Hu，Claude / Anthropic）](https://claude.com/resources/articles/building-always-on-agents)
  本课的唯一主来源。讲清 always-on 只是用户体验、run 与 session、五个原语（event inbox、timers、memory、permissions、outbox）以及它们如何转成一个循环。致谢 Rodrigo Olivares、Michael Segner。2026-11-16 抓取的原文页正文未标发布日期；多篇次级报道记为 2026-11-13，课里不以日期当原文事实。Use for: 第 1 课及之后一切「原文怎么说」的问题；复述、测验解释、术语定义都以这篇为准。

### 原文点名的补充（已核对可打开，只作补充）
- [Research: The components of agent memory（Lance Martin，2026-11-06）](https://www.anthropic.com/research/components-of-agent-memory)
  原文讲 dreaming 时写 “our post on agent memory covers this in more detail”。这篇讲 agent memory 的定义、写笔记时的 salience、以及 dreaming 如何纠正记忆、搭 wiki 式表示、把笔记提升到每 session 预加载的一层。Use for: 以后若单开 dreaming / 记忆组织课；本课只点到，不展开。
- [Docs: Memory tool（Claude Developer Platform）](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
  原文把 Messages API 的 memory tool 和 Claude Code 的 auto memory 并列为「目录里的文件」这一实现。这份文档说明 memory 是客户端工具、目录要映射到你控制的存储、以及跨 session 的用法。Use for: 核对「目录映射到 durable storage」这句话的产品落点，不当作 always-on 架构的新主张。
- [Docs: How Claude remembers your project（Claude Code）](https://code.claude.com/docs/en/memory)
  Claude Code auto memory 的产品说明：CLAUDE.md 与 auto memory 的分工、四种笔记类型、`MEMORY.md` 索引只加载前 200 行或 25KB。Use for: 对照原文「user notes 变多之后只加载索引」的写法；本课不把产品细节当原文要求。

### 相关高可信补充（已核对可打开，只作补充）
- [Research: Effective harnesses for long-running agents（Justin Young，2025-11-26）](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents)
  讲跨多个 context window 的 harness：initializer agent、进度文件、一次只推进一步。与原文的 task progress、以及「session 太长就 compact 或新开、途中把该留的写入 memory」是同一类问题，但场景更偏写代码。Use for: 以后讲 task progress 怎么落到文件时对照，不替代本课原文。
- [Research: Effective context engineering for AI agents（2025-09-29）](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)
  讲 context 是有限注意力预算、要保持精瘦，以及 compaction 与 structured note-taking。和原文「初始 context overhead 要 lean，并用 prompt caching」相呼应。Use for: 解释为什么每轮 run 的开头不能把记忆全塞进去。
- [Docs: Choose a permission mode（Claude Code）](https://code.claude.com/docs/en/permission-modes)
  auto mode 的产品说明：用 classifier 审查较高风险的动作，并挡住判定为危险的；最重要的决定仍要人看。原文把这一模式当作 always-on 在无人值守时的现成例子。Use for: 核对 auto mode 一词，不把页面上的产品开关细节读回原文。

## Wisdom (Communities)
- [Claude Community](https://claude.com/community)
  Anthropic 官方的社区入口，上面有线下活动，并指向 Claude Discord 与 Reddit。Use for: 想和其他人讨论 always-on 架构、对照自己的设计时从这里进，不要把社区转述当成原文。
- 用户尚未表达是否愿意加入社区；先只列出，不主动推。

## Gaps
- 原文没有示例代码，也没有规定 inbox / timer / memory 必须用哪一种数据库。课里只教结构与协作，不补一套实现。
- 原文对「run 做到一半又来了新事件」给了三种处理（推到下一次 run、并进当前 run、打断重来），但没有推荐哪一种。课里并列写出，不编造偏好。
- dreaming 在原文里只是一句指针；细节在 *The components of agent memory*，本工作区按任务先不深挖。
- 正式 outbox 被写成可选（多数情况一个 send 工具就够）；只在需要控制节奏或从投递错误里恢复时才上。不要把 outbox 讲成和 inbox 同等必建。
