---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-18T11:35:12.085Z'
  edges-title: 安装 edges 后自动装好 skills
  edges-tasks-status: backlog
  edges-task-priority: none
name: 安装_edges_后自动装好_skills
description: 只装 npm 包拿不到 edges skills；目标是一次安装加一次初始化，同时装好 CLI 和 skills。
---
**背景：**
2026-10-18 `@viruspc/edges@0.1.0` 首次发布到 npm（PR #264，用 stage 暂存加人工批准的方式上线）。验证安装时讨论到：用户从零开始用 edges，只装一个 CLI 够不够？结论是不够。CLI 只负责搭目录、读写笔记、记忆和任务；真正让 agent 用起来的是 `extensions/skills/` 下的 skill（conversation-to-notes、project-memory-* 等），而 npm 包只打了 `dist`，不包含这些 skill。用户确认：安装过程要把 skills 也装好。
- 现状：CLI 已有 `edges skills` 命令组（list / get / create / update / delete / init），create / update 写到 `skills/managed/<name>/SKILL.md`
- 非目标：ChatGPT、Claude 网页端接入（另有 edges connector 卡）
- 关联：PR #264；卡「edges CLI 发布到 npm」；卡「入库类 skill 增加无工作区降级模式」

**目标：**
新用户执行 `npm install -g @viruspc/edges` 加一次初始化命令后，同时拿到 CLI 和一套可用的 edges skills，本地 agent 能直接按 skill 调用 CLI。

完成标准待 grill-with-docs 补（例如：skills 打进包还是安装时从 GitHub 拉；装到哪些 agent 的目录，Cursor / Codex / Claude Code 各不相同）。
