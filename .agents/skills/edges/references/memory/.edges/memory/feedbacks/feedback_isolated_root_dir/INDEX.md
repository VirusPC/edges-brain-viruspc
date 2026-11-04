---
name: feedback_isolated_root_dir
description: 目标目录就是 --root-dir 时，不要把仓库里其他位置的 .memory 当成这棵树的祖先。
metadata:
  edges-title: "--root-dir 封住记忆树，不把外面的 .memory 当祖先"
  edges-type: feedback
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-06T13:41:45+08:00"
---

`--root-dir` 等于 `--target-dir` 时，这棵记忆树封在目标自己，外面即使有 `.memory/` 也不是祖先。

**Why:** `find_index_anchor` 原先对 `target == root` 仍往上扫 parent。本仓库根已有一份旧 `.memory/`，skill 目录自举时 `indexAnchor` 会指到 git 根，并因根 `AGENTS.md` 是 foreign 返回 `needs-doctor`。`--root-dir` 的语义是记忆树的封顶。

**How to apply:** 目标就是记忆根时直接返回 root；不要把声明根之外的 `.memory/` 当成带记忆祖先。
