---
metadata:
  edges-type: task
  edges-task-project: site-and-content
  edges-updated-at: '2026-10-07T14:41:15.571Z'
  edges-title: 除 posts 外支持更丰富的内容输出形态
  edges-tasks-status: backlog
  edges-task-priority: none
name: richer-content-outputs
description: >-
  在 posts 之外扩展 videos、朋友圈、flashcards、ppt 等输出；对标 Google NotebookLM
  一类「同知识多形态输出」能力。
---
**背景：**
2026-10-07 补记近一周 PR 缺卡时，用户另提：后续除了 posts，还应支持 videos、wechat-moments（朋友圈）、flashcards、ppt 等更丰富的输出形态，并参考 Google NotebookLM 等产品。现有看板已有 posts 建站/Astro 相关 backlog，但没有单独记下「多形态输出」方向，故开本卡以免只停在博客长文一种出口。
- 相关现状：已有 backlog「posts 用 Astro 搭博客与 CI」「整理 posts 文件夹并建站」管 posts 展示与建站；本卡不替代它们。
- 预期收益：同一套知识材料可按场景产出短视频、社交片段、记忆卡片、演示稿等，而不只是文章站点。
- 非目标：本卡不实现具体生成管线；不规定必须自研还是接入第三方；不改 posts 硬约束（AI 不得自动改 posts）的现行约定。
- 关联：对话（任务记录员 2026-10-07）；兄弟卡 `.harness/tasks/site-and-content/backlog/2026-09-10--posts用Astro搭博客与CI/`、`.harness/tasks/site-and-content/backlog/2026-09-14--整理posts文件夹并建站/`；对标产品 Google NotebookLM

**目标：**
Edges 内容出口从「主要 posts」扩展到可枚举的多形态输出（至少覆盖视频、朋友圈、闪卡、演示稿等方向），并有清晰的产品边界与后续拆卡依据。

**动作：**
- 对照 NotebookLM 等产品梳理「同输入 → 多输出」能力清单与常见形态
- 结合 Edges 现有 posts / notes / artifacts 边界，划定首批要支持的形态与不做清单
- 产出可拆的后续实现卡（或 ADR）后再出栈

**完成标准：**（待 grill-with-docs 细化；开卡时先留方向性条目）
- [ ] 有一份书面清单：首批支持的输出形态、每种的输入/产物约定、与 posts 的关系
- [ ] 明确非目标与是否允许第三方服务；拆出可指派的实现子卡或明确「暂不拆」
- [ ] 与现有 posts 建站卡不重复抢范围（本卡管形态扩展，posts 卡管博客落地）
