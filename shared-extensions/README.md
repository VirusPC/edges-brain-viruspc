# 跨机器共享扩展 (shared-extensions/)

`shared-extensions/` 是**个人 agent harness 的真源**：同一套扩展，装到所有本地和云端机器、被所有 Agent 共用。

它不是 Edges 的对外接口。接入或操作 Edges 知识库的能力在 [`extensions/`](https://github.com/VirusPC/edges/blob/main/extensions/README.md)。

## 收录标准

判据是**「离开 Edges，换一台机器、换一个 Agent，我还要带着它干活吗」**。

| 放这里 | 不放这里 |
| --- | --- |
| 通用 skill、MCP **配置**、plugins、hooks | 为接入 Edges 而存在的 CLI / MCP server / skill → [`extensions/`](https://github.com/VirusPC/edges/blob/main/extensions/README.md) |
| 换机器仍要用的 harness 片段 | 只在某一台机器、某一个 Agent 上的实验 |
| 愿意随公开仓库发布的配置 | 凭据、token、cookie、未脱敏的内部信息 → 绝对不入库 |

和 `extensions/` 互斥：一件东西只放一处。`extensions/` 回答「Agent 怎么接入 Edges」；这里回答「我的 Agent 在任意机器上怎么工作」。

换 Agent、换机器带得走是进本目录的必要条件，不是把东西放进 `extensions/` 的理由。

## 目录结构

按**扩展类型**分，不按 Agent 分。某个类型的格式在各家之间对不上时，再在该类型下加 Agent 子目录（如 `hooks/claude/`），不要一上来按 `claude/`、`codex/` 切整棵树。

- **`skills/`**: 不绑定 Edges 的通用 skill。每目录一份 `SKILL.md`，`name` 与目录名一致；**不**各自发版，跟本层走同一份 `VERSION`。
- **`mcp/`**: MCP **配置**（连哪些 server、怎么启动）。实现一个 Edges 用的 MCP server 仍走 `extensions/mcp-servers/`。
- **`plugins/`**: Agent 插件。
- **`hooks/`**: Agent 生命周期钩子。

需要新类型（如 `commands/`）时再加目录，并在本 README 登记。各家 `commands` 的目录名和格式不同，不要整目录软链。

## 版本与发版

本目录是**一个**发版单元，和 `extensions/skills`（按 skill 独立 semver）不同。所有机器装的是同一份 harness，版本必须能对上。

- 版本号：[`VERSION`](VERSION)（semver）
- 变更说明：[`CHANGELOG.md`](CHANGELOG.md)（Keep a Changelog，手写 `[Unreleased]`）
- tag：`shared-extensions@<version>`（annotated，和打 tag 的 commit 相同）
- 不要给单个 skill / mcp / plugin / hook 另开 `version` 或 `CHANGELOG.md`
- 不要从 git log / Conventional Commits 生成 changelog 正文

改了 `skills/`、`mcp/`、`plugins/`、`hooks/`，或改了影响使用的约定（收录标准、分发、发版）之后：

1. 按 semver 升 `VERSION`（补丁 +0.0.1，新能力 / 行为变 +0.1.0，不兼容 +1.0.0）
2. 把 `[Unreleased]` 下的条目挪到 `## [x.y.z] - YYYY-MM-DD`，分类用 Added / Changed / Deprecated / Removed / Fixed / Security
3. 更新 changelog 底部的 compare 链接
4. 对**同一个 commit** 打 annotated tag：`shared-extensions@<version>`，message 用该版本 changelog 正文
5. `git push origin main --follow-tags`

只改 `.harness/memory/` 或 `AGENTS.md` 索引，不升版本——记忆是本层维护笔记，不随 harness 装到各机器。

查找：

```bash
git show shared-extensions@1.0.0
git log --oneline shared-extensions@1.0.0..HEAD -- shared-extensions
git tag -l 'shared-extensions@*'
```

只改本目录的 harness 内容不必升仓库 `vX.Y.Z`，也不要把条目明细抄进根 changelog。新建或删除这个发版单元、改变它和 `extensions/` 的边界，才算仓库级。

## 记忆

本目录是一层项目记忆。提问或改这里的约定前用 `$project-memory-ask`，沉淀用 `$project-memory-remember`，入口 [`AGENTS.md`](AGENTS.md)。

`.harness/memory/` 只给在本仓库里维护 harness 的人/Agent 读，不是装到各机器的那份扩展。局部方案和决策写本层记忆，不因跨层复用而写入根层知识目录。

## 分发

本目录是源，不是各家 Agent 的发现位。发现位仍是各 Agent 自己的约定路径（全局中枢是 `~/.agents/skills`；Claude Code 不读中枢，只留软链）。

原则与仓库其余 skill 分发相同：能读 `.agents/skills` 的不占目录；读不到的只留软链，禁止实体拷贝。MCP / plugins / hooks 的文件名和格式各家不同，**不要**套用「整目录软链」。

每台机器克隆本仓库后，把这里的内容安装到该机器的全局 Agent 目录。安装脚本尚未落地；有第一份真实内容时再加 `pnpm` 入口，在此之前不要手拷到 `~/.claude/`、`~/.codex/` 等处以免漂移。

本仓库工作区里的 `.agents/skills` 只链 [`extensions/skills`](https://github.com/VirusPC/edges/blob/main/extensions/skills/README.md)（项目级、服务本仓）。`shared-extensions/skills` 的主路径是**本机全局**，不默认链进项目发现位。两个 skill 目录的 `name` 禁止撞车。

## 隐私

本仓公开。写进这里的 MCP 配置、hook 脚本、plugin 代码都等于公开发表。

- 凭据只引用环境变量（`${GITHUB_TOKEN}` 这类占位），禁止写入实际 token / key / cookie。
- 内部域名、未公开 IP、他人信息按根 README「隐私与脱敏」处理。
- 拿不准能不能公开的，不放这里。
