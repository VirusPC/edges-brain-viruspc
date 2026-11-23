---
name: feedback_ai_news_three_stages
description: >-
  改 AI 资讯周报流程时打开：产物是 raw、cleaned、summary；规则版本是 Skill 的 semver；数据仓库只写 URL，站点不是
  Skill 输入。
metadata:
  edges-title: AI 资讯是准备、清洗、总结三阶段
  edges-type: feedback
  edges-origin-session-id: bc-ada6e488-c01b-5a22-89db-36c666bb5355
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-23T04:41:18+00:00'
---

AI 资讯周报只有准备、清洗、总结三个阶段。产出到数据仓库的 `issues/<生成日>/summary/` 为止。阶段入口是 `references/prepare/prepare.md`、`references/clean/clean.md`、`references/summarize/summarize.md`。规则版本是 Skill frontmatter 的 semver，加上 skill 名，不记规则仓库或 commit。数据仓库这项输入只有 URL，以及可选的基准 commit（缺省为默认分支最新）。站点渲染不是 Skill 输入。

**Why:**
2026-11-22 用户确认三阶段，产物目录定为 raw、cleaned、summary。随后要求 Skill 不写死具体仓库。同日又改为用 Skill 版本号标识规则，因为别的提交会让 commit 变而 Skill 未变。数据仓库输入收成 URL 和可选基准 commit。站点仓库从输入里删除，因为博客读 summary/ 是站点的事。

**How to apply:**
改阶段连接时改 SKILL.md。根入口只写步骤顺序（含哪些阶段可并行）和指向各子步骤 md 的链接；生成命令、校验脚本、schema、输入输出写在对应子步骤 md。这条结构约定见 `data_processing_skill_leads_scripts`。数据目录写 raw、cleaned、summary。正文写到 summary/ 为止，不写站点渲染步骤，也不再写「脚本仍写根目录」「站点还在读 markdown」这类过渡句。升版本按 Edges `packages/skills/README.md`：补丁 +0.0.1，行为或契约变 +0.1.0，不兼容 +1.0.0，并写同目录 CHANGELOG。具体数据仓库 URL 写在 `.edges/routines/weekly-ai-blogs-digest/INDEX.md`。
