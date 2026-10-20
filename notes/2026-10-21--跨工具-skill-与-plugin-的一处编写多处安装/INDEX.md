# 跨工具 skill 与 plugin 的一处编写多处安装

## 背景

2026-10-20 傍晚（Asia/Shanghai），用户在 Grok Bot 里连着问了几件事：vercel 的 skills 包能不能装 GitLab 上的 skill，能不能只装某个目录，同时装给 Claude、Codex、Cursor 时是不是一份主副本加引用，以及 plugin 有没有类似「一处编写，多处安装」的方案，hooks 能不能跨工具通用。之前的 [Skill 分发改用 npx skills](../2026-09-01--skill-分发改用-npx-skills/INDEX.md) 记的是 edges 自己接入 `npx skills` 时实测到的坑，这篇补上跨工具这一层。

## 主题

skill 和 plugin 能不能写一份、装到多家 coding agent 里。

## 过程

1. **GitLab 来源。** [vercel-labs/skills 的命令文档](https://github.com/vercel-labs/skills/blob/main/docs/commands.md)写明支持 GitLab，但 `owner/repo` 简写默认指向 GitHub，GitLab 要写完整地址：`npx skills add https://gitlab.com/org/repo`；自建或私有 GitLab 用 SSH（`git@gitlab.example.com:group/repo.git`）或 HTTPS。私有仓走本机已配好的 git 认证（SSH key、credential helper）。`GITHUB_TOKEN`、`gh` 这类回退认证只对 GitHub 有效，clone 不下来时先直接跑一次 `git clone` 排查。
2. **只装一部分。** 通用做法是按 skill 名挑：先 `--list` 看仓里有哪些 `SKILL.md`，再用 `--skill <name>` 只装一个，可配 `-a cursor`、`-g`。按目录路径装，文档只写了 GitHub（`/tree/main/<dir>`）和 Azure 的写法，GitLab 的 `/-/tree/...` 没写明支持，需要实测。
3. **多家同装。** 默认在 `.agents/skills/` 放一份主副本（`-g` 时是 `~/.agents/skills/`），各家自己的 skills 目录放指向它的软链接，更新一次全部生效。`--copy` 改成每家各复制一份，适合不支持软链接的环境，代价是更新要逐份同步。本身就读 `.agents/skills/` 的工具连软链接都不需要，见它的[支持工具列表](https://github.com/vercel-labs/skills/blob/main/docs/agents.md)。
4. **plugin 跨工具。** 各家 plugin 格式本来就不同：manifest 路径（`.claude-plugin/`、`.cursor-plugin/`、`.codex-plugin/`）不同，hook 事件命名也不统一，所以现有方案都是「写一份源，按每家格式生成一份」，做不到 skill 那样一条软链接搞定。搜到的社区方案：[universal-plugin](https://github.com/cyberuni/universal-plugin)（一份 `plugin.json` 生成多家 manifest，作者自己说跨工具「安装」还没解决）、[agmk](https://agent-marketplace-kit.github.io/)（以 Claude 格式的 `marketplace.json` 为总目录生成 Codex、Cursor 的目录文件）、[vstack](https://github.com/jerryrox/vstack)（Rust 包管理器，翻译后装进多家）、[plugin-kit-ai](https://777genius.github.io/plugin-kit-ai/)（一个 `plugin.yaml` 生成多家产物）、[anyagent](https://github.com/saucam/anyagent)（以 `.claude/` 为准同步到其他家）。
5. **流行度。** 2026-10-20 当时查到：universal-plugin 1 星、npm 周下载约 1100，是其中最活跃的；anyagent 4 星，周下载个位数；vstack 0 星，5 月后没更新；agmk 和 plugin-kit-ai 没查到仓库和 npm 数据。对比之下 vercel skills 约 3.5 万星、npm 周下载约 226 万。这些数字是当时的快照，会变。
6. **hooks 为什么不通用。** Claude、Codex、Cursor 的 plugin 都能带 hooks，但 hooks 是宿主在特定时机执行的脚本，和宿主绑死：事件名大小写不同（`PreToolUse` 和 `preToolUse`），各家支持的事件集合也不同；传进来的工具名、参数结构、环境变量各家自定；表示拦截、放行、改写的返回值约定不同；配置位置和格式也不同。跨工具只能写一份核心逻辑，再给每家包一层输入输出适配。某家没有的事件，有的生成工具会降级成写进指令的文字提醒，就不再是强制执行。

## 结果

- 跨工具真正通用的只有两样：`skills/<name>/SKILL.md` 和 MCP server。
- 能做成 skill 或 MCP 的部分就这么做，用 vercel skills 分发；hooks、subagent 这类各家格式不同的部分再考虑生成工具。
- 跨工具 plugin 方案目前都是个人项目，没有主流，暂不押注任何一个第三方工具。助手提过可以拿 edges 的扩展试 agmk 或 universal-plugin，用户没有回应，没做。

## 所学

- 选 skill 分发工具先看它是否认完整 git 地址；简写默认绑 GitHub 是常见约定。
- 「一处编写，多处安装」能不能成立，取决于各家格式是否已经收敛。skill 收敛了，plugin 和 hooks 还没有。