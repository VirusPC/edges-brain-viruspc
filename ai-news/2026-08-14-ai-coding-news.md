覆盖窗口：2026-08-07～2026-08-13（生成日 2026-08-14）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 没有落到这个窗口的可核验快照（Wayback 未收录该栏目），不把后来的帖子写进来。窗口内也没有核对到面向开发者的额度或订阅优惠。

<br/>

## 一、本周关键词

Cursor 云端构建提速，Firetiger 并入

Gemini 3.7 Flash 进入 Antigravity，Zed 做多人协作环境 Delta

Claude Code 默认 Auto，Amp 的全局插件与「不靠 PR 过 SOC 2」

Agent 调用里只有少数轮次需要前沿模型

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（Hugging Face 数据集 `lmarena-ai/leaderboard-dataset`，`text_style_control` / overall，榜单发布日 **2026-08-12**，落在本窗口内）。相对上一份快照（2026-08-11），Top-15 里 Claude Opus 的 thinking 条目换成了 high，Gemini 3.6 Flash 换成了 Flash High，没有新的模型族进入，故图中不标 NEW。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-08-12](llm-arena-top15-2026-08-12-marked.png)

#### Gemini 3.7 Flash 进入 Google Antigravity

Antigravity 引入 Gemini 3.7 Flash，页面将其称为面向编码与 Agent 的高智能、偏实用模型。编码 Agent 选型应把它和同窗口的路由实验放在一起看，而不是只看聊天榜。

> 原始链接：[Gemini 3.7 Flash in Google Antigravity](https://antigravity.google/blog/gemini-3-7-flash-in-google-antigravity)（发布日 2026-08-13）

#### Muse Glimmer

Hugging Face 介绍 Meta 的 Muse Glimmer：本地、具备 Agent 能力、多模态且开源。页面的通用摘要没有给出参数与许可细节，落地前以原文和模型卡为准。

> 原始链接：[Meta is back with Muse Glimmer](https://huggingface.co/blog/muse-glimmer)（发布日 2026-08-10）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 GitHub Trending RSS 没有这一窗口的历史名次。下面 5 条来自 Wayback 对 [github.com/trending](https://github.com/trending) 的存档（页面为 Today、全部语言，即 daily / all），快照 **2026-08-13**。简介译自存档页上的仓库描述。

> 存档：[2026-08-13 github.com/trending](https://web.archive.org/web/20260813000733/https://github.com/trending)

1. [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)：给 Claude Code 用的 29 种编辑式示意图，自包含 HTML + SVG。
2. [macro-inc/macro](https://github.com/macro-inc/macro)：把邮件、聊天、文档、任务、Agent 和通话放进同一工作区，并共享 AI 记忆。
3. [semantica-agi/semantica](https://github.com/semantica-agi/semantica)：面向上下文与可追责 AI 的图原生基础设施。
4. [stablyai/orca](https://github.com/stablyai/orca)：并行编码 Agent 的环境，可用自有订阅，覆盖桌面、手机和 VPS。
5. [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)：一组带流程和交付物的专职 Agent。

#### Zed Delta

Zed 发布 Delta 的非公开测试：人和 Agent 一起写代码、一起看结果的多人环境，让代码和对话保持在同一上下文里。页面标注的发布时间为 2026-08-12。

> 原始链接：[Introducing Delta](https://zed.dev/blog/introducing-delta)（发布日 2026-08-12）

<br/>

## 五、国际进展

#### &lt;云端环境&gt;Cursor：预构建让云端智能体启动更快

Cursor 的「构建」在后台准备可直接使用的开发环境副本。页面称云端智能体启动速度可到原来的 3 倍，且无需额外费用。长任务 Agent 的冷启动可以先看这种快照，而不是每次从空仓库装依赖。

> 原始链接：[借助构建，云端智能体启动速度提升至 3 倍](https://cursor.com/cn/blog/builds)（发布日 2026-08-13）

#### &lt;收购&gt;Firetiger 加入 Cursor

Firetiger 做的是软件上线之后的智能体。Cursor 宣布该团队加入，用来把「写代码」和「看线上」接成一条路径。

> 原始链接：[Firetiger 加入 Cursor](https://cursor.com/cn/blog/firetiger)（发布日 2026-08-13）

#### &lt;认证&gt;Cursor 获得 AIUC-1

Cursor 称其控制措施经过独立审计、智能体经过对抗测试，并获得 AIUC-1 认证。引入编码 Agent 时，可以把这类审计范围问清楚：覆盖的是 IDE、云端智能体，还是只覆盖某一层。

> 原始链接：[Cursor 获得 AIUC-1 智能体安全与可靠性认证](https://cursor.com/cn/blog/aiuc-1)（发布日 2026-08-13）

#### &lt;安全&gt;CodeRabbit Security

CodeRabbit Security 在代码库里查应用层漏洞，用代码证据核验，再给出可审查的修复。它适合接在 Agent 改动之后，而不是替代原有的依赖扫描。

> 原始链接：[Introducing CodeRabbit Security](https://coderabbit.ai/blog/introducing-coderabbit-security)（发布日 2026-08-13）

#### &lt;Agent产品&gt;Antigravity 自定义 Agent

Antigravity 认为软件工程正在从写代码转到编排 Agent，并放出自定义 Agent。团队可以把设计系统和仓库约定收成可复用的 Agent，而不是每条任务重新写提示。

> 原始链接：[Introducing Custom Agents](https://antigravity.google/blog/introducing-custom-agents)（发布日 2026-08-12）

#### &lt;产品&gt;Claude Code 默认打开 Auto

Claude Code 将为 Pro、Max、Ultra 和 Team 默认使用 Auto，以便跑更长的自主任务，并拦住更多危险命令。默认值一变，权限和确认策略要重新看一遍。

> 原始链接：[Auto mode is now the default in Claude Code](https://claude.com/blog/auto-mode-default-in-claude-code)（发布日 2026-08-07）

#### &lt;扩展&gt;Kiro powers 支持 Agent 插件

Kiro 让 powers 带上 Agent 插件，用来装团队自己的技能和内部 MCP。插件一旦能进共享目录，就要同时定版本和权限。

> 原始链接：[Kiro powers now support Agent Plugins](https://kiro.dev/blog/powers-supports-plugins/)（发布日 2026-08-07）

#### &lt;扩展&gt;Amp：全局插件与技能

Amp 的插件和技能可以在各处使用，并在工作区里给队友发现、导入和更新。

> 原始链接：[Global Plugins and Skills](https://ampcode.com/news/global-plugins-and-skills)（发布日 2026-08-11）

#### &lt;合规&gt;Amp：不用 PR 也可以谈 SOC 2

Amp 回应「直接推 main、不做 PR 就不符合 SOC 2」的说法，认为合规看的是风险控制，不是某一种评审形式。小团队可以对照自己的推送权限、签名和审计日志，而不是先假定必须有人工 PR。

> 原始链接：[That's not SOC 2 compliant](https://ampcode.com/notes/thats-not-soc-2-compliant)（发布日 2026-08-13）

#### &lt;路由&gt;多数 Agent 轮次用不到前沿模型

LangChain 用 NVIDIA NeMo Switchyard 在 145 个 Agent 任务上做了路由实验。页面称只有 7% 的轮次需要前沿模型，路由后成本下降 74%，准确率掉了 6 个点。自建 harness 可以先量自己的轮次分布，再决定默认模型。

> 原始链接：[How many of your agent's calls actually need a frontier model?](https://www.langchain.com/blog/switchyard-agent-routing-benchmark)（发布日 2026-08-11）

#### &lt;企业落地&gt;JetBrains 如何评估 Claude Fable 5

JetBrains 介绍在自家环境里评估和部署 Claude Fable 5，并把防护与数据保留看成使用前沿模型的前提。私有仓库上的评测集，比公开榜更接近日常编码。

> 原始链接：[How JetBrains evaluates and deploys Claude Fable 5](https://claude.com/blog/how-jetbrains-evaluates-and-deploys-claude-fable-5)（发布日 2026-08-13）

<br/>

本期于 2026-11 按新版格式补录。
