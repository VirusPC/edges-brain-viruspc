---
name: feedback_ai_news_three_stages
description: 改 AI 资讯周报流程时打开：只有准备、清洗、总结；产物目录是每期 raw、cleaned、summary。旧五步和全量候选词云不再是规则。
metadata:
  edges-title: AI 资讯是准备、清洗、总结三阶段
  edges-type: feedback
  edges-origin-session-id: bc-ada6e488-c01b-5a22-89db-36c666bb5355
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-22T15:41:27+00:00'
---

AI 资讯周报只有准备、清洗、总结三个阶段。一期数据是 `issues/YYYY-MM-DD/` 下的 `raw/`、`cleaned/`、`summary/`。处理阶段的英文目录仍是 `references/prepare/`、`clean/`、`summarize/`。routine 只绑定何时跑、写到哪、密钥和交付。

**Why:**
2026-11-22 用户确认三阶段，并要求记进 Skill。随后把每期三个产物目录定为 raw、cleaned、summary。选文在总结阶段，而且要先读候选正文。关键词等三路展示内容汇合后再提炼，并映射到稳定内容 ID。这套替换了五步编号，也替换了从全量候选提前抽词。同一天未合并的 products/ 四张表没有被批准。

**How to apply:**
改阶段连接时改 SKILL.md。改某一路的做法时改对应阶段目录。数据目录写 raw、cleaned、summary，不要再写成 usable 或 page。不要把现行脚本和站点写成已经按这三个目录运行。旧期不回填。不把 PR 574 或数据仓 PR 19 的目录契约再写回 Skill。
