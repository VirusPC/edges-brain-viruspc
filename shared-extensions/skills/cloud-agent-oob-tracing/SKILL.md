---
name: cloud-agent-oob-tracing
description: >-
  当编码 Agent 的云端 / 托管运行时无法用官方 hooks、插件或本地 OTel 配置上报时，用带外轮询把会话 turns 写入
  Langfuse（或同类观测后端）。适合 Codex Cloud、只读沙箱、Install 脚本不跑、以及只有 WebSocket/内部 API
  可读会话的场景。
---
# 云端 Agent 带外追踪（Out-of-band → Langfuse）

官方 in-process 路径走不通时，用**带外轮询**把云端 Agent 的会话写进 Langfuse。本地交互会话仍优先用官方插件，见 [langfuse-agent-tracing](../langfuse-agent-tracing/SKILL.md)。

## 何时用

满足任一条件就考虑本 skill：

- 云端编排声明不支持 command / plugin / local-config hooks
- 任务容器里配置目录或 Agent home **只读**，写不进 managed config
- Environment 的 Install / Setup 脚本经常不跑，又没有清缓存入口
- 会话只在网页 UI 可见，官方 CLI list 拉不到新版任务
- 需要回填历史任务（in-process 做不到）

不满足时：先装官方插件 / OTel，不要先上轮询。

## 决策树

1. **读官方文档**（Langfuse 该 Agent 页 + Agent 自家 Cloud 文档）。
2. **探运行时**（在真实云端任务里跑诊断，不要猜）：
   - 有没有 Agent 主进程（如 `codex exec-server`）
   - 配置路径是否存在、是否可写（`/etc/…`、`$HOME/.…`）
   - env 里有没有 `LANGFUSE_*` / OTel 变量（只报名字，不贴值）
3. **能写配置且 hooks/OTel 被支持** → 走 in-process（A：OTel；B：Stop/session hook）。验证一轮后结束。
4. **不能** → 带外路径（C）：
   - 找**官方 list/get API**（CLI 或公开 REST）
   - 没有 → 抓网页加载会话时的网络：优先 REST；没有就 WebSocket / JSON-RPC
   - 用本机已有登录态只读拉取（勿自动 refresh token）
   - 用 **OTLP** 写入 Langfuse（`events_only` 实例拒绝旧 ingestion `trace-create`）
5. **挂定时**：有新 turns 才通知；鉴权失败大声失败并停手。

## 带外轮询实现清单

### 鉴权

- 复用本机 Agent 登录文件（如 `~/.codex/auth.json`），**只读**。
- **禁止**在轮询里 refresh OAuth：许多实现会轮换 refresh token，把其它会话踢下线。
- 401 / `token_expired` → 退出码约定为 **2**，提示人手工重新登录。

### 发现传输

| 优先 | 做法 |
|---|---|
| 1 | 官方 CLI / 公开 API list + get turns |
| 2 | 浏览器打开一个已知会话，抓 DevTools：REST 路径、查询参数名、响应字段 |
| 3 | WebSocket：记录 URL、subprotocol、首包 JSON-RPC 方法名；对照开源 app-server 协议 |
| 4 | 仍无 → 退到本机桌面 DB / rollout 文件（只覆盖本机线程，不是云端） |

把抓到的方法名、字段名写进 README；**不要**把 token 写进笔记或 skill。

### Langfuse 写入（自建 / events_only）

- Endpoint：`$LANGFUSE_BASE_URL/api/public/otel/v1/traces`
- Header：`x-langfuse-ingestion-version: 4`（版本以实例为准）
- Auth：Basic（public:secret）
- 验证：`GET /api/public/v2/observations`（不要依赖可能 404 的 `/api/public/traces`）
- `environment`：语义用 `prod`/`dev`/`codex-cloud` 这类运行场，不要塞设备序列号
- `tags`：至少 `source:<poller名>`、`device:<短名或 cloud>`、`task:<id>` 或 `thread:<id>`

### 数据模型（最低可用）

每个**已结束**的 turn 一条 trace：

- session id = task / thread id
- input = 用户文本；output = 最终回答（commentary 可附在 metadata）
- 工具调用 → 子 TOOL observation（截断大输出，如 8KB）
- 有真实时间戳就用；没有就标明是 ingest 时间
- 进行中的 turn 跳过，下轮再抓

### 幂等

- 本地 state 文件记录已见 turn id（或确定性 trace id = hash(namespace + turnId)）
- 重跑只补新 turn；删 state 可强制重灌

### 调度

- 默认 5 分钟一档即可（云端 UI 本身也是轮询）
- 无新内容保持安静；有写入或鉴权失败才打扰人
- 包装脚本可串「旧 API 轮询 + 新 WS 轮询」，整体鉴权失败仍退出 2

## 验收标准

- [ ] 在真实云端任务里确认：进程是否在容器内、配置是否可写
- [ ] in-process 不可用的证据写清（只读路径 / 文档声明 / Install 未跑）
- [ ] 带外轮询至少能 list + 拉到一轮含工具调用的 turn
- [ ] Langfuse observations 能按 `environment` / session id 找到该 turn
- [ ] 二次运行 ingested=0（幂等）
- [ ] 伪造过期 token 时退出码 2，且未尝试 refresh
- [ ] 密钥不进日志、不进聊天、不进公开笔记

## 已知缺口（接受或另开任务）

- 粒度低于 in-process OTel：常缺 token / cost、reasoning 摘要、流式中间态
- 依赖未公开 API / WS 时可能无预警告失效
- 延迟 ≈ 轮询周期
- 桌面本地线程 ≠ 云端 `/local/` URL，不要混用一套 list

## Codex Cloud 参考实现（实例，非通用前提）

参考实现目录（Grok Bot box）：`/workspace/codex-langfuse-abc/`；过程笔记：`notes/2026-10-24--codex-cloud-会话追踪到自建-langfuse/`

| 文件 | 作用 |
|---|---|
| `poller.mjs` | 旧式 `task_e_*`：`codex cloud list` + wham turns → OTLP |
| `poller-ws.mjs` | 新版 `/local/`：`wss://codex-cloud-backend.chatgpt.com/` app-server JSON-RPC → OTLP |
| `run-all.sh` | 两者串行；任一鉴权失败 → exit 2 |
| `state/seen-*.json` | 幂等 |

WS 握手要点（可能变更）：subprotocols `codex-app-server`、`codex-client.browser`、`openai-bearer.<access_token>`；`initialize` clientInfo.name=`codex-browser`；随后 `thread/list` → `thread/turns/list` → `thread/items/list`。

改协议时先更新上述笔记与本参考段。

## 安全

- 永不打印 / 提交 access token、refresh token、Langfuse key
- 永不在 Install script 里把 secret 明文写进可被快照的配置（若必须用 header，优先运行时注入且确认文件系统可写）
- 抓包与探针只用用户自己的账号会话；不扩散到第三人
