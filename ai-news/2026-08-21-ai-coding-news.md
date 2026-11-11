覆盖窗口：2026-08-14～2026-08-20（生成日 2026-08-21）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 没有落到这个窗口的可核验快照（Wayback 未收录该栏目），不把后来的帖子写进来。

#### Amp 教育优惠：学生和教师月费 10 美元

Amp 对学生和教师的订阅价为每月 10 美元，页面称是原价的一半。资格和适用计划以官方说明为准。

> 原始链接：[Education Discount](https://ampcode.com/news/edu-discount)（发布日 2026-08-18）

<br/>

## 一、本周关键词

Cursor 并入 SpaceX

Warp Factories，Antigravity 的 IDE 扩展

Kiro 云端会话，Claude Tag 值守 CI

Qoder 完成 SOC 2 Type II

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（Hugging Face `lmarena-ai/leaderboard-dataset`，`text_style_control` / overall，榜单发布日 **2026-08-19**，落在本窗口内）。红圈为相对 2026-08-12 新进入 Top-15 的 **gemini-3.7-flash-high** 与 **glm-5.3-max**。同一次对比里，qwen3.8-max 与 gemini-3.6-flash-high 离开 Top-15。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-08-19](llm-arena-top15-2026-08-19-marked.png)

#### 2026 年夏季开源模型观察

Hugging Face 发布夏季开源模型观察。页面通用摘要没有列出具体名次，结论以原文为准。

> 原始链接：[State of Open Models: Summer 2026 Observations](https://huggingface.co/blog/state-of-open-models-summer-2026)（发布日 2026-08-14）

#### 用兼容 OpenAI 的网关跑 OCR 模型

VLM Run 介绍其网关，标题列出 GLM-OCR、DeepSeek-OCR-2 和 dots.mocr，接口按 OpenAI 兼容方式提供。文档解析 Agent 可以把它当作多模型入口来测，而不是只绑一家 OCR。

> 原始链接：[VLM Run Gateway](https://huggingface.co/blog/vlm-run/intro-to-vlmrun-gateway)（发布日 2026-08-19）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 RSS 没有这一窗口的历史名次。下面 5 条来自 Wayback 对 [github.com/trending](https://github.com/trending) 的存档（Today、全部语言），快照 **2026-08-20**。简介译自存档页描述。

> 存档：[2026-08-20 github.com/trending](https://web.archive.org/web/20260820001141/https://github.com/trending)

1. [harry0703/MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)：用大模型和自动化流程，按主题生成短视频。
2. [volcengine/OpenViking](https://github.com/volcengine/OpenViking)：给 Agent 用的上下文数据库，把记忆、检索和技能放在一起，并可自我演化。
3. [chaitanyagiri/munder-difflin](https://github.com/chaitanyagiri/munder-difflin)：本地多 Agent harness。
4. [mukul975/Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)：面向安全 Agent 的结构化技能集，页面称有 817 条，并对到多套安全框架。
5. [nautechsystems/nautilus_trader](https://github.com/nautechsystems/nautilus_trader)：Rust 交易引擎，确定性事件驱动。

#### Agent 到底需要多少记忆

IBM Research 在 Hugging Face 讨论 Agent 实际需要多少记忆。页面通用摘要没有给出容量数字，不在这里转述未核对的结论。

> 原始链接：[How Much Memory Does Your Agent Actually Need?](https://huggingface.co/blog/ibm-research/altk-evolve-hmm)（发布日 2026-08-18）

<br/>

## 四、国内进展

#### &lt;合规&gt;Qoder 完成 SOC 2 Type II

Qoder 宣布完成独立的 SOC 2 Type II 检查，面向企业采用 AI 编码时的可核验证据。采购问答可以先要报告范围：覆盖的是桌面端、云端 Agent，还是两者。

> 原始链接：[Qoder Completes Independent SOC 2 Type II Examination](https://qoder.com/blog/qoder-completes-soc2-examination)（发布日 2026-08-19）

<br/>

## 五、国际进展

#### &lt;收购&gt;Cursor 并入 SpaceX

Cursor 宣布已被 SpaceX 收购。页面称这桩交易始于当年 4 月。模型供应和数据策略会不会跟着变，要看后续合同，而不是只看收购声明。

> 原始链接：[Cursor 现已成为 SpaceX 的一部分](https://cursor.com/cn/blog/joining-spacex)（发布日 2026-08-14）

#### &lt;软件工厂&gt;Warp Factories

Warp 放出 Factories：用来搭内部云软件工厂的开放基础设施。重点是工厂的运行环境，不是再做一个聊天窗口。

> 原始链接：[Introducing Warp Factories](https://www.warp.dev/blog/open-infrastructure-for-building-a-software-factory)（发布日 2026-08-18）

#### &lt;IDE&gt;Antigravity 的 IDE 扩展

Antigravity 发布 IDE 扩展。页面重申产品从一开始就按自主 Agent 来设计。扩展若能改 Agent 的工具边界，就要和权限模型一起看。

> 原始链接：[Introducing IDE Extensions](https://antigravity.google/blog/antigravity-ide-extensions)（发布日 2026-08-20）

#### &lt;云端会话&gt;合上笔记本，Agent 还在跑

Kiro 放出云端会话预览，让 Agent 不必一直占着本地机器。长任务可以迁到云端，本地只留审查和接管。

> 原始链接：[Close the laptop, keep the agent](https://kiro.dev/blog/cloud-sessions/)（发布日 2026-08-18）

#### &lt;CI&gt;Claude Tag 做 CI 故障的第一响应

Anthropic 介绍用 Claude Tag 发现、分诊并处理 CI 失败。把 Agent 放进发布链路时，要先定它能重启什么、不能合并什么。

> 原始链接：[Claude on call](https://claude.com/blog/ai-ci-cd-on-call)（发布日 2026-08-18）

#### &lt;支付&gt;Bedrock AgentCore Payments 正式可用

Amazon Bedrock AgentCore 的支付能力正式可用。页面强调支出护栏、与协议无关的支付编排，以及可观测性。让 Agent 花钱之前，限额和审计要比模型分数优先。

> 原始链接：[AgentCore payments is now generally available](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-payments-is-now-generally-available-enabling-agents-to-transact-safely-and-autonomously-at-scale/)（发布日 2026-08-18）

#### &lt;计算机使用&gt;150 行 Python 驱动 Android

philschmid 用 Gemini 3.7 Flash 的计算机使用能力，以大约 150 行 Python 操作 Android 模拟器，示例是从截图玩 Wordle。这是一条很短的计算机使用基线，方便自己复现，而不是产品宣布。

> 原始链接：[Controlling Android with Gemini 3.7 Flash](https://www.philschmid.de/gemini-android-computer-use)（发布日 2026-08-17）

<br/>

本期于 2026-11 按新版格式补录。
