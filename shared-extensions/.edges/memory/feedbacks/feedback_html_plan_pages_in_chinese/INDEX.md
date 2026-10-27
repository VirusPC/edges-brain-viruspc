---
name: feedback_html_plan_pages_in_chinese
description: 生成给用户看的 html-plan 审阅页或让子代理生成时打开：标题、claim、选项、注释全部中文，prompt 里明说；代码与路径不译
metadata:
  edges-title: html-plan 审阅页整页用中文
  edges-type: feedback
  edges-origin-session-id: sand-subagent-9bba2d17-f501-3bca-5df5-c998d3e51948
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-21T05:19:35+08:00'
---

给 peng cheng 看的 html-plan 审阅页整页用中文：标题、claim、选项、推荐理由、注释都写中文。只把 `<html lang="zh-CN">` 设对不算数。

**Why:** html-plan skill 的说明和打包脚本里的写作检查（ASD-STE100 简化技术英语）都是英文，交给子代理生成页面时，claim、选项和注释很容易写成英文。2026-10-21 00:59（Asia/Shanghai），Compose 改挂 R2 页面的源文件虽然已经是 `lang="zh-CN"`，claim、选项和注释仍是英文。用户问「网页里为啥还是说英语？说中文」，助手只好整页重写再发布。前一天 13:56 也出现过：nginx 切换的选择卡片和随后的说明是英文，用户回「中文」。

**How to apply:**

- 让子代理或云端 Agent 生成审阅页时，在 prompt 里明确写「页面所有文字用中文」，不要指望它从上下文推断。
- 代码、命令、路径、flag、标识符保持原样，不翻译。
- 打包时出现的英文写作规则告警（ASD-STE100）只针对英文正文，中文页面可以忽略。
- 发布前打开页面看一遍，确认没有英文残留，再发链接。聊天里的选择卡片（widget）也用中文。
