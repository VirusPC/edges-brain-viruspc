---
name: project_cloud_agent_blind_verification
description: 派云端 Agent 验证约定或功能能否被自然用对时打开：写清产出、要点和交付形式，不提示期望落点或参数
metadata:
  edges-title: 派云端 Agent 验证：验收写具体，不提示答案
  edges-type: project
  edges-origin-session-id: sand-subagent-ce7b2d5e-de1c-ad6f-6451-4f15d78beee6
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-22T05:20:20+08:00'
---

派云端 Agent 去验证「某个约定或功能会不会被自然用对」时，任务要写具体：产出什么、内容要覆盖哪几点、标题、以什么形式交付（例如开 PR）。但不能提示期望的结果，比如该写进哪个仓、该用什么 `--scope` 或参数，这样才不算作弊。

**Why:** 2026-10-21 验证「Compose 子仓可写以后，沉淀能不能落进子仓」。用户要求派云端 Agent 去写，理由是「比你自己去写靠谱」「避免作弊」。第一版提示只有一句「按本仓约定写一条 Compose 可写的笔记」，用户说「你这个需求太模糊了」。改成写清主题、三条要点、标题带「Compose 子仓可写」、写完开 PR，但仍然不说落点，Agent 读了工作区 `AGENTS.md` 和 `.edges/compose/README.md` 以后自己写进了公开脑。

**How to apply:**
- 提示里写验收标准，不写答案。期望的落点或做法只留在自己这边，用来对照结果。
- 回报结果时分清楚：是 Agent 读规则做对的，还是 CLI 或机制自动做到的。两者的结论不一样。
- 验证留下的临时分支、探测文件、工作区指针，要么收拾掉，要么合到 main 上的提交，不留悬空引用。
