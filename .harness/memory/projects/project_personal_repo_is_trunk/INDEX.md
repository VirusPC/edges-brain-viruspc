---
name: project_personal_repo_is_trunk
description: 原 edges 改名 edges-brain-viruspc 作个人主干长期保留；系统拆成新仓，不再 archive
metadata:
  edges-title: 个人仓是长期主干，系统往外拆
  edges-type: project
  edges-origin-session-id: 099e84df-06c3-4c5d-9e29-fc255dce3d56
  edges-agent-client: cursor
  edges-username: VirusPC
  edges-email: 30697592+VirusPC@users.noreply.github.com
  edges-updated-at: '2026-10-20T12:12:43+08:00'
---

本仓（原 `VirusPC/edges`，2026-10-20 起改名 `VirusPC/edges-brain-viruspc`）是 peng cheng 的**个人主干**，长期保留，不归档。

**Why:** 个人知识库会不断长出新项目，系统也会不断往外拆；每次都 archive 不现实。个人仓的 commit 历史无所谓，不刻意脱敏。

**How to apply:**
- 个人内容的新项目：直接在本仓里长。
- 系统（Edges 框架等）：从本仓**往外拆成新仓**（新仓从单个初始提交开始），本仓删掉对应路径；框架仓沿用 `VirusPC/edges`。
- 要公开 / 开源的东西从一开始就放独立仓，别再和个人内容混在一起。
- 两边用 Compose 双向挂：系统仓为主体时挂本仓作个人工作区；本仓为主体时挂系统仓作参考项目。
- 代价已接受：拆出去的系统，其旧 commit 与 PR 留在本仓；本仓若转私有，外人看不到这段历史。
- 决策细节见任务卡 `.harness/tasks/edges-extensions/in_progress/2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去/`（grill R6）。
