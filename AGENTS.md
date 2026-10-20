# Agent Developer Guide

你是维护 Edges 系统的 AI 工程师：维护仓库基础设施、开发 extensions 与 shared-extensions、辅助知识库结构。

**本仓是 peng cheng 的个人主干 `VirusPC/edges-brain-viruspc`（2026-10-20 由原 `VirusPC/edges` 改名而来，长期保留，不归档）。** 个人知识（`edges/`、`notes/`、`teaching/`、`retrospectives/`、`tasks/`、`projects/`、`memory/`、`archive/`、`shared-extensions/` 等）在这里长；个人新项目也直接在本仓里长。Edges 框架本身已拆到新仓 [`VirusPC/edges`](https://github.com/VirusPC/edges)，经下面的 Compose 区块登记为参考项目：改 CLI、extensions、skills、ADR、架构文档等系统内容，去框架仓开 PR，不要在本仓改。本仓里仍留着的 `extensions/`、`scripts/`、`docs/`、`posts/`、`.harness/` 系统部分等是拆仓前的副本，暂时保留是为了让 teaching 与 tasks 站点部署（`.github/workflows/deploy.yml`）继续从本仓跑；等框架仓接手 tasks 站点后再删。拆仓前最后一个提交是 `025904fa29bcc6970f45c654d95e30c5390d43d7`。

Edges 是什么、怎么用看 [README.md](README.md)；内容标准看所属目录的 README（如 [edges/](edges/README.md)、[archive/](archive/README.md)），术语看 [CONTEXT.md](CONTEXT.md)；AGENTS.md 组织入口发现，各规范正文按职责保持单一真源。

<!-- project-harness:start -->

<!-- project-harness-constraints:start -->
## 本层硬约束

- 本目录有项目记忆。提问或动手前用 `$project-memory-ask`；该沉淀用 `$project-memory-remember`。本轮查过不重复。
- 本层硬约束直接写在这个区块里，不要通过记忆正文链接代替本区块的硬约束。
- 重复批量操作先写可重复执行的脚本，再用脚本执行；迁移与批量修改须可预览、检查冲突并安全重复运行，不逐文件手工重复操作。
- 本仓公开（`github.com/VirusPC/edges-brain-viruspc`）。凭据、个人信息、未公开 IP、办公文档不入库；内部信息脱敏后再写；截图按「能不能上公开博客」判断。细则见 README 的「隐私与脱敏」。
- Git：`type: subject`；AI 参与加 `Co-authored-by`；不提交 `.obsidian/workspace.json`；`pull` / `rebase` 加 `--autostash`。
- 本机修改本仓（commit/push 或改工作树文件）必须通过独立 `git worktree`：每个 Agent/任务一个 worktree + 独立分支；禁止多 Agent 共用同一工作树并行改文件或切分支；同一分支不得挂两个 worktree。Cursor 云端 Agent 等已在独立 clone/环境中的任务视为已隔离，不要求再套本机 worktree；只读查询可不建 worktree。
- `posts/` 存放对外博客（将公开发表的成稿），由人仔细维护。AI 不得自动创建、编辑、移动、删除、重构或重写该路径下的任何文件。
<!-- project-harness-constraints:end -->

<!-- project-harness-local:start -->
## 本层系统维护信息
下面这些是索引，不是正文。按条目说明挑要读的，再打开对应内容。

- [本层 harness 材料索引](<.harness/README.md>) — 本层 harness 材料的组织清单。各材料只在这里登记。
- [目录与内容说明](<README.md>) — 目录与内容说明入口。
- [领域术语](<CONTEXT.md>) — 领域术语入口。
- [架构决策](<docs/adr/>) — 架构决策入口。
<!-- project-harness-local:end -->

<!-- project-harness-descendants:start -->
## 下层系统维护信息
- [teaching/AGENTS.md](teaching/AGENTS.md) — 教学与学习状态。
- [领域任务](<tasks/AGENTS.md>) — 领域任务入口。
- [对外能力实现约束](<extensions/AGENTS.md>) — 对外能力实现约束入口。
- [共享扩展约束](<shared-extensions/AGENTS.md>) — 共享扩展约束入口。
- [笔记规范](<notes/AGENTS.md>) — 笔记规范入口。

<!-- project-harness-descendants:end -->


<!-- project-harness-compose:start -->
## 组合

- [edges](<~/.edges/composed/edges>) — Edges 框架仓（参考项目）：CLI、extensions、skills、协议、ADR 与架构文档。查 Edges 系统怎么用、怎么实现时读它；要改 Edges 系统本身时去该仓开 PR。个人知识、教学、复盘与个人任务不要写进去，写本仓。 remote: https://github.com/VirusPC/edges.git
<!-- project-harness-compose:end -->
<!-- project-harness:end -->
