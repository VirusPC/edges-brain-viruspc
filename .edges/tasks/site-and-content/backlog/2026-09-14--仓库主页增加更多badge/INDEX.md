---
name: add_more_repo_badges
description: 仓库主页增加更多 badge，不只 teach 部署这一枚
metadata:
  edges-type: task
  edges-title: 仓库主页增加更多 badge
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-17T14:09:12.297Z"
  edges-task-project: site-and-content
---

仓库主页要再加更多 badge。teach 部署状态那枚已经落地（PR #54，已 done）。

**Why:**
现在主页几乎只看见 teach 部署；CI、其它 workflow、质量信号看不出来。徽章要能一眼看出仓在跑什么、绿没绿。

**How to apply:**
- 盘点现有 `.github/workflows/`，选出该上主页的（CI、deploy、检查等）。
- README 增加对应 GitHub Actions `badge.svg`，风格与 teach 那枚对齐。
- 不要把 ECS 部署失败修进这条；那是运行问题，不是展示。
- 未指派。派发时默认先 grill-with-docs。
