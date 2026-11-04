---
name: edges-langfuse-agent-tracing
description: >-
  当用户要把编码 Agent 或 Grok Bot 的会话接到 Langfuse 时加载本 skill，再按表面打开 references。
  本机 Codex、Cursor、Claude Code、OpenCode、Pi：安装以官方文档为准，补 environment（*-local）与设备 tags。
  Codex Cloud（chatgpt.com/codex）：云端容器里官方插件、hooks、OTel 都用不了，改本机带外轮询写 OTLP；轮询脚本不在本仓库。
  Cursor Cloud Agents：云端只执行仓库里的项目级 hooks，用包装脚本懒加载官方 cursor-observability-plugin。
  Grok Bot 助手会话导出：步骤与环境变量在 references，导出脚本不随本包发布。
  还没确定表面时不要装插件、改配置或写密钥。
version: 0.1.1
---

# Langfuse Agent 追踪

按表面打开本目录的 `references/`。安装步骤不在这里重复。

## 何时用

用户要把会话接到 Langfuse。已经确定表面时直接打开对应参考；还没确定时用下表，不要先装插件。

## 选哪份

| 表面 | 读 |
| --- | --- |
| 本机 Codex / Cursor / Claude Code / OpenCode / Pi | [local-agent.md](references/local-agent.md) |
| Codex Cloud（chatgpt.com/codex） | [codex-cloud.md](references/codex-cloud.md) |
| Cursor Cloud Agents | [cursor-cloud.md](references/cursor-cloud.md) |
| Grok Bot 助手会话导出 | [grokbot.md](references/grokbot.md) |

四个表面的步骤都在这些参考里。不要再找同名的独立 skill。
