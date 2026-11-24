---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-24T21:54:50.945Z'
  edges-title: AI 资讯订阅的个性化关键词筛选
  edges-tasks-status: backlog
  edges-task-priority: none
name: ai_资讯订阅的个性化关键词筛选
description: 一键订阅第一版全员收到同一份本周总结；后续让订阅者按关键词筛选推送内容。
---
**背景：**
2026-11-25 一键订阅第一轮 grill 定下第一版不做个性化：所有订阅者收到同一份本周总结，说明页只留一句「可以按关键词筛选」。筛选本身留到以后，所以开这张卡。
- 现状：订阅端的查询入口、提示词形态和推送内容已写入 ADR 0005。推送是本期本周概览的文字（`overview.json` 的 `text`，`refs` 落到站内链接）加当期页 URL，不另写一套要点。
- 约束：栏目名是「AI 资讯」，路径仍是 `/ai-news/`。不改「本周概览」和「本周总结」的含义。第一版说明页只留那一句，不在这张卡里设计筛选规则。
- 非目标：不在本卡实现 `latest.json`、说明页、订阅 UI，也不改周报 routine 的运行指令。
- 关联：[第一轮 grill](https://edges.viruspc.tech/artifacts/d22d1d69-212d-46e8-a5b0-84cb33f456a2/)，[ADR 0005](../../../../../skills/managed/weekly-ai-blogs-digest/docs/adr/0005-subscribe-reads-published-latest-json.md)。

**目标：**
让订阅者按关键词筛选推送内容。

完成标准待 grill-with-docs 补。
