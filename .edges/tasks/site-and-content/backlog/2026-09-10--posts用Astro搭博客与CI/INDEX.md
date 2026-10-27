---
name: posts用Astro搭博客与CI
description: posts 对外展示，后续用 Astro + GitHub Actions 搭博客与 CI
metadata:
  edges-type: task
  edges-title: posts 用 Astro 搭博客与 CI
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: Task 记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-17T14:09:10.886Z"
  edges-task-project: site-and-content
---

`posts` 是要对外展示的内容；后面要把 `posts` 作为数据，通过 Astro 搭建博客，并配置 GitHub Actions 在服务器做 CI。

**Why:**
`posts` 与对内的 notes/todos/记忆层不同：面向公开站点消费，数据形态要能被静态站点生成器稳定读取。

**How to apply:**
- 规划 Astro 博客：以 `posts` 为内容源。
- 配置 GitHub Actions，在服务器侧跑 CI（构建/部署链路待定）。
- 定 posts 目录与 frontmatter 约定时，兼顾「可对外展示」与 Astro 内容集合需求。
