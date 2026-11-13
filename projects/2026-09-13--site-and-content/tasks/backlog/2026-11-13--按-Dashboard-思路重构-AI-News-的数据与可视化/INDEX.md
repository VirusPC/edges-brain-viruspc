---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-13T16:09:22.511Z'
  edges-title: 按 Dashboard 思路重构 AI News 的数据与可视化
  edges-tasks-status: backlog
  edges-task-priority: none
name: 按_dashboard_思路重构_ai_news_的数据与可视化
description: AI News 的模型榜单目前多源平铺。按 dashboard 思路分开数据层和可视化层，榜单用下拉切换。
---
**背景：**
2026-11-13，AI 资讯的模型榜单刚扩充完。LLM Arena、Artificial Analysis、OpenRouter 这几块是平铺的。OpenRouter 的总体 token、编程 token、公开应用三张图已经随 [brain#481](https://github.com/VirusPC/edges-brain-viruspc/pull/481) 和 [ai-news-data#3](https://github.com/VirusPC/ai-news-data/pull/3) 合并。用户接着提出用做 dashboard 的思路做 AI News，并要求这张卡直接落库。
- 现状：2026-11-13 期「模型进展」里，LLM Arena、Artificial Analysis、OpenRouter 各自成节；OpenRouter 的三张图上下排开。
- 约束：AI 资讯页面在本仓 `site/` 的 `/ai-news/`，不改 VirusPC/blog。
- 非目标：这张卡只记录任务，不在这次实现 dashboard。不预设技术栈、实时刷新或额外筛选。
- 关联：[brain#481](https://github.com/VirusPC/edges-brain-viruspc/pull/481)；[ai-news-data#3](https://github.com/VirusPC/ai-news-data/pull/3)。

**目标：**
AI News 的数据层和可视化层分开；模型榜单用下拉菜单切换，而不是全部平铺。

**动作：**
- 把数据层和可视化层分开。
- 模型榜单支持通过下拉菜单切换，而不是平铺。
