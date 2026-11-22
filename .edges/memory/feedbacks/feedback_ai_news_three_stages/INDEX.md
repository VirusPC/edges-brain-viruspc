---
name: feedback_ai_news_three_stages
description: >-
  改 AI 资讯周报流程时打开：阶段入口是 prepare.md、clean.md、summarize.md；产物目录是每期
  raw、cleaned、summary。
metadata:
  edges-title: AI 资讯是准备、清洗、总结三阶段
  edges-type: feedback
  edges-origin-session-id: bc-ada6e488-c01b-5a22-89db-36c666bb5355
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-22T15:43:29+00:00'
---

AI 资讯周报只有准备、清洗、总结三个阶段。一期数据是 `issues/YYYY-MM-DD/` 下的 `raw/`、`cleaned/`、`summary/`。处理阶段入口是 `references/prepare/prepare.md`、`references/clean/clean.md`、`references/summarize/summarize.md`。routine 只绑定何时跑、写到哪、密钥和交付。

**Why:**
2026-11-22 用户确认三阶段，并要求记进 Skill。产物目录定为 raw、cleaned、summary。阶段入口不用 README，也不用数据目录名。选文在总结阶段，而且要先读候选正文。关键词等三路展示内容汇合后再提炼，并映射到稳定内容 ID。

**How to apply:**
改阶段连接时改 SKILL.md。改某一阶段的总约定时改对应的 prepare.md、clean.md 或 summarize.md。数据目录写 raw、cleaned、summary。不要把现行脚本和站点写成已经按这三个目录运行。旧期不回填。
