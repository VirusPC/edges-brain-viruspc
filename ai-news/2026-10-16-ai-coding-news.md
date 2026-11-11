覆盖窗口：2026-10-09～2026-10-15（生成日 2026-10-16）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 当前只剩生成日之后的帖子，Wayback 没有该地址的存档，窗口内的社区帖补不回来。

#### 千问三款模型在 GMI Cloud 继续免费一周

千问 RSS：Qwen3.8-Max、Qwen3.8-Flash 和 Wan3.0 在 GMI Cloud 上再免费 7 天，三个模型的速率限制也提高了。资格和截止以 GMI 与千问的原文为准。

> 原始链接：[A week of free access](https://x.com/Alibaba_Qwen/status/2108401307577090259)（发布日 2026-10-09）

#### Devin 接入 Pylon，新客户 1.5 万美元额度

Cognition 的订阅：Devin 进入 Pylon，用来缩短修复时间中位数；新的 Devin 客户有 1.5 万美元额度。额度条件以原文为准。

> 原始链接：[Introducing Devin in Pylon](https://x.com/cognition/status/2110068304383725720)（发布日 2026-10-13）

#### 在 Amp 里使用已有的 Claude 订阅

Amp：创建线程时选 Claude Code 模式，并关联已有的 Claude 订阅。RSS 称这一模式免费、现在对所有人开放，底层用的是 Claude Agent SDK，而不是再买一份 Amp 的模型额度。

> 原始链接：[Use Your Claude Plan in Amp](https://ampcode.com/news/use-your-claude-plan)（发布日 2026-10-10）

<br/>

## 一、本周关键词

Gemini 4 Argon 进入 Antigravity

百度网盘放弃全自动生成代码

QwenGyre 做长程 Agent 训练，Kiro CLI V3 开始铺开

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（同一份全量数据集，overall，榜单发布日 **2026-10-15**）。相对 2026-10-13，按归一化名称没有新模型进入 Top-15（展示名改成了带空格的写法），图中不标 NEW。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-10-15](llm-arena-top15-2026-10-15-marked.png)

#### Gemini 4 Argon 进入 Antigravity

Antigravity 在 2026-10-13 接入 Gemini 4 Argon。该条 RSS 正文为空，和上一期榜单里 Argon 登顶放在一起看，这次是进到编码产品。能力以原文为准。

> 原始链接：[Gemini 4 Argon in Google Antigravity](https://antigravity.google/blog/gemini-4-argon-in-google-antigravity)（发布日 2026-10-13）

#### QwenGyre

千问 RSS：用弹性强化学习训练极长程 Agent。Elastic Scheduler 在 rollout 和训练之间调 GPU，正在跑的执行不被打断。文中称相对 Colocate 最高约 1.85 倍加速。

> 原始链接：[Introducing QwenGyre](https://x.com/Alibaba_Qwen/status/2109633085658808515)（发布日 2026-10-12）

#### Asana 用 GPT-6.1 Sol 把浏览器测试的模型成本降到约 1/76

OpenAI RSS：Asana 在 Codex 里用 GPT-6 Astra 改浏览器 Agent，测试中模型成本降到约七十六分之一，速度约 5 倍，从而给客户开更强的模型。

> 原始链接：[Asana cuts model costs 76x in browser tests with GPT-6.1 Sol](https://openai.com/index/asana-browser-agent)（发布日 2026-10-09）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 Trending RSS 没有这一天的存档。下面 5 条来自 Wayback 对 `github.com/trending`（Today / 全部语言）的存档，快照 **2026-10-15**。

> 存档：[2026-10-15 github.com/trending](https://web.archive.org/web/20261015004025/https://github.com/trending)

1. [morluto/rea](https://github.com/morluto/rea)：用 Agent 做逆向。
2. [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio)：可本地运行的语音工作室。
3. [mksglu/context-mode](https://github.com/mksglu/context-mode)：压缩编码 Agent 的工具输出并保留会话记忆。
4. [nvm-sh/nvm](https://github.com/nvm-sh/nvm)：Node 版本管理器。
5. [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills)：面向科学工作的 Agent 技能库。存档页称有 177 个可用技能。

#### Apache Auron 从快手实践毕业

快手技术：10 月 14 日 Apache 宣布 Auron 从孵化器毕业，成为顶级项目。它长在快手的大规模数据计算里，2025 年 8 月捐给基金会。

> 原始链接：[Apache Auron 正式毕业](https://mp.weixin.qq.com/s?__biz=Mzg2NzU4MDM0MQ==&mid=2247501480&idx=1&sn=6fe806e6e30f10952002bcb10b3c5bcb)（发布日 2026-10-15）

<br/>

## 四、国内进展

#### &lt;落地&gt;百度网盘放弃全自动生成代码

百度 Geek 说：网盘团队把 Coding Agent 接进真实研发之后，停掉「一键生成」的流水线，改成多轮的 Agentic Engineering Loop：先澄清需求，再分轮验证，让每次交付可检查、可回溯。文中的原话是，全自动最大的风险不是会犯错，而是错了还自信地往前跑。

> 原始链接：[我们放弃了「全自动生成代码」](https://mp.weixin.qq.com/s?__biz=Mzg5MjU0NTI5OQ==&mid=2247607686&idx=1&sn=a9428c9fdf46957a8cc77ed5ac070368)（发布日 2026-10-13）

#### &lt;推理&gt;美团：延迟约束下的小模型高并发

美团技术博客讨论 SLM 生成式高并发推理引擎，优化的是延迟约束下的有效吞吐，而不是只把批量开大。

> 原始链接：[SLM 生成式高并发推理引擎](https://tech.meituan.com/2026/10/15/Small-Language-Model-in-meituan.html)（发布日 2026-10-15）

字节、阿里、腾讯、支付宝的 Wechat2RSS 已滚出本窗口且没有 Wayback 存档。千问的训练系统和免费额度写在模型进展与薅羊毛。

<br/>

## 五、国际进展

#### &lt;CLI&gt;Kiro CLI V3 开始作为默认体验铺开

Kiro 在 2026-10-09 写 CLI V3 正在成为默认体验。同一页后文提到 CLI 3.0 于 2026-11-03 发布，那次更新不在本窗口。

> 原始链接：[Kiro CLI V3 is rolling out](https://kiro.dev/blog/cli-3)（发布日 2026-10-09）

<br/>

本期于 2026-11 按新版格式补录。
