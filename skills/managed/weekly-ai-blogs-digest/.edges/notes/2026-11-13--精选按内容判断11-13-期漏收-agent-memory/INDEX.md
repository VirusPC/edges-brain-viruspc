# 精选按内容判断：11-13 期漏收 Agent memory

2026-11-13。记录本期 AI 资讯漏收 Anthropic《The components of agent memory》的原因、skill 改动，以及用干净 agent 验证精选规则的结果。本文可独立阅读。

## 问题

2026-11-13 期《AI 资讯》没有收入 Anthropic 于 2026-11-06 发表的 [The components of agent memory](https://www.anthropic.com/research/components-of-agent-memory)。这篇文章讲的是 agent memory 与 dreaming，落在本期窗口（11-06～11-12）的第一天，按内容应属 Agent 重点。

## 排查

不是订阅缺失。窗口内 `claude-articles` 与 `anthropic-engineering` 两个源都抓到了这篇。去重时留下了产品源那一份：摘要薄、标题里没有 dream，又夹在十几条产品稿中间，精选时不容易认出来。

真正丢掉它的是 SKILL 第 12 行的总原则：「研究向、红队、纯学术长文不要当作重点，可以不写或一笔带过。」模型看到 URL 在 `/research/` 下，就把它当成研究长文跳过了。判断依据成了路径，而不是内容。

曾经考虑过补订 Olshansk 的 `feed_anthropic_research.xml`，里面也有这篇。但这个源会带进大量科学和对齐方向的长文，与 skill 里「研究向的源不要新加进订阅」冲突，噪声也大，所以不加新源，只改精选规则。

## 改动

在 SKILL 第 12 行末尾加了一句：「判断依据是内容，不是 URL 路径。」不改订阅，也不为 `/research/` 单开白名单。

## 验证

为了看这句是否真的改变精选行为，用一个没有本期上下文的干净 agent，只提供 skill 和日期，从头重跑 11-13 期：46 个源全部成功，窗口内 197 条；Arena 用到 2026-11-11 的榜，Gemini 4 Hydrogen (High) 新进入 Top-15，排第 15。

重跑结果里，这篇被自然选进「国际进展」，标签是〈Agent 记忆〉，并与 LangChain 的 context-engineering-deep-agents-remember 合并为同一条。同样发在 `/research/` 下的 claude-electronics-design 按内容没有选入。这说明精选是按内容判断，既不是看到 `/research/` 就全收，也不是全丢。

中间曾经先用一个已经知道这篇该收的 agent 重跑过，那次不能算盲测。教训是：测 skill 必须换干净的 agent，只给 skill 和输入，不要让它看到旧稿或本题结论。

## 遗留

干净重跑时还记下几处缺口，与这次精选规则无关，但会影响以后出报：

- 没有 Artificial Analysis 密钥，对应小节没写。
- AWS ML 的 RSS 只覆盖到 11-11～11-12，窗口前半段的 AWS 文章缺了。
- linux.do 福利 RSS 有截断，需要翻论坛列表页才能补齐整个窗口。
- Devin 与麦肯锡合作那篇链接已经 404，重跑时去掉了。

本次改动在 [brain#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479)，尚未合并。
