# Agent Developer Guide

你是维护 peng cheng 个人大脑仓 `VirusPC/edges-brain-viruspc` 的 AI 工程师。个人内容在这里长：笔记、教学、复盘、个人任务、个人项目、博客成稿。本仓也是 `edges-publish` 写入这些个人内容的目标。

**本仓是个人主干（2026-10-20 由原 `VirusPC/edges` 改名而来，长期保留，不归档）。** Edges 框架在 [`VirusPC/edges`](https://github.com/VirusPC/edges)：CLI `@viruspc/edges`、extensions、skills、ADR、任务看板站点构建、artifacts 预览服务，以及相关 workflow。改框架去那边开 PR。博客成稿 `posts/`、博客与站点内容的维护项目 `.edges/tasks/site-and-content/`，以及新服务器运维笔记（`new-server/`）与相关 notes 只在本仓，框架仓不再保留。不绑定 Edges 的通用 skill 在根 [`skills/managed/`](skills/managed/README.md)。`.edges/skills` 仍是本仓 materials，维护向 skill（如 `linux-nas-direct-link`）留在 [`.edges/skills/managed/`](.edges/skills/managed/README.md)。跨机靠 Compose 挂本脑仓即可用这些材料，不再做全局 `~/.agents` 安装，也不再打 `shared-extensions@*`。要用 CLI，执行 `npm install -g @viruspc/edges`，或在框架仓里开发。本仓不把框架仓登记进 Compose。公开仓库之间不互相挂载。Compose 挂载在私有工作空间根 `VirusPC/edges-workspace-viruspc`（`.edges/compose/` 下的 git submodule；日常命令是 `edges compose add`、`list`、`update`）。本仓不写这些登记。

ECS 上 `/teaching/` 由本仓部署，检出是 `/home/cheng-dev/projects/edges`。`/tasks/` 和 artifacts 预览由框架仓部署，检出是 `/home/cheng-dev/projects/edges-framework`。

内容标准看所属目录的 README（如 [edges/](edges/README.md)、[archive/](archive/README.md)）。术语与架构决策在框架仓 [`CONTEXT.md`](https://github.com/VirusPC/edges/blob/main/CONTEXT.md) 与 [`docs/adr/`](https://github.com/VirusPC/edges/tree/main/docs/adr)。AGENTS.md 组织入口发现，各规范正文按职责保持单一真源。

<!-- edges:start -->

<!-- edges-constraints:start -->
## 本层硬约束

- 本目录有项目记忆。提问或动手前用 `$edges-memory-ask`；该沉淀用 `$edges-memory-remember`。本轮查过不重复。
- 本层硬约束直接写在这个区块里，不要通过记忆正文链接代替本区块的硬约束。
- 重复批量操作先写可重复执行的脚本，再用脚本执行；迁移与批量修改须可预览、检查冲突并安全重复运行，不逐文件手工重复操作。
- 本仓公开（`github.com/VirusPC/edges-brain-viruspc`）。凭据、个人信息、未公开 IP、办公文档不入库；内部信息脱敏后再写；截图按「能不能上公开博客」判断。细则见 README 的「隐私与脱敏」。
- Git：`type: subject`；AI 参与加 `Co-authored-by`；不提交 `.obsidian/workspace.json`；`pull` / `rebase` 加 `--autostash`。
- 本机修改本仓（commit/push 或改工作树文件）必须通过独立 `git worktree`：每个 Agent/任务一个 worktree + 独立分支；禁止多 Agent 共用同一工作树并行改文件或切分支；同一分支不得挂两个 worktree。Cursor 云端 Agent 等已在独立 clone/环境中的任务视为已隔离，不要求再套本机 worktree；只读查询可不建 worktree。
- `posts/` 存放对外博客（将公开发表的成稿），由人仔细维护。AI 不得自动创建、编辑、移动、删除、重构或重写该路径下的任何文件。
<!-- edges-constraints:end -->

<!-- edges-local:start -->
## 本层系统维护信息
下面这些是索引，不是正文。按条目说明挑要读的，再打开对应内容。

- [本层 harness 材料索引](<.edges/README.md>) — 本层 harness 材料的组织清单。各材料只在这里登记。
- [目录与内容说明](<README.md>) — 目录与内容说明入口。
- [框架仓术语](https://github.com/VirusPC/edges/blob/main/CONTEXT.md) — Edges 领域术语在框架仓。
- [框架仓架构决策](https://github.com/VirusPC/edges/tree/main/docs/adr) — ADR 在框架仓。
- [.edges/tasks/README.md](<.edges/tasks/README.md>)
<!-- edges-local:end -->

<!-- edges-descendants:start -->
## 下层系统维护信息
- [teaching/AGENTS.md](teaching/AGENTS.md) — 教学与学习状态。
- [领域任务](<tasks/AGENTS.md>) — 领域任务入口。
- [笔记规范](<notes/AGENTS.md>) — 笔记规范入口。

<!-- edges-descendants:end -->

<!-- edges:end -->
