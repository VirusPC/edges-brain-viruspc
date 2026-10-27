---
name: local_memory_visualization_ui
description: 提供本地 memory 可视化界面；可能在 init 时本地一并初始化
metadata:
  edges-type: task
  edges-title: 本地 memory 可视化界面
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-17T14:09:11.321Z"
  edges-task-project: agent-clients-ux
---

提供本地 memory 的可视化界面；可能在 project-memory `init` 时就在本地把可视化相关文件/入口初始化好。

**Why:**
project memory / `.memory` 条目以 markdown + 索引存在，人眼扫目录和 frontmatter 成本高；本地可视化能按 type、树路径、关联快速浏览与跳转。若等事后再装视图，容易和仓结构脱节；挂在 `init` 上可以保证新项目开箱即有「可看」的本地入口。

**How to apply:**
- 与「数据与视图分离 + 本地 HTML」对齐：memory 文件为数据，可视化为视图层。
- 评估：`project-memory-init`（或同级 init）是否生成本地 HTML/静态看板脚手架、打开说明、与 `.gitignore` 的关系。
- 细聊范围：只读浏览 vs 可编辑；覆盖 project memory、tasks、user memory（若本地化）哪些层。
- 选型：本地 HTML / 小服务 / Obsidian 插件等；默认不把私密 memory 推上公开仓。
