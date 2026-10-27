---
title: 多机 Langfuse Agent 追踪安装与验收
date: 2026-10-24
tags: [langfuse, agent-tracing, codex, claude-code, cursor, opencode, multi-device]
---

# 多机 Langfuse Agent 追踪安装与验收

## 背景

要把家里几台开发机上的编码 Agent（Codex、Claude Code、Cursor、OpenCode）会话，统一打到自建 Langfuse（`https://langfuse.viruspc.tech`，项目 Edges），方便按设备和 Agent 类型对照排查。此前单机已接过一部分；这次目标是四台设备、四类 Agent 一次装齐并做 API 验收。

设备短名约定（与 MagicDNS / `device:` 标签一致）：`macbookpro-w`、`macmini`、`minigtr-ubuntu`、`4070ts-win11`。安装与排查现跟框架仓 [`edges-langfuse-local-agent-tracing`](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-langfuse-local-agent-tracing/SKILL.md)（主入口 [`edges-langfuse-agent-tracing`](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-langfuse-agent-tracing/SKILL.md)，随 `@viruspc/edges` 从 `packages/skills/` 分发）；密钥只落本机配置文件（权限多为 `600`），不进仓库、不进对话明文。

## 主题

- **多机统一接入自建 Langfuse**：四台设备 × 最多四类 Agent，凭证与设备标签对齐。
- **设备标签约定**：`device:<MagicDNS短名>`（Codex/Claude/Cursor 用 tags；OpenCode 用 `environment` 字段，因插件不支持 tags）。
- **验收方式**：Langfuse v4 事件模型下，`/api/public/traces` 会 404，改查 `/api/public/v2/observations`，按时间窗、名称、environment 对齐。
- **难点**：
  - Codex 版本过旧时 hooks 形同虚设；Stop hook 需人工信任，且信任绑定 hooks 内容哈希，插件更新后可能要再批一次。
  - Windows 上 Codex 信任要用 `winpty` / `--no-daemon`，不能只靠非交互脚本。
  - 国内 npm 镜像对 `@langfuse/*` scoped 包常 502；改走 `registry.npmjs.org` 或本机 `.npmrc`。
  - Cursor 官方 npm 包名曾 404，Mac mini 上改为 GitHub 克隆 + `npm link`。
  - Claude Code 配置写了仍可能长时间无 observation（本轮验收未落点）。
  - 设备改名：`mini-gtr-ubuntu` → `minigtr-ubuntu`，需 Tailscale hostname 与标签同步。

## 过程

以下时间均为 **Asia/Shanghai（UTC+8）**。原始会话导出在约 17:00–20:15 有缺口，安装波细节部分来自助手状态汇报与后续验收探针，缺口处标「未记录」。

### 1. 设备改名（约 16:48–17:00）

- **机器**：`minigtr-ubuntu`（原 MagicDNS 名 `mini-gtr-ubuntu`）。
- **动作**：在线机器上执行 `tailscale set --hostname=minigtr-ubuntu`；离线改名也可在管理端改 hostname，上线后生效。
- **结果**：短名与后续 `device:minigtr-ubuntu` / OpenCode `environment` 对齐；旧名不再作为标签目标。

### 2. 安装波（约 17:00–20:15，会话导出有缺口）

按 skill 在四台机器上分别装 Codex / Claude Code / Cursor / OpenCode 的 Langfuse 插件或 hooks，写入本机凭证与设备标签。共通约定：

| Agent | 配置落点（脱敏） | 设备区分 |
| --- | --- | --- |
| Codex | `~/.codex/config.toml` 开 `[features] hooks` 与 `[plugins."tracing@codex-observability-plugin"]`；凭证 `~/.codex/langfuse.json` 或环境变量；可选 `TRACE_TO_LANGFUSE=true` | `tags` 含 `device:<短名>` |
| Claude Code | `~/.claude/settings.json` 的 `env`：`LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST` / `CC_LANGFUSE_TRACE_TAGS` | `CC_LANGFUSE_TRACE_TAGS=device:<短名>` |
| Cursor | Marketplace 或 npm/`hooks.json`；凭证 `~/.cursor/langfuse.json`；`hooks.json` 里 **node 用绝对路径**（避免 Dock 启动找不到 PATH） | `tags` 或 `LANGFUSE_TAGS` 含 `device:<短名>` |
| OpenCode | `~/.config/opencode/opencode.json(c)` 的 `plugins`（v2）或 `plugin`（v1）；凭证 `~/.config/opencode/opencode-langfuse.json` | **`environment`: `<短名>`**（无 tags） |

各机要点（能记清的）：

- **macbookpro-w**：Codex 装 `tracing@codex-observability-plugin`（后见版本问题）；Cursor Marketplace 插件；OpenCode `plugins`；Claude `settings.json` env。密钥文件权限 `600`。
- **macmini**：Cursor 官方 npm 包名 404 → 按文档从 GitHub 装并 `npm link`，注册约 18 个 hook，**node 绝对路径**；Codex / OpenCode / Claude 同步写入。助手汇报过 Cursor 已导出 turn、Codex 曾手动调 hook 看到 `Codex Turn`（非交互 `exec` 未真正跑起 Stop hook）。
- **minigtr-ubuntu**：四类均装；Cursor `hooks.json` 使用 node 绝对路径。
- **4070ts-win11**：路径形如 `C:\Users\<用户>\...`；Codex 侧准备用 `--no-daemon`；OpenCode 侧为绕过镜像，本机 `.npmrc` 指向 `registry.npmjs.org`。

安装波结束时，用户侧尚未做完整 API 对照验收。

### 3. 首次冒烟（约 20:15）

- 各机做短会话 / 短 turn，意图在 Langfuse 里看到对应名称。
- **API 验收结果**：当时窗口内**仅**能稳定对上 **macmini 的 OpenCode turn**（observation 名称与 `environment=macmini` 一致）。
- 其余组合多数「配置在、库里没有」或尚未触发有效 Stop/export。

### 4. 修复波（约 20:45 前后）

针对首次冒烟缺口逐项修：

1. **macbookpro-w / macmini · Codex 过旧**  
   - 现象：hooks 开了仍无 `Codex Turn`。  
   - 处理：`brew` 升级 `openai/app/codex`（记录从约 `0.144.3` 升到 `0.164.0` 量级；以本机 `codex --version` 为准）。  
   - 之后新开会话，批准 Langfuse **Stop hook**，再发两条短消息做上传（Stop 在 turn 结束时跑；最新一条常在下一轮 hook 才收尾）。

2. **OpenCode · npm 镜像 502**  
   - 现象：装 `@langfuse/opencode-observability-plugin` 失败或装不上。  
   - 处理：对该 scope 改用 `https://registry.npmjs.org`（全局或项目/用户 `.npmrc`）；Windows 上同样写本机 `.npmrc`。

3. **4070ts-win11 · Codex hook 信任**  
   - 现象：非交互装完后 Stop hook 未真正生效。  
   - 处理：用 `winpty` 驱动交互式 Codex，或 `codex --no-daemon`，在提示时批准 Langfuse Stop hook；信任写入本机 hook state（**不要**手工伪造 `hooks.json` 里的哈希）。

4. **Cursor**  
   - MacBook：Marketplace 路径为主。  
   - Mac mini：维持 GitHub + `npm link`；必要时 `Developer: Reload Window`，查 `~/.cursor/langfuse/hook.log` 是否出现 `Exported turn`。

修复后再跑短会话，Codex / OpenCode / Cursor 在多台设备上陆续能在 observations 里对上；**Claude Code 仍无对应 observation**（配置已写，原因未在本轮坐实，见踩坑清单）。

### 5. 验收查询（修复后）

用 Basic Auth（公钥:私钥）调自建实例：

- `GET /api/public/traces` → **404**，响应提示 events-only / 请改用 observations（v4 行为）。
- `GET /api/public/v2/observations` → 可用；按 `fromStartTime` / `toStartTime`、`name`、分页拉取后，在客户端按名称关键字与 `environment` / metadata 里的设备信息过滤。
- **注意**：observations 列表 API **不提供 tags 过滤参数**；`device:*` 标签需在 UI 或拉回后再筛，或对 OpenCode 直接用 `environment`。

（具体 curl 与参数见下文「验收查询方法」。）

## 结果

- **改名完成**：`minigtr-ubuntu` 短名统一。
- **安装面**：四机均写入凭证与插件/hooks；密钥仅本机文件。
- **修复后可见（API 侧）**：多台 Codex Turn、OpenCode turn、Cursor Turn 能按时间与名称对齐；首次冒烟仅 macmini OpenCode 一点的情况已扩大。
- **仍未验收通过**：各机 **Claude Code** 在本次时间窗内**未见**对应 observation（配置存在 ≠ 已上报）。
- **未做**：合并相关 PR、改 main、把密钥或 hook 哈希写入仓库。

### 设备 × Agent 状态表

状态含义：✅ 本轮 API/日志已见到上报；⚠️ 已装或已配、本轮未见到有效 observation；❓ 过程记录不完整。版本以当时本机命令为准，表中为记录到的量级。

| 设备 | Agent | 版本 / 安装方式（记录到的） | 设备标签或 environment | 验证时间（约） | 状态 | 遗留 |
| --- | --- | --- | --- | --- | --- | --- |
| macbookpro-w | Codex | brew `openai/app/codex`，约 0.144.3→0.164.0；plugin `tracing@codex-observability-plugin` | `device:macbookpro-w` | 修复波后 | ✅ | 新会话需再批 Stop hook（若插件更新） |
| macbookpro-w | Claude Code | `~/.claude/settings.json` env | `CC_LANGFUSE_TRACE_TAGS=device:macbookpro-w` | 修复波后 | ⚠️ | 无 observation，原因未坐实 |
| macbookpro-w | Cursor | Marketplace / observability plugin | `device:macbookpro-w` | 修复波后 | ✅ | Dock 启动依赖 hooks 内 node 绝对路径 |
| macbookpro-w | OpenCode | `plugins` + npmjs 源 | `environment=macbookpro-w` | 修复波后 | ✅ | scoped 包勿走坏镜像 |
| macmini | Codex | 同上量级升级 + plugin | `device:macmini` | 修复波后 | ✅ | 非交互 exec 不触发 Stop；要交互会话 |
| macmini | Claude Code | settings env | `device:macmini` | 修复波后 | ⚠️ | 同「未上报」 |
| macmini | Cursor | npm 包名 404 → GitHub 克隆 + `npm link`；~18 hooks；node 绝对路径 | `device:macmini` | 安装波已有导出；修复波再验 | ✅ | 官方包名变更时跟文档 |
| macmini | OpenCode | `plugins` + 凭证文件 | `environment=macmini` | **~20:15 首次冒烟即 ✅** | ✅ | — |
| minigtr-ubuntu | Codex | plugin + hooks | `device:minigtr-ubuntu` | 修复波后 | ✅/❓ | 细版本号未写入导出则标未记录 |
| minigtr-ubuntu | Claude Code | settings env | `device:minigtr-ubuntu` | 修复波后 | ⚠️ | 未上报 |
| minigtr-ubuntu | Cursor | hooks.json + node 绝对路径 | `device:minigtr-ubuntu` | 修复波后 | ✅/❓ | — |
| minigtr-ubuntu | OpenCode | plugins + environment | `environment=minigtr-ubuntu` | 修复波后 | ✅/❓ | — |
| 4070ts-win11 | Codex | Win；`--no-daemon` / `winpty` 批 hook | `device:4070ts-win11` | 修复波后 | ✅ | 信任不可脚本伪造 hash |
| 4070ts-win11 | Claude Code | settings env | `device:4070ts-win11` | 修复波后 | ⚠️ | 未上报 |
| 4070ts-win11 | Cursor | 本机 hooks + langfuse.json | `device:4070ts-win11` | 修复波后 | ✅/❓ | — |
| 4070ts-win11 | OpenCode | 本机 `.npmrc` → npmjs；plugins | `environment=4070ts-win11` | 修复波后 | ✅ | 镜像 502 时保持 npmjs |

表中「✅/❓」表示助手汇报或探针曾对齐，但导出原文未逐条钉死版本号时保守标注。

## 所学

1. **v4 查 observations，不查 traces**：自建 Langfuse v4 上 `/api/public/traces` 返回 404 并提示 events-only；验收脚本应打 `/api/public/v2/observations`。
2. **OpenCode 用 environment，不用 tags**：插件侧无 tags；设备短名写进 `opencode-langfuse.json` 的 `environment`，验收时按该字段过滤最省事。
3. **Codex：版本 + 信任 + 交互**：hooks 需要足够新的 CLI；Stop hook 必须人工批准；信任与 hooks 内容哈希绑定，**不要**手改 `hooks.state` 里的 hash；Windows 用 `winpty` / `--no-daemon`。
4. **npm scoped 包与镜像**：`@langfuse/*` 在部分国内镜像 502 或包名 404；OpenCode 走 npmjs，Cursor 曾需 GitHub 安装。
5. **Cursor node 绝对路径**：`hooks.json` 里写死 node 路径，Dock / GUI 启动才稳定。
6. **配置 ≠ 上报**：Claude Code 写了 `settings.json` env 仍可能整窗无数据，验收必须以 API/UI 为准。
7. **标签与 API**：observations 列表无 tags 查询参数；`device:*` 适合 UI 或二次过滤。

### 踩坑清单

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `/api/public/traces` 404，文案提到 events-only | Langfuse v4 事件模型，traces 路由不可用 | 改 `GET /api/public/v2/observations`，用时间窗与 `name` |
| Codex 开了 hooks 仍无 `Codex Turn` | CLI 过旧（如 0.14x）或未批 Stop hook，或只用了非交互 exec | `brew upgrade` 到文档要求的版本区间；新开交互会话批准 hook；发 ≥2 条短消息 |
| Windows 上 hook 一直未信任 | 非交互安装无法点批准；信任绑哈希 | `winpty` 或 `codex --no-daemon` 交互批准；禁止伪造 hash |
| 装 `@langfuse/opencode-observability-plugin` 502 | 镜像源拉 scoped 包失败 | `.npmrc` 或命令行 registry 指到 `registry.npmjs.org` |
| Cursor npm 包 404（macmini） | 当时官方包名/发布与文档不一致 | 按官方文档从 GitHub 克隆并 `npm link`，再注册 hooks |
| Dock 打开的 Cursor 不上报 | `hooks.json` 里 `node` 走 PATH，GUI 无该 PATH | 改为本机 node **绝对路径** |
| OpenCode 有数据但按 tags 搜不到设备 | 插件不写 tags | 用 `environment=<短名>` 过滤 |
| Claude Code 配置齐全仍无 observation | 未记录到单一根因（未触发、凭证项目不一致、或集成未跑） | 本轮标未通过；复查 env 键名、`LANGFUSE_HOST`、是否新开过会话；勿假定「写了就会有」 |
| 设备标签对不上 MagicDNS | 主机曾用 `mini-gtr-ubuntu` 等旧名 | `tailscale set --hostname=...` 与配置里 `device:` / `environment` 一并改 |

## 行动指南

### 新机器接入（顺序）

1. 确认 MagicDNS 短名；需要时 `tailscale set --hostname=<短名>`。
2. 按 Agent 安装插件/hooks（Codex marketplace + `config.toml`；Claude `settings.json` env；Cursor Marketplace 或文档推荐的 GitHub/npm；OpenCode `plugins`/`plugin`）。
3. 只写本机凭证文件（`langfuse.json` / `opencode-langfuse.json` 等），权限收紧；**不要**把密钥、hook 哈希、内网 IP 写进 git。
4. 打上 `device:<短名>` 或 OpenCode `environment`。
5. **交互**跑短会话：Codex 批准 Stop hook 并至少两轮；Cursor Reload 后看 `hook.log`；OpenCode 开一轮 turn。
6. 用下文 curl 查 observations，按时间与名称/environment 对齐；没有就先查版本、信任、registry、node 路径，而不是先改 Langfuse 服务端。

### 验收最小集

- 时间窗覆盖操作时间（注意 UI 可能显示 UTC）。
- 名称关键字：`Codex Turn`、`OpenCode`/`opencode`、`Cursor Turn`（以实际 observation name 为准）。
- OpenCode：`environment` = 设备短名。
- Claude：若仍空，记「未通过」并单开排查，不阻塞其他 Agent。

### 不要做的事

- 不要手写/伪造 Codex `hooks.state` 哈希。
- 不要把 Langfuse 公钥/私钥真值、Tailscale 或局域网地址、邮箱、机器序列号推进公开仓库。
- 不要用 `/traces` 当 v4 验收主路径。

## 补充说明

### 验收查询方法

自建实例 Base：`https://langfuse.viruspc.tech`。认证：HTTP Basic，用户名为公钥、密码为私钥（环境变量占位，勿把真值写进笔记或脚本仓库）。

**为何不用 traces：**

```bash
curl -sS -u "$LANGFUSE_PUBLIC_KEY:$LANGFUSE_SECRET_KEY" \
  "https://langfuse.viruspc.tech/api/public/traces?limit=1"
# 预期：404，正文提示 events-only / 改用 observations（措辞以实例为准）
```

**推荐：v2 observations**

```bash
# 按时间窗拉取（时间用 UTC 的 ISO8601；对照时换算到 Asia/Shanghai）
curl -sS -u "$LANGFUSE_PUBLIC_KEY:$LANGFUSE_SECRET_KEY" \
  "https://langfuse.viruspc.tech/api/public/v2/observations?limit=100&fromStartTime=2026-10-24T12:00:00.000Z&toStartTime=2026-10-24T14:00:00.000Z"
```

对齐建议：

1. 先用操作前后的 UTC 时间窗缩小结果。
2. 再按 `name` 包含 `Codex` / `Cursor` / `OpenCode`（或实际名称）分组。
3. OpenCode 看字段 `environment` 是否等于 `macbookpro-w` / `macmini` / `minigtr-ubuntu` / `4070ts-win11`。
4. Codex/Cursor 的 `device:*`：列表 API **无 tags 参数**，在 UI 筛标签，或把 JSON 拉回后本地过滤 metadata/tags。
5. 分页：若结果到 `limit`，用返回游标/页参数继续拉（以当时 OpenAPI 为准）；不要只盯第一页。

脱敏排障时，脚本只打印 `id`、`name`、`startTime`、`environment`，避免把输入内容、密钥打进日志。

### 配置片段（脱敏示例）

**Codex · `~/.codex/config.toml`**

```toml
[features]
hooks = true

[plugins."tracing@codex-observability-plugin"]
enabled = true

# 信任项由 Codex 在批准 Stop hook 后自行写入；不要手造 hash。
# [hooks.state."tracing@codex-observability-plugin:hooks/hooks.json:stop:0:0"]
# enabled = true
```

**Codex · `~/.codex/langfuse.json`（或环境变量）**

```json
{
  "enabled": true,
  "public_key": "$LANGFUSE_PUBLIC_KEY",
  "secret_key": "$LANGFUSE_SECRET_KEY",
  "base_url": "https://langfuse.viruspc.tech",
  "tags": ["device:macbookpro-w"]
}
```

环境变量备选：`TRACE_TO_LANGFUSE=true`，以及 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_BASE_URL`（Codex 亦支持 `LANGFUSE_CODEX_*` 覆盖）。

**Claude Code · `~/.claude/settings.json`（仅示 env 键名）**

```json
{
  "env": {
    "LANGFUSE_PUBLIC_KEY": "$LANGFUSE_PUBLIC_KEY",
    "LANGFUSE_SECRET_KEY": "$LANGFUSE_SECRET_KEY",
    "LANGFUSE_HOST": "https://langfuse.viruspc.tech",
    "CC_LANGFUSE_TRACE_TAGS": "device:macbookpro-w"
  }
}
```

**OpenCode · `~/.config/opencode/opencode.jsonc`（v2 用 `plugins`）**

```jsonc
{
  "plugins": ["@langfuse/opencode-observability-plugin@latest"]
}
```

**OpenCode · `~/.config/opencode/opencode-langfuse.json`**

```json
{
  "publicKey": "$LANGFUSE_PUBLIC_KEY",
  "secretKey": "$LANGFUSE_SECRET_KEY",
  "baseUrl": "https://langfuse.viruspc.tech",
  "environment": "macbookpro-w"
}
```

**Cursor · `~/.cursor/langfuse.json`**

```json
{
  "publicKey": "$LANGFUSE_PUBLIC_KEY",
  "secretKey": "$LANGFUSE_SECRET_KEY",
  "baseUrl": "https://langfuse.viruspc.tech",
  "tags": ["device:macbookpro-w"]
}
```

**Cursor · hooks 中的 node**：在 `~/.cursor/hooks.json`（或项目 `.cursor/hooks.json`）里，把 hook 命令中的 `node` 换成本机绝对路径（例如 Homebrew 的 node 路径）。具体路径因机器而异，不在此写死；原则是 GUI/Dock 启动也能解析到同一二进制。

### 其他

- 项目：自建 Langfuse **Edges**（若误指到其他项目，换对应项目的公钥/私钥并更新本机 json）。
- 主机：`https://langfuse.viruspc.tech`。
- 相关 skill：框架仓 [`edges-langfuse-local-agent-tracing`](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-langfuse-local-agent-tracing/SKILL.md)，主入口 [`edges-langfuse-agent-tracing`](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-langfuse-agent-tracing/SKILL.md)，随 `@viruspc/edges` 从 `packages/skills/` 分发（安装步骤以 skill / 官方集成文档为准；本文记的是本轮实操与验收差异）。
- 会话导出缺口：约 17:00–20:15 的逐命令细节若未出现在 transcript，表中已用「未记录」/「❓」，不编造命令行。
