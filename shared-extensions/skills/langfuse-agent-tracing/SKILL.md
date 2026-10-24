---
name: langfuse-agent-tracing
description: >-
  当用户要把编码 Agent（Codex、Cursor、Claude Code、OpenCode、Pi 等）的会话追踪接到 Langfuse
  时使用：以官方文档为准安装，本 skill 只补文档未写清的坑与验证方法。
---
# Langfuse Agent 追踪

把编码 Agent 的 session / turn 接到 Langfuse。**安装步骤以官方文档为准**；本 skill 只补文档没写清或易踩的坑。

## 必做：先读文档

对每个要装的 Agent，先打开（或 `curl` / WebFetch）对应页，**按页内当前命令与配置格式操作**，不要抄本 skill 里过期的命令：

| Agent | 文档 |
|-------|------|
| Codex | https://langfuse.com/integrations/developer-tools/codex （`.md` 后缀可拿纯 Markdown） |
| Cursor | https://langfuse.com/integrations/developer-tools/cursor |
| Claude Code | https://langfuse.com/integrations/developer-tools/claude-code |
| OpenCode | https://langfuse.com/integrations/developer-tools/opencode |
| Pi | https://langfuse.com/integrations/developer-tools/pi-agent |
| 其它 | https://langfuse.com/llms-integrations.txt 里 `developer-tools` 列表 |

索引：https://langfuse.com/llms.txt

原则：优先文档写的官方插件 / marketplace / npm 路径；同一工具不要混装两套 hook。

## 本 skill 只补充这些

### 配置合并

- 改配置前备份（如 `.bak-langfuse-YYYYMMDD`），**合并**进已有 `config.toml` / `settings.json` / `hooks.json` / `opencode.json(c)`，不要冲掉其它插件。
- 同一台机、同一 Langfuse 项目时，各 Agent 复用同一对 key；装前用文档里的 status / setup（或 API）确认实际落在哪个项目名。

### 自建 Langfuse / events-only

- `baseUrl` 用实例根地址（含协议，无尾斜杠也可，以文档与 setup 校验为准）。
- 若实例开了 **v4 events-only**，`GET /api/public/traces` 可能 **404**。验证改用：

```bash
curl -s -u "$LANGFUSE_PUBLIC_KEY:$LANGFUSE_SECRET_KEY" \
  "$LANGFUSE_BASE_URL/api/public/v2/observations?limit=20"
```

或直接打开网页上的 Traces / Sessions。

### 本机环境坑（文档常一笔带过）

- **Cursor + Dock：** 从 Dock / Finder 启动时往往读不到 shell 的 `PATH`。hooks 里的 `node` 尽量用绝对路径；或从已有 `node` 的终端启动 Cursor。装完后要 **Reload Window**（命令面板搜 `Reload Window`；只有 `Cmd+P` 时输入 `>Reload Window`）。
- **Cursor 双路径：** Marketplace 与 `langfuse-cursor-hook` / npm **只选一条**，否则每个动作会打两份 trace（文档「Switch from community hooks」同理）。
- **Codex Stop hook：** 不要手写伪造 `[hooks.state.…]` 的 hash。用户必须**新开交互会话**批准 Stop；仅 `codex exec` 可能跑不起 hook。
- **Claude Code：** 未登录则无法端到端验证；先 `/login`，已开着的会话要重启才能加载新插件。
- **OpenCode 单次 `run`：** 进程退出可能来不及 flush，冒烟可用文档认可的 serve/attach 或交互界面；平时交互用法一般正常。
- **私有 npm 镜像：** 若 `@langfuse/*` 502，单次用官方源覆盖安装；长期可在 `~/.npmrc` 加 `@langfuse:registry=https://registry.npmjs.org`（**改前先问用户**）。

### Tags 与 Metadata

两者都是 Langfuse 的 trace 字段，分工不同：

- **tags：** 字符串标签，用来筛选和分组（UI 过滤、dashboard 拆分）。上报后不可改。要筛的维度都放这里，写成 `key:value`，如 `device:macbookpro-w`。
- **metadata：** 键值对，挂打开 trace 才看的附加信息。Langfuse 4.59 以下按嵌套 metadata 筛选弱，别指望拿它筛。
- **environment：** 语义是 prod / dev，不拿来放设备名，除非插件没有 tags 口（见下）。

**设备约定：** tag `device:<Tailscale MagicDNS 短名>`，不用系统主机名或序列号。所有插件都不自动带 hostname，每台机器各配一次。设备规范名以 IT 资产台账或 tailnet 现网为准。

各插件配置口（2026-10 核对，以文档和源码为准，变了就以新的为准）：

| Agent | tags | metadata | 备注 |
|---|---|---|---|
| Codex | `~/.codex/langfuse.json` 的 `"tags": [...]`，或 `LANGFUSE_CODEX_TAGS` | `"metadata": {...}`，或 `LANGFUSE_CODEX_METADATA` | 文档有写 |
| Cursor | `~/.cursor/langfuse.json` 的 `"tags": [...]`，或 `LANGFUSE_TAGS` / `LANGFUSE_CURSOR_TAGS` | `"metadata": {...}`，或 `LANGFUSE_CURSOR_METADATA` | 文档有写；固定追加 `cursor` |
| Claude Code | `~/.claude/settings.json` 的 `env.CC_LANGFUSE_TRACE_TAGS`（逗号分隔或 JSON 数组） | 不支持 | tags 仅见[源码](https://github.com/langfuse/claude-observability-plugin/blob/main/hooks/langfuse_hook.py)；固定带 `claude-code` |
| OpenCode | 不支持（[issue #57](https://github.com/langfuse/opencode-observability-plugin/issues/57)） | 不支持 | 临时用 `opencode-langfuse.json` 的 `"environment"` 或 `LANGFUSE_ENVIRONMENT` |
| Pi | 不支持，写死 `["pi"]` | 只能经 `OTEL_RESOURCE_ATTRIBUTES` 落到 `resourceAttributes` | 临时用 `~/.pi/agent/langfuse.json` 的 `"environment"` 或 `LANGFUSE_TRACING_ENVIRONMENT`；自动带 `cwd`、`git_branch` |

- 临时借 environment 时，值只能小写、不超过 40 字符、不带 `device:` 前缀。上游支持 tags 后改回 tags。
- 配置里的 metadata 是静态的，每次会话都一样。仓库、分支、commit 这类每轮在变的现场信息配不进去，需要插件自己采集。

### 验证与回报

对每个 Agent：按文档完成安装 → 触发一轮真实对话（或文档写明的测试方式）→ 在 Langfuse 看到对应 turn / observation → 用短中文告诉用户：装了谁、接到哪个项目、谁已见到 trace、还缺哪步交互（登录 / 批 hook / Reload）。
