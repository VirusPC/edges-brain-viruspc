---
name: feedback_new_files_no_new_concepts
description: >-
  在 extensions/cli 新增文件、目录或改名时打开：不引入抽象新词（如
  classify.ts），文件名要一眼看出职责、符合语义；能并进已有文件就不另起。简单命名不等于降低分层质量。
metadata:
  edges-title: 新增文件不造新概念，名字一眼看懂
  edges-type: feedback
  edges-origin-session-id: sand-subagent-91de785a-85c8-d2ad-e2bf-4dd7c12708f9
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-19T05:17:16+08:00'
---

在 extensions/cli 里新增文件或目录时，不引入复杂概念或抽象新词：文件名要一眼看出职责、符合语义。能并进已有文件（如目录分类并进 `layout`）就不另起一个抽象名的文件；必须新开时，名字直接说它在做什么。

**Why:**

2026-10-18 的 domain 分层重构（#268、#269）里，云端 Agent 新建了 `classify.ts` 放「按路径判断节点类型」的逻辑。用户问「一眼看过去，能看明白这些 classify 啥的东西吗」，并明确要求「新增文件，不要引入复杂概念」，最后选择把分类并回 `layout`（#269）。同一天用户还强调「关键是符合语义」：判断 `layout`、`syntax` 放哪时，以名字是否名副其实为准，常量进 `config/`，逻辑留 `models/`。

**How to apply:**

- 起名前先问：只看文件名，第一次读代码的人能不能猜到里面是什么。猜不到就换名，或并进现有文件。
- 不为一两个函数造新层、新目录或新术语；同类东西放在已有的同名职责里。
- 简单不等于偷懒：用户同一天也说过要「架构最好的方案，不图省事」（如 core 不认识具体节点类型、依赖只能 models 指向 core），以及「代码健壮简洁」（如参数切分只在第一个 `--` 处切开，不另抄一份参数表）。命名要直白，分层仍按最合理的来。
