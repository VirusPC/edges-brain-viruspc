# skills/

不绑定 Edges 的通用 skill，跨机器、跨 Agent 共用。

一个 skill 一个子目录，必须有 `SKILL.md`，frontmatter 的 `name` 与目录名一致。`description` 写清何时触发、何时不该触发。

**不要**给单个 skill 写 `version` 或 `CHANGELOG.md`。本目录跟 mcp / plugins / hooks 一起，走 shared-extensions **整层**的 [`VERSION`](../VERSION) 和 [`CHANGELOG.md`](../CHANGELOG.md)。这点和 [`extensions/skills/`](https://github.com/VirusPC/edges/blob/main/extensions/skills/README.md) 相反。

## 和 `extensions/skills` 的分工

| | `extensions/skills` | `shared-extensions/skills` |
| --- | --- | --- |
| 用途 | 接入或操作 Edges，打进 `@viruspc/edges` | 作者自己的通用 harness，不进这个 npm 包 |
| 对外 | `edges skills init -- -g -y`（或无参 `edges init -- -g -y`） | 不走这条对外路径 |
| 本机 | 项目级：`pnpm skills:link` → `.agents/skills` | 全局：`~/.agents/skills`（安装脚本待落地） |

一件 skill 只放一处。`name` 在两个目录之间也不得重复。

为 Edges 知识库服务的 skill（如 `conversation-to-notes`、`project-memory-*`）留在 `extensions/skills`，不要搬过来。
