---
name: feedback_retro_comments_in_separate_file
description: 审阅或补记周复盘时打开：正文定稿后不再改，用户后续评论与进度写同目录 COMMENTS.md；更正往期也在往期目录加 COMMENTS.md，不动往期正文。
metadata:
  edges-title: 复盘正文定稿后不改，评论写进同目录 COMMENTS.md
  edges-type: feedback
  edges-origin-session-id: sand-subagent-8eb53323-9aaf-6e82-8fb0-34454bd8dd71
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-20T05:18:32+08:00'
---

复盘正文写定、用户审过之后不再回头改。用户后来补的评论、进度和取舍，记在同目录新建的 `COMMENTS.md`，按日期分节。要更正上一期的错误，也在上一期目录加 `COMMENTS.md` 写更正，上一期正文不动。

**Why:**

2026-10-19 审 2026-10-12 周复盘（#307）时，助手按用户的反馈直接改了正文三处（已合的 PR、html-plan、doctor 断链）。用户说「我觉得不应该改，应该找地方额外写我的评论」，并选定「同目录新建 COMMENTS.md」。正文因此改回第一版，用户的意见进了 `retrospectives/weekly/2026-10-12--周复盘/COMMENTS.md`；上上期那句「#208、#211 随 #204 合入」的错误，也是在上期目录加 `COMMENTS.md` 更正的。正文保留当时核对的样子，后来的人才能看出当时的判断和之后的变化。

**How to apply:**

- 周复盘：用户审阅时提出的意见、决定做或不做的事，写进本期 `COMMENTS.md`，不改 `INDEX.md`。
- 发现往期复盘写错：在那一期目录加或追加 `COMMENTS.md`，写明更正内容和依据（PR、提交），不改往期正文。
- PR 还没合时，正文按审阅意见改错字、补遗漏可以；一旦用户说正文定了，后续意见一律进 `COMMENTS.md`。
- 用户当时只就周复盘说过这条；日复盘是否照做，以用户之后的说法为准。
