---
name: cursor-cloud-langfuse-tracing
description: >-
  把 Cursor Cloud Agents 的会话追踪进（自建）Langfuse 时使用：云端只执行仓库里的项目级
  hooks，用包装脚本懒加载官方 cursor-observability-plugin。本机 Cursor 桌面会话改用
  langfuse-agent-tracing；Codex Cloud 改用 codex-cloud-langfuse-tracing。
---

# Cursor Cloud Agents 会话追踪到 Langfuse

Cursor Cloud Agent 跑在 saved environment 的 Build 快照里，**不执行** `~/.cursor` 用户级插件和 Marketplace 插件。本 skill 把两个文件放进目标仓库，让项目级 hooks 懒加载官方 [cursor-observability-plugin](https://github.com/langfuse/cursor-observability-plugin)（bin `langfuse-cursor-hook`，`dist` 已打包、零依赖、Node >= 22），把会话打进 Langfuse。

本机 Cursor 桌面 / IDE 会话见 [langfuse-agent-tracing](../langfuse-agent-tracing/SKILL.md)。Codex Cloud 见 [codex-cloud-langfuse-tracing](../codex-cloud-langfuse-tracing/SKILL.md)。过程笔记见 `notes/2026-10-24--cursor-cloud-会话追踪到自建-langfuse/`。

资产（原样拷贝，不要改写成 npm 安装）：

- [`templates/hooks.json`](templates/hooks.json) → 目标仓库 `.cursor/hooks.json`
- [`templates/langfuse.sh`](templates/langfuse.sh) → 目标仓库 `.cursor/hooks/langfuse.sh`（可执行，`100755`）

## 步骤

1. **拷两个文件。** 把上面两个模板放进要追踪的仓库，`langfuse.sh` 保持可执行。不要改 environment 的 install 脚本：插件在第一次 hook 触发时克隆到 `~/.cache/langfuse-cursor-plugin/<pin>`（临时目录再 `mv`，并发时后写的一方让路）。项目 hooks 的 cwd 是仓库根，所以 command 写 `bash .cursor/hooks/langfuse.sh`。
2. **环境加 4 个 Runtime Secrets**（只放环境，不进仓库、不进聊天、不进日志）：
   - `LANGFUSE_PUBLIC_KEY`
   - `LANGFUSE_SECRET_KEY`
   - `LANGFUSE_BASE_URL`：实例根地址，含协议（自建例：`https://langfuse.viruspc.tech`）
   - `LANGFUSE_CURSOR_PROJECT_HOOKS=1`
3. **确认 active build 含该 commit。** Saved environment 用的是 Build 快照，不是「仓库 main 的最新提交」本身。推完 hooks 后，看 Cloud Agents 环境页里 **active** build 的 commit 是否已经包含 `.cursor/hooks.json` 和 `.cursor/hooks/langfuse.sh`。
4. **用 v2 observations 验证。** 用含该 commit 的 active build 跑一轮真实 Cloud Agent 对话，然后：

```bash
curl -s -u "$LANGFUSE_PUBLIC_KEY:$LANGFUSE_SECRET_KEY" \
  "$LANGFUSE_BASE_URL/api/public/v2/observations?name=Cursor%20Turn&limit=20"
```

确认有 `name` 为 `Cursor Turn`、`environment` 为 `cursor-cloud` 的观测。开关打开时，脚本默认 `LANGFUSE_TAGS=device:cursor-cloud`、`LANGFUSE_TRACING_ENVIRONMENT=cursor-cloud`（环境里已有同名变量则沿用）。

## 坑

截至 2026-10-24 在 saved environment `edges-workspace-viruspc` 上验证。规则变了先在真实云端任务里再确认一次。

- **npm 404。** `@langfuse/cursor-observability-plugin` 的 `npm view` 返回 404（search 能搜到 `0.1.0`）；`npm pack git+https://...` 同样失败。不要走 npm。脚本把插件 pin 在 commit `a36d39a7c5cf9da34662159b70d51b6b36855abc`，克隆后执行 `node dist/index.mjs`。云端 VM 需要能 `git clone` GitHub，且 `node` 在 PATH 里（实测 v22.23.4）。
- **permission hook 非法 JSON 会阻断。** `beforeShellExecution`、`beforeMCPExecution`、`beforeReadFile`、`preToolUse`、`subagentStart` 等 hook 即使 exit 0，stdout 不是合法 JSON 也会**挡住**该动作。关闭追踪的路径不能 `exit 0` 且空输出：要么让插件按正常协议应答，要么 `exit 1`（Cursor 把失败当成放行）。
- **Build 快照 / Draft build。** 推完 hooks 的第一次任务可能仍跑在旧快照上，容器里没有 `.cursor/`。改 Secrets 会触发一次 **Config change** build，并拉到当时的最新 commit，之后才看得到 hooks。手动 **Trigger New Build** 默认是 **Draft**，不会变成 active build。改仓库内容之后，以 active build 的 commit 为准，不要用 Draft 或「已经 push」代替。
- **v4 events_only 没有 `/traces`。** 自建 Langfuse v4、摄取模式 `events_only` 时，`GET /api/public/traces` 不可用。验收走上面的 `GET /api/public/v2/observations`。
- **云端只跑项目 hooks。** 只认仓库里的 `.cursor/hooks.json`。用户级 `~/.cursor` 与 Marketplace 插件在云端不加载。`sessionStart` / `sessionEnd`、MCP hooks 在云端不触发；模板里仍挂着官方那 18 个 hook（`sessionEnd`、`beforeSubmitPrompt`、`stop` 的 timeout 为 60，其余为 10），不要靠不触发的事件做开关或验收。
- **本机去重开关。** 只有 `LANGFUSE_CURSOR_PROJECT_HOOKS=1` 才上报。本机 Cursor 打开同一仓库时不要设这个开关：机器上已有 `langfuse-cursor-hook` 或本机插件 bundle 时，脚本以 `LANGFUSE_TRACING_ENABLED=false` 交给本机插件应答（用户级 hooks 已经在上报）；找不到插件就 `exit 1`。两套同时上报会每个动作两份 trace。

## 验收

- [ ] 目标仓库有 `.cursor/hooks.json` 与可执行的 `.cursor/hooks/langfuse.sh`，且 **active** build 的 commit 包含它们
- [ ] 四个 Secret 只在该 environment 里；仓库、聊天、日志里没有 key
- [ ] 一轮 Cloud Agent 对话后，v2 observations 里能看到 `Cursor Turn`，`environment=cursor-cloud`
- [ ] 本机打开同一仓库、且未设置 `LANGFUSE_CURSOR_PROJECT_HOOKS` 时，不产生第二份 trace

## 参考

- 模板即已验证原文件：[`templates/langfuse.sh`](templates/langfuse.sh)、[`templates/hooks.json`](templates/hooks.json)。
- 本机多 Agent 安装与设备 tag：[langfuse-agent-tracing](../langfuse-agent-tracing/SKILL.md)。官方 Cursor 集成文档：<https://langfuse.com/integrations/developer-tools/cursor>（云端不要照文档走 npm / Marketplace）。
- Codex Cloud 不能装插件，走箱外轮询：[codex-cloud-langfuse-tracing](../codex-cloud-langfuse-tracing/SKILL.md)。
