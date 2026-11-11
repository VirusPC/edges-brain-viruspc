覆盖窗口：2026-09-25～2026-10-01（生成日 2026-10-02）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 当前只剩生成日之后的帖子，Wayback 没有该地址的存档，窗口内的社区帖补不回来。百度 Geek 说 9 月 30 日的「国庆免费领」是音箱和京东卡一类礼品，不是开发者额度，不写入本期。

<br/>

## 一、本周关键词

GPT-6.1 Sol 与 dots

Claude Sonnet 5.5 上 AWS，Opus 5.5 进入 Kiro

Devin 变便宜，DeepSeek 开源昇腾组件

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（同一份全量数据集，overall，榜单发布日 **2026-09-30**）。红圈为相对 2026-09-25 新进入 Top-15 的 **gemini-4-argon-high**，并且排在第一。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-09-30](llm-arena-top15-2026-09-30-marked.png)

#### GPT-6.1 Sol

OpenAI RSS：接近 Astra 的编码、计算机使用和专业工作能力，标准 API 的输入和输出价格大约是 Astra 的五分之一。日期取自 RSS。

> 原始链接：[Introducing GPT-6.1 Sol](https://openai.com/index/introducing-gpt-6-1-sol)（发布日 2026-09-29）

#### dots

OpenAI RSS：dots 是会主动往下做的助手，可以在复杂项目和日常任务里持续工作，同时让人保持控制。

> 原始链接：[Introducing dots](https://openai.com/index/introducing-dots)（发布日 2026-09-29）

#### Claude Sonnet 5.5

Anthropic 在 2026-09-28 发布 Claude Sonnet 5.5。AWS 同一天把它放上 Amazon Bedrock 和 AWS 上的 Claude Platform，称它是更聪明、更省的 Sonnet，适合聚焦的编码和知识工作，单任务成本更低、速度更快。

> 原始链接：[Claude Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5)（发布日 2026-09-28）；[Introducing Claude Sonnet 5.5 on AWS](https://aws.amazon.com/blogs/machine-learning/introducing-claude-sonnet-5-5-on-aws/)（发布日 2026-09-28）

#### Claude Opus 5.5 进入 Kiro

Kiro 博客标题称 Opus 5.5 已可用，发布日 2026-09-28。RSS 正文只有拼写忽略标记，档位和价格以原文为准。

> 原始链接：[Claude Opus 5.5 is now available in Kiro](https://kiro.dev/blog/opus-5-5)（发布日 2026-09-28）

#### Holo4

Hugging Face 博客标题：Holo4 用来驱动通用计算机使用 Agent。该条 RSS 正文为空。

> 原始链接：[Holo4](https://huggingface.co/blog/Hcompany/holo4)（发布日 2026-09-28）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 Trending RSS 没有这一天的存档。下面 5 条来自 Wayback 对 `github.com/trending`（Today / 全部语言）的存档，快照 **2026-10-01**。

> 存档：[2026-10-01 github.com/trending](https://web.archive.org/web/20261001020842/https://github.com/trending)

1. [NVIDIA/OpenShell](https://github.com/NVIDIA/OpenShell)：给自主 Agent 用的运行时，强调安全和私密。
2. [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio)：可本地运行的语音工作室。
3. [mvschwarz/openrig](https://github.com/mvschwarz/openrig)：把 Claude Code 和 Codex 放在同一个多 Agent harness 里跑。
4. [mksglu/context-mode](https://github.com/mksglu/context-mode)：压缩编码 Agent 的工具输出并保留会话记忆。存档页称工具输出可减少 98%。
5. [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)：让编码 Agent 少写不必要的代码。

<br/>

## 四、国内进展

#### &lt;开源&gt;DeepSeek 开源昇腾基础组件

深度求索：面向华为昇腾的 TileLang 编译器、计算库和分布式通信库开源，并与此前面向英伟达平台的组件一一对应。文中把 TileLang 写成比 CUDA 更好写、同时要打到硬件上限的高级语言。

> 原始链接：[DeepSeek 开源昇腾基础组件](https://mp.weixin.qq.com/s?__biz=Mzk0OTYwNzc3NQ==&mid=2247485843&idx=1&sn=565102c3642d88e814331390bf62d276)（发布日 2026-09-30）

字节、阿里、腾讯、支付宝的 Wechat2RSS 已滚出本窗口且没有 Wayback 存档。

<br/>

## 五、国际进展

#### &lt;成本&gt;Devin 整体变便宜

Devin RSS：Fusion 和 Normal 便宜 30% 到 40%，Ultra 便宜 15% 到 20%，Devin Review 最多便宜 70%。原因写成最新模型和更省的 harness，不是单独一档促销。

> 原始链接：[Devin is now up to 40% more cost-efficient](https://devin.ai/blog/more-efficient-devin)（发布日 2026-09-28）

#### &lt;审查&gt;Sonnet 5.5 比 Sonnet 5 抓得更多、用时约一半

CodeRabbit 用 Sonnet 5.5 对比 Sonnet 5 做代码审查。标题称抓到更多，时间约为一半。

> 原始链接：[Claude Sonnet 5.5 for code review](https://coderabbit.ai/blog/sonnet-5-5-model-review)（发布日 2026-09-28）

<br/>

本期于 2026-11 按新版格式补录。
