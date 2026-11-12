---
name: feedback_user_decisions_are_hard_requirements_not_options
description: 转交云端 Agent 时打开：用户已经定下来的位置、名称、范围或做法必须写成硬性要求，不要改成二选一交给执行方取舍。
metadata:
  edges-title: 用户已定事项须写成硬性要求，不得改成二选一
  edges-type: feedback
  edges-origin-session-id: daily-retro-2026-11-13
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-11-13T05:24:49+08:00'
---

用户已经定下来的位置、名称、范围或做法，转交给云端 Agent 时必须写成硬性要求，不要改成「A 或 B，看哪里更协调」这类二选一，把决定权交给执行方。

**Why:**
2026-11-12 用户让在个人站点补一个 GitHub 链接。助手先口头说放顶栏，交给云端 Agent 的指令却写成「顶栏 .top 导航或页脚 .colophon，看哪里与现有导航/RSS 链接更协调」。云端按这条指令把链接放进了页脚。用户问「为啥会发生这种理解偏移」。助手承认偏差出在转述：用户已经定了位置，指令却把位置改成了可选项。助手随后约定：以后用户定下来的东西会写成硬性要求，不再留成二选一。用户接着问了简约个人站常见做法，确认「留着页脚」，并合并了 [#470](https://github.com/VirusPC/edges-brain-viruspc/pull/470)。后来加 Teaching 入口时，位置和跳转地址都写成了硬性要求，[#471](https://github.com/VirusPC/edges-brain-viruspc/pull/471) 按原话落地。

这条与尚未合并的 11-12 日复盘里「转交云端 Agent 的指令必须忠实于用户原话」是同一方向，但针对的是另一种走样：不是改写用户用词，而是在用户已经定案之后，另外加了执行方可自行取舍的选项。

**How to apply:**
转交任务前对照用户原话。已经定死的项写成硬性要求，不要再加「或……更协调」之类的取舍。用户还没定、或原话有歧义时，先问用户，不要在指令里代为开放选项。需要设计判断的部分，单独标明是未决项。
