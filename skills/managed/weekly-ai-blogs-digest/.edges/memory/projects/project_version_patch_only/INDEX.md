---
name: project_version_patch_only
description: >-
  改本技能版本号时打开：永远只升 patch（+0.0.1），不得升高 minor 或 major；即使行为或契约变化，也不按通用约定去升 0.1.0 或
  1.0.0。
metadata:
  edges-title: 本技能只升 patch 版本
  edges-type: project
  edges-origin-session-id: sand-subagent-d68b4b17-5691-5b4f-2f83-9920e94c999f
  edges-agent-client: cursor
  edges-updated-at: '2026-11-23T17:11:40+08:00'
---

本技能 weekly-ai-blogs-digest 的版本号永远只升 patch（+0.0.1），不得升高 minor 或 major。

**Why:**

这是用户于 2026-11-23 专门针对本技能定下的规则。Edges skills 目录的通用约定是：补丁 +0.0.1，行为或契约变化 +0.1.0，不兼容 +1.0.0。本技能已经按用户要求把编号排在 0.0.x；如果再按通用约定把行为或契约变化写成 0.1.0，就会离开这条线。本条约定覆盖上述通用规则，且只对本技能生效。

**How to apply:**

改了本技能的 `SKILL.md`、scripts、references、数据契约或对外行为后，只把 patch 加一，例如 0.0.5 → 0.0.6，并在 `CHANGELOG.md` 里用对应的 patch 号。即使这次改动改变了行为或契约，也不升到 0.1.0 或 1.0.0。修改本技能前，同时按「每次修改本 skill 要考虑的点」里的版本号条目和本层硬约束检查。
