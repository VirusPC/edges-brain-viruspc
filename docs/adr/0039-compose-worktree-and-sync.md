---
status: proposed
---

# Compose 写入走 worktree，同步用 compose sync

2026-10-19～20 针对「edges/CLI 写完本地文件后远程看不见」做 grill。结论：不引入挂载种类枚举；继续用现有 compose + Node Tree；每个主仓（含 composed 检出）在 clone/pull 后建立独立 git worktree；写入与「提交」都走 worktree；新增 `edges compose sync` 完成 commit、push、开或更新 PR；远端合入后删除该 worktree 与本地分支。

本 ADR 细化 ADR 0034 Decision #4（本地组合仓库可直接写、按该仓 git 流程提交）与 Decision #10（需 push），规定**默认写路径与同步命令**，不推翻 0034 的 compose 模型。

**Status:** proposed（ADR 0039；grill 2026-10-19～20）

**See also:** ADR 0034（组合 harness 仓库）

## Decision

1. **不设挂载种类枚举**：不在 Compose 契约里引入 `write` / `pin` / `learn` 等 kind。用途与是否可推仍由描述、skill 与操作习惯表达。
2. **CLI 只写盘，不同步**：`notes` / `tasks` / `compose register` 等继续只改本地文件；不在每个写命令末尾自动 commit 或 push。
3. **每主仓一条（可多条并行）worktree**：`compose clone` / `pull` 成功后，为该仓自动创建 worktree。路径固定为 `~/.edges/worktrees/<name>/<branch>`。默认分支名 `agent/<slug>-<短哈希>`（无任务短名时用时间戳类 slug）。同仓已有活跃 worktree 时，再开新分支 worktree，不静默复用脏树。
4. **主检出默认只跟踪远程**：CLI 与 skill 默认只向 worktree 写入；主检出用于 `pull` / 只读跟踪，不作为默认写路径。
5. **同步命令**：新增 `edges compose sync`（可 `--name`）。行为：在对应 worktree 上 commit（若有改动）、push 当前分支、开 PR 或更新已有 PR。现有 `compose push` 保留为底层 git push，不承担 commit/PR。
6. **何时调用 sync**：由 skill 规定——一批改动可交付时，或用户说「提交」时。不在每个写命令后自动 sync。
7. **远端合入后收尾**：删除该 worktree 与对应本地分支；下次改动再新建。不默认把旧树 `pull --ff-only` 留下来继续用。
8. **不自动 merge**：合入 PR 仍须用户明确说 merge（或等价授权）。

## Considered Options

- **挂载种类 write/pin/learn：** 否决（用户明确「不要种类」）。
- **CLI 写完自动 commit/push：** 否决。凭证与保护分支风险高；与 notes create 不 commit 一致。
- **只用 skill 口头约定、无 sync 命令：** 否决。需要可调用的 CLI 入口。
- **扩展 compose push 兼任 commit/PR：** 否决。保留 push 语义清晰；sync 为更高层。
- **submodule / subtree / meta / ghq 换底座：** 否决（同场行业比对）。可借鉴清单思路，运行时仍用 compose。
- **合入后留 worktree 追上 main：** 否决。短命分支，合完就清。
- **同仓复用已有脏 worktree：** 否决。多 Agent 并行时易撞车。

## Consequences

- Domain / Service / CLI 需支持：clone·pull 后建 worktree；解析 `~/.edges/worktrees/...`；`compose sync`；`worktree prune`（或等价）。
- compose skill 与相关 AGENTS 说明须写清：写路径、sync 时机、prune。
- 与 ADR 0034「可直接写组合仓库」兼容：直接写的落点改为 worktree，再经 sync 进入该仓远程流程。
- 实现跟进：任务卡「Compose worktree 写入与 compose sync」（edges-extensions）。
