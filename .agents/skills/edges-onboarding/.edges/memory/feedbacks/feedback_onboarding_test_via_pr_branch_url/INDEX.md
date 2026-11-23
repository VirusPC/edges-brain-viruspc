---
name: feedback_onboarding_test_via_pr_branch_url
description: 改 edges-onboarding 后，把一句话安装的 main raw URL 换成 PR 分支即可测提问与接入；合入后改回 main。
metadata:
  edges-title: 改后用 PR 分支 raw URL 测一句话接入
  edges-type: feedback
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-07T23:37:18+08:00'
---

改完 edges-onboarding 后，用原先一句话安装测；把 URL 里的 `main` 换成 PR 分支名即可，不必等合入。

**Why:**
Skill 未发布前，Agent 读 main 仍是旧文；raw.githubusercontent.com 可直接指向 PR 分支上的 `SKILL.md`，用来验证开场提问与接入流程。

**How to apply:**
1. 把这句话丢给 Agent：`读 https://raw.githubusercontent.com/VirusPC/edges/<branch>/packages/skills/edges-onboarding/SKILL.md ，帮我接入 edges。`（当前 PR 示例：`cursor/onboarding-scenario-menu-f837`）
2. 测提问流程时不要先说清场景，看它是否先给出场景选项（含流程兜底）。
3. 合入 main 并发布后，测试与对外说明改回 `main` URL。
