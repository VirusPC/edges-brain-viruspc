---
name: synced_desktop_pet_message_board
description: 开发可在两台电脑间同步动作行为的桌面宠物，并配备留言板等功能
metadata:
  edges-type: task
  edges-title: 跨设备同步桌面宠物与留言板
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-09-17T14:09:11.447Z'
---

开发一个桌面宠物：可在两台电脑之间同步动作与行为，并配备留言板等功能。

**Why:**
单机桌面宠物只服务一台机器；跨设备同步能让宠物成为两台电脑之间的在场感与轻量沟通入口，留言板补上异步留言能力。

**How to apply:**
- 细聊时先定：同步范围（姿态/动画/位置/状态机）、同步通道（自建服务 / 现有账号体系）、冲突与离线策略。
- 留言板作为并列能力：留言落库、对端展示、与宠物行为是否联动。
- 落地前用 grill-with-docs + deep-research 拆清技术选型，再交 Cloud Agent 开发。
