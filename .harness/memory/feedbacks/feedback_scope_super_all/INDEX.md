---
name: feedback_scope_super_all
description: >-
  改 edges 的 list、写任务、init、doctor、帮助、skill 或持久看板生成时：目录和登记分组只由
  --scope、--super、--all 与路径决定，不要再加 purpose、index-group 或另一套全仓开关。
metadata:
  edges-title: scope、super、all 的组合形成一切
  edges-type: feedback
  edges-origin-session-id: ed32d8b9-d356-4eb9-8822-6ad2ddc36d1c
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-10-18T05:55:13+00:00'
---

`--scope`、`--super`、`--all` 与路径决定目录和登记分组。不设 purpose、index-group 之类用途旗标。

**Why:** 用户 2026-10-07 收口，2026-10-18 再拍板。用途和 index-group 是在主体系统之外又加一套分类，命令因此变复杂。目录由范围参数和路径定下之后，看板落点和登记分组跟着目录走。

**How to apply:** 改 list、写任务、init、doctor、帮助、skill 或持久看板生成时，范围只用这三个根开关。`--scope` 选定主体；`--super` 把主体换成该 scope 上的虚拟系统一；`--all` 从当前 scope 走森林。一般 `--scope` 就够。主体是仓库之外的虚拟系统一时，用 `--scope <仓库根> --super`，任务写入该系统的 `tasks/`（即 `<仓库根>/tasks`）。真系统的看板是 `<scope>/.harness/tasks`。最全的查询是 `--scope <仓库根> --super --all`。

`edges init`、`edges memory init`、`edges notes init`、`edges projects init`、`edges skills init`、`edges tasks init` 不接受 `--index-group`。未登记的子作用域按路径登记：目标 `AGENTS.md` 在锚点 `.harness` 下是 local，否则是 descendant。已经登记的保持原组。`edges memory doctor --apply` 用同一规则补上缺失的父级链接，不挪已有登记。

`extensions/cli/scripts/generate-tasks-site.ts` 不接受 `--purpose`，始终汇总该根下发现的全部任务板。list、分组和生成页仍输出从目录推出的 `source.purpose`（父目录名为 `.harness` 则是 maintenance，否则是 domain）。身份键仍是 `scope:purpose:project:stem`。

不要再加用途、分组或另一套全仓开关。NodeService 写节点时的 `indexGroup` 覆盖不是这条要删的旗标。
