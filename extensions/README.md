# 外部连接扩展 (extensions/)

`extensions/` 是 Edges 系统与外部世界（AI Agent、IDE 客户端、第三方系统）通信的**接口层**。

这里的代码不是用来开发 Edges 系统本身的，而是作为“连接器”，实现 **“终端捕获，核心沉淀”** 的设计思想：让 ChatGPT、Cursor、Claude Code 等终端生成的思考，能够通过 CLI、Skill 或 MCP 流入核心资产库。三条入口并列：[`cli/`](cli/)（`edges notes …`）、[`skills/`](skills/)（何时如何调用）、[`mcp-servers/`](mcp-servers/)（没有 shell 的宿主）。决策见 [能力面决策](../.harness/memory/projects/project_capability_surface_cli_skill_mcp/INDEX.md)。

## 收录标准

判据是**「这是为了让 Agent / 外部系统接入或操作 Edges」**，而不是「它是代码还是文档」。
纯 markdown 一样是 extension——一段能复用的 system prompt、一份开荒新机器的操作手册，与一个 MCP server 在这里地位相同。
反过来：只在当下有用、不可复用的总结属于 `notes/`；跨机器共用、却不绑定 Edges 的 harness（通用 skill、MCP 配置、plugins、hooks）属于 [`shared-extensions/`](../shared-extensions/README.md)。

换 Agent、换机器带得走是进本目录的必要条件，不是充分条件。

## 目录结构

**协议与能力**

- **`cli/`**: 面向 agent 的 CLI 项目（`edges`：`notes`、`tasks`、`artifacts`、…）。有 shell 的本地 agent 优先走这里。公共节点与文档工具在 [`cli/src/utils/node-tree/`](cli/src/utils/node-tree/README.md)，使用 TypeScript，与命令适配分层。
- **`services/`**: 接入 Edges 的常驻 HTTP 进程（不是 MCP，也不是 Commander 命令节点）。目前是 Artifacts 预览服务 [`services/artifacts-preview/`](services/artifacts-preview/)；命令面仍是 `edges artifacts`。
- **`apps/`**: 全局共享的对外应用实现，可被不同作用域复用。目前包括 [`tasks-review-app/`](apps/tasks-review-app/)，构建结果供 CLI 的任务审阅页使用。
- **`mcp-servers/`**: [Model Context Protocol](https://modelcontextprotocol.io/) 服务器实现。给没有 shell 的 AI 客户端。
- **`skills/`**: 供外部 Agent 加载、并随 `@viruspc/edges` 分发的技能。项目级用 `pnpm skills:link` 把每个 skill 软链到 `.agents/skills`。外部用户执行 `edges skills init -- -g -y`（或无参 `edges init -- -g -y`）安装包内 skill。没有 TTY 时不要省略 `--` 后面的旗标。不调用 edges CLI 的通用 skill 在 [`shared-extensions/skills/`](../shared-extensions/skills/README.md)。
- **`subagents/`**: 针对特定复杂任务预配置的子代理。
- **`tools/`**: 暴露给外部系统的独立工具或脚本适配器。

**可复用的操作资产**

- **`system-prompt/`**: 可复用的 system prompt 片段与模板，接入新 Agent 时直接取用。
- **`new-server/`**: 新机器 / 新服务的开荒手册（用户与权限、DNS 配置、第三方模型 key 接入等）。
- **`others/`**: 尚未归类的可复用片段，如存档的检索式。

**文档**

- **`docs/`**: 关于接口协议和接入指南的详细文档。

## 接入准则

1. **标准化**: 能力面是 CLI、Skill、MCP 三者并列（[`cli/`](cli/)、[`skills/`](skills/)、[`mcp-servers/`](mcp-servers/)），不是「有 shell 就只用 CLI、没有再补 MCP」。
2. **文档化**: 每个子目录都应包含独立的 README，说明其调用协议和配置方法。
3. **解耦**: Extension 应当只依赖 `edges` CLI 契约或作用域内约定的 `notes/`、`edges/` 等内容路径，避免复杂的内部依赖。不要依赖仓根 `bin/`。
4. **自包含**: 一个 extension 应当能被单独复制走。避免用 Obsidian wikilink 引用 `resources/` 下的附件——链接在 vault 内能解析，但目录被带到别处时附件会丢失。
