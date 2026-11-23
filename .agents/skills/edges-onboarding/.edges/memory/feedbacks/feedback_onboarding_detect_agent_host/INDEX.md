---
name: feedback_onboarding_detect_agent_host
description: 设计 onboarding 提问时：Agent 宿主从当前会话和环境识别，不列为必答项；只在无法判断且影响入口配置时询问。
metadata:
  edges-title: 接入时从环境识别 Agent 宿主
  edges-type: feedback
  edges-origin-session-id: bc-2f53ec8a-a076-5cff-b804-c01179d4f837
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-07T15:03:00+00:00'
---

用户确认，onboarding 不应要求用户重复确认当前使用的 Agent 宿主。

**Why:** 当前会话与环境通常已经提供宿主信息，把它列为开场必答项会增加重复沟通。

**How to apply:** 从环境识别并沿用用户已指定的宿主。只有无法判断且影响入口配置时才询问。CLI 参数设计也不应强制用户提供可探测的宿主信息。
