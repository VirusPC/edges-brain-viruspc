---
name: feedback_cli_fail_on_missing_required_files
description: >-
  改 extensions/cli 里读写节点或项目的命令时打开：约定必需的文件缺失时报错并写明路径，不自动生成文件掩盖数据问题；只有显式 create
  才新建。
metadata:
  edges-title: CLI 遇到缺失的必需文件就报错，不自动补
  edges-type: feedback
  edges-origin-session-id: sand-subagent-8eb53323-9aaf-6e82-8fb0-34454bd8dd71
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-20T05:18:31+08:00'
---

CLI 读到不合约定的数据时（例如必需的文件缺失），直接报错，并在报错里写明是哪个目录缺哪个文件。不要为了让命令跑通，自动补一个文件把数据问题盖过去。

**Why:**

2026-10-19 修 `edges tasks project list`（#302）时，第一版让 CLI 在 Task Project 缺 `README.md` 时去读 `AGENTS.md`，第二版改成 `update` 时自动给缺 README 的项目补一份。用户先指出「不应该读 README 么，AGENTS.md 是系统二」，又追问「foo 必须有这个文件呀，怎么会没有 README 呢」。结论是：项目本来就必须有 README，只有 AGENTS.md 说明数据有问题，该由人或迁移去修，不该由 CLI 悄悄兜底。#302 最终删掉了自动补 README 的逻辑：目录在、README 缺时，`get` 和 `update` 返回 `project <id> is missing README.md: <路径>`，不写任何文件；`list` 跳过该目录。当时 main 上唯一的缺口 `tech-reading` 在同一个 PR 里用 CLI 显式补了 README。

**How to apply:**

- 写命令时遇到「约定里必须存在、实际却缺」的输入，默认报 `VALIDATION_ERROR` 并给出相对路径，不写盘。
- 只有用户显式要求创建（如 `project create`）时才生成新文件。
- 兜底逻辑会让坏数据长期潜伏；宁可让命令失败，把缺的文件暴露出来，再用一次显式命令或迁移脚本修数据。
- 只读的列表类命令可以跳过坏条目，但不要因此改写任何文件。
