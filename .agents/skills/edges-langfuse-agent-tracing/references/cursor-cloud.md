本文件是 `edges-langfuse-agent-tracing` 的参考，不是独立 skill。

# Cursor Cloud Agents 会话追踪到 Langfuse

Cursor Cloud Agent 跑在 saved environment 的 **active** build 快照里（启动时不 git pull 最新 main），**不执行** `~/.cursor` 用户级插件和 Marketplace 插件。本 skill 把两个文件放进目标仓库，让项目级 hooks 懒加载官方 [cursor-observability-plugin](https://github.com/langfuse/cursor-observability-plugin)（bin `langfuse-cursor-hook`，`dist` 已打包、零依赖、Node >= 22），把会话打进 Langfuse。

Cursor Cloud 见本 skill。本机桌面会话、Codex Cloud、Grok Bot 导出请先打开[主入口](../SKILL.md)。

本机 Cursor 桌面 / IDE 会话见 [本机 Agent](local-agent.md)。Codex Cloud 见 [Codex Cloud](codex-cloud.md)。Grok Bot 导出见 [Grok Bot](grokbot.md)。过程笔记留在接入方自己的笔记里，不随本包发布。

资产（原样拷贝，不要改写成 npm 安装）：

- [`cursor-cloud/hooks.json`](cursor-cloud/hooks.json) → 目标仓库 `.cursor/hooks.json`
- [`cursor-cloud/langfuse.sh`](cursor-cloud/langfuse.sh) → 目标仓库 `.cursor/hooks/langfuse.sh`（可执行，`100755`）

## 步骤

1. **拷两个文件。** 把上面两个模板放进要追踪的仓库，`langfuse.sh` 保持可执行。不要改 environment 的 install 脚本：插件在第一次 hook 触发时克隆到 `~/.cache/langfuse-cursor-plugin/<pin>`（临时目录再 `mv`，并发时后写的一方让路）。项目 hooks 的 cwd 是仓库根，所以 command 写 `bash .cursor/hooks/langfuse.sh`。
2. **环境加 4 个 Runtime Secrets**（只放环境，不进仓库、不进聊天、不进日志）：
   - `LANGFUSE_PUBLIC_KEY`
   - `LANGFUSE_SECRET_KEY`
   - `LANGFUSE_BASE_URL`：实例根地址，含协议（例：`https://langfuse.example.com`）
   - `LANGFUSE_CURSOR_PROJECT_HOOKS=1`
3. **确认 active build 含该 commit，再冒烟。** Cloud Agent 用的是 **active** build 快照，启动时不会 git pull 最新 main。推完 hooks 不等于环境里已有文件。看环境页里 active build 的 commit 是否已经包含 `.cursor/hooks.json` 和 `.cursor/hooks/langfuse.sh`。若刚改完 Secrets，先等它触发的 Config change build Success 且成为 active，核对 commit，再跑冒烟；不要一保存就验。每个 saved environment 单独接：自己的仓库 hooks、自己的四个 Secret、自己的 active build。
4. **用 v2 observations 验证。** 用已经是 active、且 commit 含 hooks 的那次 build 跑一轮真实 Cloud Agent 对话，然后：

```bash
curl -s -u "$LANGFUSE_PUBLIC_KEY:$LANGFUSE_SECRET_KEY" \
  "$LANGFUSE_BASE_URL/api/public/v2/observations?name=Cursor%20Turn&limit=20"
```

确认有 `name` 为 `Cursor Turn`、`environment` 为 `cursor-cloud` 的观测。开关打开时，脚本默认 `LANGFUSE_TAGS=device:cursor-cloud`、`LANGFUSE_TRACING_ENVIRONMENT=cursor-cloud`（环境里已有同名变量则沿用）。

## 坑

截至 2026-10-24 在一个 saved environment 上验证；同日晚 Compose 下各子仓各自的 environment 再确认过下面四条快照规则。规则变了先在真实云端任务里再确认一次。

- **npm 404。** `@langfuse/cursor-observability-plugin` 的 `npm view` 返回 404（search 能搜到 `0.1.0`）；`npm pack git+https://...` 同样失败。不要走 npm。脚本把插件 pin 在 commit `a36d39a7c5cf9da34662159b70d51b6b36855abc`，克隆后执行 `node dist/index.mjs`。云端 VM 需要能 `git clone` GitHub，且 `node` 在 PATH 里（实测 v22.23.4）。
- **permission hook 非法 JSON 会阻断。** `beforeShellExecution`、`beforeMCPExecution`、`beforeReadFile`、`preToolUse`、`subagentStart` 等 hook 即使 exit 0，stdout 不是合法 JSON 也会**挡住**该动作。关闭追踪的路径不能 `exit 0` 且空输出：要么让插件按正常协议应答，要么 `exit 1`（Cursor 把失败当成放行）。
- **active build 快照，不是 live pull。** Cloud Agent 用当时的 active build，启动时不会 git pull 最新 main。推 hooks 到 main 不等于环境里已有文件。容器里没有 `.cursor/` 时，先核对 active build 的 commit。长过程见笔记「第一次云端测试跑在旧快照上」与「三环境 rollout」。
- **Secrets 已写入，快照可能仍是旧的。** 改 Secrets 会触发 Config change build（大约一两分钟）。它 Success 并成为 active 之前开的任务仍报 hooks missing，尽管 `printenv` 已能看到四个 `LANGFUSE_*`。验收顺序：active build 的 commit 含 hooks → 再冒烟 → 再查 Langfuse。刚保存 Secrets 不要立刻验。
- **每个 environment 单独接。** 自己的仓库 hooks、自己的四个 Secret、自己的 active build。Compose 子仓各自独立：一个子仓通了，其它子仓不会跟着追踪。
- **不要依赖 Trigger New Build。** 手动触发默认是 Draft，不转正、不替换 active build。改 Secrets 触发的 Config change 会自动成为 active。不要用 Draft 或「已经 push」代替 active commit。
- **v4 events_only 没有 `/traces`。** 自建 Langfuse v4、摄取模式 `events_only` 时，`GET /api/public/traces` 不可用。验收走上面的 `GET /api/public/v2/observations`。
- **云端只跑项目 hooks。** 只认仓库里的 `.cursor/hooks.json`。用户级 `~/.cursor` 与 Marketplace 插件在云端不加载。`sessionStart` / `sessionEnd`、MCP hooks 在云端不触发；模板里仍挂着官方那 18 个 hook（`sessionEnd`、`beforeSubmitPrompt`、`stop` 的 timeout 为 60，其余为 10），不要靠不触发的事件做开关或验收。
- **本机去重开关。** 只有 `LANGFUSE_CURSOR_PROJECT_HOOKS=1` 才上报。本机 Cursor 打开同一仓库时不要设这个开关：机器上已有 `langfuse-cursor-hook` 或本机插件 bundle 时，脚本以 `LANGFUSE_TRACING_ENABLED=false` 交给本机插件应答（用户级 hooks 已经在上报）；找不到插件就 `exit 1`。两套同时上报会每个动作两份 trace。

## 验收

- [ ] 目标仓库有 `.cursor/hooks.json` 与可执行的 `.cursor/hooks/langfuse.sh`，且 **active** build 的 commit 包含它们
- [ ] 若刚改过 Secrets：Config change build 已 Success 且为 active，commit 含 hooks，然后才冒烟
- [ ] 四个 Secret 只在该 environment 里；仓库、聊天、日志里没有 key
- [ ] 每个要追踪的 saved environment（含 Compose 子仓）各自有 hooks、四个 Secret 和自己的 active build
- [ ] 一轮 Cloud Agent 对话后，v2 observations 里能看到 `Cursor Turn`，`environment=cursor-cloud`
- [ ] 本机打开同一仓库、且未设置 `LANGFUSE_CURSOR_PROJECT_HOOKS` 时，不产生第二份 trace

## 扩到别的 environment

每个 saved environment 单独接一遍：该仓库自己的两个 hook 文件、该 environment 自己的四个 Runtime Secret、该 environment 自己的 active build。Compose 子仓各自独立，一个环境通了不会带上其它子仓。

改完 Secrets 后先等 Config change build Success 且成为 active，核对 commit，再冒烟。不要一保存就验，也不要靠手动 Trigger New Build 的 Draft 转正。

## 参考

- 模板即已验证原文件：[`cursor-cloud/langfuse.sh`](cursor-cloud/langfuse.sh)、[`cursor-cloud/hooks.json`](cursor-cloud/hooks.json)。
- 本机多 Agent 安装与设备 tag：[本机 Agent](local-agent.md)。官方 Cursor 集成文档：<https://langfuse.com/integrations/developer-tools/cursor>（云端不要照文档走 npm / Marketplace）。
- Codex Cloud 不能装插件，走箱外轮询：[Codex Cloud](codex-cloud.md)。[主入口](../SKILL.md)。
