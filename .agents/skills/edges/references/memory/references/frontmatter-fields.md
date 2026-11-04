# 条目 frontmatter 的字段来源

字段清单与顺序看 [`templates/index.tmpl.md`](templates/index.tmpl.md)。这里只讲值从哪来，以及更新已有条目时谁覆盖谁。落盘时内部名映射到 `metadata.edges-*`（`title` → `edges-title`，以此类推）；读的时候顶层旧键和 `metadata:` 都认，后者优先。

本文件只适用于 `feedback`、`project`、`reference` 三种普通记忆；`packages/skills/` 的内容遵循其自身协议，但出处 / 审计同样进 `metadata:`。

**正常写入路径用不到这一份。** 除 `--title` / `--description` 外的字段都由脚本自动填，只有要修正已经写错的值时才需要查表。

| 字段组 | 来源 | 更新时 |
| --- | --- | --- |
| 身份与语义 `name` `type` | `name` 等于内容目录名（如 `project_example`），写在顶层，不是入口文件名 `index`；`type` 就是 `--type`，写在 `metadata.edges-type` | 不变 |
| 语义 `title` `description` | 同名命令行参数；`description` 顶层，`title` 在 `metadata.edges-title` | 不传则保留原值 |
| 出处 `originSessionId` `agentClient` | 环境变量：`CURSOR_CONVERSATION_ID` / `CLAUDE_SESSION_ID`，以及 `CURSOR_AGENT` → `cursor`、`CLAUDECODE` → `claude-code`；落盘为 `edges-origin-session-id` / `edges-agent-client` | **保留创建时的值** |
| 审计 `username` `email` `updatedAt` | 前两个取 `git -C <目录> config`，后一个取本地时区 ISO 8601；落盘为 `edges-username` / `edges-email` / `edges-updated-at` | **每次覆盖** |

- 出处记「谁最先写的」，审计记「谁最后改的」，两端都有了就不必再加 `createdAt`。
- 显式参数（`--origin-session-id` / `--agent-client` / `--username` / `--email`）优先级最高，写错了可以改回来。
- `git config` 在非仓库目录里也会读全局配置，所以 `username` / `email` 基本总能取到；真取不到才省略。审计字段探测不到时沿用旧值，不清空。
