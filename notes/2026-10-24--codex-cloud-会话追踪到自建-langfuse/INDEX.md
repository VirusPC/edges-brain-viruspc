# Codex Cloud 会话追踪到自建 Langfuse

> 把 Codex Cloud 环境 `edges-workspace-viruspc` 的任务会话，可靠地打进自建 Langfuse（https://langfuse.viruspc.tech，v4.38 `events_only`）。机内 OTEL / Stop hook 走不通后，改用箱外轮询 + WebSocket 反查新 UI。

## 背景

目标是给 Codex Cloud 上跑的任务补上可观测性：在自建 Langfuse 里看到每一次 turn 的用户输入、助手输出、工具调用与时间线，方便对照 Grok Bot 侧已有的追踪习惯。

当天（Asia/Shanghai 2026-10-24）由助手「全栈开发专家」与用户一起排查。环境名 `edges-workspace-viruspc`；Langfuse 基址为公开域名 `langfuse.viruspc.tech`，版本 v4.38，摄取模式为 `events_only`。用户希望最终能像 Grok Bot 一样定时把会话写进 Langfuse，而不是只靠云端 UI 肉眼翻。

## 主题

这场对话要解决的是：在 Codex Cloud 官方尚未开放云编排下的 command / plugin / local-config hooks 时，如何把 Cloud 任务（含新旧两套 UI）的会话轨迹，稳定写入自建 Langfuse。

- 难点一：新 Codex Cloud UI 下 Install script 常常不跑；运行时 `/etc/codex` 与 Codex home 只读；没有 cache-reset 控制，无法靠改机内配置「补丁式」打开追踪。
- 难点二：官方文档写明 cloud orchestration 不支持 command / plugin / local-config hooks，因此机内 `[otel]` 与 `[[hooks.Stop]]` 路径在架构上不可用。
- 难点三：旧 wham REST 能覆盖 `task_e_*` 任务，但新 UI 的 `/local/<ULID>` 线程既不出现在 `codex cloud list`，也没有公开 REST 转录接口，浏览器走的是 `wss://codex-cloud-backend.chatgpt.com/` 上的 JSON-RPC app-server。
- 难点四：Langfuse `events_only` 会拒绝 `/api/public/ingestion` 的 trace-create，必须改走 OTLP；同时绝不能自动 refresh OAuth（会轮换并登出其它会话）。

## 过程

### 时段不详（对话前半）定目标与三条路线

用户提出要把 Codex Cloud 任务追踪进自建 Langfuse。双方先列了三条路线并打算都试、再对比：

- **A**：在 managed_config 写 `[otel]`，OTLP HTTP binary 打到 Langfuse `/api/public/otel/v1/traces`，带 Basic 鉴权与头 `x-langfuse-ingestion-version: 4`。随后发现配置里 `${VAR}` **不会**在 headers 里展开，密钥不能靠占位符注入。
- **B**：`[[hooks.Stop]]` 调 `@langfuse/codex-observability-plugin`，指望 turn 结束时上传。
- **C**：箱外 poller，不改云端环境，只读本地 `auth.json` 与公开/半公开 API，再把 turn 用 OTLP 写入 Langfuse。

用户最初直觉是「在 sandbox / 任务容器里挂 hooks」；助手一度判断「用户关于 sandbox-hooks 的直觉不对」。后来进程排查证明 Codex **确实**跑在任务容器里（见下），用户第一直觉在「进程位置」上是对的——只是只读与无 managed_config 仍挡住 hooks。这是过程里一次明确的纠偏。

用户还提过希望「turn 结束就监听上报」；随后又对齐成「像 Grok Bot 一样约 5 分钟一轮」；并要求 A/B/C 都试、对照粒度与可行性，而不是先赌一条。

### 时段不详 查清 Cloud 运行时真相

在任务容器内确认：

- Codex 进程存在：`/opt/codex/bin/codex exec-server --remote …`。
- 配置现实：`/etc/codex/config.toml` 只启用了自带的 computer-use plugin；没有 `managed_config.toml`；`~/.codex/config.toml` 为空。
- 新 UI：Install script 经常不执行；没有 cache-reset；运行时 `/etc/codex` 与 Codex home 只读。
- 官方立场：cloud orchestration 不支持 command / plugin / local-config hooks。

因此 **A、B 在 Cloud 上不可用**。Install 脚本里为 A/B 加的配置被回退到 Edges-only 基线；环境里保留了 `LANGFUSE_*` 变量，以备将来官方开放 hooks 或机内 OTEL 时复用。取舍上选择了 **先走 C，而不是干等 OpenAI 开放 hooks**。

### 时段不详 C 经典路径（旧 `task_e_*`）

实现箱外轮询：

1. `codex cloud list --json` 拉任务列表。
2. 用未文档化的 `GET chatgpt.com/backend-api/wham/tasks/{id}/turns`，Bearer + `ChatGPT-Account-Id` 来自 `~/.codex/auth.json`（只读；**从不**自动 refresh，避免轮换登出）。
3. 写入 Langfuse 时发现 `events_only` 拒 `/api/public/ingestion` 的 trace-create，改为 OTLP。

结果：旧 `task_e_*` 任务可用；首批约 76 条 turn，之后继续有增量入库。

### 时段不详 新 UI `/local/<ULID>` 缺口

新 UI 线程：

- 不在 `codex cloud list`，也不在 wham tasks 列表。
- 无 REST 转录 API；浏览器经 `wss://codex-cloud-backend.chatgpt.com/` JSON-RPC app-server 拉数据。
- 子协议：`codex-app-server`、`codex-client.browser`、`openai-bearer.<token>`；Origin `chatgpt.com`。
- 方法链：`initialize` → `initialized` → `thread/list` → `thread/turns/list` → `thread/items/list`。

取舍：与其放弃新 UI，不如 **反查 WebSocket 协议** 自己实现客户端。落地 `poller-ws.mjs`；首次跑通约 57 turns / 25 threads，含 `DIAG_CODEX_PROCESS` 测试线程，带来真实时间戳与 tool 子项。

### 时段不详 合并入口与定时

- 包装脚本 `run-all.sh`：先 `poller.mjs`（经典 wham），再 `poller-ws.mjs`（新 UI WS）。
- 例行每 5 分钟跑 `run-all.sh`；无新数据时安静；鉴权失败 exit 2 时告警，提示人工 `codex login`。
- 代码落在 `/workspace/codex-langfuse-abc/`（`poller.mjs`、`poller-ws.mjs`、`run-all.sh`、`state/`、`README.md`、`NOTES-ABC.md`）。

过程中刻意保留的约束：**不做 OAuth 自动 refresh**——短期会少几轮数据，但不会把其它已登录会话踢掉。

## 结果

做成了：

- A/B 在 Cloud 上被证伪并回退；`LANGFUSE_*` 环境变量保留。
- C 经典路径：旧 `task_e_*` 经 wham turns + OTLP 入库（约 76+ turns）。
- C 新 UI 路径：`poller-ws.mjs` 经 app-server JSON-RPC 入库（首跑约 57 turns / 25 threads）。
- 统一入口 `run-all.sh` + 每 5 分钟例行；鉴权失败可告警。

还剩（未开任务，仅记录）：

- 内部 WS 协议可能随产品变更而失效。
- 尚无 token / cost 指标（相对机内 OTEL 粒度更粗）。
- Desktop 本机线程（`state_5.sqlite`）仍独立；`poller-new-ui.mjs` 仅 dry-run。
- Auth 过期需人工 `codex login`。

## 所学

- 「Codex 是否跑在任务容器里」与「能否在容器里挂 hooks」是两件事：进程位置可以正确，配置面仍可被只读与官方 cloud orchestration 限制挡住。
- 配置占位符 `${VAR}` 在 Codex otel headers 里不展开——机内密钥注入不能假设 shell 式展开。
- Langfuse `events_only` 与完整 ingestion API 行为不同：trace-create 可能被拒，OTLP `/api/public/otel/v1/traces` 才是稳妥写入面。
- 未文档化的 wham REST 覆盖旧任务 ID；新 UI ULID 线程是另一套数据面（WS app-server），两套都要扫才算「Cloud 全覆盖」。
- 箱外轮询用本地 `auth.json` 只读访问时，**禁止**自动 refresh：refresh 会轮换 token 并可能登出其它会话。
- 相对「等官方开放 hooks」或「放弃新 UI」，选择 C + WS 反查能更快拿到可验收的历史与增量数据，代价是协议脆弱、缺细粒度 token/cost。

## 行动指南

### 主题行动指南

#### 背景

需要把云端 Agent 编排产品（官方不支持机内 hooks / 本地配置注入）的会话，写入自建的 LLM 可观测后端；机内 OTEL 与 Stop hook 不可用或不稳定。

#### 核心问题

在无法改写云端任务运行时配置的前提下，如何用箱外只读凭证，覆盖「旧 REST 任务」与「新 UI 无线程 REST」两类会话，并兼容 `events_only` 类摄取限制。

#### 核心解决方案

1. 先用最小探测确认：任务进程是否在容器内、配置目录是否只读、官方是否声明 hooks 不支持。若只读或不支持，则放弃机内 A/B，而不是反复改 Install script。  
   （可选项：继续赌 managed_config / Install script —— 不做，因实测不跑且只读。）
2. 实现箱外经典 poller：官方 list CLI +（若存在）turns REST；认证只读本地 auth；写入走 OTLP 而非被拒的 ingestion trace-create。  
   （可选项：自动 refresh OAuth —— 不做，避免登出其它会话。）
3. 若新 UI 任务不在 list/REST 中，对浏览器实际使用的 WebSocket JSON-RPC 做只读客户端（initialize → list turns/items），与经典 poller 串成统一入口。  
   （可选项：放弃新 UI 只保旧任务 —— 不做，覆盖面不足。）
4. 用短周期定时（例如 5 分钟）跑统一入口；无增量安静；鉴权失败显式退出并告警，由人重新登录。
5. 保留机内环境变量与 Install 基线回退，便于官方日后开放 hooks 时再启用 A/B，与 C 对照。

#### 验收标准

- 旧 ID 形态任务至少有一批 turn 出现在自建 Langfuse，且可按 source/tag 过滤。
- 新 UI ULID 线程至少有一批 turn（含真实时间戳或 tool 子项）出现在同一 Langfuse。
- 重复跑同一入口不产生重复 spam（有 seen-state 或等价幂等）。
- 鉴权失效时进程非 0 退出且有可读告警；全程无自动 token refresh。
- 机内 A/B 若曾写入环境，已回退到不影响主工作流的基线。

### 细节与其他

#### 若目标是 Codex Cloud → 自建 Langfuse（本机路径）

则：

- 代码目录：`/workspace/codex-langfuse-abc/`（`poller.mjs`、`poller-ws.mjs`、`run-all.sh`、`state/`、`README.md`、`NOTES-ABC.md`）。
- Langfuse：`https://langfuse.viruspc.tech`，v4.38 `events_only`；OTLP 路径 `/api/public/otel/v1/traces`；需要时带头 `x-langfuse-ingestion-version: 4`。
- 经典 API：`codex cloud list --json`；`GET …/backend-api/wham/tasks/{id}/turns`（Bearer + ChatGPT-Account-Id，来自 `~/.codex/auth.json`，只读）。
- 新 UI：`wss://codex-cloud-backend.chatgpt.com/`，子协议 `codex-app-server`、`codex-client.browser`、`openai-bearer.<token>`；Origin `https://chatgpt.com`；方法 `initialize` → `initialized` → `thread/list` → `thread/turns/list` → `thread/items/list`。
- 例行：每 5 分钟 `run-all.sh`；auth 失败 exit 2 → 人工 `codex login`。
- 不做：自动 OAuth refresh；等待官方 hooks 才开工；把 Desktop `state_5.sqlite` 与 Cloud 混为同一数据面（`poller-new-ui.mjs` 仍仅 dry-run）。

#### 若 Langfuse 写入报 ingestion / trace-create 错误

则：确认实例是否为 `events_only`；改打 OTLP HTTP，而不是 `/api/public/ingestion` 的 trace-create。  
（可选项：改 Langfuse 摄取模式 —— 未在本场作为默认方案，优先适配现网 `events_only`。）

#### 若只要「turn 结束立刻」而不是 5 分钟

则：Cloud 侧无稳定 push；浏览器本身也是拉。可把 cron 在活跃窗口收紧，或日后再探官方 hooks；本场选定 5 分钟对齐 Grok Bot 习惯。  
（可选项：机内 Stop hook —— Cloud 上不可用，已放弃。）

## 补充说明

- 原始材料：Asia/Shanghai 2026-10-24，助手「全栈开发专家」与用户关于 Codex Cloud → Langfuse 的排查与实现对话；本笔记由 Grok Bot 按 `conversation-to-notes` 整理入库。
- 协作路径（脱敏）：`/workspace/codex-langfuse-abc/`；公开服务 `langfuse.viruspc.tech`；环境名 `edges-workspace-viruspc`。凭证、Tailscale `100.x`、完整鉴权密钥路径不写入本公开脑仓。
- 相关笔记可对照同仓既有 Langfuse / Codex 主题笔记（如多机追踪安装与验收、自建实例接入等），本篇聚焦 **Cloud 任务箱外覆盖**。
- 遗留项（协议脆弱、无 token/cost、Desktop sqlite、人工 login）仅记在「结果」；按委托 **先不转任务**。

### Technical appendix / 技术附录（EN + 中文）

**Live code (no secrets):** `/workspace/codex-langfuse-abc/`

| File | Role |
|------|------|
| `poller.mjs` | Classic path: `codex cloud list --json` → wham `GET …/tasks/{id}/turns` → OTLP to Langfuse |
| `poller-ws.mjs` | New UI: WebSocket JSON-RPC app-server → turns/items → OTLP |
| `run-all.sh` | Runs classic then WS poller |
| `poller-new-ui.mjs` | Desktop `state_5.sqlite` dry-run only (not Cloud) |
| `state/` | Seen-turn idempotency |
| `README.md`, `NOTES-ABC.md` | Ops notes and A/B/C field capture |

**WS handshake (desensitized):**

1. Connect `wss://codex-cloud-backend.chatgpt.com/` with subprotocols `codex-app-server`, `codex-client.browser`, `openai-bearer.<access_token>` (token from local Codex auth file; never logged here).
2. `Origin: https://chatgpt.com`.
3. RPC: `initialize` with clientInfo akin to `codex-browser` and `experimentalApi: true` → notify `initialized` → page `thread/list` → `thread/turns/list` → `thread/items/list` (cursors).
4. Map items to OTLP spans/events; tag e.g. source poller; skip auto token refresh (exit 2 on auth failure).

**中文对照：**

1. 连接上述 WSS，三个子协议，其中 bearer 子协议携带本地 Codex access token（本文不写具体值）。
2. Origin 使用 `https://chatgpt.com`。
3. 握手后按 `initialize` → `initialized` → 分页 `thread/list` / `turns` / `items`。
4. 转成 OTLP 写入 `https://langfuse.viruspc.tech`；鉴权失败退出码 2，不自动 refresh。

**A/B（机内，已证伪于 Cloud）：** managed `[otel]` OTLP + `x-langfuse-ingestion-version: 4`；`[[hooks.Stop]]` → `@langfuse/codex-observability-plugin`。Headers 中 `${VAR}` 不展开；Install 增补已回退，仅留 `LANGFUSE_*`。