---
status: accepted
---

# edges init / skills init 顺带把 skills 装给 agent

只装 `@viruspc/edges` CLI，本地 agent 用不上它；要让 agent 用起来，还得装 `extensions/skills/` 下的 skill。本 ADR 决定 skill 如何随 CLI 分发和安装。

**Amends ADR 0031**：无参 `edges init` 的默认集加入 skills；`edges skills init` 除建 skill 类型索引外，还安装包内 skill。0031 其余决定不变。

**Status:** accepted，已实现（2026-10-18；合入 main 随本变更的 PR。实现前的「待做」记录见任务卡进展）

**See also:** ADR 0031、ADR 0004；[Agent Skills 规范](https://agentskills.io/specification)

## Decision

1. **skill 打进 npm 包**：`extensions/cli/package.json` 的 `files` 加入 skills 目录，与 CLI 同版本发布，安装时不从 GitHub 拉。与 edges CLI 无关的 6 个 skill 移到 `shared-extensions/skills/`，不进包。
2. **安装是 vercel skills 的薄封装**：`edges skills init` 的安装步骤运行固定版本的 `skills@1.7.2`：`skills add <包内 skills 目录的绝对路径> --skill '*'`。edges 只补这两样：skill 源地址、选中全部 skill。agent、`-g`、`-y`、有无 TTY、同名覆盖等其余行为一律按 vercel skills 的默认，用户给的旗标原样透传。edges 不加任何额外逻辑；这一块有问题都以 vercel skills 的行为为准。
3. **装在 init 里**：不新开 `edges skills install`。`edges skills init` 既建 skill 类型索引（同 ADR 0031），也安装；重跑即刷新。根 `edges init` 默认集加 skills。
4. **失败即失败**：vercel skills 非零退出时，`edges skills init` / `edges init` 也非零退出。不提供 `--no-skills`。
5. **不开放 `--skill`**：CLI 总是写死 `--skill '*'`。
6. **旗标用 `--` 转交**：`--` 之后的 token 原样传给 vercel skills；`edges init -- …` 只转交给 skills 安装步骤。
7. **Node 版本**：`engines.node` 提到 `>=22.20.0`，与 `skills@1.7.2` 一致。

## Considered Options

- 安装时从 GitHub 拉 skill：否决，CLI 与 skill 会错版。
- GitHub `gh skill`：未选，要求较新的 gh；npx 随 Node 必有。
- vercel skills 用 `@latest`：否决，上游行为会变。
- edges 自己决定无 TTY 默认、强制 `--agent`、比较版本：否决，与第 2 条薄封装冲突。

## Consequences

- `@viruspc/edges` 的 `files` 包含构建时拷入的 `skills/`。与 edges CLI 无关的 6 个 skill 在 `shared-extensions/skills/`，不进包。
- 安装步骤调用依赖里的 `skills@1.7.2`：`node <该包 bin> add <包内 skills 目录绝对路径> --skill '*'`，再加上 `--` 之后的 token。stdio 继承，edges 不改写安装器输出，因此它的输出与 edges 的 JSON 信封会出现在同一次进程的 stdout / stderr 上。
- 会写用户级 agent 目录（如 `~/.agents/skills`、`~/.claude/skills`）。测试用假 spawn，不写开发机的这些目录。
- 无 TTY 又需要交互时，vercel skills 不装、退出码 1，init 以同一退出码失败。
- 升级固定的 vercel skills 版本时，复核其旗标语义与 node 要求，并改 `VERCEL_SKILLS_VERSION` 与 `dependencies.skills`。
