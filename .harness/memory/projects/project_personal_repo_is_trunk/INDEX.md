---
name: project_personal_repo_is_trunk
description: 本仓（原 VirusPC/edges）是个人主干，长期保留不归档；系统只往外拆成新仓，旧 PR 链接用新仓名引用
metadata:
  edges-title: 个人仓是长期主干，系统往外拆
  edges-type: project
  edges-origin-session-id: sand-subagent-9bba2d17-f501-3bca-5df5-c998d3e51948
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-21T05:19:35+08:00'
---

本仓（原 `VirusPC/edges`，2026-10-20 起改名 `VirusPC/edges-brain-viruspc`）是 peng cheng 的个人主干，长期保留，不归档；系统部分只往外拆成新仓。

**Why:** 2026-10-20 拆仓 grill 时先后考虑过「系统仓重写历史」「edges 改名、框架开新仓」「旧仓 archive 再开两个新仓」。用户最后指出：个人知识库会不断长出新项目，以后还会不断往外拆系统，总不能每次都 archive。于是定为 R6：现在的 edges 改名作个人主干，框架另开新仓沿用 `VirusPC/edges`。用户当时明确说这条要记一个 memory，并且记在个人仓。个人仓的 commit 历史不刻意脱敏。

**How to apply:**

- 个人内容的新项目直接在本仓里长。
- Edges 框架等系统部分，从本仓往外拆成独立新仓（新仓从单个初始提交开始），本仓删掉对应路径；框架仓沿用 `VirusPC/edges`。改框架去框架仓开 PR。
- 将来要公开或开源的东西，从一开始就放独立仓，不再和个人内容混放。
- 已接受的代价：拆出去的系统，旧 commit 和旧 PR 留在本仓。另外，`VirusPC/edges` 这个名字被新框架仓占用后，GitHub 不再把旧链接 `VirusPC/edges/pull/<N>` 重定向到本仓。引用拆仓前的 PR 时用 `VirusPC/edges-brain-viruspc/pull/<N>`。
- 决策过程见任务卡 `.harness/tasks/edges-extensions/done/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去/`（grill R1–R6）。
- 2026-10-20 同一条记忆也写进过 `VirusPC/edges`（#328，正文里的「本仓」指个人仓）。#332 清理个人仓里的系统文件时把根目录的记忆一起删了，所以本条在个人仓补回。
