---
name: feedback_ai_news_three_stages
description: 改 AI 资讯周报流程时打开：三阶段产物是 raw、cleaned、summary；具体仓库和路径写在 routine，Skill 只声明输入名。
metadata:
  edges-title: AI 资讯是准备、清洗、总结三阶段
  edges-type: feedback
  edges-origin-session-id: bc-ada6e488-c01b-5a22-89db-36c666bb5355
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-22T16:37:28+00:00'
---

AI 资讯周报只有准备、清洗、总结三个阶段。一期数据是数据仓库本地检出下 `issues/<生成日>/` 的 `raw/`、`cleaned/`、`summary/`。阶段入口是 `references/prepare/prepare.md`、`references/clean/clean.md`、`references/summarize/summarize.md`，只串联子阶段。具体仓库、检出路径、生成日和 commit 由 routine 提供。Skill 只声明输入名、含义和缺省处理。

**Why:**
2026-11-22 用户确认三阶段，产物目录定为 raw、cleaned、summary。随后要求入口保持简单，每个流程图内部节点各一个英文文件。选文在总结阶段，而且要先读候选正文。关键词等三路展示内容汇合后再提炼。同日又要求 Skill 不写死数据仓库等具体路径，由 routine 给值。

**How to apply:**
改阶段连接时改 SKILL.md。入口只写输入输出、顺序和并行，细则写在同目录的子阶段文件。数据目录写 raw、cleaned、summary，不要写成 usable、page，也不要拿来当处理入口文件名。不要把现行脚本和站点写成已经按这三个目录运行。Skill 正文和命令用输入名，例如数据仓库的本地检出、生成日。VirusPC/ai-news-data 这类具体值写在 `.edges/routines/weekly-ai-blogs-digest/INDEX.md`，不写进 Skill。
