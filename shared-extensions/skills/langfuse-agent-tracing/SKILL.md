---
name: langfuse-agent-tracing
description: >-
  当用户要把编码 Agent（Codex、Cursor、Claude Code、OpenCode、Pi 等）的会话追踪接到 Langfuse
  时使用：安装以官方文档为准，本 skill 给出流程，并补文档没写清的坑、设备标签约定与验证方法。
---
# Langfuse Agent 追踪

把编码 Agent 的 session / turn 接到 Langfuse。**命令和配置格式一律以官方文档为准**，本 skill 只给流程，并补文档没写清的部分。

云端编排不在本 skill 里。Cursor Cloud Agents 用 [cursor-cloud-langfuse-tracing](../cursor-cloud-langfuse-tracing/SKILL.md)。Codex Cloud 用 [codex-cloud-langfuse-tracing](../codex-cloud-langfuse-tracing/SKILL.md)。

## 流程

1. 读文档
2. 准备：确认项目和 key，备份配置
3. 按 Agent 安装
4. 打设备标签
5. 验证

## 1. 读文档

每个要装的 Agent 先打开对应页（`curl` / WebFetch 均可，URL 加 `.md` 拿纯 Markdown），按页内当前写法操作：

| Agent | 文档 |
|---|---|
| Codex | https://langfuse.com/integrations/developer-tools/codex |
| Cursor | https://langfuse.com/integrations/developer-tools/cursor |
| Claude Code | https://langfuse.com/integrations/developer-tools/claude-code |
| OpenCode | https://langfuse.com/integrations/developer-tools/opencode |
| Pi | https://langfuse.com/integrations/developer-tools/pi-agent |
| 其它 | https://langfuse.com/llms-integrations.txt 的 `developer-tools` 列表；总索引 https://langfuse.com/llms.txt |

## 2. 准备

- **项目和 key：** 同一台机、同一 Langfuse 项目，各 Agent 复用同一对 key。装前用文档里的 status / setup（或 API）确认 key 实际落在哪个项目。
- **baseUrl：** 自建实例填根地址，含协议。
- **备份并合并：** 改配置前先备份（如 `.bak-langfuse-YYYYMMDD`），把新内容**合并**进已有的 `config.toml`、`settings.json`、`hooks.json`、`opencode.json(c)`，不要覆盖其它插件。

## 3. 按 Agent 安装

按文档装官方插件 / marketplace / npm 包，同一工具只装一套。各家文档没写清的坑：

| Agent | 坑 |
|---|---|
| Codex | Stop hook 需要用户**新开交互会话**批准，不要手写 `[hooks.state.…]` 的 hash 绕过；只跑 `codex exec` 可能不触发 hook。 |
| Cursor | Marketplace 和 npm hook 只选一条，否则每个动作两份 trace。从 Dock 启动读不到 shell 的 `PATH`，hooks 里的 `node` 用绝对路径。装完要 Reload Window（命令面板搜 `Reload Window`；只有 `Cmd+P` 时输入 `>Reload Window`）。Cloud Agents 不跑用户级 / Marketplace 插件，见 [cursor-cloud-langfuse-tracing](../cursor-cloud-langfuse-tracing/SKILL.md)。 |
| Claude Code | 未登录无法验证，先 `/login`；已开的会话要重启才加载插件。 |
| OpenCode | 单次 `opencode run` 退出太快可能来不及上报，验证用交互界面或文档里的 serve / attach。 |
| Pi | 无额外坑。 |

## 4. 打设备标签

### 用哪个字段

Langfuse trace 上有三个相关字段：

- **tags：** 字符串标签，用来筛选、分组、dashboard 拆分，上报后不可改。**要筛的维度都放这里**，写成 `key:value`。
- **metadata：** 键值对，放打开 trace 才看的附加信息。Langfuse 4.59 以下按嵌套 metadata 筛选弱，不要指望用它筛。
- **environment：** 语义是 prod / dev，不放设备名，除非插件没有 tags 口。

### 设备约定

- tag 写成 `device:<短名>`。短名优先取 Tailscale MagicDNS 短名（如 `macbookpro-w`）；没有 Tailscale 或取不到时，退回系统主机名（`hostname`）。不用序列号。
- 有 Tailscale 时，规范名以 IT 资产台账或 tailnet 现网为准。
- 插件都不会自动带 hostname，每台机器各配一次。

### 各插件怎么配

2026-10 按文档和源码核对；插件更新后以新文档为准。

| Agent | tags | metadata |
|---|---|---|
| Codex | `~/.codex/langfuse.json` 的 `"tags"`，或 `LANGFUSE_CODEX_TAGS` | `"metadata"`，或 `LANGFUSE_CODEX_METADATA` |
| Cursor | `~/.cursor/langfuse.json` 的 `"tags"`，或 `LANGFUSE_TAGS`；固定追加 `cursor` | `"metadata"`，或 `LANGFUSE_CURSOR_METADATA` |
| Claude Code | `~/.claude/settings.json` 的 `env.CC_LANGFUSE_TRACE_TAGS`；文档未写，见[源码](https://github.com/langfuse/claude-observability-plugin/blob/main/hooks/langfuse_hook.py) | 不支持 |
| OpenCode | 不支持（[issue #57](https://github.com/langfuse/opencode-observability-plugin/issues/57)） | 不支持 |
| Pi | 不支持，源码写死 `["pi"]` | 只能用 `OTEL_RESOURCE_ATTRIBUTES`，落在 `resourceAttributes`；自带 `cwd`、`git_branch` |

**没有 tags 口时：** 临时把设备名写进 environment。OpenCode 用 `opencode-langfuse.json` 的 `"environment"` 或 `LANGFUSE_ENVIRONMENT`；Pi 用 `langfuse.json` 的 `"environment"` 或 `LANGFUSE_TRACING_ENVIRONMENT`。值只能小写、不超过 40 字符、不带 `device:` 前缀。上游支持 tags 后改回 tags。

**metadata 的限制：** 配置里写的是静态值，每次会话都一样。仓库、分支、commit 这类每轮在变的现场信息配不进去，要靠插件自己采集。

## 5. 验证

- 每个 Agent 触发一轮真实对话，或用文档里的测试方式。
- 在 Langfuse 的 Traces / Sessions 页面查看，或调 API。实例开了 v4 events-only 时 `GET /api/public/traces` 会 404，改用：

```bash
curl -s -u "$LANGFUSE_PUBLIC_KEY:$LANGFUSE_SECRET_KEY" \
  "$LANGFUSE_BASE_URL/api/public/v2/observations?limit=20"
```

- 确认 trace 带上了设备 tag（或 environment）。
