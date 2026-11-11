覆盖窗口：2026-10-16～2026-10-22（生成日 2026-10-23）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 没有落到这个窗口的可核验快照（Wayback 未收录该栏目），不把后来的帖子写进来。Qoder Lite 的 10 美元月费是新的付费档，写在国内进展，不算限时赠送。

<br/>

## 一、本周关键词

MiniMax M3.1 Flash 与 Code Mini App

Reflection Beam 开放权重上 AWS，Claude Duet 开始候补

Cursor 放出 Agent SDK，Kiro 给 IDE 和 CLI 加记忆

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（Hugging Face `lmarena-ai/leaderboard-dataset`，`text_style_control` / overall，榜单发布日 **2026-10-22**，落在本窗口内）。相对上一份快照（2026-10-20）没有新模型进入 Top-15，图中不标 NEW。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-10-22](llm-arena-top15-2026-10-22-marked.png)

#### MiniMax M3.1 Flash

MiniMax 更新 M3.1 Flash。页面称它在 Agent 任务、编程、计算机使用和网络安全上有代际提升，线上推理速度约到原来的 3 倍，使用成本降低 70%。速度和成本是产品页的说法。

> 原始链接：[MiniMax M3.1 Flash](https://www.minimax.cn/blog/minimax-m31f)（发布日 2026-10-19）

#### Reflection Beam：开放权重的编码模型

Reflection 的 Beam 作为开放权重模型，面向 Agent 编码和长任务。AWS 的文章写如何用 SageMaker JumpStart 做实时端点，或用 HyperPod Inference 配合 JumpStart、SGLang、vLLM 做 Kubernetes 上的分布式 GPU。Hugging Face 介绍页的标题写的是可以自己持有和定制的 **501B** 开放模型；参数量只出现在标题，没有从正文再核对。

> 原始链接：[Introducing Reflection Beam on AWS](https://aws.amazon.com/blogs/machine-learning/introducing-reflection-beam-an-open-weight-model-for-agentic-coding-on-aws/)（发布日 2026-10-16）；[Welcome Beam](https://huggingface.co/blog/reflection-beam)（发布日 2026-10-16）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 RSS 没有这一窗口的历史名次。下面 5 条来自 Wayback 对 [github.com/trending](https://github.com/trending) 的存档（Today、全部语言），快照 **2026-10-22**。简介译自存档页描述。

> 存档：[2026-10-22 github.com/trending](https://web.archive.org/web/20261022014611/https://github.com/trending)

1. [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill)：给编码 Agent 用的分阶段安全审计技能，发现要能独立核验。
2. [vllm-project/vllm](https://github.com/vllm-project/vllm)：高吞吐、省内存的大模型推理与服务引擎。
3. [stablyai/orca](https://github.com/stablyai/orca)：并行跑多种编码 Agent 的环境，可用自有订阅。当日简介举例包括 Grok Bot 和 Claude Code。
4. [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)：在工具输出、日志和检索片段进模型之前先压缩。页面称编码 Agent 可少用 20% 的 token，JSON 可少 60% 到 95%。
5. [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)：让编码 Agent 少写不必要的代码。

#### Apple 平台上的本地模型一年

Hugging Face 的 AnyLanguageModel 1.0 标题写的是 Apple 平台本地模型的一年。通用摘要没有 API 清单，变化以原文为准。

> 原始链接：[AnyLanguageModel 1.0](https://huggingface.co/blog/anylanguagemodel-1-0)（发布日 2026-10-20）

<br/>

## 四、国内进展

#### &lt;产品&gt;MiniMax Code 的 Mini App

MiniMax 发布 Code 的 Mini App：带前端和后端、可以一直跑的应用，以插件安装，并能和 Agent 互相调用，让 Agent 的结果留在一个持续存在的页面上，而不是停在一轮对话里。

> 原始链接：[插件即应用：MiniMax Code Mini App](https://www.minimax.cn/blog/minimax-code-mini-app-1792650729)（发布日 2026-10-22）

#### &lt;定价&gt;Qoder Lite：每月 10 美元

Qoder Lite 每月 10 美元，含 1,000 积分和一组成本更低的模型。这是新的付费档，不是限时赠送。

> 原始链接：[Introducing Qoder Lite](https://qoder.com/blog/qoder-lite)（发布日 2026-10-21）

<br/>

## 五、国际进展

#### &lt;产品&gt;Claude Duet

Claude Duet 是一个把 Claude 当作主动 Agent 的新应用。研究预览从即日起对美国的 Pro、Max 和 Ultra 订阅者开放候补。

> 原始链接：[Introducing Claude Duet](https://claude.com/resources/articles/claude-duet)（发布日 2026-10-21）

#### &lt;框架&gt;Cursor Agent SDK

Cursor 放出 Agent SDK，称 Bugbot、安全审查智能体和 Rollouts 这些自家托管智能体就是用它做的。用代码定义智能体，一条命令完成部署。

> 原始链接：[隆重推出 Agent SDK](https://cursor.com/cn/blog/agent-sdk)（发布日 2026-10-20）

#### &lt;工单&gt;在 Linear 里把问题派给 Amp

Amp 成为 Linear 里的一个 Agent。把问题指派或委托给 Amp，或提及 @Amp，就会开一条 Agent 会话并拉起 orb；也可以为每个新问题跑一次性的分诊 orb。

> 原始链接：[Assign It To Amp](https://ampcode.com/news/assign-it-to-amp)（发布日 2026-10-19）

#### &lt;记忆&gt;Kiro 的 IDE 和 CLI 开始记得偏好

Kiro 在 IDE 和 CLI 里加记忆，包括工作偏好、仓库里的命令和约定，以及纠正。记忆若不可审、不可删，就会变成下一轮的隐蔽提示。

> 原始链接：[Introducing memory in Kiro IDE and CLI](https://kiro.dev/blog/memory-in-ide-cli/)（发布日 2026-10-20）

#### &lt;正确性&gt;Kiro 如何改自己，并保持修改诚实

Kiro 写到，文件读取和搜索工具的描述里有一句与 harness 实际行为不符，而且已经进了产品。后半讲的是怎样让这类修复保持可核对。工具描述也是产品行为，不能只当注释。

> 原始链接：[How Kiro fixes itself](https://kiro.dev/blog/how-kiro-fixes-itself/)（发布日 2026-10-20）

#### &lt;迁移&gt;Navan 把一个月的迁移收成一周

Cursor 的客户故事称，Navan 最近一次迁移涉及 8 个应用和 15 个库，大约一周完成，开发期间没有冻结代码库。

> 原始链接：[Navan 将长达一个月的迁移缩短至一周](https://cursor.com/cn/blog/navan)（发布日 2026-10-16）

<br/>

本期于 2026-11 按新版格式补录。
