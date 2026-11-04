本文件是 `edges-langfuse-agent-tracing` 的参考，不是独立 skill。

# Grok Bot 会话导出到 Langfuse

Grok Bot 助手会话的导出见本 skill。本机桌面会话、Codex Cloud、Cursor Cloud 请先打开[主入口](../SKILL.md)。

具体导出脚本、adapter 与调度不在本仓库，也不随 `@viruspc/edges` 发布。接入方在自己的 routine 里实现（常见目录名 `grokbot-langfuse-export`）。本 skill 只规定接入面：何时用、变量名、写出的 trace 长什么样。不要把密钥、本机绝对路径或实例域名写进仓库或对话。

## 何时用

- 要把 Grok Bot 助手会话按真实发生时间写入与本机 Agent 同一个 Langfuse 项目。
- 不要用本 skill 安装 Codex、Cursor、Claude Code、OpenCode 或 Pi 的官方插件。那些走 [本机 Agent](local-agent.md)。
- 云端编码任务走 [Codex Cloud](codex-cloud.md) 或 [Cursor Cloud](cursor-cloud.md)。

## 环境变量

与其它 Langfuse skill、以及框架评测代码共用同一组名字。只放环境，不进仓库、不进聊天、不进日志：

- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_BASE_URL`：实例根地址，含协议（例：`https://langfuse.example.com`）。框架评测代码先读 `LANGFUSE_HOST`，再回退 `LANGFUSE_BASE_URL`。
- `LANGFUSE_TRACING_ENVIRONMENT`：设了且非空就用它；没设则用 `grok-bot`。不要落成 Langfuse 的 `default`，也不要和本机 `*-local`、云端 `*-cloud` 混用。

## 高层步骤

1. 确认表面是 Grok Bot 导出。密钥只从环境变量读取，不写进 routine 源码。
2. 在接入方自己的 routine 里准备写入端（官方 cursor-observability 的 `emitTurn`，或等价的 OTLP 写入）。本包不携带这段代码。
3. 从接入方自己的消息索引或 transcript 落一份 staging：可见的 user / assistant 文本；来源里有 tool 名才写 tool 名。不要写 tool 参数、tool 结果或 reasoning。
4. 读 staging 再导出。一轮 user 到该轮 assistant 最终可见回复为一条 trace，根 observation 名 `Grok Bot Turn`。时间保持来源能证明的精度，不发明更细的时间。
5. Session：同一 bot，与上一轮 user 消息间隔不超过 3 小时为同一 session，否则新开。`sessionId` 用稳定 id，不要用会变的显示名当唯一键。
6. Tags：`agent:grok-bot`、`device:grokbot`、`bot:<助手显示名>`。设备维度用 tags，不写进 environment。
7. 去重：稳定 trace id 加接入方本地的 cursor。失败的批次不要推进 cursor。
8. 验证：v4 `events_only` 时写入 `POST /api/public/otel/v1/traces`，核对 `GET /api/public/v2/observations`。能按 `device:grokbot` 筛到，根 observation 名为 `Grok Bot Turn`。

## 不在本包

- 没有 adapter、调度、vendor 插件或密钥。
- 不读取、不打印凭证文件。
