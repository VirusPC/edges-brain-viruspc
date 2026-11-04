本文件是总入口 skill `edges` 的模块说明，不是独立 skill。

# edges notes

人和有 shell 的 Agent 共用 [`cli`](../../../cli/README.md) 的 `edges notes`。本 skill 只说明何时调用、怎么写对命令。落盘在 CLI 的 NodeService 里，不在本目录，也不做 git commit、push 或 PR。

## 什么时候用

- 用户或任务要把一条 Note 写进选定 scope 或 Project：默认 `<scope>/.edges/notes/YYYY-MM-DD--slug/INDEX.md`，选定 P 则为 `P/notes/`；未选 Project 时，显式 `--super` 写入 `<scope>/notes/`。
- 不要用它整理对话（改用 `edges-conversation-to-notes`）、不要用它改 tasks 看板、不要自己 `git commit`。

## 有 shell：调用 CLI

在仓库根：

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts --scope <目录> notes create \
  --title "<1–120 chars>" \
  --body "<markdown>" \
  --json
```

子命令是 `notes create`。已 build 时把 `tsx src/index.ts` 换成 `node dist/index.js`。`package.json` 的 `"bin": { "edges": "./dist/index.js" }` 只是安装挂钩：装过之后也可以 `npx edges --scope <目录> notes create …`，不要再包一层仓根脚本。归入已有 Project 时，在根参数加 `--project <相对路径>`，相对 `<scope>/.edges/projects`，嵌套示例为 `P/projects/Q`。不把 Project 当新 scope，不自动初始化或迁移旧材料。`notes` 没有 `--index-group`。

标题来自 `--title`，或来自 `--body` 里的一级标题。已经由 `edges-conversation-to-notes` 写好的 Markdown 放进 `--body`。不接受 `--content`、`--content-file`、`--markdown`、`--import-entry`、`--co-author`、`--mode`、`--dry-run`、`--token-file`、`--token-stdin`。创建不会复制旁路目录，也不会 commit。

读取、更新、删除：

```bash
edges --scope <目录> notes get .edges/notes/<date>--<slug>/INDEX.md
edges --scope <目录> notes update .edges/notes/<date>--<slug>/INDEX.md --body "<markdown>"
edges --scope <目录> notes delete .edges/notes/<date>--<slug>/INDEX.md
edges --scope <目录> --super notes get notes/<date>--<slug>/INDEX.md
edges --scope <目录> --project <Project相对路径> notes list
edges --scope <目录> --project <Project相对路径> notes get <返回的path>
```

get 与 delete 只收目标。update 至少给 `--title`、`--body` 或 `--metadata key=value` 之一。创建和后续读写使用同一 scope / Project / `--super` 选择，以返回的 path 为准。`list` 默认递归已登记组成，Project 中包括可达的子 Project；`--all` 仅补充所选物理范围内的独立系统，不能用于写入。

### stdout JSON

成功 exit 0：

```json
{"status":"success","command":"notes.create","path":".edges/notes/2026-10-08--slug/INDEX.md","title":"slug"}
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

宿主不能 exec 时，调用 `packages/mcp-servers/new-note` 的工具 `new_note`，必填参数 `title`（同一套标题长度），可选 `body`、`project`（相对服务端 scope 的 `.edges/projects`）和 `super`（布尔值）。不传选择时写入 `.edges/notes/`；传 Project 则写入 P 的直属 notes，并优先于 `super`。scope 由服务端配置固定或按启动目录解析，工具不接受 scope，不把 Project 路径当 scope 传入。它同样只本地创建叶子，路径与 Project 校验交给 CLI。不要 import CLI 模块，不要找已删除的 `bin/new-note`。

## 禁止

- 不要在本 skill 下写 `scripts/` 去跑 git。
- 不要教 Agent 把仓根 `bin/` 加入 PATH。
- 不要把 npm `bin` 说成能力面的一层。能力面是 CLI + Skill + MCP（见仓库 `CONTEXT.md` 与 `docs/adr/0004-capability-surface-cli-skill-mcp.md`）。
- 不要给 `notes create` 传 `--index-group`。init 与 `memory doctor` 也不接受这个旗标；新的子作用域按路径登记到父级。
- 不要传已删除的 ingest / git 旗标。
