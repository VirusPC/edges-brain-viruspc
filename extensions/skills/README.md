# Skills (extensions/skills/)

本目录是 Edges **对外分发、接入本系统**的 skill 真源，供外部 AI Agent（Claude Code、Codex、Cursor、Gemini CLI、Factory、opencode）加载。不绑定 Edges 的通用 skill 在 [`shared-extensions/skills/`](../../shared-extensions/skills/README.md)，不要放进来。classifyTasks（`project-tasks-classify`）人闸走 `edges tasks project review-page`；尚未入库的 proposeTypes Skill 应复用同一命令与同一 HTML 壳，不要另开 `--mode`。

## 目录规范

每个 skill 一个子目录，目录下必须有 `SKILL.md`，且其 YAML frontmatter 的 `name` **与目录名完全一致**：

```markdown
---
name: <目录名>
description: <一句话，说明何时该触发、何时不该触发>
version: <semver>
---

<正文>
```

`description` 是 agent 决定要不要加载这个 skill 的唯一依据，写清楚触发场景和边界（"如果 X 请改用 Y"），不要写成 `summarize ai article` 这种同义反复。

每个 skill 各自独立 semver，和 `SKILL.md` 同目录放一份 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 格式的 `CHANGELOG.md`。改了某个 skill 的 `SKILL.md`、scripts、references 或对外行为后：

1. 按 semver 升它自己的 `version`（补丁 +0.0.1，行为/契约变 +0.1.0，不兼容 +1.0.0）
2. 把 `[Unreleased]` 下的条目挪到 `## [x.y.z] - YYYY-MM-DD`
3. 对**同一个 commit** 打 annotated tag：`skill/<name>@<version>`
4. `git push origin main --follow-tags`

没改到的 skill 不要动版本；目录级 README 不算单个 skill 的版本。一次 commit 改了多个 skill，每个改过的各写 changelog、各打一条 tag。

仓库级变更另记根目录 [`CHANGELOG.md`](../../CHANGELOG.md)，用 `vX.Y.Z` tag，**不是** skill 总账。只改某个 skill 的补丁不必升仓库版本。

查找某个版本对应的 commit：

```bash
git show skill/project-memory-init@1.1.0
git log --oneline skill/project-memory-init@1.0.0..skill/project-memory-init@1.1.0 -- extensions/skills/project-memory-init
git tag -l 'skill/project-memory-init@*'
```

`name` 与目录名一致这条**没有机器校验了**（旧的 `install-skills` 脚本会拦，已退役）。两个 skill 的 `name` 撞车时，后一个会被静默丢弃。

## 安装

外部用户先 `npm install -g @viruspc/edges`（Node.js 22.20 及以上），再执行 `edges skills init` 或无参 `edges init`。命令会建 skill 类型索引，并把包内 skill 交给固定的 `skills@1.7.2`：`skills add <包内 skills 目录的绝对路径> --skill '*'`。要传给安装器的旗标写在 `--` 后面。没有 TTY、又没探测到 agent 时，不带这些旗标会退出 1。非交互且仍让安装器自动探测 agent 时用 `-g -y`：

```bash
edges init -- -g -y
edges skills init -- -g -y
edges init -- -y --agent claude-code
```

`-g` 装到用户目录（Claude Code 是 `$CLAUDE_CONFIG_DIR/skills`，否则 `~/.claude/skills`）。不加 `-g` 时写当前项目的 agent 目录，例如 `.claude/skills`。探测到当前 agent 时，`skills@1.7.2` 只装给那一个；没探测到且本机没有已安装 agent 时，`-y` 会装给它支持的全部 agent。edges 不另选 agent，也不对用户开放 `--skill`。安装器的 stdout / stderr 原样出现在终端里。它非零退出时，init 以同一退出码失败，信封 `errorCode` 为 `SKILLS_INSTALL_FAILED`。

不要再让外部用户执行 `npx skills add VirusPC/edges/extensions/skills`，也不要写不带版本的 `npx skills` 或 `npx skills@latest`。不带版本时，npm 可能把命令名解析到已废弃的 `add-skill` 老包。CLI 把 `skills@1.7.2` 锁在自己的依赖里。

> 改完 skill 目录结构后，用这条复核，别只看退出码（`<安装目录>` 是 `~/.agents/skills` 或 `~/.claude/skills`，看用的哪种装法）：
> ```bash
> diff <(cd <src> && find . -type f | sort) \
>      <(cd <安装目录>/<name> && find . -type f | sort)
> ```

## 项目级（本仓库工作区）

约定：**能读 `.agents/skills` 的 Agent 不再占一份目录；读不到的，只留一条软链，不拷贝。**

- 本目录是 Edges 自有 skill 的真源。每个 skill 在 `.agents/skills/<name>` 是一条指向这里的相对软链，由 `pnpm skills:link` 维护（新增或删除 skill 后重跑）。
- `npx skills` 从别处装进来的 vendor skill 在 `.agents/skills/` 里是实体拷贝，脚本不碰。
- Claude Code 不读 `.agents/skills`，所以 `.claude/skills` → `.agents/skills`
- `.codex/skills`、`.cursor/skills`、`.factory/skills`、`.gemini/skills`、`.opencode/skills`、`.agent/skills` 都不留

本仓库已卸载 OpenSpec。若有工具再把 skill 拷回那些目录，删掉即可，不要改回实体拷贝。

## 分发

统一走 [`vercel-labs/skills`](https://github.com/vercel-labs/skills)。

### 本机（作者）

```bash
pnpm skills:link                   # 项目级：extensions/skills → .agents/skills 相对软链
pnpm skills:install-claude-global  # 全局，只装给 Claude Code：实体拷贝到 ~/.claude/skills
```

`skills:link` 只写仓库内的发现位。`skills:install-claude-global` 跑的是 `npx skills@1.7.2 add ./extensions/skills -g -a claude-code -y`。只选 Claude Code 一家时，安装器不经过中枢，直接把每个 skill 实体拷贝进 `~/.claude/skills/<name>/`。

外部用户不要走这条作者脚本，用上一节的 `edges skills init`。

> ⚠️ **改完必须重跑。** `npx skills` 会把源目录里的软链一并 `dereference` 掉，所以改了本目录下的文件不会自动生效。对本地路径源，`skills update` 会跳过，只能重跑安装命令。

> Project Memory 系列依赖提供 `edges memory` 的 Edges CLI。先构建或安装 CLI，并验证 `edges memory --help`；Skill 的安装不等于安装 CLI。建议一起安装 `project-memory-ask` / `-doctor` / `-init` / `-remember` / `-reshape`，以保留互相引用的工作流与协议资料。执行命令不再定位其他 Skill 的 Python 脚本，模板随 CLI 构建分发。

旧 Project Memory 升级使用 [`project-memory-migrate`](project-memory-migrate/SKILL.md) 调用 `edges memory migrate`；其 `--dry-run` 可预览一次性转换，包括早期平铺的 `<type>_<slug>.md`。还没装这个 skill 时直接跑同一条 CLI。常规运行时不兼容旧 `.memory`。私有归档使用 [`user-memory-backup`](user-memory-backup/SKILL.md) 与 [`user-memory-restore`](user-memory-restore/SKILL.md) 调用同一 CLI 的 backup/restore，仅处理新 `.harness/memory/users`。Git 更新公共布局后，每台机器仍须迁移自己的 ignored 私有残留。

维护这组 skill 时，按 [Project Memory 开发规范](project-memory-init/.harness/memory/projects/project_development/INDEX.md) 的顺序修改和验证。

### 卸载

```bash
npx skills@1.7.2 remove <name> -g
```

它按名字删，会清掉所有 agent 目录下的同名条目，**不区分是谁装的**。

## 命名注意

skill 名会跟各 agent 的内置 skill 处在同一命名空间，同名会遮蔽内置的。取名前先确认不撞车——例如 `deep-research` 是 Claude Code 的内置名，横纵分析法因此叫 `horizontal-vertical-research`（在 `shared-extensions/skills/`，不进 npm 包）。
