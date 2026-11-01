---
name: posts用Astro搭博客与CI
description: posts 对外展示，后续用 Astro + GitHub Actions 搭博客与 CI
metadata:
  edges-type: task
  edges-title: posts 用 Astro 搭博客与 CI
  edges-tasks-status: todo
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: Task 记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-11-01T03:28:00.568Z'
  edges-task-project: site-and-content
  edges-task-priority: high
---

`posts` 是要对外展示的内容；后面要把 `posts` 作为数据，通过 Astro 搭建博客，并配置 GitHub Actions 在服务器做 CI。

**Why:**
`posts` 与对内的 notes/todos/记忆层不同：面向公开站点消费，数据形态要能被静态站点生成器稳定读取。

**How to apply:**
- 规划 Astro 博客：以 `posts` 为内容源。
- 配置 GitHub Actions，在服务器侧跑 CI（构建/部署链路待定）。
- 定 posts 目录与 frontmatter 约定时，兼顾「可对外展示」与 Astro 内容集合需求。

2026-10-31 用户高优要求 edges/notes/posts 对外博客展示；本卡抬高优，范围 grill 时扩到 notes/edges。

2026-11-01 实现已出 PR（未合）；本卡仍保持 todo，不改看板状态。
- Plan：https://edges.viruspc.tech/artifacts/ba71ac57-130e-49b2-a3f1-e93f8263bbcd/
- 实现 PR：https://github.com/VirusPC/edges-brain-viruspc/pull/417（分支 `cursor/astro-dual-blog-b2f0`）
- 云端 Agent：https://cursor.com/agents/bc-2352a1fb-5bd6-5493-92d9-c84a4e95b2f0
- 要点：脑仓 `site/`；posts 书页边注 + notes 全量 PI 程序风；GHA→GitHub Pages；AI 未改 `posts/`；合入后需把 Pages Source 设为 GitHub Actions；预期 URL https://viruspc.github.io/edges-brain-viruspc/
