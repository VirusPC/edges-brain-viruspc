本文件是 `edges-langfuse-agent-tracing` 的参考，不是独立 skill。

# Codex Cloud 会话追踪到 Langfuse

Codex Cloud 任务见本 skill。本机桌面会话、Cursor Cloud、Grok Bot 导出请先打开[主入口](../SKILL.md)。

Codex Cloud 任务跑在 OpenAI 托管容器里，官方 Langfuse 插件、Stop hook、OTel 配置都上不去。本 skill 用**本机带外轮询**：读本机 `codex login` 的登录态，拉云端任务的 turns，以 OTLP 写进 Langfuse。轮询脚本不在本仓库，也不随 `@viruspc/edges` 发布；按下面的行为在接入方自己的机器上实现。本地 Codex 会话见 [本机 Agent](local-agent.md)。Cursor Cloud Agents 见 [Cursor Cloud](cursor-cloud.md)。Grok Bot 导出见 [Grok Bot](grokbot.md)。

## 为什么不能 in-process（已验证，2026-10）

- 官方文档：云端编排不支持 command / plugin / local-config hooks。
- 容器里 Codex home（`/home/agent/.codex`、`/run/codex-environment/codex-home`）和 `/etc/codex` **只读**；没有 `managed_config.toml`。
- Environment 的 Install script 常因缓存不跑，又没有清缓存入口。
- 容器内确实有 `/opt/codex/bin/codex exec-server --remote …`，但写不进配置，hooks 照样挂不上。

规则变了先在真实云端任务里跑一次诊断（进程、配置路径可写性、`LANGFUSE_*` 变量名，只报名字不贴值）再决定，不要猜。

## 两类任务、两条读取路径

| 任务 | URL 形态 | 列表 | turns |
|---|---|---|---|
| 旧式 | `chatgpt.com/codex/tasks/task_e_…` | `codex cloud list --json` | `GET https://chatgpt.com/backend-api/wham/tasks/{id}/turns` |
| 新版 | `chatgpt.com/local/<ULID>` | WS `thread/list` | WS `thread/turns/list` → `thread/items/list` |

- 鉴权：`~/.codex/auth.json` 里的 access token（`Authorization: Bearer`）和 account id（`ChatGPT-Account-Id`）。
- 新版 WS：`wss://codex-cloud-backend.chatgpt.com/`，subprotocols `codex-app-server`、`codex-client.browser`、`openai-bearer.<access_token>`，`Origin: https://chatgpt.com`。先 `initialize`（`clientInfo.name=codex-browser`，`capabilities.experimentalApi=true`），再发 `initialized` 通知，然后 list。
- 两者都是**未公开接口**，随时可能变；变了先打开网页抓 DevTools 网络重新对齐方法名和字段。

## 鉴权规则

- `auth.json` **只读**，轮询里**禁止 refresh token**（会轮换 refresh token，把本机其它 Codex 会话踢掉）。
- 401 / `token_expired` → 退出码 **2**，提示人手工 `codex login`。

## 写入 Langfuse

- `POST $LANGFUSE_BASE_URL/api/public/otel/v1/traces`，Basic auth（public:secret），自建 v4 events_only 加 `x-langfuse-ingestion-version: 4`。实例根地址含协议（例：`https://langfuse.example.com`），不要把真实实例域名写进仓库。
- 验证用 `GET /api/public/v2/observations`。
- 每个**已结束**的 turn 一条 trace：session id = task / thread id；input = 用户文本；output = 最终回答；工具调用为子 TOOL observation，输出截断到 8 KB；进行中的 turn 跳过。
- trace id 确定性：`sha256("<namespace>:turn:<turnId>")` 取前 32 位 hex；本地 `state/seen-*.json` 记已见 turn，重跑只补新的。
- `environment=codex-cloud`；tags：`source:codex-cloud` 或 `source:codex-cloud-ws`、`device:codex-cloud`、`task:<id>` / `thread:<id>`。

## 调度

- 包装脚本串跑两个 poller，任一鉴权失败整体退出 2，其它错误退出 1。
- 每 5 分钟一次即可；没有新 turn 不出声，有写入或鉴权失败才通知。

## 验收

- [ ] 旧、新两类任务各至少一轮含工具调用的 turn 进了 Langfuse，能按 session id 找到
- [ ] 二次运行写入 0 条（幂等）
- [ ] 过期 token 时退出 2，且没有尝试 refresh
- [ ] token、Langfuse key 不进日志、聊天、仓库

## 已知缺口

- 拿不到 token 用量和成本；reasoning 摘要为空；延迟约等于轮询周期。
- Codex 桌面本地线程不是云端 `/local/` 任务，不在这两条路径里。

## 参考实现

轮询代码不随本包发布，也不在本仓库。上面描述的是行为：旧式任务一个 poller、新版 WebSocket 一个 poller、串跑包装，以及本地已见记录做幂等。接入方在自己的机器上按这些行为实现。不要到 npm 包或本仓库里找这些脚本。过程笔记留在接入方自己的笔记里，不随本包发布。
