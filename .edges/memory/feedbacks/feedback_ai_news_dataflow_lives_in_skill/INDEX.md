---
name: feedback_ai_news_dataflow_lives_in_skill
description: 改 AI 资讯周报的流程或日程时打开：Skill 只留一张数据流，节点细节在 references；routine 只绑定何时跑、写到哪、交付和审批。
metadata:
  edges-title: AI 资讯只留 Skill 一张数据流
  edges-type: feedback
  edges-origin-session-id: bc-ada6e488-c01b-5a22-89db-36c666bb5355
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-22T13:46:03+00:00'
---

AI 资讯周报只有 Skill 里的一张数据流。节点的输入、处理和产物写在 `skills/managed/weekly-ai-blogs-digest/references/`。`.edges/routines/weekly-ai-blogs-digest/INDEX.md` 只绑定何时跑、写到哪、密钥、交付和审批。

**Why:**
2026-11-22 用户先要求把总图放进 routine，随后改到单独的数据流文件，当天再次确认：Skill 只留主干，每个节点的具体内容放在 references。旧的五步编号不能和这张图并存。选文、总结、榜图说明和页面表写入数据仓 `issues/YYYY-MM-DD/products/`，已有原文、榜单和关键词留在期次目录根上。

**How to apply:**
改节点连接时改 `SKILL.md` 的图。改某一节点的输入、输出或重算时改对应 reference。routine 不另画图。现有期次还没有 `products/`，不要把这份契约说成历史数据已经按新表回填。
