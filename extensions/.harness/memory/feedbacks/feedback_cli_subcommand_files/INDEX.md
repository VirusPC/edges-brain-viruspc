---
name: feedback_cli_subcommand_files
description: 新增或修改 extensions/cli 的多子命令时：父文件只注册，每个子命令一个文件，commands 层只解析参数并调 Service。
metadata:
  edges-title: CLI 多子命令一文件一个动词
  edges-type: feedback
  edges-origin-session-id: bc-cf0f8ba2-7f99-5937-b33b-dccce3074186
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-10-18T04:09:33+00:00'
---

多子命令组用 `commands/<组>.ts` 只注册父命令，缺子命令时返回用法错误；每个子命令一个文件 `commands/<组>/<动词>.ts`，导出 `add<组><动词>Command`。文件里声明参数和选项，用 `ctx.env` 调 Service，成功走 `succeed`，失败走 `failNodeCommand`。业务逻辑和读写不在 commands 层，不绕过 NodeService。

**Why:** 保持各命令组一致，便于 Agent 和人照着新增命令。用户在审 #265 时指出 `compose.ts` 格式不一致。

**How to apply:** 新增或修改命令时参照 notes、skills、tasks、memory、projects、artifacts、compose 的现有文件。
