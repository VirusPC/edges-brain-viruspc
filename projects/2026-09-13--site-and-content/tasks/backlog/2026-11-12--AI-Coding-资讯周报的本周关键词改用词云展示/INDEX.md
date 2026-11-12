---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-12T09:25:00.000Z'
  edges-title: AI Coding 资讯周报的本周关键词改用词云展示
  edges-tasks-status: backlog
  edges-task-priority: none
name: ai_coding_资讯周报的本周关键词改用词云展示
description: 本周关键词目前只是一行文字，改用词云展示，让每期重点一眼可见。
---
**背景：**
2026-11-11 10 期旧版重跑上线之后（brain#463），用户提出：本周关键词改用词云来表达。
- 现状：关键词是周报里「一、本周关键词」那一章，网站 /ai-news/ 列表页也把它作为一行文字显示。
- 2026-11-12 用户补充：词的大小表示重要程度。
- 2026-11-12 已定方案：
  - 位置：只放在每期正文「本周关键词」章；/ai-news/ 列表页仍保留一行文字。
  - 形式：生成周报时产出 SVG 真源并导出 PNG，与 Arena 榜单图同一路子（站点和 REDoc 都能直接用）。
  - 库选型：d3-cloud（jasondavies/d3-cloud）。截至 2026-11-12，npm 近一年下载约 2037 万，在词云库中最高，且仍在维护（2026-10-30 有提交）；它只算布局，可在 Node 中直接输出 SVG。站点以后要做交互，也能复用同一份布局结果。备选：@visx/wordcloud（底层是 d3-cloud）、echarts-wordcloud（2024 年后未更新）、Python wordcloud（默认输出位图，中文需自配字体）。
  - 权重（重要程度）：模型给每个关键词打 1–5 分，再结合本期相关条目数和来源数综合计算，映射为字号；需配中文字体。
- 关联：任务卡「ai-news 周报在 Astro 博客上可视化展示」；skill llm-arena-marked-chart。

**目标：**
每期周报的本周关键词都有一张词云，读者一眼能看出这周的重点。

**完成标准：**
- 每期周报正文的「本周关键词」章有一张词云 PNG，同目录保留同名 SVG 真源，字号随权重变化。
- 生成脚本基于 d3-cloud，在 Node 中运行，中文显示正常；作为 skill 资源随 weekly-ai-blogs-digest 一起使用。
- weekly-ai-blogs-digest SKILL.md 写明权重算法和出图步骤。
- 已有各期是否补图，由用户另行决定。
