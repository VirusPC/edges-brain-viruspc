---
name: artifacts_支持多种预览类型不止_html
description: >-
  Artifacts 预览仍偏直接发布 HTML，Markdown 打开几乎是裸文本。先摸清主流 agent desktop 的 artifact
  类型与预览，再按类型做成可读预览。
metadata:
  edges-type: task
  edges-title: Artifacts 支持多种预览类型（不止 HTML）
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-updated-at: '2026-10-11T15:09:41.883Z'
---

**背景：**
更早的触发是 IT资产管理聊天里 @任务记录员：peng cheng 交办记一条待办。当时 Artifacts 预览偏直接 publish HTML，希望还能预览 markdown、diff、文件夹、图片、视频等。2026-10-11 日复盘把一份 Routine schema 研究报告上传到 Artifacts，打开 Markdown 几乎是裸文本，阅读很痛苦。当天确认把这个诉求并进这张已有卡：先识别主流 agent desktop 的 artifact 类型和各自怎么预览，再按类型给 Edges Artifacts 定制预览。
- 现状：HTML 临时托管和 ECS 部署已有卡，有的已经 done。本卡只做预览类型扩展，不换托管宿主。
- 预期收益：Markdown 这类常见类型打开就能读；后来的类型按同一套策略加预览。
- 非目标：不在这张卡里重做托管架构，也不改走 Pages（另有 backlog）。
- 关联：IT资产管理交办（更早触发）；笔记 `knowledge/notes/2026-09-25--Grok-Bot-Artifacts预览与交接loop.md`；2026-10-11 日复盘。

**目标：**
Edges Artifacts 按类型提供预览。主流 agent desktop 里常见的 artifact 类型有一份可核对的清单；标成高优先级的类型，尤其是 Markdown，打开后是可读的渲染结果。

**动作：**
- 调研 Cursor、Codex、Claude Code、Grok Bot 以及同类 agent desktop 的 artifact 类型和预览行为。
- 产出类型清单，写明扩展名或 MIME、使用场景、优先级。
- 为 Edges Artifacts 设计按类型的预览。Markdown 要能读排版、代码块、表格和目录。
- 实现高优先级类型的预览，并把以后怎么扩展写进 artifacts-preview 的 README 或一份 ADR。

**完成标准：**
- [ ] 有书面类型清单，至少覆盖 5 种常见类型，其中包含 Markdown，并标明来源（对 Cursor、Codex、Claude Code、Grok Bot 或同类产品的观察或文档）。
- [ ] Markdown 的 Artifacts URL 打开后是可读的渲染文档，排版、代码块、表格和目录都能用。只把原文放进 bare 或 pre 不算通过。
- [ ] 其它标为高优先级的类型，要么有可打开的样例 URL，要么写明明确的回退。
- [ ] 扩展策略写在 artifacts-preview 的 README 或 ADR 里，后来的类型能按同一策略加预览。
