覆盖窗口：2026-08-21～2026-08-27（生成日 2026-08-28）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 没有落到这个窗口的可核验快照（Wayback 未收录该栏目），不把后来的帖子写进来。

#### Devin 里的 GPT-5.6 Sol 继续降价

Devin 称 OpenAI 把 GPT-5.6 Sol 的标价降到每百万 token 输入 4 美元、输出 20 美元，并且此前宣布的七折在 2026-10-03 之前仍然叠加上面。价格和截止日期以 Devin 与 OpenAI 的页面为准。

> 原始链接：[GPT-5.6 Sol: Now even cheaper in Devin](https://devin.ai/blog/gpt-5-6-sol-price-drop)（发布日 2026-08-21）

<br/>

## 一、本周关键词

Qoder 桌面端重做，CodeRabbit 进入 Cursor

GPT-5.6 进入 Kiro

Kiro 用线上信号做提示词评估，并用 Agent 做事故分诊

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（Hugging Face `lmarena-ai/leaderboard-dataset`，`text_style_control` / overall，榜单发布日 **2026-08-27**，落在本窗口内）。相对上一份快照（2026-08-21）没有新模型进入 Top-15，图中不标 NEW。窗口内另有一份 2026-08-21 的榜，图用较晚的这一份。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-08-27](llm-arena-top15-2026-08-27-marked.png)

#### GPT-5.6 进入 Kiro

OpenAI 称 GPT-5.6 系列（含 Sol、Terra、Luna）已可在 Kiro 里用于计划、实现、审查和测试。官方页在补录时对脚本返回 403；正文核对自可读副本，页面上没有日历日期。Wayback 在 **2026-08-25** 01:05 UTC 已抓到该 URL，因此计入本窗口，不采用旧稿里的 08-24。

> 原始链接：[Advancing price-performance for developers with GPT-5.6 in Kiro](https://openai.com/index/gpt-5-6-in-kiro/)（Wayback 2026-08-25 已可见）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 RSS 没有这一窗口的历史名次。下面 5 条来自 Wayback 对 [github.com/trending](https://github.com/trending) 的存档（Today、全部语言），快照 **2026-08-27**。简介译自存档页描述。

> 存档：[2026-08-27 github.com/trending](https://web.archive.org/web/20260827001841/https://github.com/trending)

1. [tt-a1i/archify](https://github.com/tt-a1i/archify)：用 Agent 技能画可核对的架构图、流程图和数据流图，输出自包含 HTML。
2. [freestylefly/awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2)：GPT-Image2 的提示词与模板集，页面称含 530 多个案例。
3. [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)：Anthropic 维护的 Claude Code 插件目录。
4. [Alishahryar1/free-claude-code](https://github.com/Alishahryar1/free-claude-code)：声称可在终端或 IDE 里免费用 Claude Code、Codex 等。这是当日仓库简介，不是经核对的官方额度。
5. [MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search)：跑在本机、基于 Claude Code 的求职流程。

<br/>

## 四、国内进展

#### &lt;产品&gt;Qoder 桌面端重做

Qoder 发布新的桌面端，口号是从写代码延伸到把事情做完。和同周进入 Cursor 的审查插件放在一起，看的是「生成」和「审查」会不会还在两个产品里。

> 原始链接：[Introducing the All-New Qoder](https://qoder.com/blog/qoder-desktop)（发布日 2026-08-27）

<br/>

## 五、国际进展

#### &lt;代码审查&gt;CodeRabbit 插件进入 Cursor

CodeRabbit 的 Cursor 插件让审查发生在正在写代码的同一条 Agent 会话里。审查若离开会话，Agent 很容易把上下文再传一遍。

> 原始链接：[Introducing the CodeRabbit plugin for Cursor](https://www.coderabbit.ai/blog/coderabbit-plugin-for-cursor)（发布日 2026-08-25）

#### &lt;案例&gt;IMDEX 用 Cursor 做数据平台迁移

Cursor 的客户故事称，矿业技术公司 IMDEX 用 Cursor 把分散的数据系统收拢，并把旧应用迁到新平台，速度相对原先的开发方式有数量级差别。个案不能直接外推，但可以看出迁移类工作已被写成对外案例。

> 原始链接：[IMDEX 使用 Cursor](https://cursor.com/cn/blog/imdex)（发布日 2026-08-25）

#### &lt;评测&gt;Kiro 用裁判模型和线上信号评估提示词

Kiro 写他们如何用 LLM 裁判和线上信号做持续的提示词评估。系统提示跨很多任务，抽几条手工用例盖不住行为变化。

> 原始链接：[Continuous Prompt Evaluation](https://kiro.dev/blog/continuous-prompt-evaluation/)（发布日 2026-08-21）

#### &lt;事故&gt;让 Agent 做生产事故分诊

Kiro 复盘如何把生产事故分诊交给 Agent，并以一次前沿模型的可用性告警为例。分诊可以自动化，恢复动作仍然要有人能中止。

> 原始链接：[How We Learned to Trust an AI Agent to Triage Production Incidents](https://kiro.dev/blog/trust-agent-triage/)（发布日 2026-08-21）

<br/>

本期于 2026-11 按新版格式补录。
