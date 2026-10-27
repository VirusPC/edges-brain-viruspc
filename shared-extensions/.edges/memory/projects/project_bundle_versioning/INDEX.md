---
name: project_bundle_versioning
description: 改本目录的 skill / mcp / plugin / hook 或发版约定时：升 VERSION、写本层 CHANGELOG、打 shared-extensions@x.y.z。不要给单条扩展独立 semver，也不要把明细抄进根 changelog。只改 .memory 不升版本。
metadata:
  edges-title: shared-extensions 整层一份版本，不按条目发版
  edges-type: project
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-08T16:00:03+08:00"
---

`shared-extensions/` 整层一份 semver：`VERSION` + `CHANGELOG.md` + annotated tag `shared-extensions@<version>`。不要给单个 skill / mcp / plugin / hook 另开 version 或 changelog。

**Why:** 这是装到所有机器、所有 Agent 的同一份 harness，必须能回答「这台机器上的是哪一版」。按条自发版会对不上。`extensions/skills` 按 skill 独立发版是因为对外可单装；这里不走那条路径。

**How to apply:** 改了 `skills/`、`mcp/`、`plugins/`、`hooks/` 或影响使用的约定后：升 `VERSION`（补丁 +0.0.1，新能力 / 行为变 +0.1.0，不兼容 +1.0.0），把 `[Unreleased]` 挪到带日期的版本段，同一 commit 打 `shared-extensions@<version>`。只改 `.memory/` 或 `AGENTS.md` 索引不升版本。changelog 手写，不要从 git log 生成。查找用 `git show shared-extensions@1.0.0`。不要把 harness 明细抄进根 changelog；边界变化才写仓库级。
