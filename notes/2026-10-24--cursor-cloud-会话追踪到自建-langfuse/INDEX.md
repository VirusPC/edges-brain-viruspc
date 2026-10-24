# Cursor Cloud 会话追踪到自建 Langfuse

> 把 Cursor Cloud Agents 在 saved environment `edges-workspace-viruspc` 里的会话，打进自建 Langfuse（https://langfuse.viruspc.tech，v4 `events_only`，项目 Edges）。云端不跑用户级插件，改用仓库里的项目级 hooks，包装脚本懒加载官方 cursor-observability-plugin。

## 背景

目标是给 Cursor Cloud Agent 补上可观测性：在自建 Langfuse 里看到一轮会话的 turn，以及下面的 LLM 与工具观测，方便对照本机 Cursor、Codex 和 Grok Bot 已经在用的追踪习惯。

当天（Asia/Shanghai 2026-10-24）的接入已经在真实环境里跑通。环境是 saved environment `edges-workspace-viruspc`（仓库 `VirusPC/edges-workspace-viruspc`，env id `2b29527a-cd15-11f1-bec7-b2318963e0b6`）。Langfuse 基址为公开域名 `langfuse.viruspc.tech`，版本 v4，摄取模式 `events_only`，项目名 Edges。

可复用步骤沉淀在 skill `shared-extensions/skills/cursor-cloud-langfuse-tracing`。本篇记当时为什么这样接、验证到了什么。

## 主题

这场接入要解决的是：Cursor Cloud 只执行仓库里的项目级 hooks、官方 npm 包又安装不上时，如何把 Cloud Agent 会话写入自建 Langfuse，并且本机 Cursor 打开同一仓库时不会重复上报。

- 难点一：Cloud Agent 只跑 `.cursor/hooks.json`。`~/.cursor` 用户级插件和 Marketplace 插件在云端不可用。`sessionStart` / `sessionEnd`、MCP hooks 不触发。
- 难点二：`@langfuse/cursor-observability-plugin` 截至 2026-10-24 `npm view` 为 404（search 能搜到 `0.1.0`），`npm pack git+https` 也失败。不能按文档 `npm install`。
- 难点三：permission 类 hook exit 0 但输出不是合法 JSON，会阻断 shell、读文件、MCP、子代理等动作。
- 难点四：saved environment 是 Build 快照。手动 Trigger New Build 默认是 Draft，不会成为 active build。推完代码不等于正在跑的云端已经有这些文件。
- 难点五：自建 v4 `events_only` 下 `GET /api/public/traces` 不可用，验收要改走 observations。
- 难点六：同一仓库会被本机 Cursor 打开。项目级 hooks 若无条件上报，会和本机用户级插件各写一份 trace。

## 过程

### 选定项目级包装脚本，不改 install 脚本

官方插件是 `langfuse/cursor-observability-plugin`：可执行文件名 `langfuse-cursor-hook`，`dist` 已打包、零依赖，要求 Node >= 22。云端用不上 Marketplace，也不把安装写进 environment 的 install 脚本。

落地是仓库内两个文件：

- `.cursor/hooks.json`：官方模板的 18 个 hook，command 全部是 `bash .cursor/hooks/langfuse.sh`。`sessionEnd`、`beforeSubmitPrompt`、`stop` 的 timeout 为 60，其余为 10。项目 hooks 的 cwd 是仓库根，所以用相对路径。
- `.cursor/hooks/langfuse.sh`（`100755`）：第一次 hook 时 `git clone` 指定 commit，再 `node dist/index.mjs`。

克隆目标是 `~/.cache/langfuse-cursor-plugin/<pin>`。先克隆到临时目录再 `mv`，并发时后完成的一方直接沿用已经放好的目录。云端 VM 实测 `node` v22.23.4，并且能 clone GitHub。

### npm 404，改为 pin 一个 commit

不使用 npm 包名。插件 pin 在 `a36d39a7c5cf9da34662159b70d51b6b36855abc`，仓库 `https://github.com/langfuse/cursor-observability-plugin.git`。脚本直接执行该 commit 里已经打好的 `dist/index.mjs`。

### 用一个开关把云端和本机分开

环境 Secrets（Runtime Secret）四个，值不进仓库：

- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_BASE_URL`（本次为 `https://langfuse.viruspc.tech`）
- `LANGFUSE_CURSOR_PROJECT_HOOKS=1`

只有开关为 `1` 才上报，并默认 `LANGFUSE_TAGS=device:cursor-cloud`、`LANGFUSE_TRACING_ENVIRONMENT=cursor-cloud`。

本机 Cursor 打开同一仓库时不设这个开关。机器上已经有 `langfuse-cursor-hook` 或本机插件 bundle 时，脚本导出 `LANGFUSE_TRACING_ENABLED=false` 再交给本机插件应答，避免和用户级 hooks 重复上报。找不到插件就 `exit 1`：Cursor 把 hook 失败当成放行，对话可以继续。

### permission hook 不能空输出成功

`beforeShellExecution`、`beforeMCPExecution`、`beforeReadFile`、`preToolUse`、`subagentStart` 一类 hook，exit 0 且 stdout 不是合法 JSON 时会**阻断**对应动作。因此「本机关掉上报」不能写成 `exit 0` 加空输出，要么让插件正常应答，要么失败退出。

### 第一次云端测试跑在旧快照上

推完 hooks 之后的第一次 Cloud Agent 测试失败：容器里没有 `.cursor/`（hooks-missing），因为 active build 仍是旧快照。

改 Secrets 触发了一次 **Config change** build，这次 build 拉到了最新 commit。之后的第二次测试通过。手动 **Trigger New Build** 默认得到的是 Draft，不会替换 active build；改仓库内容后要核对 active build 的 commit，而不是只看 push 成功或 Draft 的状态。

另外，这个 environment 挂在某一个 Google 登录的 Ultra 账号下。换另一个 Google 账号进 Cursor 后台，看不到该环境。邮箱不写入本公开仓。

### 验证

本机 smoke：对包装脚本依次送 `beforeSubmitPrompt` → `afterAgentResponse` → `stop`。插件日志出现 `Exported turn 1 ... as trace ...`。`langfuse-cursor-hook status` 显示 connection 成功，项目为 Edges。

云端第二次 smoke（Secrets 变更触发的 build，commit `5eac8c7`）通过。缓存目录 `~/.cache/langfuse-cursor-plugin/a36d39a…` 已生成。Langfuse 出现 `Cursor Turn`，时间 `2026-10-24T15:07:36Z`（北京时间 23:07），`environment=cursor-cloud`，子观测为 LLM `GENERATION` 与 Shell `TOOL`。

`events_only` 下不用 `/api/public/traces`。看数用：

```bash
curl -s -u "$LANGFUSE_PUBLIC_KEY:$LANGFUSE_SECRET_KEY" \
  "$LANGFUSE_BASE_URL/api/public/v2/observations?name=Cursor%20Turn&limit=20"
```

### 三环境 rollout：快照不是启动时拉代码

Asia/Shanghai 2026-10-24 晚，约 23:26–23:31，把同一套接入扩到 Compose 下另外三个仓。每个仓对应自己的 Cursor saved environment，按与 workspace 相同的方式接：该仓自己的 hooks、该 environment 自己的四个 Runtime Secret（名字与 workspace 相同，Scope=Environment）、以及该 environment 自己的 active build。workspace 环境已经通，不会让挂在 workspace 下的 brain / framework 环境跟着追踪。

| 仓库 | hooks | env id | Config change build | active commit |
| --- | --- | --- | --- | --- |
| `VirusPC/edges-brain-viruspc` | PR #367 合入 `4a4fda4` | `dd6e8e7d-cc40-11f1-bec7-b2318963e0b6` | `bld-20261024-cc41f50a-…` | `4a4fda4` |
| `VirusPC/edges-brain-viruspc-private` | PR #5 合入 `3880247` | `287e377d-cd73-11f1-89ee-7aa6f0729b11` | `bld-20261024-a8f32a90-…` | `3880247` |
| `VirusPC/edges` | PR #29 合入 `9b29acb` | `d999f199-a889-11f1-b532-320a589b8025` | `bld-20261024-4afd4685-…` | `9b29acb` |

时间线：

1. hooks 已在各仓 main，四个 Secret 也已写入，但 Config change build 还没完成。三环境首轮冒烟都报 hooks 文件 missing。`printenv` 已经能看到四个 `LANGFUSE_*`，容器里没有 `.cursor/`。
2. 保存 Secrets 之后，UI 没有立刻出现新构建。约 23:26–23:28 各环境自动出现并完成 Config change build，且成为 active。这次没有再点 Trigger New Build。手动触发容易停在 Draft、不转正，见上文「第一次云端测试跑在旧快照上」。
3. 核对 active build 的 commit 含 hooks 之后做第二轮冒烟，hooks 存在。23:31 Langfuse 收到 3 条 `Cursor Turn`，`environment=cursor-cloud`。

Cloud Agent 跑的是 active build 快照，不会在每次启动时 git pull 最新 main。此前误以为「启动会拉最新代码」，把「main 已有 hooks」当成「环境里已有文件」。推到 main 不等于正在跑的快照已经换过。Secrets 已经写入，也不等于新快照已经生效：改 Secrets 会触发 Config change build，构建要一两分钟；在它 Success 并成为 active 之前开的 Cloud Agent 仍用旧快照。

## 结果

做成了：

- 项目级 hooks 懒加载 pin 住的官方插件，不改 environment install 脚本。
- 四个 Secret 放在 environment；开关把云端上报和本机去重分开。
- active build 含 commit `5eac8c7` 后，云端出现 `Cursor Turn`（`environment=cursor-cloud`），并带 LLM 与 Shell 子观测。
- 本机 smoke 能导出 turn，且 status 连上项目 Edges。
- 落地文件在 `VirusPC/edges-workspace-viruspc` 的 main `5eac8c7`：`.cursor/hooks.json` 与 `.cursor/hooks/langfuse.sh`（`100755`）。可复用副本在本仓 skill 的 `templates/`。
- 三 Compose 对应 env 已通。公开脑 `VirusPC/edges-brain-viruspc` hooks PR #367（`4a4fda4`）、私有脑 `VirusPC/edges-brain-viruspc-private` hooks PR #5（`3880247`）、框架仓 `VirusPC/edges` hooks PR #29（`9b29acb`）。各环境 Config change build 已是 active，commit 与上述合入一致。23:31 Langfuse 收到 3 条 `Cursor Turn`（`environment=cursor-cloud`）。密钥不入库。

还剩（未开任务，仅记录）：

- npm 包仍然 404，后续插件升级要改脚本里的 pin，不能改回 `npm install`。
- 云端 `sessionStart` / `sessionEnd` 与 MCP hooks 不触发，模板里挂着它们只是对齐官方 18 个 hook。
- Draft build 看起来像「已经重建」，实际不会成为正在使用的快照。
- 环境只对拥有它的那个 Cursor 账号可见。

## 所学

- Cursor Cloud 的「插件装在本机用户目录」和「仓库里的项目 hooks」是两套机制。云端只跑后者。
- 官方集成文档里的 npm 包名，在 2026-10-24 对这个插件不可用。`dist` 已打包时，pin 一个 git commit 再 `node dist/index.mjs` 就能跑，不必在 install 脚本里预装。
- permission hook 的失败模式是「exit 0 + 非法 JSON」阻断动作，不是非零退出。关闭上报必须仍然给出合法应答，或用 `exit 1` 放行。
- Saved environment 的运行内容等于 **active** build 的快照。改 Secret 会拉一次带最新 commit 的 Config change build；Trigger New Build 的 Draft 不会自动转正。
- 自建 Langfuse v4 `events_only` 的验收接口是 `GET /api/public/v2/observations`，按 `Cursor Turn` 和 `environment=cursor-cloud` 过滤。
- 同一份项目 hooks 会被本机 Cursor 加载。用 `LANGFUSE_CURSOR_PROJECT_HOOKS` 做云端开关，本机未设置时关掉上报或失败放行，避免双份 trace。
- Cloud Agent 跑的是 active build 快照，不会在每次启动时 git pull 最新 main。推 hooks 到 main 不等于环境里已有这些文件。
- Secrets 已经写入、`printenv` 能看到四个 `LANGFUSE_*`，快照仍可能是旧的。改 Secrets 会触发 Config change build，要等它 Success 并成为 active、且 commit 含 hooks，再冒烟，再查 Langfuse。
- Compose 子仓各自接一次。workspace 环境通了，不等于挂在 workspace 下的 brain / framework 环境会追踪。每个 env 要自己的仓库 hooks、自己的 Secrets、自己的 active build。

## 行动指南

### 主题行动指南

#### 背景

需要把 Cursor Cloud Agents（saved environment）的会话写入自建 Langfuse。云端不加载用户级插件和 Marketplace；自建实例可能是 v4 `events_only`。

#### 核心问题

在不能改云端用户目录、npm 包又安装失败的前提下，如何用仓库内 hooks 上报，并保证 active build 真的包含这些文件，同时本机打开同一仓库不会重复上报。

#### 核心解决方案

1. 把 skill 里的两个模板拷进目标仓库：`.cursor/hooks.json` 与可执行的 `.cursor/hooks/langfuse.sh`。不改 environment install 脚本。  
   （可选项：按文档 `npm install` 或在 install 脚本里预装插件 —— 不做。2026-10-24 npm 404，且 install 脚本不是这条路径的依赖。）
2. 在该 environment 加上四个 Runtime Secret：`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`、`LANGFUSE_BASE_URL`、`LANGFUSE_CURSOR_PROJECT_HOOKS=1`。本机不设最后一个。  
   （可选项：本机也打开项目 hooks 上报 —— 不做，会和用户级插件重复。）
3. 核对 **active** build 的 commit 已经包含这两个文件，再冒烟，再查 Langfuse。Cloud Agent 用的是 active build 快照，启动时不会 git pull 最新 main。若刚改完 Secrets，先等它触发的 Config change build Success 且成为 active，核对 commit，不要一保存就验：此时 `printenv` 可能已经能看到四个 `LANGFUSE_*`，旧快照里仍然没有 `.cursor/`。手动 Trigger New Build 的 Draft 不算。  
   （可选项：push 或刚保存 Secrets 之后立刻验收 —— 不做。）
4. 跑一轮真实 Cloud Agent 对话，用 `GET /api/public/v2/observations?name=Cursor%20Turn` 确认 `environment=cursor-cloud`。  
   （可选项：用 `GET /api/public/traces` —— `events_only` 下不可用。）

#### 验收标准

- active build 的 commit 含 `.cursor/hooks.json` 与 `.cursor/hooks/langfuse.sh`。
- Langfuse 里至少有一条 `Cursor Turn`，`environment` 为 `cursor-cloud`，并能看到子观测（如 LLM `GENERATION`、Shell `TOOL`）。
- 仓库、聊天、日志中没有 public/secret key。
- 本机未设置 `LANGFUSE_CURSOR_PROJECT_HOOKS` 时，不产生第二份 trace；permission 类动作没有被空 JSON 挡住。

### 细节与其他

#### 若目标是另一个 Cursor Cloud environment

则：拷同一对文件，在**那个** environment 加同样的四个 Secret，再确认它自己的 active build。Compose 下每个子仓是独立的 saved environment，workspace 通了不会让 brain / framework 跟着追踪。插件 pin、缓存目录和开关语义都在 `templates/langfuse.sh` 里，不要在笔记里另抄一份脚本。

#### 若云端任务报 hooks 缺失或 `.cursor/` 不存在

则：看 active build 的 commit，而不是 Draft build、本地 main，或「启动时会拉最新代码」。`printenv` 已有 `LANGFUSE_*` 只说明密钥在，不说明快照已换。需要新快照时，用会成为 active 的构建（例如改 Secret 触发的 Config change build），等它 Success，并核对 commit 哈希，再冒烟。

#### 若刚改完 Secrets

则：先等 Config change build Success 且成为 active，核对 commit 含 hooks，再冒烟，再查 Langfuse。不要一保存 Secrets 就验。保存后 UI 可能过一两分钟才出现这次构建。手动 Trigger New Build 容易停在 Draft，不要靠它转正。

#### 若 permission 类动作被 hook 挡住

则：看该 hook 是否 exit 0 且 stdout 为空或不是 JSON。关闭路径改为让插件应答，或 `exit 1`。

#### 若只要本机 Cursor

则：走 [langfuse-agent-tracing](../../shared-extensions/skills/langfuse-agent-tracing/SKILL.md)，不要设 `LANGFUSE_CURSOR_PROJECT_HOOKS`。Codex Cloud 走 [codex-cloud-langfuse-tracing](../../shared-extensions/skills/codex-cloud-langfuse-tracing/SKILL.md)。

## 补充说明

- 原始材料：Asia/Shanghai 2026-10-24 的接入事实（已验证的 `hooks.json` 与 `langfuse.sh`）；同日晚三环境 rollout（公开脑 hooks PR #367、私有脑 hooks PR #5、框架仓 hooks PR #29），验证时间 23:31，助手「全栈开发专家」。本笔记按 `conversation-to-notes` 的章节（背景 / 主题 / 过程 / 结果 / 所学 / 行动指南 / 补充说明）整理。凭证与 Cursor 账号邮箱不写入本公开仓。
- 可复用资产：`shared-extensions/skills/cursor-cloud-langfuse-tracing/`（`SKILL.md` 与 `templates/`）。
- 同日姊妹笔记：[Codex Cloud 会话追踪到自建 Langfuse](../2026-10-24--codex-cloud-会话追踪到自建-langfuse/INDEX.md)、[多机 Langfuse Agent 追踪安装与验收](../2026-10-24--多机-langfuse-agent-追踪安装与验收/INDEX.md)。
- 遗留项（npm 仍 404、云端部分 hook 不触发、Draft build、账号可见性）只记在「结果」。本篇不另开任务。

### 技术附录

**Skill 内的已验证原文件：**

| 文件 | 放到目标仓库 |
| --- | --- |
| `shared-extensions/skills/cursor-cloud-langfuse-tracing/templates/hooks.json` | `.cursor/hooks.json` |
| `shared-extensions/skills/cursor-cloud-langfuse-tracing/templates/langfuse.sh` | `.cursor/hooks/langfuse.sh`（`100755`） |

**插件 pin：** `a36d39a7c5cf9da34662159b70d51b6b36855abc`（`langfuse/cursor-observability-plugin`）。缓存目录 `~/.cache/langfuse-cursor-plugin/<pin>`。

**本次跑通的云端：** environment `edges-workspace-viruspc`，仓库 `VirusPC/edges-workspace-viruspc`，active build commit `5eac8c7`。观测时间 `2026-10-24T15:07:36Z`。同日晚三环境见过程「三环境 rollout」，观测时间北京时间 23:31。

**写入与验收：** 插件自己向 `LANGFUSE_BASE_URL` 上报。人验收用 `GET /api/public/v2/observations?name=Cursor%20Turn`，看 `environment=cursor-cloud`。
