覆盖窗口：2026-09-25～2026-10-01（生成日 2026-10-02）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 没有落到这个窗口的可核验快照（Wayback 未收录该栏目），不把后来的帖子写进来。窗口内没有核对到新的开发者额度或订阅优惠。

<br/>

## 一、本周关键词

Gemini 4 Argon 登顶 Arena，Manus 2.0

Kiro workflows，Warp 接上 ChatGPT 订阅

Opus 5.5 进入 Kiro，Sonnet 5.5 的审查对比

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（Hugging Face `lmarena-ai/leaderboard-dataset`，`text_style_control` / overall，榜单发布日 **2026-09-30**，落在本窗口内）。红圈为相对 2026-09-25 新进入 Top-15 的 **gemini-4-argon-high**，并且排在第一。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-09-30](llm-arena-top15-2026-09-30-marked.png)

#### Claude Opus 5.5 进入 Kiro

Kiro 称 Claude Opus 5.5 已在 IDE、CLI、Crew 和 Web 提供，并称它是当时最强的 Opus，表现对齐 Fable 5.1 这一档。具体价目以 Kiro 的模型页为准。

> 原始链接：[Claude Opus 5.5 is now available in Kiro](https://kiro.dev/blog/opus-5-5/)（发布日 2026-09-28）

#### Holo4

H company 在 Hugging Face 介绍 Holo4，标题写的是驱动通用计算机使用 Agent。页面通用摘要没有指标，能力边界以原文为准。

> 原始链接：[Holo4: powering generalist computer-use agents](https://huggingface.co/blog/Hcompany/holo4)（发布日 2026-09-28）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 RSS 没有这一窗口的历史名次。下面 5 条来自 Wayback 对 [github.com/trending](https://github.com/trending) 的存档（Today、全部语言），快照 **2026-10-01**。简介译自存档页描述。

> 存档：[2026-10-01 github.com/trending](https://web.archive.org/web/20261001020842/https://github.com/trending)

1. [NVIDIA/OpenShell](https://github.com/NVIDIA/OpenShell)：给自主 Agent 用的运行时，强调安全和私密。
2. [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio)：可本地运行的语音工作室。
3. [mvschwarz/openrig](https://github.com/mvschwarz/openrig)：把 Claude Code 和 Codex 放在同一个多 Agent harness 里跑。
4. [mksglu/context-mode](https://github.com/mksglu/context-mode)：压缩编码 Agent 的工具输出，保留会话记忆，并通过 MCP 和钩子做路由。页面称工具输出可减少 98%。
5. [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)：让编码 Agent 少写不必要的代码。

<br/>

## 四、国内进展

#### &lt;产品&gt;Manus 2.0

Manus 在 2026-09-28（周一）发布 2.0，称这不是小版本，而是新架构和新产品。文中的 Cascade 是新一版自有 Agent harness：项目先保持轻，需要时再调入专项能力，简报、页面、视频和自动化仍在同一个项目里。

> 原始链接：[Introducing Manus 2.0](https://manus.im/blog/introducing-manus-2-0)（发布日 2026-09-28）

#### &lt;计费&gt;Manus Flex：带上自己的 API 钥匙

次日的 Manus Flex 允许在工作区里使用受支持推理服务商的自有 API 钥匙。托管 Agent 和自有钥匙可以并存，账单归属要先说清楚。

> 原始链接：[Introducing Manus Flex](https://manus.im/blog/introducing-manus-flex)（发布日 2026-09-29）

<br/>

## 五、国际进展

#### &lt;工作流&gt;Kiro workflows

Kiro 放出 workflows，用多个 Agent、更少看管地把复杂任务从头做到尾。他们称搭 Kiro 自己的云端配置时就在用这套流程。

> 原始链接：[Introducing Kiro workflows](https://kiro.dev/blog/introducing-workflows/)（发布日 2026-09-30）

#### &lt;订阅&gt;用 ChatGPT 订阅登录 Warp

Warp 允许用 ChatGPT 订阅支付终端和 Agent CLI 里的 AI 请求，用量在 ChatGPT 的设置里查看和控制。已有订阅能否抵扣，比再买一份座位更值得先核对。

> 原始链接：[Sign in to Warp with ChatGPT](https://www.warp.dev/blog/sign-in-to-warp-with-chatgpt)（发布日 2026-09-29）

#### &lt;平台&gt;LangSmith：Engine v2、托管 Deep Agents 与轨迹

LangChain 汇总 LangSmith 的更新：Engine v2 带红队和自动测试，托管 Deep Agents 有新版本，并加上轨迹等能力。

> 原始链接：[New in LangSmith](https://www.langchain.com/blog/langsmith-engine-agents-fine-tuning-trajectories)（发布日 2026-09-25）

#### &lt;代码审查&gt;Sonnet 5.5 比 Sonnet 5 抓得更多、用时约一半

CodeRabbit 用 Claude Sonnet 5.5 对比 Sonnet 5 和 Opus 5.5 做代码审查，看已知缺陷的命中、精确率、速度和按标价计算的单次成本。标题称相对 Sonnet 5 抓到更多，时间约为一半。

> 原始链接：[Claude Sonnet 5.5 for code review](https://coderabbit.ai/blog/sonnet-5-5-model-review)（发布日 2026-09-28）

<br/>

本期于 2026-11 按新版格式补录。
