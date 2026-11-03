---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-03T14:41:24.854Z'
  edges-title: 补充重要邮件提醒 routine
  edges-tasks-status: backlog
  edges-task-priority: none
name: 补充重要邮件提醒_routine
description: 在个人大脑补一条 important-email-reminder，定时扫重要邮件并提醒。
---
**背景：**
在任务记录员对话里，要求个人大脑补一条重要邮件提醒的 routine。当时脑仓 `.edges/routines` 只有日复盘、周复盘和 grokbot-langfuse-export，没有邮件相关项。交付定为：先开本卡，并直接落库 `important-email-reminder`（日程与 Skill 随后补）。
- 现状：三条 routine 已登记；邮件提醒尚未定义。
- 预期：漏看重要邮件能被提醒到。
- 非目标：不在本卡里改 Grok Bot 平台调度本身；不代替人工回信。
- 关联：`.edges/routines/` 现有三条；本卡与 `important-email-reminder` 落库配套。

**目标：**
个人大脑有一条可调度的重要邮件提醒 routine（含日程与可执行 Skill），能按约定检查并提醒重要邮件。

**完成标准：**（日程/Skill 定清后再 grill 可收紧）
- [ ] `.edges/routines/important-email-reminder/` 已有 INDEX（日程）与 Skill，合入 brain main
- [ ] 平台侧已按 INDEX 接上触发（有则验证一次；无则在卡上标明待接）
