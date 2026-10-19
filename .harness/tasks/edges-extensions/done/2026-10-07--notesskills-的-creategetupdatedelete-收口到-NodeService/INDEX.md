---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-19T13:54:49.863Z'
  edges-title: notes/skills 的 create·get·update·delete 收口到 NodeService
  edges-tasks-status: done
  edges-task-priority: none
name: notes-skills-crud-via-nodeservice
description: >-
  消灭 notes/skills 对 NodeService 的旁路：create/get/update/delete（skills 无 update）全部经
  NodeService，与 tasks/memory、list 一致。
---
**背景：**
2026-10-07 对 edges CLI harness 模块 CRUD 核对（HEAD 约 `f3bb56e8`）后确认：list 均走 NodeService；tasks 主写与 memory remember/get/delete 未发现绕过。但 notes 的 get/update/delete（`services/note/records.ts` 直接读写/rm INDEX）与 skills 的 get/delete（`services/skills/records.ts` 扫盘/`rmSync`）绕过 NodeService。用户明确最不希望绕过 NodeService，要求记卡并开始完成。随后补充：范围还要包含 create，notes 与 skills 的 create、get、update、delete（skills 无 update）全部经 NodeService，消灭任何旁路。
- 相关现状：核对当时 notes create/list、skills list 已走 NodeService，同模块内读写路径不一致；用户要求把 create 与读改删一起收口，不留旁路。
- 非目标：不重做 artifacts（非 node 域）；不借此大改 tasks/memory 已厚编排路径；evaluation/observation 无 CLI 不在本卡。
- 关联：对话（任务记录员 2026-10-07）；兄弟解耦卡「解耦 CLI commands 与 Service」已 done（#165）

**目标：**
notes 与 skills 的 create、get、update、delete（skills 无 update）与 list 一样经 NodeService（或同一套 Node 门面），无直接 fs 写 INDEX、rm 目录或扫盘旁路。

**动作：**
- 先 grill-with-docs：对齐 NodeService API、错误合同、与现 CLI 行为兼容边界
- 改 `services/note/records.ts`、`services/skills/records.ts`（及必要调用方）走 NodeService.create/get/update/destroy（或项目等价 API）；skills 无 update 则不发明 update
- 补/改测试证明旁路已消失；回归 notes/skills CLI

**完成标准：**
- [x] notes create/get/update/delete 经 NodeService；不再 `readFileSync`/`writeFileSync`/`rmSync` 直改 INDEX（测试可证）
- [x] skills create/get/delete 经 NodeService；不再扫盘/`rmSync` 旁路（skills 无 update）
- [x] 既有 CLI 行为与错误语义尽量兼容；相关测试通过
- [x] 变更经 PR 合入 main
