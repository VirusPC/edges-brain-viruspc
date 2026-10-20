# mcp/

跨机器、跨 Agent 共用的 MCP **配置**。

这里放「连哪些 server、命令是什么、环境变量叫什么」，不放 server 的实现。为 Edges 实现的 MCP server 在 [`extensions/mcp-servers/`](https://github.com/VirusPC/edges/blob/main/extensions/mcp-servers/README.md)。

## 怎么写

- 用各家都能映射的字段描述 server：名字、启动命令 / URL、环境变量名。
- 凭据只写环境变量占位，禁止写实际 token / key。
- 一份配置默认对所有 Agent 共用。某家字段对不上时，再在本目录加 Agent 子目录，不要一上来按 Agent 切开。

不要为本目录另开 version 或 changelog，跟 shared-extensions 整层走 [`VERSION`](../VERSION) / [`CHANGELOG.md`](../CHANGELOG.md)。

安装到 `~/.claude.json`、`~/.cursor/mcp.json`、Codex `config.toml` 等发现位的映射脚本尚未落地。有第一份真实配置时再加。
