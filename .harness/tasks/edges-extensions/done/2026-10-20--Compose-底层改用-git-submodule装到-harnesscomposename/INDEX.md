---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-21T01:18:16.571Z'
  edges-title: Compose 底层改用 git submodule，装到 `.harness/compose/<name>`
  edges-tasks-status: done
  edges-task-priority: none
name: Compose 底层改用 git submodule，装到 `.harness/compose/<name>`
description: >-
  现在 compose 把本机绝对路径写进 AGENTS.md，换机器就不能用；改为底层用 git submodule 装到仓内
  `.harness/compose/<name>`，AGENTS.md 只写相对路径，默认只展开一层。
---

**背景：**
现在 compose 把本机绝对路径写进 AGENTS.md：相对的 `--path` 会被转成绝对路径；默认的 `~/.edges/composed/<name>` 又强制固定位置。换一台机器，这些登记就不能用。clone / pull / push 也都是 compose 自己实现的。另外，两个仓库互相登记时，担心出现套娃（无限展开）和依赖方向不清的问题。
- 相关现状：本仓 AGENTS.md 的 compose 块登记了 `edges`，链接指向 `~/.edges/composed/edges`。
- 关联：VirusPC/edges PR #13（compose 失败跳过 + warning）。

**目标：**
保留 `edges compose` 命令，底层改用 git submodule。被组合的仓库装到仓内 `.harness/compose/<name>`（目录名与命令名一致）；AGENTS.md 只写相对路径；默认只展开一层。

**动作：**
- register：`git submodule add <remote> .harness/compose/<name>`，并在 AGENTS.md 登记一行。
- clone：`git submodule update --init`（不带 `--recursive`）。
- pull：`git submodule update --remote`。
- push：进入子模块推送。
- 保留 PR #13 的失败跳过 + warning。
- 子模块未初始化（目录为空）时给出提示。
- 读取与 `--with-composed` 只看当前仓库这一层，不进子模块继续展开。
- 可选：浅克隆 / `--filter=blob:none`。
- 可选：`edges compose worktree`，开 worktree 时一并初始化子模块（注意子模块默认是 detached HEAD）。
- 可选（以后）：`--recursive`，按 remote 记录已访问的仓库，遇到就跳过，防止循环。
- 同步修改两个仓库（VirusPC/edges 与 VirusPC/edges-brain-viruspc）的 AGENTS.md compose 块、edges-compose skill 和文档。
- 兼容读取旧的 `~/.edges/composed` 条目。

**完成标准：**
- [ ] 新机器 clone 主仓库后，跑一次 compose 初始化，就能直接使用 AGENTS.md。
- [ ] AGENTS.md 中没有任何绝对路径。
- [ ] 有测试证明不会递归（包括两个仓库互相登记的情况）。
- [ ] 测试全部通过。

## 进展

- **已上线：** VirusPC/edges#14 已 squash 合入 main（2026-10-20 23:46 UTC+8，merge commit `b1e3ab42`）。Compose 底层改用 git submodule，被组合的仓库装在仓内 `.harness/compose/<name>`；日常命令只有 `add` / `list` / `update`。决定见框架仓 ADR 0042。
- **后续：** VirusPC/edges#19（`72980dd`）去掉了虚拟 ComposeNode，入口改成真实的 `.harness/compose/README.md`；遍历默认展开 Compose，可用根级 `--exclude` 排除；新增一次性迁移命令 `edges compose doctor`；edges-compose skill 升到 0.2.0。
- **实测：** 私有工作空间根仓已用 submodule 挂上公开和私有两个大脑，并升级到 0.2.0 的 edges-compose skill。
- **遗留（已完成）：**
  - 框架仓里的个人仓名已清掉（VirusPC/edges#22，`e16b736`）。
  - 重复编号的 ADR 已理顺：Compose worktree 那份保留 0039，pi 沙箱那份改为 0044（VirusPC/edges#23，`cffe757`）。
- **遗留（待定）：**
  - 框架仓和公开个人仓之间仍是旧式互相登记，还没有改成 submodule。
  - ADR 0039 的 worktree 部分需要重新评估。
