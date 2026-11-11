覆盖窗口：2026-10-02～2026-10-08（生成日 2026-10-09）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 当前只剩生成日之后的帖子，Wayback 没有该地址的存档，窗口内的社区帖补不回来。订阅里没有核对到落在本窗口的开发者额度或订阅优惠。

<br/>

## 一、本周关键词

GPT-6 面向所有人，Claude Haiku 5.5

GPT-6 家族选型指南，Sonnet 5.5 进入 Kiro

独立代码审查，以及 Agent 说做完了但数据库并不同意

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（同一份全量数据集，overall，榜单发布日 **2026-10-08**）。相对 2026-10-02 没有新模型进入 Top-15，图中不标 NEW。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-10-08](llm-arena-top15-2026-10-08-marked.png)

#### GPT-6 与智能界面

OpenAI RSS：GPT-6 在 ChatGPT 里全球铺开，并带上 Intelligent UI，回复更快，还可以直接使用可视化的交互。日期取自 RSS。

> 原始链接：[GPT-6 and Intelligent UI for everyone](https://openai.com/index/gpt-6-for-everyone)（发布日 2026-10-07）

#### GPT-6 家族选型

OpenAI RSS：给创业团队的模型指南，讲怎么在 GPT-6 家族里选型、调推理档位、改提示和技能、协调工具，并把工作流准备到生产。

> 原始链接：[A model guide for the GPT-6 family](https://openai.com/index/practical-guide-building-gpt-6)（发布日 2026-10-02）

#### Claude Haiku 5.5

Anthropic News RSS：Haiku 5.5 是当时最快、能力也最强的小模型，面向摘要、子 Agent 和浏览器使用这类大批量工作。AWS 同一天把它放上 Bedrock 和 Claude Platform，并称多数任务大约比 Haiku 4.5 便宜 75%。

> 原始链接：[Introducing Claude Haiku 5.5](https://www.anthropic.com/claude-haiku-5-5)（发布日 2026-10-07）；[Introducing Claude Haiku 5.5 on AWS](https://aws.amazon.com/blogs/machine-learning/introducing-claude-haiku-5-5-on-aws/)（发布日 2026-10-07）

#### Claude Sonnet 5.5 进入 Kiro

Kiro 博客标题称 Sonnet 5.5 已可用，发布日 2026-10-02。RSS 正文没有功能说明，档位以原文为准。

> 原始链接：[Claude Sonnet 5.5 is now available in Kiro](https://kiro.dev/blog/sonnet-5-5)（发布日 2026-10-02）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 Trending RSS 没有这一天的存档。下面 5 条来自 Wayback 对 `github.com/trending`（Today / 全部语言）的存档，快照 **2026-10-08**。

> 存档：[2026-10-08 github.com/trending](https://web.archive.org/web/20261008024504/https://github.com/trending)

1. [morluto/rea](https://github.com/morluto/rea)：用 Agent 做逆向，从应用行为到原生二进制。
2. [mattpocock/skills](https://github.com/mattpocock/skills)：作者从自己的 `.agents` 目录拿出的工程技能。
3. [boykopovar/AnyPS5](https://github.com/boykopovar/AnyPS5)：把 PS5 可执行文件移植到 Linux 和 Windows。
4. [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd)：一个技能，用来阻止编码 Agent 把答案埋进长文。
5. [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)：给多种编码 Agent 用的示意图。当日简介写成 42 种。

#### Agent 说做完了，数据库并不同意

微软在 Hugging Face 用这个标题讨论 Agent 的完成声明和数据库实际状态不一致。该条 RSS 正文为空，步骤以原文为准。

> 原始链接：[The Agent Said It Was Done. The Database Disagreed.](https://huggingface.co/blog/microsoft/thinkingbox)（发布日 2026-10-03）

<br/>

## 五、国际进展

#### &lt;审查&gt;独立审查才敢收 Agent 的改动

CodeRabbit：编码 Agent 可以在有人看清改动之前就把请求变成 pull request。代码能编译、测试能过、摘要也像那么回事，仍可能一起错。独立审查用的是代码库上下文、沙箱和核验，而不是让生成改动的同一条会话给自己盖章。

> 原始链接：[How independent AI code review builds trust](https://coderabbit.ai/blog/why-agentic-change-management-starts-with-independent-ai-code-review)（发布日 2026-10-05）

#### &lt;云端&gt;Claude Code 的云端会话

Anthropic 在 2026-10-06 发了 Claude Code 云端会话的现场指南。长任务可以离开本机，审查和接管仍要有人能中止。

> 原始链接：[Claude Code in the cloud](https://claude.dev/blog/claude-code-in-the-cloud/)（发布日 2026-10-06）

<br/>

本期于 2026-11 按新版格式补录。
