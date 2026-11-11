覆盖窗口：2026-08-28～2026-09-03（生成日 2026-09-04）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 没有落到这个窗口的可核验快照（Wayback 未收录该栏目），不把后来的帖子写进来。

#### Claude for Teachers：美国 K-12 可免费使用企业版

Anthropic 称，Claude for Teachers 从即日起向美国 K-12 学校和学区提供，形态是免费的企业版。覆盖范围和申请条件以官方页为准。

> 原始链接：[Claude for Teachers](https://claude.com/blog/claude-for-teachers-now-available-for-schools-and-districts)（发布日 2026-08-28）

<br/>

## 一、本周关键词

Fable 5.1 进入 Devin，OpenAI 准备停止向 Cursor 供模

Warp 给软件工厂加基准，Amp 上手机

AWS Agent Registry 正式可用

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（Hugging Face `lmarena-ai/leaderboard-dataset`，`text_style_control` / overall，榜单发布日 **2026-09-02**，落在本窗口内）。红圈为相对 2026-09-01 新进入 Top-15 的 **claude-fable-5.1-max** 与 **gemini-3.8-flash-high**。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-09-02](llm-arena-top15-2026-09-02-marked.png)

#### Fable 5.1 进入 Devin，并比 Opus 更便宜

Devin 称 Fable 5.1 已可用，并因缓存方式变化，价格比原先低 54%，甚至低于 Opus。页面还称 Fusion harness 在 FrontierCode 上以低 47% 的成本对齐 Fable 5.1。Anthropic 的模型介绍页没有读出可核对的发布日期，这里不单独把它算进本窗口。

> 原始链接：[Fable 5.1 in Devin](https://devin.ai/blog/fable-5-1)（发布日 2026-08-31）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 RSS 没有这一窗口的历史名次。下面 5 条来自 Wayback 对 [github.com/trending](https://github.com/trending) 的存档（Today、全部语言），快照 **2026-09-03**。简介译自存档页描述。

> 存档：[2026-09-03 github.com/trending](https://web.archive.org/web/20260903004838/https://github.com/trending)

1. [fmtlib/fmt](https://github.com/fmtlib/fmt)：C++ 格式化库。
2. [google-research/timesfm](https://github.com/google-research/timesfm)：Google Research 的时间序列基础模型。
3. [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)：让编码 Agent 少写不必要的代码。
4. [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio)：可本地运行的语音工作室，页面称覆盖克隆、配音和转写。
5. [sngyai/Sequoia-X](https://github.com/sngyai/Sequoia-X)：A 股形态扫描，收盘后跑并把结果推到飞书。

#### FAST：Agent 如何报告漏洞

Hugging Face 上的一篇说明，标题是 Agent 报告漏洞的 FAST 标准。页面通用摘要没有展开字段，格式以原文为准。

> 原始链接：[FAST — A Standard for How Agents Report Vulnerabilities](https://huggingface.co/blog/caleanderson/fast-agent-standard)（发布日 2026-08-28）

#### 给修复代码的 Agent 套上绳子

同站另一篇讨论有监督的自我修复，标题强调把修代码的 Agent 限制在可收回的范围内。结构化日期是 **2026-08-29**（旧稿写成 08-30）。正文细节未从通用摘要里核对。

> 原始链接：[Supervised Self-Repair](https://huggingface.co/blog/Tomoushie/httpshuggingfacecospacestomoushiexeno-sss-orchestr)（发布日 2026-08-29）

#### 给 Agent 身体、大脑、钱包和工作

three.ws 在 Hugging Face 介绍一套开源栈，标题写的是身体、大脑、钱包和工作。通用摘要没有组件清单，不在这里补写。

> 原始链接：[Inside three.ws](https://huggingface.co/blog/three-ws/building-3d-ai-agents-end-to-end)（发布日 2026-08-29）

<br/>

## 五、国际进展

#### &lt;供应&gt;OpenAI 准备停止向 Cursor 提供模型

OpenAI 称已通知 SpaceX，打算结束向 Cursor 提供模型的合同，文中提出的关闭日是 **2026-11-12**，并称这是合同允许的最长通知期。补录时官方页对脚本返回 403。Wayback 在 **2026-08-29** 已抓到该页，因此放在本窗口；11 月 12 日是文中的拟议关闭日，不是发布日。

> 原始链接：[Our decision on Cursor following its acquisition by SpaceX](https://openai.com/index/our-decision-on-cursor-following-its-acquisition-by-spacex/)（Wayback 2026-08-29 已可见）

#### &lt;基准&gt;Warp Factories 加上 Benchmarks

Warp 在 Factories 的早期访问里加上基准：在自己的代码上测 Agent，用来改工厂配置，而不是只看公共榜。

> 原始链接：[Introducing Factory Benchmarks](https://www.warp.dev/blog/warp-factory-benchmarks)（发布日 2026-09-03）

#### &lt;技能&gt;Warp 如何让 Agent 改自己的 Skill

宝玉的笔记写 Warp 用人类反馈持续改 Skill，做成低摩擦的自我改进循环。这是对 Warp 做法的转述，产品行为以 Warp 原文为准。

> 原始链接：[Warp 如何让 Agent 自我进化](https://baoyu.io/blog/2026-08-28/warp-self-improving-agents)（发布日 2026-08-28）

#### &lt;客户端&gt;Amp 的 iOS 与 macOS

Amp 放出手机和 Mac 客户端，用来在别处控制 orbs。iOS 走 TestFlight，macOS 直接下载。

> 原始链接：[Amp on iOS & macOS](https://ampcode.com/news/amp-on-ios-and-macos)（发布日 2026-08-28）

#### &lt;目录&gt;AWS Agent Registry 正式可用

AWS Agent Registry 正式可用：给组织里的 Agent、工具、技能和自定义资源一个可搜索、可治理的目录。Agent 数量上来之后，缺的往往是目录和权限，不是再一个聊天框。

> 原始链接：[Manage agents, tools and skills at scale with AWS Agent Registry](https://aws.amazon.com/cn/blogs/machine-learning/manage-agents-tools-and-skills-at-scale-with-aws-agent-registry/)（发布日 2026-08-31）

<br/>

本期于 2026-11 按新版格式补录。
