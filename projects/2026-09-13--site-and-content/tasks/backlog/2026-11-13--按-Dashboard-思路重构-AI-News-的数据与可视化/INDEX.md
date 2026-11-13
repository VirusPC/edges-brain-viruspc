---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-13T16:08:54.501Z'
  edges-title: 按 Dashboard 思路重构 AI News 的数据与可视化
  edges-tasks-status: backlog
  edges-task-priority: none
name: 按_dashboard_思路重构_ai_news_的数据与可视化
description: 多个模型榜单现在平铺展示。按 dashboard 思路分开数据层和可视化层，榜单改为下拉切换后再看。
---
**背景：**
2026-11-13，本期 AI 资讯已经加入 LLM Arena、Artificial Analysis 和 OpenRouter。OpenRouter 含三张图：总体 token、编程 token、公开应用。相关改动已合并：[edges-brain-viruspc#481](https://github.com/VirusPC/edges-brain-viruspc/pull/481)、[ai-news-data#3](https://github.com/VirusPC/ai-news-data/pull/3)。看过这期之后，多个榜单仍是平铺。用户提出用做 dashboard 的思路来组织 AI News，并要求先记成任务，这次不改产品。原话里的「等等」没有再展开，这张卡只记下已经说清的两件事。
- 现状：栏目名是「AI 资讯」，导航仍是 AI News，路径仍是 `/ai-news/`。多个模型榜单在页面上平铺。
- 非目标：不实现 dashboard，不改现有资讯正文，不改周报 skill。不追加技术栈、实时刷新或更多筛选维度。
- 关联：brain#481、ai-news-data#3。兄弟卡「优化 AI News 版块整体排版」谈的是列表页和正文页排版；「AI 资讯每期抓取数据存入 ai-news-data 仓」谈的是抓取快照留存。都不是这张卡要做的数据层与可视化层分离。

**目标：**
AI 资讯按数据层与可视化层分离，榜单可以交互选择后再展示，而不是全部平铺。

**动作：**
- 分离数据层与可视化层。
- 模型榜单支持通过下拉菜单切换，而不是平铺。

完成标准待后续 grill-with-docs 细化。
