---
name: project_pr_merge_needs_user_review
description: 准备合入任何 VirusPC PR 前打开：除非用户当轮明确点名要合并，否则只开 PR、保持打开，不要自行 gh pr merge
metadata:
  edges-title: 合 PR 须经用户审，Agent 不自行 merge
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-28
  edges-agent-client: grok-bot
  edges-updated-at: '2026-10-28T09:24:30+08:00'
---

合入 PR 必须经用户审阅确认；Agent 不得自行 merge（含 squash merge），除非用户在当轮对话里明确说「合并 / 合入 / merge」并点名哪个 PR。

**Why:** 2026-10-27 用户在全栈会话明确纠正「你现在每次合并怎么都不让我审了」。日复盘 routine 已写「审阅在 PR 上，不自动合并」；本条把同一闸门扩到日常框架/脑仓/workspace 改动，避免 Agent 把「PR 已开」理解成可以自行合入。

**How to apply:**
- 开完 PR 后停在「待审」：回报链接，不要跑 `gh pr merge`，也不要在用户只说「更新到最新」时顺手合无关 PR。
- 用户说「更新完直接合并」时，只合用户当轮点名的那一张（或明确「刚开的那张」）；其余仍保持打开。
- 日复盘 / 周复盘 / 沉淀类 PR 一律保持 OPEN，等人合并。
