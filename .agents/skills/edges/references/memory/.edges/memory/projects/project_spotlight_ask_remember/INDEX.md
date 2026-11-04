---
name: project_spotlight_ask_remember
description: 决定 AGENTS.md 要不要点名 skill、或觉得 skill 自己的说明就够时：要点名 ask 和 remember，因为 skill 一多，模型不一定会自己加载它们；不要点名 init/doctor/reshape，也不要在入口里写整套工具怎么用。
metadata:
  edges-title: AGENTS.md 要点名 ask 和 remember
  edges-type: project
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-06T22:06:32+08:00"
---

`AGENTS.md` 里必须点名 ask 和 remember。不要指望模型只靠 skill 列表里那句说明，自己把这两个找出来。不要点名 init / doctor / reshape，也不要在入口里写整套记忆工具怎么用。

**Why:** 每个 skill 只有一句说明，模型靠它判断「这次要不要加载」。本机 skill 一多（几十个很常见），ask / remember 很容易被挤掉：用户说「提交」或问「这条该不该记」时，模型不一定会点它们。`AGENTS.md` 每次对话都会加载，在里面写一句「先用 ask、该记就用 remember」，才能喊到人。init 禁止自己跳出来，doctor / reshape 等人开口——被挤掉是对的。入口只点到名字；怎么查、什么不该写，仍在 skill 正文。那句说明还是要写清「动手前也要查」「被纠正也要记」，否则点名了也加载错。

**How to apply:** 硬约束种子里留那一行即可。改种子、或讨论「要不要在 AGENTS.md 写工具用法」时：不要加回独立 auto 区块，不要画系统图，不要把另外三个 skill 写进去。入口形状见 `project_agents_three_blocks`，区块里还装什么见 `project_important_block`。
