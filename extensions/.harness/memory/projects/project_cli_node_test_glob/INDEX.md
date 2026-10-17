---
name: project_cli_node_test_glob
description: 跑 extensions/cli 测试时：Node 22 + tsx 下 `node --test --import tsx test` 会把 test/ 当成模块并找 test/index.json；用 './test/**/*.test.ts'。
metadata:
  edges-title: edges-cli 测试用 glob 而不是目录 test
  edges-type: project
  edges-origin-session-id: bc-d482593f-00aa-4f8d-9f91-3fc354b40de3
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: "2026-09-16T04:12:20+00:00"
---

跑 `extensions/cli` 的 `node:test` + `tsx` 套件时，用 `node --test --import tsx './test/**/*.test.ts'`，不要用目录参数 `test`。已验证于 2026-09-16（Node 22.14 + tsx 4.21）。

**Why:**
`node --test --import tsx test` 在该组合下把 `test/` 当成 ESM 模块解析，报 `ERR_MODULE_NOT_FOUND` for `test/index.json`，`pnpm --filter @viruspc/edges test` 无法跑递归套件。ADR 0009 实现计划仍写着旧命令；实现 PR 已把 `package.json` `"test"` 改成 glob。

**How to apply:**
- 改 `extensions/cli/package.json` `"test"` 或写计划里的测试命令时，保持 glob，不要为了「跟旧计划字面一致」改回 `node --test --import tsx test`。
- 单文件仍可用 `node --test --import tsx test/tasks/utils/foo.test.ts`。
- 不要因此换 vitest。
