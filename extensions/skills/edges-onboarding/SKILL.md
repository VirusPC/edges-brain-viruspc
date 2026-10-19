---
name: edges-onboarding
description: 帮用户第一次接入 Edges 时使用：安装 edges CLI（npm 包 @viruspc/edges）、初始化目录、跑一次验证、学会常用命令、排查安装与鉴权报错。用户说「帮我接入 edges」「安装 edges」「edges 怎么用」「edges 报错了」「给我的仓库配一套 edges」时触发。已经装好、只是要写笔记请改用 edges-note；整理对话改用 conversation-to-notes；项目记忆的增删查改改用 project-memory-* 系列。本 skill 只做入口与引导，具体操作一律交给 edges CLI 执行。
version: 0.1.0
---

# edges onboarding

本 skill 是入口，[`edges` CLI](../../cli/README.md) 是执行层。这里只说明按什么顺序调用哪些命令、看到什么算成功、失败了怎么办。不要用手写文件或自造脚本替代 CLI。完整参数以各层 `edges <命令> --help` 为准。没在下面出现的命令和旗标，不要猜。

所有命令的约定（来自 CLI 实现）：

- stdout 只有 JSON（`tasks runs` 等少数只读命令默认是表格），诊断写 stderr。只解析 stdout。
- 退出码：`0` 成功；`1` 运行错误；`2` 用法或校验错误（`errorCode: "VALIDATION_ERROR"`）；`4` 鉴权错误（`errorCode` 以 `AUTH_` 开头）。`edges init` / `edges skills init` 的安装步骤失败时，退出码沿用安装器自己的退出码，`errorCode` 为 `SKILLS_INSTALL_FAILED`。
- 失败信封：`{"status":"failed","errorCode":"…","reason":"…"}`。先读 `reason` 再决定下一步。

## 何时用

- 用户第一次在一台机器或一个仓库上使用 Edges。
- 用户问「edges 怎么装 / 怎么用 / 有哪些命令」。
- `edges` 命令报错，用户需要排查。
- 不用于：写一条笔记（`edges-note`）、整理对话（`conversation-to-notes`）、维护项目记忆（`project-memory-*`）。装好之后按那些 skill 走。

## 硬规则

1. **不经手凭证。** 不要让用户把 token、API key、密码、cookie、私钥贴进对话；用户主动贴了，提醒他作废这份凭证并重新生成，不要复述、不要写进任何文件。你自己也不要读取或打印凭证文件（如 `~/.config/edges/artifacts.env`）的内容。
2. **需要凭证的步骤让用户在自己的终端完成。** GitHub 身份用 `gh auth login`，不要让用户贴 PAT。
3. **凭证不进仓库、不进公开笔记。** 不要把凭证写进 `.env`、`AGENTS.md`、`notes/`、任务、记忆或 commit；MCP 客户端配置里的 token 只放在用户本机配置里。Edges 公开仓库的规则：写入即公开发表，见仓库 README「隐私与脱敏」。
4. **不改别人的内容，不越权写 git。** 本 skill 只做本地初始化与验证：不 commit、不 push、不开 PR，除非用户明确要求。`edges notes create`、`edges tasks create` 本身也只写本地文件。
5. **只用真实存在的命令。** 不要编造 `edges login`、`edges auth`、`edges whoami`、`edges doctor` 这类当前不存在的命令；没有的能力如实告诉用户「尚未实现」。

## 前置检查

逐项检查，任何一项不满足都先停下来告诉用户，不要继续安装。

```bash
node -v
npm -v
git --version
```

预期与处理：

| 检查 | 要求 | 不满足时 |
| --- | --- | --- |
| `node -v` | `v22.20.0` 或更高（包的 `engines.node` 是 `>=22.20.0`，依赖 `skills@1.7.2` 同样要求） | 让用户用自己习惯的版本管理器（nvm、fnm、Volta、官方安装包）升级。低版本可能装得上，但不受支持，`edges init` 装 skill 那一步可能失败。 |
| `npm -v` | 有输出即可（随 Node 自带） | 重新安装 Node。 |
| `git --version` | 有输出即可 | CLI 用 Git 根判断作用域，`compose clone/pull/push` 也会调用 git。没有 git 时先装 git。 |
| 网络 | 能访问 npm registry | `npm install` 超时或 `ETIMEDOUT` 时，检查代理或 registry 设置（`npm config get registry`）。不要替用户改全局 npm 配置，先问。 |

## 安装

```bash
npm install -g @viruspc/edges
edges --version
edges --help
```

预期：

- `npm install` 末尾出现 `added N packages`。
- `edges --version` 打印一个版本号（写作本 skill 时 npm 上是 `0.2.1`）。
- `edges --help` 打印 `Usage: edges [options] [command]`，命令列表里有 `init`、`notes`、`projects`、`tasks`、`memory`、`skills`、`artifacts`、`schema`、`forest`、`compose`。

失败时：

- `EACCES` / permission denied：全局目录没有写权限。建议用户改用 Node 版本管理器装的 Node，或者让用户自己决定是否设置 npm prefix。**不要建议 `sudo npm install -g`**，除非用户坚持。
- `edges: command not found`：npm 全局 bin 目录不在 PATH 里。让用户执行 `npm prefix -g`，把输出目录下的 `bin` 加进 PATH 后重开终端。
- 想临时用、不全局安装：`npx -y @viruspc/edges@<版本> --help`（每次都会下载，日常不推荐）。

只有用户要参与 Edges 本身的开发时，才走源码方式（需要 pnpm）：

```bash
git clone --recurse-submodules https://github.com/VirusPC/edges.git && cd edges
pnpm install && pnpm setup && pnpm skills:link
pnpm build && pnpm test
```

## 初始化一个目录

Edges 把任意目录当成一个「作用域」。先选定作用域，再初始化。作用域解析顺序：`--scope` → 环境变量 `EDGES_SCOPE` → `EDGES_REPO` → 当前目录所属的 `AGENTS.md` 作用域或 Git 根。建议总是显式传 `--scope`。

**先确认目标目录是用户想要的。** 然后：

```bash
cd <用户的仓库>
edges --scope . init -- -g -y
```

- 无参 `init` 默认写入：`AGENTS.md`、memory 类型 `feedback` / `project` / `reference`、skills 类型索引（managed、referenced），并把包内 Edges skills 装给本机 agent；还有 notes、projects 的组织列表。任务看板**不在**默认集里，需要时另跑 `edges --scope . tasks init`。
- `--` 后面的旗标原样交给 `skills@1.7.2` 安装器：`-g` 装到用户目录，`-y` 跳过确认。没有 TTY、又没探测到 agent 时，不带 `-y` 会退出 1。
- 只给某一个 agent 装：`edges --scope . init -- -y --agent claude-code`（不加 `-g` 时写当前项目的 `.claude/skills`）。
- 只想建目录结构、不装 skill：`edges --scope . init notes tasks`（列出要的模块，可选 `memory`、`skills`、`tasks`、`notes`、`projects`）。

预期 stdout（示例，字段以实际为准）：

```json
{"status":"success","targetDir":"/path/to/repo","agentsAction":"created","modules":["notes","tasks"],"created":[".harness/tasks/README.md",".harness/notes/README.md"],"command":"init"}
```

重复执行是安全的：已有文件出现在 `preserved` 里，不会被覆盖。

失败时：

- `errorCode: "SKILLS_INSTALL_FAILED"`：目录结构可能已经写好（看 `created`），是装 skill 那一步失败。看 stderr 里安装器的原始输出；常见原因是 Node 版本过低、没有 TTY 又没带 `-y`、网络不通。修好后重跑同一条命令。
- 安装器 stderr 列出「被忽略的 token」：这次解析出的模块里没有 skills，`--` 后面的旗标没有用上。去掉模块参数或加上 `skills`。

## 登录鉴权

**现状（截至 CLI 0.2.1）：没有 `login` 命令。** 本地的 notes / projects / tasks / memory / skills / schema / forest 命令只读写本机文件，**不需要鉴权**。

目前真正涉及凭证的只有这几处，都让用户自己在终端里完成。AI 不经手 token，不读取、不复述凭证文件：

| 场景 | 现有机制 | AI 该怎么做 |
| --- | --- | --- |
| 发布预览页（`edges artifacts create/publish/delete`） | 共享 token，变量 `EDGES_ARTIFACTS_TOKEN`、`EDGES_ARTIFACTS_BASE_URL`；默认存在 `~/.config/edges/artifacts.env`（权限 0600，可用 `EDGES_ARTIFACTS_CONFIG` 改路径）。用 `edges artifacts init` 写入。 | 告诉用户在他自己的终端运行 `edges artifacts init --base-url <预览服务地址>`（会新生成 token 并打印在 stderr）或加 `--token <服务端 token>` 复用服务端 token。**不要由你来运行带 `--token` 的命令，也不要读取或复述输出里的 token。** 完成后你只需确认 stdout 里 `"tokenCreated"` 和 `"configPath"`。 |
| new-note MCP 的 HTTP 模式 | 静态 Bearer token，变量 `EDGES_AUTH_TOKEN`；不设置就不鉴权 | 让用户自己在 MCP 服务端环境和客户端配置里设置，不要经手。 |
| `compose clone/pull/push`、git 推送 | 走用户本机已有的 git 凭证 | 推荐用户执行 `gh auth login` 在浏览器里授权；不要让用户贴 PAT。 |

## 验证

在一个**临时 Git 目录**里跑一遍，确认 CLI 能写能读，不污染用户的真实仓库：

```bash
mkdir -p /tmp/edges-check && cd /tmp/edges-check && git init -q
edges --scope . init notes tasks
edges --scope . notes create --title "edges 接入验证" --body "安装后第一条笔记。"
edges --scope . notes list
edges --scope . tasks create --title "试一下任务" --project default
edges --scope . tasks list
edges --scope . memory doctor
```

预期：

- 每条命令退出码 0，stdout 是 `"status":"success"` 的 JSON（`memory doctor` 输出 `"ok": true`）。
- `notes create` 返回 `"path":"notes/<今天日期>--edges-接入验证/INDEX.md"`。
- `tasks create` 返回的 `path` 在 `.harness/tasks/_default/backlog/` 下，`tasks list` 能列出它。

验证通过后告诉用户可以删掉 `/tmp/edges-check`（由用户决定，不要擅自删除用户目录）。任何一步失败，按下面「常见错误排查」处理。

## 常用操作

以下命令都只改本地文件，不 commit、不 push。`<目录>` 换成作用域路径。

```bash
# 笔记
edges --scope <目录> notes create --title "标题" --body "正文 Markdown"
edges --scope <目录> notes list
edges --scope <目录> notes get notes/<日期>--<slug>/INDEX.md
edges --scope <目录> notes update notes/<日期>--<slug>/INDEX.md --body "新正文"
edges --scope <目录> notes delete notes/<日期>--<slug>/INDEX.md

# 项目
edges --scope <目录> projects create --title "Demo" --body "这个项目是什么。"
edges --scope <目录> projects list --filter title=Demo

# 任务（取消用 status cancelled，没有删除任务的用法）
edges --scope <目录> tasks init
edges --scope <目录> tasks create --title "修复构建" --project default
edges --scope <目录> tasks list --status todo --priority high --sort priority
edges --scope <目录> tasks update <stem或路径> --priority high
edges --scope <目录> tasks status <stem或路径> done
edges --scope <目录> tasks project list

# 项目记忆
edges --scope <目录> memory init --memory-types project feedback
edges --scope <目录> memory remember --type project --slug <slug> --description "一句话" --content-file /tmp/x.md
edges --scope <目录> memory doctor          # 只诊断
edges --scope <目录> memory doctor --apply  # 修复，会改文件，先告知用户

# 技能
edges --scope <目录> skills list
edges --scope <目录> skills get <name或路径>

# 系统总览与数据合同
edges --scope <目录> forest list
edges schema list

# 组合多个 harness 仓库（clone/pull/push 会调用 git）
edges --scope <目录> compose list
edges --scope <目录> compose clone
```

细节交给对应 skill：写笔记 `edges-note`，整理对话 `conversation-to-notes`，记忆 `project-memory-ask` / `project-memory-remember` / `project-memory-doctor`，任务分类 `project-tasks-classify`。

没有 shell 的宿主（只能调 MCP）：用 `extensions/mcp-servers/new-note` 暴露的 `new_note` 工具（参数 `title`、`body`），它在背后调用同一个 `edges notes create`。目前 MCP 只覆盖新建笔记。

## 常见错误排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `edges: command not found` | 没装，或 npm 全局 bin 不在 PATH | 回到「安装」；`npm prefix -g` 找到目录后把 `bin` 加进 PATH。 |
| `"reason":"missing command. Use edges --help."`，退出码 2 | 只敲了 `edges` | 必须带子命令；没有默认写笔记的行为。 |
| `"reason":"unknown option '--xxx'"`，退出码 2 | 旗标不存在（例如老版本的 `--content`、`--mode`、`--index-group`） | 跑 `edges <命令> --help` 看当前旗标，不要猜。 |
| `edges note` / `edges skill` / `edges ingest` 报错 | 已改名，无别名 | 用 `edges notes`、`edges skills`。 |
| `"reason":"No owning scope or Git repository found. Pass --scope <directory> or set EDGES_SCOPE."` | 当前目录既不在 Git 仓库里，也没有所属 `AGENTS.md` | 加 `--scope <目录>`，或在目标目录 `git init` / `edges --scope . init`。 |
| `"errorCode":"AUTH_MISSING"`，退出码 4，提示 `run edges artifacts init` | artifacts 没配 token | 让用户自己在终端跑 `edges artifacts init …`（见「登录鉴权」），不要经手 token。 |
| `AUTH_INVALID_TOKEN`，退出码 4 | 本机 token 与预览服务端不一致 | 让用户自己拿服务端 token 执行 `edges artifacts init --token <…> --force`。 |
| `artifacts config already has a token … (pass --force to overwrite)` | 已初始化过 | 确认用户确实要覆盖后，由用户自己加 `--force` 重跑。 |
| `SKILLS_INSTALL_FAILED` | `skills@1.7.2` 安装步骤失败 | 看 stderr 原始输出；查 Node 版本、`-y`、网络。退出码就是安装器的退出码，不要用「是不是 2」判断是不是校验错误。 |
| 写命令报 busy / 锁冲突 | 同一 worktree 里另一个 edges 写命令正在运行（锁目录 `.edges-write.lock/`） | 等它结束再重试；不要手动删除正在使用的锁。 |
| `--all is only supported by read commands.` | 在写命令上用了 `--all` | `--all` 只配 `list` 这类只读命令。 |
| `schema` 命令说缺少构建产物 | 源码方式没 build | `pnpm --filter @viruspc/edges build`，或改用 npm 安装的版本。 |
| 装了 skill 但 agent 找不到 | 装到了别的 agent 目录，或改了 skill 没重装 | 重跑 `edges --scope <目录> skills init -- -g -y`（或 `--agent <名字>`）。不要用不带版本号的 `npx skills`。 |

仍无法解决：把命令、stdout JSON、stderr（**先删掉任何 token 或 URL 里的密钥**）、`edges --version`、`node -v` 交给用户，建议到 https://github.com/VirusPC/edges/issues 反馈。
