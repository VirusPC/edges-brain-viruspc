覆盖窗口：2026-09-18～2026-09-24（生成日 2026-09-25）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 没有落到这个窗口的可核验快照（Wayback 未收录该栏目），不把后来的帖子写进来。窗口内没有核对到新的开发者额度或订阅优惠。

<br/>

## 一、本周关键词

Kimi K3 登陆 Bedrock，Cursor 推出开发 Bots

Claude Opus 5.5 上 AWS，CodeRabbit 用它做审查对比

Kiro Crew 一周合并一千个 PR，LangSmith 做微调

<br/>

## 二、模型进展

#### 整体排名

本期为补录，覆盖窗口内没有 Arena 榜单发布日。相邻两份是 2026-09-13 和 2026-09-25；后者是本期生成日，不计入窗口。不附榜单图，也不用其它日期的名次充数。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

#### Kimi K3 登陆 Amazon Bedrock

Moonshot 的 Kimi K3 在 Amazon Bedrock 提供。页面称它是开放权重，带原生视觉、约一百万 token 上下文，以及显式的提示缓存，用来降延迟和输入成本。

> 原始链接：[Introducing Kimi K3 on Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/introducing-kimi-k3-on-amazon-bedrock/)（发布日 2026-09-18）

#### Claude Opus 5.5 登陆 AWS

Anthropic 的 Claude Opus 5.5 在 Amazon Bedrock 和 AWS 上的 Claude Platform 提供。页面把它放在 Agent 编码、知识工作和长任务上。

> 原始链接：[Claude Opus 5.5 is now available on AWS](https://aws.amazon.com/blogs/machine-learning/claude-opus-5-5-is-now-available-on-aws/)（发布日 2026-09-22）

#### 零数据保留页面上的 9 月 22 日更新

OpenAI 的零数据保留页面有一条 **2026-09-22** 更新：向 API 客户分阶段推出 Private Safety Processing，以便在前沿模型变强之后继续提供零数据保留。页面没有把这项能力的首次发布时间标成 9 月 22 日，这里只记这次更新。

> 原始链接：[Offering Zero Data Retention for frontier models](https://openai.com/index/offering-zero-data-retention-for-frontier-models/)（更新日 2026-09-22）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 RSS 没有这一窗口的历史名次。下面 5 条来自 Wayback 对 [github.com/trending](https://github.com/trending) 的存档（Today、全部语言），快照 **2026-09-24**。简介译自存档页描述；第一条在存档页上没有简介。

> 存档：[2026-09-24 github.com/trending](https://web.archive.org/web/20260924000041/https://github.com/trending)

1. [anthropics/financial-services](https://github.com/anthropics/financial-services)：存档页未给出简介。
2. [google/ax](https://github.com/google/ax)：Google 的开放 Agent 编排运行时。
3. [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates)：配置和观察 Claude Code 的命令行工具。
4. [BuilderIO/agent-native](https://github.com/BuilderIO/agent-native)：用来做 Agent 应用的框架。
5. [obra/superpowers](https://github.com/obra/superpowers)：Agent 技能框架，以及一套软件开发方法。

#### Transformers 可以直接跑 llama.cpp 量化

Hugging Face 称 Transformers 现在能跑 llama.cpp 的量化格式。把量化权重接进现有推理栈时，少一次格式转换。

> 原始链接：[Transformers now runs llama.cpp quants](https://huggingface.co/blog/transformers-llama-cpp-quants)（发布日 2026-09-22）

<br/>

## 五、国际进展

#### &lt;代码审查&gt;用 Opus 5.5 做审查对比

CodeRabbit 把 Claude Opus 5.5 和自家生产审查器做了对比：抓到哪些缺陷、漏掉哪些，以及把推理档位调高有没有用。换审查模型之前，先看漏报类型，不要只看「抓得更多」。

> 原始链接：[Claude Opus 5.5 for code review](https://coderabbit.ai/blog/opus-5-5-model-review)（发布日 2026-09-22）

#### &lt;交付&gt;Cursor 的 Rollouts 与安全审查 Bot

Cursor 推出一组软件开发 Bot，用来把代码交到生产环境。安全审查和 rollout 被做成可派工的 Bot，而不是聊天结束之后的手工清单。

> 原始链接：[打通最后一公里的 Bots：Rollouts 与 Security Review](https://cursor.com/cn/blog/rollouts-and-security-reviewer)（发布日 2026-09-23）

#### &lt;微调&gt;LangSmith Fine-Tuning

LangChain 发布 LangSmith Fine-Tuning 和命令行工具 SmithTune，用来做训练后的专用模型，而不必先手写整条数据管道。

> 原始链接：[Introducing LangSmith Fine-Tuning](https://www.langchain.com/blog/langsmith-fine-tuning)（发布日 2026-09-24）

#### &lt;软件工厂&gt;Kiro Crew 一周合并一千个 PR

Kiro 称，三名全职做 Crew 的人在七天里合并了 1,000 个 pull request。这个数字是团队自述。值得看的是工厂如何把审查和合并留下来，而不是把 1,000 当成目标。

> 原始链接：[How we built a software factory with Kiro Crew](https://kiro.dev/blog/software-factory-1000-prs/)（发布日 2026-09-18）

<br/>

本期于 2026-11 按新版格式补录。
