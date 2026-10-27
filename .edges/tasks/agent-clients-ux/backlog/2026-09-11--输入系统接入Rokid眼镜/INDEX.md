---
name: input_system_rokid_glasses
description: 输入系统接入 Rokid 眼镜
metadata:
  edges-type: task
  edges-title: 输入系统接入 Rokid 眼镜
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-17T14:09:11.507Z"
  edges-task-project: agent-clients-ux
---

输入系统接入 Rokid 眼镜。

**Why:**
眼镜侧可作为新的输入通道（语音、触控、场景感知等），把采集端从键鼠/手机扩展到可穿戴，便于边走边记、边看边投喂 agent。

**How to apply:**
- 细聊时明确：接入的是哪一层「输入系统」（edges 捕获 / agent 入口 / 其它产品）、Rokid 提供哪些 API/事件。
- 调研 Rokid 眼镜 SDK、权限、配对与数据通路；和现有捕获链路（tasks / notes / memory）怎么接。
- 定 MVP：先通一条稳定输入（如语音转写落盘），再扩展多模态。
