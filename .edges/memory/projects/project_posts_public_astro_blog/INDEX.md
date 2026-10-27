---
name: project_posts_public_astro_blog
description: posts 面向对外展示；后续以 posts 为数据用 Astro 搭博客，并用 GitHub Actions 在服务器做 CI
metadata:
  edges-title: posts 对外展示，Astro 博客 + Actions CI
  edges-type: project
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: Task 记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-10T08:00:53+00:00"
---

`posts` 是要对外展示的内容；后续把 `posts` 作为数据，用 Astro 搭建博客，并配置 GitHub Actions 在服务器做 CI。

**Why:**
posts 与对内 notes/tasks/记忆不同，是公开站点的内容源；目录与格式约定要从一开始按「可被 Astro 消费、可被 CI 构建」来定，避免事后再洗。

**How to apply:**
- 改 posts 结构或 frontmatter 时，默认假设内容会进公开博客
- 博客实现：Astro 读 posts 数据；部署链路用 GitHub Actions，在服务器侧 CI
- 不要把仅对内的速记/工作项默认写进 posts
