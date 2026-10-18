---
name: publish_edges_cli_as_package
description: 把 edges CLI 发布到 npm，外部用户一行命令就能装上，README 快速开始不再需要克隆和本地打包。
metadata:
  edges-type: task
  edges-title: edges CLI 发布到 npm
  edges-tasks-status: done
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-18T11:35:32.276Z'
  edges-task-project: edges-extensions
---

**背景：**
2026-10-08 至 10-09 重写根 README、讨论「快速开始」时，实测了外部访客今天能走通的安装路径：克隆本仓 → `pnpm install` → `pnpm --filter edges-cli pack` → `npm install -g` 本地安装包，再对自己的仓库执行 `edges init`。这条路能跑通，但要四步，还要求本机装有 pnpm。用户确认 README 先写这条实测路径，同时要求记一个 todo：把 CLI 发成 npm 包。本卡由 2026-09-14 的同名 backlog 卡更新而来，原卡只记了方向（包名、registry、版本与 CI 待细聊）。
2026-10-18 凌晨（Asia/Shanghai），用户在 Grok Bot 对话里问「edges cli 发 npm 包如何」并说「发个」。助手核实后回复：现在发不了，因为 `extensions/cli/package.json` 仍是 `private: true`，README/CHANGELOG 也写明暂不发 npm；正式发布至少要解除 private、定公开包名、处理 workspace 依赖 `tasks-review-app`（devDependency `workspace:*`）、定版本与发布流程，并准备 npm 发布凭证。用户随后要求开任务卡；助手查到本卡已覆盖同一意图，用户选择只更新本卡背景，不新建卡。
- 现状：`extensions/cli/package.json` 的包名是 `edges-cli`，`private: true`，版本 0.1.0；`prepack` 已执行完整构建。本地打出的安装包装到临时目录后，`edges --help`、`edges init`、`edges memory remember` 均正常（2026-10-09 实测）。
- 公网 npm 上 `edges-cli` 与 `@viruspc/edges` 当时没有被占用，`edges` 已被他人占用（2026-10-09 查询）。
- 2026-10-18 peng cheng 已定：npm 包名 `@viruspc/edges`（不是裸 `edges-cli`），版本 `0.1.0`，命令名仍是 `edges`；`tasks-review-app` 不单独发布，只把编好的 HTML/JS/CSS 放进 CLI 包的 `dist`。实现可以进 PR；`npm publish` 仍要等人明确同意。本卡完成标准先不勾。
- `extensions/skills` 里大约 10 个 skill 运行时要调用 `edges` CLI，只装 skill、没有 CLI 时大多跑不起来。
- 非目标：CLI 与 MCP 的鉴权、project-memory 脚本迁移（原卡已排除）；不再加仓根 `bin/`。
- 关联：根 README 重写（分支 `docs/readme-rewrite`）；兄弟卡「edges 封装为脚手架框架并定义升级路径」。

**目标：**
外部用户在没有克隆本仓的机器上，用一行 npm 命令装上 `edges` CLI，README 快速开始随之改成这一行。

**完成标准：**
- [ ] 在一台没有克隆本仓的机器上，`npm install -g <包名>` 之后 `edges --help` 正常输出
- [ ] 同一环境里，对一个空 Git 仓库执行 `edges init`、`edges memory remember` 都成功
- [ ] 根 README 快速开始的安装步骤换成这一行 npm 命令
