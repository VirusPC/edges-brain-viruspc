---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-13T17:37:51.494Z'
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

这次调研没有改框架要覆盖哪些看板、用什么技术栈，也没有补完成标准。
