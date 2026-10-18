---
name: feedback_grill_rounds_as_html_plan
description: >-
  跑 grill-with-docs 或开实现 PR 时打开：每一轮提问做成一页 html-plan，用户 Copy response 粘回再写回卡片和
  ADR；实现 PR 主动附审阅页。markdown 仍是正本。
metadata:
  edges-title: grill 每轮与实现 PR 都附 html-plan 审阅页
  edges-type: feedback
  edges-origin-session-id: sand-subagent-91de785a-85c8-d2ad-e2bf-4dd7c12708f9
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-19T05:17:02+08:00'
---

grill-with-docs 的**每一轮提问**都做成一页 html-plan 审阅页发给用户，不再只用纯文字列 Q1、Q2；实现 PR 开出后也主动附一页审阅页（打包好的离线 HTML，必要时加截图），不用等用户要。

**Why:**

2026-10-18 审 #274（安装 skills 的 grill 结论与 ADR 0036）时，用户说纯 markdown 的 PR「太难 review」。试用 html-plan 后用户明确要求「memory 里记下，grill-with-docs 每一轮用 html plan」，并纠正是「每一轮」，不是「每一步」。随后 #276 实现 PR 没附页面时，用户追问「html 图呢」。

**How to apply:**

- 每轮提问：问题、选项、推荐项做成一页，用户选好后点 Copy response，把 markdown 粘回对话；助手据此写回任务卡和 ADR。Respond 不会自动回传，提醒用户手动粘贴。
- 页面只是视图：plan、任务卡、ADR 的 markdown 仍是正本，HTML 不进主线。
- 页面里有事实写错时，改好重新打包再发，不只在聊天里口头更正。
- 背景与来源见笔记 `notes/2026-10-19--html-plan-审阅页与-grill-with-docs-的配合/INDEX.md`。
