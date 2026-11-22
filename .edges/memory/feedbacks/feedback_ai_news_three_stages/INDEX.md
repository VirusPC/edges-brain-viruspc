---
name: feedback_ai_news_three_stages
description: >-
  改 AI 资讯周报流程时打开：入口 prepare.md、clean.md、summarize.md 只串联子阶段；产物目录是
  raw、cleaned、summary。
metadata:
  edges-title: AI 资讯是准备、清洗、总结三阶段
  edges-type: feedback
  edges-origin-session-id: bc-ada6e488-c01b-5a22-89db-36c666bb5355
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-22T15:57:06+00:00'
---

AI 资讯周报只有准备、清洗、总结三个阶段。一期数据是 `issues/YYYY-MM-DD/` 下的 `raw/`、`cleaned/`、`summary/`。阶段入口是 `references/prepare/prepare.md`、`references/clean/clean.md`、`references/summarize/summarize.md`，只串联子阶段。routine 只绑定何时跑、写到哪、密钥和交付。

**Why:**
2026-11-22 用户确认三阶段，产物目录定为 raw、cleaned、summary。随后要求入口保持简单，每个流程图内部节点各一个英文文件。选文在总结阶段，而且要先读候选正文。关键词等三路展示内容汇合后再提炼。

**How to apply:**
改阶段连接时改 SKILL.md。入口只写输入输出、顺序和并行，细则写在同目录的子阶段文件。数据目录写 raw、cleaned、summary，不要写成 usable、page，也不要拿来当处理入口文件名。不要把现行脚本和站点写成已经按这三个目录运行。
