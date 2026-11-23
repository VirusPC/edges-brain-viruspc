---
name: Routines
description: 例行任务定义；执行与调度由外部平台负责。
---
# Routines

<!-- edges-entries-local:start -->
## 本层内容

- [daily\-conversation\-deposit](<daily-conversation-deposit/INDEX.md>) — 每日 05:00 运行日复盘，调用每日沉淀扫描 Skill，候选与当日复盘经 PR 写入对应子仓。
- [weekly\-retrospective](<weekly-retrospective/INDEX.md>) — 每周一 08:08 运行周复盘，调用周复盘 Skill，经 PR 写入公开脑 retrospectives/weekly。
- [grokbot\-langfuse\-export](<grokbot-langfuse-export/INDEX.md>) — 每小时调用现有导出 Skill，把全部 Grok Bot 助手会话按真实时间写入 Langfuse。
- [weekly\-ai\-blogs\-digest](<weekly-ai-blogs-digest/INDEX.md>) — 每周五 09:00 运行 AI 资讯周报，调用 weekly\-ai\-blogs\-digest，周报与数据快照各开 PR、不合并。
- [grokbot\-box\-disk\-check](<grokbot-box-disk-check/INDEX.md>) — 每天约 10:00（Asia/Shanghai，±15 分钟，含周末）检查 Grok Bot 电脑磁盘剩余；低于 30% 时在该聊天提醒并列出占用最大的目录，不自动删除；空间够则不发消息。
<!-- edges-entries-local:end -->
