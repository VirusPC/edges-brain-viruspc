---
name: project_daily_retro_pr_use_merge_commit
description: 用户要求合并本仓日复盘 PR 时打开：使用普通 merge commit（merge_method=merge），不要 squash。
metadata:
  edges-title: 合并日复盘 PR 用普通 merge commit，不要 squash
  edges-type: project
  edges-origin-session-id: bc-057763ea-478d-593b-8a51-fdab54f35d76
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-20T21:36:53+00:00'
---

这是针对本仓日复盘类 PR 的合入方式约定：用户要求合并时，使用普通 merge commit（`merge_method=merge`），不要 squash。

**Why:** 2026-11-20 16:33（Asia/Shanghai）用户在「日复盘」助手对话里，要求把这几天未合并的日复盘 PR 合进 VirusPC/edges-brain-viruspc，并明确说「直接合不要squash」。随后按普通 merge commit（不是 squash）合入了当日点名的那些 PR。

**How to apply:**
- 这条不改变既有闸门：没有用户当轮明确点名要合并时，仍然只开 PR、保持打开，不要自行 merge。见已有记忆 `.edges/memory/projects/project_pr_merge_needs_user_review/`。本条只补充「用户已经要求合并日复盘 PR 时，用哪种合入方式」。
- 不要把这条扩成所有仓库、所有类型 PR 的默认策略；用户当日说的是这几天的日复盘 PR。
