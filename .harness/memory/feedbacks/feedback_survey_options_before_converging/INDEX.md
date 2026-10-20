---
name: feedback_survey_options_before_converging
description: 用户要行业方案、主流做法或技术选型调研时打开：先并列多种方案并按用户约束逐条评估，不擅自收敛；说「常见」「主流」前要有依据。
metadata:
  edges-title: 调研行业方案先并列多种，不擅自收敛
  edges-type: feedback
  edges-origin-session-id: sand-subagent-8eb53323-9aaf-6e82-8fb0-34454bd8dd71
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-20T05:18:34+08:00'
---

用户要「行业方案」「主流做法」这类调研时，先把多种可行方案并列摆出来，每种写清是什么、适合什么、对用户场景有什么问题，再一条条聊；用户没要求时不要自己收敛成一个结论。说某种做法「常见」「主流」之前，先确认有依据，没查过就说是推测，或者先去查。

**Why:**

2026-10-19 夜里聊「一个仓库要挂多个外部仓库的整仓源码」时，助手几轮内就收敛成「整仓 clone、清单加挂载」，用户说「你别擅自收敛，我要的是你出行业方案多种」。同一段对话里，助手说「手写 SOURCES.md 是常见做法」，被用户追问「你确定是常见的做法？」后才改口「不常见，我说偏了」；后来又被追问「真对假对」「你别糊弄我」。重新调研后才列出 submodule、subtree、清单加批量 clone、ghq、多根工作区、Dev Container、自研挂载七条，逐条聊完，最后用户自己得出「继续用现有 compose」。这次讨论整理在笔记 `notes/2026-10-20--多仓整仓挂载行业方案与-compose/INDEX.md`。

**How to apply:**

- 调研类问题先给编号清单，覆盖主流和小众做法，再问用户想展开哪几条；不要一上来只推荐一个。
- 对每个方案按用户的实际约束评估（例如不能占用主系统的包管理、Cloud Agent 没有 IDE），不要只讲通用优缺点。
- 「常见」「主流」「业界标准」出口前，问自己有没有来源；没有就写「我推测」，或先用搜索或调研子任务核实。
- 用户追问「真的吗」时，拿依据回答，不要只是更坚定地重复结论。
- 和 `feedback_verify_before_asserting` 配合：那条管仓库和工具事实，这条管方案调研和行业判断。
