---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-14T08:12:56.453Z'
  edges-title: 建设个人 Dashboard 框架
  edges-tasks-status: backlog
  edges-task-priority: none
name: 建设个人_dashboard_框架
description: 在改造 AI News 可视化之外，先建成一套可复用的个人 dashboard 框架，让资讯榜单等视图能挂在同一套数据层和可视化层上。
---

**背景：**
刚把 2026-11-13 期的模型榜单扩到 LLM Arena、Artificial Analysis 和 OpenRouter，多个榜单是平铺的。你先要求按 dashboard 思路改造 AI News，分开数据层和可视化层，模型榜单用下拉菜单切换，这张卡已经记在 Site and Content 的待办里（`projects/2026-09-13--site-and-content/tasks/backlog/2026-11-13--按-Dashboard-思路重构-AI-News-的数据与可视化/INDEX.md`，随 https://github.com/VirusPC/edges-brain-viruspc/pull/483 合入）。接着你说更进一步，要建设 personal dashboard 框架。这是比单页改造更大的意图，所以单独开卡，不改那张已有卡。对话里还没展开框架要覆盖哪些看板、用什么技术栈。

**目标：**
建成一套个人可用的 dashboard 框架，把数据层和可视化层做成可复用的基础，而不只改 AI News 单页。

**相关调研：**（2026-11-14，依据官方文档与第一方材料）
到 2026-11-14，没有看到成熟、可直接采用的开源或商业框架，把「每张图背后的数据源是一条会反复执行的提示词」做成一等公民，尤其难直接接 LLM Arena / OpenRouter 这类非数仓来源。主流 AI BI 几乎都把提示词编译成 SQL、语义层或代码后，刷新不再走模型。

最接近的对照：

- [LatchAI Dynamic Dashboards](https://latchai.app/docs/features/dashboards/)：官方写明看板不是已保存查询，而是交给智能体的自然语言 brief，刷新时用工具重新取数并发布校验过的 JSON widget。它是整板一份 brief，不是每图一条提示词；项目仍早期，安装文档里仓库地址还是 `TODO`。
- [Dashfridge 定时刷新](https://dashfridge.com/guides/scheduled-refresh)：用 ChatGPT / Claude 定时任务按提示词重建整页，Dashfridge 只托管持久链接和版本。
- [TextQL Playbooks](https://docs.textql.com/core/how-it-works/playbooks)：商业产品里「存下来的提示词按计划重跑」写得最清楚，但输出是邮件 / Slack 报告；它的[看板](https://docs.textql.com/core/how-it-works/dashboards)反而改成刷新执行已发布代码。
- [Julius Scheduled Runs](https://julius.ai/product/scheduled-runs)：能发布持久交互看板并定时重跑，刷新靠版本化代码，不是提示词连接器。
- [Birdie AI Prompt Widget](https://ask.birdie.ai/customer-intelligence/dashboards-and-reporting/dashboard-widgets/ai-prompt-widget)：少见的「每个磁贴一条持久提示词」，但只生成叙述洞察，数据仍来自已有筛选或其他图表。
- [96loveslife/big_model_radar](https://github.com/96loveslife/big_model_radar)：你在 Codex 的 issue 里看到，觉得「有一点点像」想做的东西。它是固定主题的 AI 资讯雷达：GitHub Actions 每天定时抓取 AI CLI 工具与 Agent 生态仓库、GitHub Trending、Hacker News、Anthropic/OpenAI 官网等来源，经大模型生成中英文日报、周报和月报，并发布为 GitHub Issues、Markdown、网页、RSS 和 Telegram，还提供 MCP 查询历史报告；追踪对象通过 `config.yml` 配置。相似处是同一批数据源定时处理后分发到多个出口，可作为「采集 → 大模型总结 → 多渠道发布」以及数据流编排的参考实现。差异是产出是报告而非可切换的 Dashboard；不按用户学习主题关联已有笔记，也不判断哪些是新机制值得补学；来源是固定配置的仓库与站点，不是每个视图由一条提示词驱动。

这次调研没有改框架要覆盖哪些看板、用什么技术栈，也没有补完成标准。

**主题持续追踪：**
需求尚未实现：框架不仅呈现当前数据，还能按照用户指定主题，持久化追踪相关消息和趋势。

例如学习记忆机制。技术迭代很快，学完 Codex 又出 Claude，之后又有 DSH 等框架，需要自动追踪这些相关更新。

持续收集更新，保留历史并比较趋势；将新消息关联到已有学习笔记和已学内容，帮助识别值得补学的变化，并区分新机制与重复消息。

**数据流编排（待探索）：**
主题增多后，同一数据源需要复用，经不同处理流程分流到不同 Workflow；可能需要类似 Dify、n8n 的轻量数据流编排能力。

这是候选方向，不等于已经决定引入这些产品，也不预设可视化拖拽、节点协议、技术栈或完成标准。
