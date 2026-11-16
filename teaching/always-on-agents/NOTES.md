# NOTES（给老师自己看的笔记）

## 用户偏好
- 用户：peng cheng，中文母语。
- 目标（已确认）：先把原文吃透，先不盯某个产品。不要把课文映射到 open-grokbot、Grok Bot 或其他产品。
- 写法：平常的中文、完整的句子、不堆术语。遇到技术词，要么换成平常说法，要么当场用一句话解释。
- 保持英文的词：Agent、run、session、event inbox、worker、handler、timer、scheduler、memory、outbox、dispatcher、deferred tool call、auto mode、credential proxy。其余统一用 reference/glossary.html 里的说法。
- 每课约 10 分钟，要在手机上能看（窄屏、图要能缩放）。
- 以 https://claude.com/resources/articles/building-always-on-agents 为唯一主来源；延伸资料只做补充并标明。不编造原文没有的说法；推断处要标明。

## 工作约定
- 组件：assets/style.css、assets/quiz.js 从 pi-durable / cloud-coding-agent 复制。新课先复用。测验选项字数必须一致（按字符，含汉字与空格）。
- 术语表里的词目前是「第 1 课引入」的状态，用户还没用测验证明掌握。按 GLOSSARY 规则，后续根据用户表现修订定义。
- 不要写 learning-records，直到用户展示了理解（测验反馈、追问、复述）。
- 2026-11-16：用户要求把本课工作区放到个人大脑 `teaching/always-on-agents/`。课页与笔记随课入库；仍不要把边学边问默认写进 edges 知识库。
- 入库约定：课页文件名用 ASCII dash-case（页面标题与链接文案仍用中文）。第 1 课文件为 `lessons/0001-sleep-wake-cycle-and-five-primitives.html`，循环速查为 `reference/cycle-cheatsheet.html`。样式与测验用本课 `assets/`（style.css、quiz.js），不改共享的 `teaching/assets/`。
- 原文页 2026-11-16 抓取时正文未标日期；次级报道多写 2026-11-13。课里署名 William Hu，不以日期当原文事实。
- 原文用 credential store +「环境外的 proxy 注入凭证」。工作区按用户用词统称 credential proxy，术语表里同时保留原文的 store / proxy 说法。

## 第 1 课范围（已定）
- Win：60 秒讲清睡醒循环；五个原语一眼看完；一个事件如何走完一圈。
- 必须覆盖成功标准里的：每个原语挡住的失败、deferred tool call 往返、memory 只存查不回来的东西 + 四类记忆。
- 不讲：代码实现、映射到具体产品、dreaming 深挖。

## 课程大纲（7 课，已确认）

每课大约 10 分钟。若学得快，第 5、6 课可以合成一节；哪部分想多花时间，也可以再拆细。

1. 睡醒循环与五个原语（已完成，`lessons/0001-sleep-wake-cycle-and-five-primitives.html`）
   整体循环与五个原语；一个事件如何走完一圈；deferred tool call 的完整往返。
2. Event inbox（已完成，`lessons/0002-event-inbox.html`）
   为什么要有一个持久化的事件队列，为什么同一时间只能有一个 worker，以及怎么批量处理事件。也覆盖快速确认、中途又来事件的三种处理。
3. Timers（已完成，`lessons/0003-timers.html`）
   follow-up 和 schedule 的区别，以及 scheduler 是怎么把一个计时器变成一个事件的。
4. Memory（已完成，`lessons/0004-memory.html`）
   只存查不回来的东西；四类记忆；context 开销与 compaction（session 过长时 compact 或新开）。
5. Permissions（已完成，`lessons/0005-permissions.html`）
   credential proxy、auto mode，以及 deferred tool call 的完整来回。
6. Outbox（已完成，`lessons/0006-outbox.html`）
   一次 run 的三种结束方式；什么时候真的需要 outbox；该发多少消息、为什么开始时要克制。
7. 总复习（已完成，`lessons/0007-cumulative-review.html`）
   不看原文，把整个循环画出来讲一遍，并且穿插前面几节的内容做混合练习。

dreaming 若要学，另开一课并改用 agent memory 原文，不并进这 7 课。

## 学习记录
- 还没有 learning-records：等用户报测验分或追问后再写第一条。
- 2026-11-16：用户询问共几节后，确认 7 课大纲，并要求将工作区放入个人大脑 `teaching/always-on-agents/`。
- 2026-11-16：用户要求把第 2–7 课依次做完并补进同一 PR。已写完 7 课，新增 `assets/self-check.js`（对照答案组件）和 `reference/scenario-cards.html`。仍不写 learning-records。
- 原文未单独规定「到期的 follow-up 是否必须续上旧 session」：只明确把用户答复这类接着先前工作的事件写成续上已有 session，其余通常新开。课里在第 7 课和第 3 课都不做额外推断。
