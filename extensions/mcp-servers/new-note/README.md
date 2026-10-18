# new-note

TypeScript + Node.js MCP server，用于在没有 shell 的宿主里本地创建一条 Note。不 commit、不 push、不开 PR。

本地有 shell 的 agent 请用 [`cli` 的 `edges notes`](../../cli/README.md)，不要默认走 MCP。本 server 留给没有 shell 的宿主。决策：[`.harness/memory/projects/project_cli_from_mcp.md`](../../.harness/memory/projects/project_cli_from_mcp.md)。

## What It Does

- 暴露 MCP 工具 `new_note`
- 接收结构化输入：`title`、`body`
- 子进程调用 `edges notes create --title --body`（与 CLI 同一套 JSON 契约）
- 在目标 scope 的 `notes/YYYY-MM-DD--slug/INDEX.md` 本地创建叶子
- 返回结构化 JSON 结果，便于客户端自动处理

## Requirements

- Node.js 22+
- 可写的目标 scope（`EDGES_SCOPE`，或 MCP 启动目录所属的内容作用域）

## Install

```bash
cd extensions/mcp-servers/new-note
npm install
npm run build
```

## Run

### STDIO 模式（默认）

适用于本地开发和与 IDE 集成：

```bash
npm start
```

开发模式：

```bash
npm run dev
```

### HTTP 模式

适用于远程访问和 Web 集成：

```bash
# 开发模式 (HTTP)
npm run dev:http

# 生产模式 (HTTP)
npm run start:http

# 自定义端口
npm run dev:http -- --port 8080
```

HTTP 模式将在以下端点启动服务器：
- Streamable HTTP 端点: `http://localhost:3000/new-note`
- 健康检查端点: `http://localhost:3000/health`

**注意**: HTTP 认证是可选的。仅当设置了 `EDGES_AUTH_TOKEN` 时，才需要在请求中包含 `Authorization: Bearer <token>` 头部。

## Environment Variables

- `EDGES_SCOPE`: 显式目标作用域；优先于 `EDGES_REPO`。相对路径按 MCP 启动 cwd 解析。
- `EDGES_REPO`: 未设置 `EDGES_SCOPE` 时的显式目标。两者均未设置时捕获 MCP 启动 cwd，由 CLI 找最近所属作用域或 Git 根；找不到则返回可操作的校验错误。CLI 和 Skill 资源独立从实现仓库读取。
- `EDGES_CLI`: (可选) `edges-cli` 入口绝对路径（`dist/index.js` 或 `src/index.ts`）。未设置时优先 `extensions/cli/dist/index.js`，否则回退 `extensions/cli/src/index.ts`。

### HTTP 认证 (可选)

- `EDGES_AUTH_TOKEN`: HTTP API 认证令牌（可选，仅用于 HTTP 模式；未设置时跳过认证）

## MCP Tool

MCP tool 名称：`new_note`

输入字段：
- `title` (string)
- `body` (string, optional)

成功返回（JSON 文本）示例：

```json
{
  "status": "success",
  "path": "notes/2026-02-18--daily-summary/INDEX.md",
  "title": "daily-summary",
  "stdoutSummary": "..."
}
```

失败返回（JSON 文本）示例：

```json
{
  "status": "failed",
  "errorCode": "PUSH_AUTH_FAILED",
  "reason": "Permission denied (publickey).",
  "stderrSummary": "..."
}
```

错误码：
- `VALIDATION_ERROR`
- `SCRIPT_NOT_FOUND`
- `GIT_FAILURE`
- `PUSH_AUTH_FAILED`
- `PR_CREATION_UNAVAILABLE`
- `UNKNOWN_ERROR`

## Client Integration

### STDIO 模式配置

以支持 stdio MCP 的客户端为例，可将命令配置为：

```json
{
  "command": "node",
  "args": ["/absolute/path/to/edges/extensions/mcp-servers/new-note/dist/index.js"],
  "env": {
    "GITHUB_TOKEN": "your_token_here (optional)"
  }
}
```

**提示**：配置 `EDGES_SCOPE` 可固定笔记归属；否则从启动 cwd 查找所属作用域。Server 安装位置不决定写入目标。笔记写入作用域的 `notes/`，Git 操作使用实际仓库根。

如需源码直跑（开发环境）：

```json
{
  "command": "npx",
  "args": ["tsx", "/absolute/path/to/edges/extensions/mcp-servers/new-note/src/index.ts"]
}
```

### HTTP 模式配置

对于支持 Streamable HTTP 的客户端（推荐）：

```json
{
  "type": "streamable-http",
  "url": "http://localhost:3000/new-note",
  "headers": {
    "Authorization": "Bearer your_auth_token_here"
  }
}
```

或者使用通用 HTTP 配置：

```json
{
  "type": "http",
  "url": "http://localhost:3000/new-note",
  "headers": {
    "Authorization": "Bearer your_auth_token_here"
  }
}
```

如果未设置 `EDGES_AUTH_TOKEN`，可省略 `headers.Authorization`。

**HTTP 认证错误码：**
- `AUTH_MISSING`: 缺少 Authorization 头部
- `AUTH_INVALID_FORMAT`: Authorization 头部格式错误
- `AUTH_INVALID_TOKEN`: 无效的认证令牌

## Testing

```bash
npm test
```

## Troubleshooting

- 报 `SCRIPT_NOT_FOUND`：`@viruspc/edges` 入口缺失。执行 `pnpm --filter @viruspc/edges build`，或设置 `EDGES_CLI` 指向 `dist/index.js` / `src/index.ts`。
- 报校验错误：确认 `title` 为 1–120 字，并且 `EDGES_SCOPE` 指向可写的内容作用域。

## Rollback

如果线上出现异常，可通过停止该 MCP server 或从客户端配置中移除 `new_note` 工具，回退到手工执行：

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts --scope <目录> notes create --title "…" --body "…" --json
```
