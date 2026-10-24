# Grok Bot box：Langfuse 导出对话源取舍（search-index vs agent-transcripts）

关联项目：[`projects/routines/grokbot-langfuse-export/`](../../projects/routines/grokbot-langfuse-export/)（通用流程见该目录 `SKILL.md`）。

## 背景

为小时增量导出 Grok Bot 会话到自建 Langfuse，需要在 box 上选定可靠对话源。候选包括 `search-index.db`、`ReadTranscript`、本机 `agent-transcripts/*.jsonl`。

## 实测（2026-10-24，Asia/Shanghai）

对照 `search-index.db` 中的 **60** 个助手，检查 `/home/box/agent-data/agent-transcripts/<id>/<id>.jsonl`：

- **不实时**：所有已有 JSONL 的 mtime 停在当天约 **09:29**（box 恢复时刻），之后对话不追加。例如全栈开发专家、IT资产管理、通用当晚仍有消息，JSONL 仍停在 09:29。判断为 box 恢复时的快照，不是实时日志。
- **不全**：60 个助手中 **15** 个没有 JSONL；不只主 Grok Bot，还包括日复盘、周复盘、4070ts-win 设备助手、mini-gtr-ubuntu 设备助手、Agent Memory 专家等。

## 结论

- **增量导出只用 `search-index.db`**（经 `npm run stage` 写 staging JSONL，再 `export`）。
- 原生 `agent-transcripts` JSONL **不做增量源**；至多在补历史时用来补 tool 过程（该格式可见 `tool` 角色）。
- 通用能力对比与 staging 形状留在 skill；本笔记只记本环境一次核对结果，换环境须重测覆盖与实时性。