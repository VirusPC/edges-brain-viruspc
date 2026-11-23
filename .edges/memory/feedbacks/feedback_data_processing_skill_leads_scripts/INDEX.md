---
name: feedback_data_processing_skill_leads_scripts
description: 写或改数据处理类流程时打开：skill 串联步骤并调用脚本；根 SKILL.md 只写顺序和子步骤链接；命令、schema 和输入输出写在各子步骤 md。
metadata:
  edges-title: 数据处理流程以 skill 串联步骤并调用脚本
  edges-type: feedback
  edges-origin-session-id: bc-20a8aaa0-6868-5a7d-aa56-34f43126d913
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-23T04:41:18+00:00'
---

数据处理类流程以 skill 为主体串联步骤、调用脚本。根 SKILL.md 只写步骤顺序和指向各子步骤 md 的链接，不写脚本列表或脚本/schema 对照表。每个子步骤 md 自己写清调用哪个生成脚本（完整命令）、哪个校验脚本、对应 schema、输入从哪读、输出写到哪。脚本只是被 skill 调用的工具，不得做 md 没写的事，也不得反过来主导流程。

**Why:**
peng cheng 于 2026-11-23 把这条定为长期约定（用户所述）。根入口如果再列脚本和 schema 对照，步骤说明和调用细节会分成两处，改一处容易漏另一处。调用、schema 和输入输出放在对应子步骤 md，执行时只读那一步。脚本若做 md 没写的事，或自己决定流程，skill 就不再是步骤的唯一说明。

**How to apply:**
写或改数据处理类流程时，根 SKILL.md 只保留步骤顺序和各子步骤 md 的链接。每个子步骤 md 写完整生成命令、校验脚本、对应 schema、输入来源和输出位置。脚本只实现该 md 已写的调用，不追加未写步骤，也不把流程决策放回脚本。
