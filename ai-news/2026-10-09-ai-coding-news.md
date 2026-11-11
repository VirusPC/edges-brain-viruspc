覆盖窗口：2026-10-02～2026-10-08（生成日 2026-10-09）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 没有落到这个窗口的可核验快照（Wayback 未收录该栏目），不把后来的帖子写进来。窗口内没有核对到新的开发者额度或订阅优惠。

<br/>

## 一、本周关键词

Claude Haiku 5.5 上 AWS

Slack 里协作编码，托管 Deep Agents 可以排程

GLM 5.3 登陆 Bedrock，Sonnet 5.5 进入 Kiro

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（Hugging Face `lmarena-ai/leaderboard-dataset`，`text_style_control` / overall，榜单发布日 **2026-10-08**，落在本窗口内）。相对上一份快照（2026-10-02）没有新模型进入 Top-15，图中不标 NEW。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-10-08](llm-arena-top15-2026-10-08-marked.png)

#### Claude Haiku 5.5 登陆 AWS

Claude Haiku 5.5 在 Amazon Bedrock 和 AWS 上的 Claude Platform 提供。页面称它是 Claude 5.5 家族里最快、最省的一档，面向子 Agent 和大批量、对成本敏感的工作，多数任务的价格大约比 Haiku 4.5 低 75%。

> 原始链接：[Introducing Claude Haiku 5.5 on AWS](https://aws.amazon.com/blogs/machine-learning/introducing-claude-haiku-5-5-on-aws/)（发布日 2026-10-07）

#### Claude Sonnet 5.5 进入 Kiro

Kiro 称 Claude Sonnet 5.5 已在 IDE、CLI、Crew 和 Web 提供，并称它是当时最快的 Sonnet。

> 原始链接：[Claude Sonnet 5.5 is now available in Kiro](https://kiro.dev/blog/sonnet-5-5/)（发布日 2026-10-02）

#### GLM 5.3 登陆 Amazon Bedrock

智谱 GLM 5.3 在 Amazon Bedrock 提供。页面称它是约 753B 参数的混合专家模型，面向编码和长程 Agent 任务，可用兼容 OpenAI 的 API 调用，并用提示缓存降成本和延迟。

> 原始链接：[Introducing GLM 5.3 on Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/introducing-glm-5-3-on-amazon-bedrock/)（发布日 2026-10-05）

#### GPT-6 与智能界面面向所有人

OpenAI 页面《GPT-6 and Intelligent UI for everyone》给出的发布时间为 **2026-10-07** 18:36 UTC。可读副本的前半是导航，没有再抽出可核对的功能清单，能力以原文为准。

> 原始链接：[GPT-6 and Intelligent UI for everyone](https://openai.com/index/gpt-6-for-everyone/)（发布日 2026-10-07）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 RSS 没有这一窗口的历史名次。下面 5 条来自 Wayback 对 [github.com/trending](https://github.com/trending) 的存档（Today、全部语言），快照 **2026-10-08**。简介译自存档页描述。

> 存档：[2026-10-08 github.com/trending](https://web.archive.org/web/20261008024504/https://github.com/trending)

1. [morluto/rea](https://github.com/morluto/rea)：用 Agent 做逆向，从应用行为一直到原生二进制。
2. [mattpocock/skills](https://github.com/mattpocock/skills)：作者从自己的 `.agents` 目录拿出的工程技能。
3. [boykopovar/AnyPS5](https://github.com/boykopovar/AnyPS5)：把 PS5 可执行文件移植到 Linux 和 Windows 的工具。
4. [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd)：一个技能，用来阻止编码 Agent 把答案埋进长文。
5. [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)：给多种编码 Agent 用的示意图。当日简介写成 42 种，早前 8 月 13 日的存档写的是 29 种。

#### Agent 说做完了，数据库并不同意

微软在 Hugging Face 用这个标题讨论 Agent 的完成声明和数据库实际状态不一致。通用摘要没有步骤，不在这里补写方案。

> 原始链接：[The Agent Said It Was Done. The Database Disagreed.](https://huggingface.co/blog/microsoft/thinkingbox)（发布日 2026-10-03）

<br/>

## 五、国际进展

#### &lt;协作&gt;Slack 里一起写代码

CodeRabbit 介绍 Slack Code 频道和 Slack 里的 CodeRabbit Agent：相关的人在同一条线程里写规格、做计划和实现。协作若散回各自的 IDE 会话，规格会再丢一次。

> 原始链接：[Introducing collaborative coding](https://coderabbit.ai/blog/introducing-collaborative-coding)（发布日 2026-10-07）

#### &lt;调度&gt;托管 Deep Agents v0.9

LangChain 的托管 Deep Agents 可以安排后续动作、每次运行单独配置，并对 Slack 消息做反应。Agent 一旦能自己排程，取消和权限要比「能跑」更先设计。

> 原始链接：[Managed Deep Agents v0.9](https://www.langchain.com/blog/managed-deep-agents-schedules-per-run-configuration-slack)（发布日 2026-10-07）

#### &lt;审查&gt;独立审查才敢收 Agent 的改动

CodeRabbit 写独立的 AI 代码审查如何建立对 Agent 改动的信任：用代码库上下文、沙箱工具、模型组合和核验，而不是让生成改动的同一个会话给自己盖章。

> 原始链接：[How independent AI code review builds trust](https://coderabbit.ai/blog/why-agentic-change-management-starts-with-independent-ai-code-review)（发布日 2026-10-05）

#### &lt;办公&gt;Claude 接上 Google 文档、表格和幻灯片

Claude 的 Google Workspace 加载项和连接器进入测试，可以在 Google 文件里用 Claude，或在 Claude 里直接处理这些文件。

> 原始链接：[Claude now works with Google Docs, Sheets, and Slides](https://claude.com/resources/articles/claude-now-works-in-google-docs-sheets-and-slides)（发布日 2026-10-06）

<br/>

本期于 2026-11 按新版格式补录。
