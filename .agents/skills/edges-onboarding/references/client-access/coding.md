# coding：Codex、Cursor、Claude Code

首期重点：**Codex**（本机 CLI、桌面 App、Cloud）。**Cursor**、**Claude Code** 作对照示例。未跑通七层前不得写成已支持。

## Codex · 本机（CLI 或桌面 App Local / Worktree）

1. 将大脑仓库放在本机（已有则跳过 clone）。
2. 在大脑仓库根启动 `codex`；或在桌面 App 把该目录加为本地项目并设为 **primary**。【官方 · [Projects and chats](https://learn.chatgpt.com/docs/projects)】
3. 规则：Codex 从项目根走到 cwd，逐层拼接 `AGENTS.md`。【官方 · [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)】
4. 技能：仓库 `.agents/skills` 或用户级 `~/.agents/skills`；用 `$skill-name` 唤起。【官方 / 环境】两边皆可；同名两版本只记录并继续。
5. 按 [contract.md](contract.md) 核验。

## Codex · Cloud

1. 新建云任务，创建并发布 environment，勾选大脑的 GitHub 仓库。【官方】
2. 云任务有独立工作文件；本机个人文件与浏览器登录不会自动带过去。【官方】
3. 结果回到大脑：靠任务产出的 PR 或分支合并。【官方 · 概述】
4. **【待试】** 云任务是否按与本机相同的规则读取 `AGENTS.md` 与 `.agents/skills`。未验证前不得宣称 Cloud 已支持。

## Cursor（对照）

- 读项目根与子目录 `AGENTS.md`。【官方 · cursor.com/docs/rules】
- 将客户端工作区根设为大脑仓库根后，按 contract 核验。未实测前不写「已支持」。

## Claude Code（对照）

- 工作目录及以上没有 `CLAUDE.md` 时才读 `AGENTS.md`；有则可在其中 `@AGENTS.md` 导入。【官方 · code.claude.com/docs/en/memory】
- 项目技能认 `.claude/skills`；可用软链指向 `.agents/skills`。
- 未实测前不写「已支持」。
