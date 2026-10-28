---
name: project_grill_memory_ask_then_html_plan
description: 细化 Edges/脑仓任务卡时打开：先 memory ask，再 grill，达成共识后出中文 html-plan 并 publish，用户确认后再改代码
metadata:
  edges-title: grill 前先 memory ask，动手前先 html-plan
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-28
  edges-agent-client: grok-bot
  edges-updated-at: '2026-10-28T09:24:31+08:00'
---

对 Edges / 脑仓任务卡做细化时，顺序是：先 `edges memory ask`（或等价检索已有记忆）→ grill 达成共识 → 中文 html-plan 并 `edges artifacts publish` → 用户确认后再改代码。不要跳过前两步直接动手或直接开实现 PR。

**Why:** 2026-10-27 用户连续纠正全栈：「你为什么老是不用 html-plan呀」「为什么没跑 edges memory ask，先看历史情况再 grill」。框架仓根 AGENTS 已有 html-plan 硬约束（[#66](https://github.com/VirusPC/edges/pull/66)）；公开脑根 AGENTS 已有 memory ask 硬约束。本条把二者收成同一条工作流，避免只遵守其中一半。

**How to apply:**
- grill 开始前先 memory ask（本轮查过不重复）；把命中的相关记忆带进 grill 上下文。
- grill 达成共识后、写实现前，必须出中文 html-plan 并发布 artifacts 预览链接，等用户确认。
- 小修复 / 用户明确说「不用 grill」时可跳过 grill+plan，但仍应先 ask 是否已有相关记忆。
