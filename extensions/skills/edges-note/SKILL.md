---
name: edges-note
description: 把一条 Note 入库到 Edges 仓库时使用。有 shell 就调用 `edges notes`；没有 shell 的宿主调用对等能力面入口 new-note MCP。只在本地写叶子，不要自己跑 git，也不要找仓根 bin/new-note。
version: 2.3.1
---

# edges notes

人和有 shell 的 Agent 共用 [`extensions/cli`](../../cli/README.md) 的 `edges notes`。本 skill 只说明何时调用、怎么写对命令。落盘在 CLI 的 NodeService 里，不在本目录，也不做 git commit、push 或 PR。

## 什么时候用

- 用户或任务要把一条 Note 写进选定 scope 的 `notes/YYYY-MM-DD--slug/INDEX.md`。
- 不要用它整理对话（改用 `conversation-to-notes`）、不要用它改 tasks 看板、不要自己 `git commit`。

## 有 shell：调用 CLI

在仓库根：

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts --scope <目录> notes create \
  --title "<1–120 chars>" \
  --body "<markdown>" \
  --json
```

子命令是 `notes create`。已 build 时把 `tsx src/index.ts` 换成 `node dist/index.js`。`package.json` 的 `"bin": { "edges": "./dist/index.js" }` 只是安装挂钩：装过之后也可以 `npx edges --scope <目录> notes create …`，不要再包一层仓根脚本。笔记写入该 scope 的 `notes/`。`notes` 没有 `--index-group`。

标题来自 `--title`，或来自 `--body` 里的一级标题。已经由 `conversation-to-notes` 写好的 Markdown 放进 `--body`。不接受 `--content`、`--content-file`、`--markdown`、`--import-entry`、`--co-author`、`--mode`、`--dry-run`、`--token-file`、`--token-stdin`。创建不会复制旁路目录，也不会 commit。

读取、更新、删除：

```bash
edges --scope <目录> notes get notes/<date>--<slug>/INDEX.md
edges --scope <目录> notes update notes/<date>--<slug>/INDEX.md --body "<markdown>"
edges --scope <目录> notes delete notes/<date>--<slug>/INDEX.md
```

get 与 delete 只收目标。update 至少给 `--title`、`--body` 或 `--metadata key=value` 之一。

### stdout JSON

成功 exit 0：

```json
{"status":"success","command":"notes.create","path":"notes/2026-10-08--slug/INDEX.md","title":"slug"}
```

失败时 `status` 为 `failed`，带 `errorCode` 与 `reason`。

### exit codes

| code | 含义 |
| --- | --- |
| 0 | 成功 |
| 1 | 运行时失败 |
| 2 | 用法或校验失败 |

进度与诊断在 stderr。只解析 stdout JSON。

## 无 shell：改用 MCP

宿主不能 exec 时，调用 `extensions/mcp-servers/new-note` 的工具 `new_note`，参数 `title`、`body`（同一套标题长度）。它同样只本地创建叶子。不要 import CLI 模块，不要找已删除的 `bin/new-note`。

## 禁止

- 不要在本 skill 下写 `scripts/` 去跑 git。
- 不要教 Agent 把仓根 `bin/` 加入 PATH。
- 不要把 npm `bin` 说成能力面的一层。能力面是 CLI + Skill + MCP（见仓库 `CONTEXT.md` 与 `docs/adr/0004-capability-surface-cli-skill-mcp.md`）。
- 不要给 `notes create` 传 `--index-group`。init 与 `memory doctor` 也不接受这个旗标；新的子作用域按路径登记到父级。
- 不要传已删除的 ingest / git 旗标。
