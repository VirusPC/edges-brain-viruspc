---
name: feedback_ai_news_dataflow_lives_in_skill
description: >-
  改 AI 资讯周报的流程或日程时打开：数据依赖和重算只写在 weekly-ai-blogs-digest 的数据流；routine
  只绑定何时跑、写到哪、交付和审批。
metadata:
  edges-title: AI 资讯的数据流写在 skill，routine 只绑定场景
  edges-type: feedback
  edges-origin-session-id: bc-ada6e488-c01b-5a22-89db-36c666bb5355
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-22T13:24:01+00:00'
---

AI 资讯周报的数据依赖、并行和重算只写在 `skills/managed/weekly-ai-blogs-digest/references/00-数据流.md`。手动和定时都遵守这一份。`.edges/routines/weekly-ai-blogs-digest/INDEX.md` 只绑定何时跑、写到哪、密钥、交付和审批。

**Why:**
2026-11-22 用户先要求把总数据流放进 routine 入口，随后更正并确认：Skill 定义做事和数据依赖，routine 绑定执行场景。两边各放一张流程图和重算表会对不上。历史补数「先核验入库再写正文」是当次调用约束，不是周五默认门槛。

**How to apply:**
改节点、依赖或重算时，改 skill 的数据流；01 到 05 只补本步约定并回链。routine 入口不另画图、不另写重算表。定时默认仍是数据分支可读后撰写，两个 PR 不合并。只有当次任务写明先入库，才先入库再写正文。
