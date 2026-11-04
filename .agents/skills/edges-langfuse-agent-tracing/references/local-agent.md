本文件是 `edges-langfuse-agent-tracing` 的参考，不是独立 skill。

# Langfuse Agent 追踪

把本机编码 Agent 的 session / turn 接到 Langfuse。**命令和配置格式一律以官方文档为准**，本 skill 只给流程，并补文档没写清的部分。

本机桌面会话见本 skill。Codex Cloud、Cursor Cloud、Grok Bot 导出请先打开[主入口](../SKILL.md)。

云端编排不在本 skill 里。Cursor Cloud Agents 用 [Cursor Cloud](cursor-cloud.md)。Codex Cloud 用 [Codex Cloud](codex-cloud.md)。Grok Bot 导出用 [Grok Bot](grokbot.md)。

## 流程

1. 读文档
2. 准备：确认项目和 key，备份配置
3. 按 Agent 安装
4. Environment 与设备标签
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
- **baseUrl：** 自建实例填根地址，含协议（例：`https://langfuse.example.com`）。不要把真实实例域名写进仓库。
- **备份并合并：** 改配置前先备份（如 `.bak-langfuse-YYYYMMDD`），把新内容**合并**进已有的 `config.toml`、`settings.json`、`hooks.json`、`opencode.json(c)`，不要覆盖其它插件。

## 3. 按 Agent 安装

按文档装官方插件 / marketplace / npm 包，同一工具只装一套。各家文档没写清的坑：

| Agent | 坑 |
|---|---|
| Codex | Stop hook 需要用户**新开交互会话**批准，不要手写 `[hooks.state.…]` 的 hash 绕过；只跑 `codex exec` 可能不触发 hook。 |
| Cursor | Marketplace 和 npm hook 只选一条，否则每个动作两份 trace。从 Dock 启动读不到 shell 的 `PATH`，hooks 里的 `node` 用绝对路径。装完要 Reload Window（命令面板搜 `Reload Window`；只有 `Cmd+P` 时输入 `>Reload Window`）。Cloud Agents 不跑用户级 / Marketplace 插件，见 [Cursor Cloud](cursor-cloud.md)。 |
| Claude Code | 未登录无法验证，先 `/login`；已开的会话要重启才加载插件。 |
| OpenCode | 单次 `opencode run` 退出太快可能来不及上报，验证用交互界面或文档里的 serve / attach。 |
| Pi | 无额外坑。 |

## 4. Environment 与设备标签

### 用哪个字段

Langfuse trace 上有三个相关字段：

- **tags：** 字符串标签，用来筛选、分组、dashboard 拆分，上报后不可改。**要筛的维度都放这里**，写成 `key:value`。
- **metadata：** 键值对，放打开 trace 才看的附加信息。Langfuse 4.59 以下按嵌套 metadata 筛选弱，不要指望用它筛。
- **environment：** 产品 × 运行位置（本机 / 云端 / Grok Bot 导出），**不放设备名**。

### Environment 约定（产品 × 位置）

本机与云端成对；Grok Bot 小时导出单独一档。值只能小写字母 / 数字 / 连字符，建议 ≤40 字符。

| 位置 | environment | 说明 |
|---|---|---|
| 本机 Codex | `codex-local` | 与云端 `codex-cloud` 成对 |
| 本机 Cursor | `cursor-local` | 与云端 `cursor-cloud` 成对 |
| 本机 Claude Code | `claude-code-local` | 官方文档未单列 env 口；在 `~/.claude/settings.json` 的 `env` 里设 `LANGFUSE_TRACING_ENVIRONMENT`（若进程读得到标准 Langfuse 变量） |
| 本机 OpenCode | `opencode-local` | `opencode-langfuse.json` 的 `"environment"`，或 `LANGFUSE_ENVIRONMENT` |
| 本机 Pi | `pi-local` | `~/.pi/agent/langfuse.json` 的 `"environment"`，或 `LANGFUSE_TRACING_ENVIRONMENT` |
| Codex Cloud | `codex-cloud` | 见 [Codex Cloud](codex-cloud.md) |
| Cursor Cloud | `cursor-cloud` | 见 [Cursor Cloud](cursor-cloud.md) |
| Grok Bot 小时导出 | `grok-bot` | 见 [Grok Bot](grokbot.md)；`LANGFUSE_TRACING_ENVIRONMENT` 可覆盖，未设则回退 `grok-bot`（不落 Langfuse `default`） |

### 设备约定（tags）

- 设备**只**进 tags：`device:<短名>`。短名优先 Tailscale MagicDNS（如 `macbookpro-w`）；没有 Tailscale 或取不到时退回 `hostname`。不用序列号、不用台账别名当 tag。
- 有 Tailscale 时以 tailnet 现网短名为准（可与 IT 资产台账对照，改名以现网为准）。
- 插件都不会自动带 hostname，每台机器各配一次。

### 各插件怎么配

2026-10 按文档和源码核对；插件更新后以新文档为准。

| Agent | environment | tags | metadata |
|---|---|---|---|
| Codex | `langfuse.json` 的 `"environment"`，或 `LANGFUSE_TRACING_ENVIRONMENT` → `codex-local` | `"tags"` / `LANGFUSE_CODEX_TAGS` → `device:<短名>` | `"metadata"` / `LANGFUSE_CODEX_METADATA` |
| Cursor | `"environment"` / `LANGFUSE_TRACING_ENVIRONMENT` → `cursor-local` | `"tags"` / `LANGFUSE_TAGS` → `device:<短名>`（固定追加 `cursor`） | `"metadata"` / `LANGFUSE_CURSOR_METADATA` |
| Claude Code | `settings.json` → `env.LANGFUSE_TRACING_ENVIRONMENT=claude-code-local`（文档未写 env 标签口） | `env.CC_LANGFUSE_TRACE_TAGS`；见[源码](https://github.com/langfuse/claude-observability-plugin/blob/main/hooks/langfuse_hook.py) | 不支持 |
| OpenCode | `"environment"` / `LANGFUSE_ENVIRONMENT` → `opencode-local` | **不支持**（[issue #57](https://github.com/langfuse/opencode-observability-plugin/issues/57)） | 不支持 |
| Pi | `"environment"` / `LANGFUSE_TRACING_ENVIRONMENT` → `pi-local` | **不支持**（源码写死 `["pi"]`） | 只能用 `OTEL_RESOURCE_ATTRIBUTES` → `resourceAttributes` |

**OpenCode / Pi 缺口：** 没有可配 tags 时，**仍把 environment 设成 `*-local`**，不要再把设备短名写进 environment（与上表成对命名优先）。设备维度暂时筛不到，等上游支持 tags 后再补 `device:<短名>`；不要为了设备筛选用 environment 顶替。

**metadata 的限制：** 配置里写的是静态值，每次会话都一样。仓库、分支、commit 这类每轮在变的现场信息配不进去，要靠插件自己采集。

## 5. 验证

- 每个 Agent 触发一轮真实对话，或用文档里的测试方式。
- 在 Langfuse 的 Traces / Sessions 页面查看，或调 API。实例开了 v4 events-only 时 `GET /api/public/traces` 会 404，改用：

```bash
curl -s -u "$LANGFUSE_PUBLIC_KEY:$LANGFUSE_SECRET_KEY" \
  "$LANGFUSE_BASE_URL/api/public/v2/observations?limit=20"
```

- 确认：`environment` 为对应的 `*-local` / `*-cloud` / `grok-bot`；有 tags 口的 Agent 带 `device:<短名>`。
