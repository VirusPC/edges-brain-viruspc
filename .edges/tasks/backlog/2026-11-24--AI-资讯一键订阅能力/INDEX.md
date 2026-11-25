---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-24T21:24:59.783Z'
  edges-title: AI 资讯一键订阅能力
  edges-tasks-status: backlog
  edges-task-priority: none
name: ai_资讯一键订阅能力
description: 交付一句可复制提示词，让任意支持定时任务的 agent 订阅 AI 资讯周报，并返回文字总结和详情链接。
---

**背景：**
2026-11-24 用户要求给 AI 资讯补上一键订阅：用户复制粘贴一句提示词给自己的 agent，让 agent 设置 routine，在合适的时间查询最新 AI 资讯，返回文字总结和详情链接。功能和 UI 分开设计。
- 已核对：站点已有 AI 资讯 RSS，每期一条，链接到期页，并含本周概览首段。
- 已核对：结构化数据在 ai-news-data 仓库，可经 raw.githubusercontent 与 jsDelivr 直取。目前没有「最新一期」索引，也没有 llms.txt。
- 进展：功能侧第一轮 grill 已经发出，问题是 Q1–Q6（agent 查哪里、多久查一次、面向哪些 agent、提示词形态等），还在等用户回答。助手建议是读站点的机器可读入口、默认每周一次并放在周报上线之后、提示词用通用自然语言。这些建议尚未被用户确认。
- 非目标：本卡不在功能与 UI 决定写入、以及 html-plan 经用户确认之前开工实现。
- 关联：细化顺序已有记忆 `.edges/memory/projects/project_grill_memory_ask_then_html_plan`。栏目在本仓站点 `/ai-news/`。

**目标：**
交付一句可复制提示词，让任意支持定时任务的 agent 订阅 AI 资讯周报。

**动作：**
- 等用户回答功能侧 Q1–Q6，把功能决定写入本卡。
- 再做一轮 UI grill，把 UI 决定写入本卡。
- 出中文 html-plan，经用户确认后再开工。

**完成标准：**
- [ ] 功能决定与 UI 决定都写入本卡。
- [ ] 中文 html-plan 经用户确认。
