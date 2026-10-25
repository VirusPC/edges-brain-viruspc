---
name: project_grok_bot_box_tailscale_silent_loss
description: Grok Bot 云电脑曾多次出现 Tailscale 装过又丢；再断时先对 IT 台账确认该装，再重装验收，hostname 用 grok-bot。
metadata:
  edges-title: Grok Bot box 上 Tailscale 重建后可能静默丢失，按台账重装
  edges-type: project
  edges-origin-session-id: sand-subagent-92a59a87-01e9-2d5a-d25a-193a102f8566
  edges-agent-client: cursor
  edges-updated-at: '2026-10-25T05:10:57+08:00'
---

## What
Grok Bot 云电脑（box）上的 Tailscale 可能在环境重建或静默故障后消失。台账与笔记里已有「该装且以前装过」的记录；再断时不要猜，先交 IT 对台账，用户确认修好后再重装并验收。

## Why
2026-10-25 窗口内再次发生：Grok Bot 发现断连 → IT 查笔记（含 2026-09-05 互通笔记与后续静默丢失记录）→ 用户确认 → 重装并拉起（无 systemd 时手动起 daemon）→ 验收后 hostname=`grok-bot`。这是可复现的运维模式，不是一次性事故。

## How to apply
- 断连：先问 IT「台账是否该装 / 以前是否装过」，不要直接当「从未配置」。
- 重装后验收：节点上线、hostname 为 `grok-bot`、SSH/互达符合既有笔记；鉴权链接只给人点，不入库。
- 公开仓只记模式与 hostname；不写未公开 IP、鉴权 URL、凭据。
