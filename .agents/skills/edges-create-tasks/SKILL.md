---
name: edges-create-tasks
description: >-
  把对话整理成任务：背景 → 目标必填，动作与完成标准可选。必填不足先提问；成文后交人审（对话确认或 PR），再用 CLI 落库。
  目前只有 conversation 场景，步骤在 references/conversation.md。看板文件进受保护的 main 必须开 PR，不要直推。
version: 0.1.0
---

# edges-create-tasks

目前只有 **conversation** 一个场景：从对话整理任务。正文是背景 → 目标（必填）→ 动作 → 完成标准（后两栏可选）。成文后交人审，再落库。步骤在 [references/conversation.md](references/conversation.md)。

将来如果有新的开卡场景，加在 `references/` 里，并在这里写清分流信号。不要把新场景的步骤写进本文件。
