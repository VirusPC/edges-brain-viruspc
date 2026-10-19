# Vercel coding-agent-template 源码分析

> 日期: 2026-10-19（Asia/Shanghai）。源码基于 [vercel-labs/coding-agent-template](https://github.com/vercel-labs/coding-agent-template) 本地 clone，HEAD `e753e1b`（main 最后一次提交 2026-02-12 17:21，UTC+8）。1.79k★（2026-10-19 实测；仓库 pushed_at 为 2026-08-25，推送的应是其他分支 ⚠️）。⚠️ 表示推断。

## 一句话

Next.js 应用：用户选仓库、选 agent、写 prompt，后端为每个任务开一台 **Vercel Sandbox**，在里面**无头**跑现成的 coding agent CLI，改完推到新分支，可以再开 PR。它是「沙箱里跑现成 CLI」路线的典型样本（见 [云沙箱 Agent 内核](2026-10-19--云沙箱Agent开源产品的Agent内核.md)）。

## 为什么有这个项目

- 起源是 Vercel 和 Anthropic 合作发布 Claude Sonnet 4.5 时的演示，见 Vercel 博客 [Collaborating with Anthropic on Claude Sonnet 4.5](https://vercel.com/blog/collaborating-with-anthropic-on-claude-sonnet-4-5)；作者 Chris Tate 也在 LinkedIn 上发帖介绍过（链接未收录 ⚠️）。
- 定位是模板和演示，不是长期维护的产品：main 从 2026-02 起没有新提交。

## 主流程

1. `POST /api/tasks` 写入任务，用 Next.js `after()` 在响应后继续执行（该路由在 `vercel.json` 里 `maxDuration: 300` 秒）。
2. `lib/sandbox/creation.ts` 调 `Sandbox.create`：
   - `runtime: 'node22'`，`resources: { vcpus: 4 }`，默认暴露端口 3000 / 5173；
   - `timeout` = 用户在 UI 里选的最长时长（5 分钟到 5 小时，`MAX_SANDBOX_DURATION` 默认 300 分钟）。
3. 在沙箱里 `git clone --depth 1` 到项目目录，按 lockfile 识别包管理器并装依赖，可选启动 dev server。
4. 按所选 agent 调对应 adapter，安装 CLI、写配置（含 MCP），无头执行。
5. 用 AI Gateway 生成 commit message，`pushChangesToBranch` 推送到新分支；PR 在 `/api/tasks/[taskId]/pr` 用 Octokit 创建。
6. 不保活就 `shutdownSandbox`；保活则留给后续对话（`/continue`）使用。

## Agent adapter（`lib/sandbox/agents/`）

| Agent | 安装 | 无头命令 | 续会话 |
|---|---|---|---|
| Claude Code | `curl claude.ai/install.sh` | `claude --dangerously-skip-permissions --output-format stream-json` | `--resume <session_id>` |
| Codex | `npm i -g @openai/codex` | `codex exec --dangerously-bypass-approvals-and-sandbox` | `codex resume --last` |
| Copilot | `npm i -g @github/copilot` | `copilot -p "<prompt>" --allow-all-tools` | `--resume <id>` |
| Cursor | `curl cursor.com/install` | `cursor-agent -p --force --output-format stream-json` | `--resume <id>` |
| Gemini | `npm i -g @google/gemini-cli` | `gemini --yolo -o json` | — |
| OpenCode | `npm i -g opencode-ai` | `opencode run` | — ⚠️ |

- **模型接入**：Claude、Codex 默认走 Vercel AI Gateway（`ai-gateway.vercel.sh`）；其余用各自 key（Cursor / Gemini / OpenAI / Anthropic key，Copilot 用 GitHub token）。用户在设置里存的 key 优先，没有就回落到系统环境变量。
- **会话恢复**：从 stream-json 的 `result` 块里解析 `session_id` 存库；保活的沙箱用 `Sandbox.get({ sandboxId })` 重连，跟进消息带 resume 参数。

## 其他实现点

| 方面 | 做法 |
|---|---|
| 日志 / 进度 | 任务日志存在 `tasks.logs`（jsonb 数组）；前端 `use-task` 每 5 秒轮询 |
| 数据表 | Drizzle + Postgres：`users`、`accounts`、`keys`、`tasks`、`task_messages`、`connectors`、`settings` |
| 鉴权 | GitHub 或 Vercel OAuth；session 用 JWE；用户 key 和 MCP 配置用 `ENCRYPTION_KEY` 加密存库 |
| 限流 | `MAX_MESSAGES_PER_DAY` 默认 5 |
| 清理 | 正常结束或出错时主动关停；保活的沙箱以及函数被 300 秒上限打断时，主要靠沙箱 `timeout` 自己过期 ⚠️（推断，没有看到 cron 清理，`crons: []`） |

## 可以借鉴

- **adapter 模式**：每个 CLI 一个文件，统一「安装 → 写配置 → 执行 → 解析流 → 取 session_id」接口，新增 agent 成本低。
- 先建沙箱再手动 clone，便于控制目录和认证；`Sandbox.get` 按 id 重连，适合跨请求操作同一沙箱。

## 不要照抄

- **每个任务现装 CLI**：冷启动慢、版本漂移。应该做预装镜像或快照，并锁定版本。
- **token 拼进 git URL**：容易出现在日志、`.git/config` 和进程列表里。
- **API key 直接拼进 shell 命令字符串**（如 Codex 的 env 前缀）：靠事后打码兜底，风险高。
- **长任务跑在 serverless 函数里**：300 秒上限，长任务会被截断。
- **清理靠超时**：保活和异常路径上沙箱一直计费，直到 timeout。
