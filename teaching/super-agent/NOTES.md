# NOTES（给老师自己看的笔记）

## 用户偏好
- 用户：peng cheng，中文母语。
- 目标（已确认，2026-11-16）：新开一门课，先把原文吃透，先不盯某个产品。不要把课文映射到 DeepSeek Harness 的产品功能、Grok Bot、open-grokbot 或其他产品。
- 可以简单引用 Anthropic 的《Building always-on agents》，以及原文第 5.2 节点名的「脑手分离」。这不是一门对比课，不要按并列对照来组织课文。
- 写法：平常的中文、完整的句子、不堆术语。遇到技术词，要么换成平常说法，要么当场用一句话解释。
- 保持英文或原文写法的词：Super-agent、Session、ReAct Loop、Router、Worker、Trigger、Thread、Watchdog、Inline、Spill、BYOM、A2A。其余统一用 reference/glossary.html 里的说法。
- 每课约 10 分钟，要在手机上能看（窄屏、图要能缩放）。
- 以中文原文为唯一主来源：https://www.bilibili.com/opus/1265361021143351318 （专栏 cv53698541）。英文是官方机器翻译。不编造原文没有的说法；推断处要标明。第 8 节的开放问题保持开放。
- 工作区放在个人大脑 `teaching/super-agent/`。目录和文件名用 ASCII。公网地址在合并并部署后是 https://edges.viruspc.tech/teaching/super-agent/（不要写成 teach.viruspc.tech）。
- 用户先要求只交付脚手架与第 1 课；同日改为一次性按顺序写完全部课程，仍只要一个 PR，先不合并。

## 工作约定
- 组件：assets/style.css、quiz.js、self-check.js 从 always-on-agents 复制，只改样式表开头的课程名，保持相关课程外观统一。测验选项字数必须一致（按字符，含汉字、字母与空格；quiz.js 会去掉首尾空白再数）。
- 术语表里的词目前是「第 N 课引入」的状态，用户还没用测验证明掌握。按 GLOSSARY 规则，后续根据用户表现修订定义。
- 不要写 learning-records，直到用户展示了理解（测验反馈、追问、复述）。
- 入库约定：课页文件名用 ASCII dash-case（页面标题与链接文案仍用中文）。样式与测验用本课 `assets/`，不改共享的 `teaching/assets/`。
- 原文开篇声明必须在目录和第 1 课里写清：这是架构思路探讨，不是产品功能介绍。文中 IM 与 GitHub 连续推进、无人 @ 就提交修复 Pull Request、后台已提交修复 PR 等例子，都归属原文所说的内部实例，不要讲成产品功能。
- 开源原型 dsh-superagent-prototype 只用来核对原文指向，不当作教学大纲；原文已写明它不是正式产品，实现与文章并不等同。
- 「3 到 5 个活跃 Session」是原文的观察，不是定律。
- 第 5 节标题是「Watch Dog」，正文多用 Watchdog Session；本课统一用 Watchdog，术语表里注明章节标题写法。
- 第 4.1 节写「这一异步任务机制已经在 DeepSeek Harness 中实现，但尚未默认开启」：课里如实转述，不展开成产品配置说明。

## 课程大纲（9 课，本 PR 全部写完）

每课大约 10 分钟。按原文结构拆分，每课只教一个切口。

1. 四个特征与五个模块（已完成，`lessons/0001-four-traits-and-five-modules.html`）
   只讲第 1 节。人的注意力天花板、Super-agent 的定义、四个特征的原文含义、单个 ReAct Loop 撑不住、五个模块先记名字和职责指向。
2. 双层架构：Router 与 Worker（已完成，`lessons/0002-two-layer-router-and-worker.html`）
   第 2 节。连续性与吞吐量的权衡；Router 层与 Worker 层的职责划分；Session 应是实现细节。
3. 事件过滤与路由（已完成，`lessons/0003-event-filtering-and-routing.html`）
   第 3.1–3.2 节。Trigger、两级过滤、Thread、订阅与直通。
4. 上下文组织与提前行动（已完成，`lessons/0004-context-and-speculative-execution.html`）
   第 3.3–3.4 节。Inline & Spill、链式召回、投机执行。
5. 面向人的交互（已完成，`lessons/0005-human-facing-interaction.html`）
   第 4 节。异步 ReAct Loop / 全双工；多信道输出怎样匹配带宽与习惯。
6. 计算、状态与环境的分离（已完成，`lessons/0006-compute-state-and-environment.html`）
   第 5 节。两步解耦；原文自己写下的与「脑手分离」的对照及场景区别。
7. Watchdog（已完成，`lessons/0007-watchdog.html`）
   第 6 节。外部 Control Loop；既看基础设施，也看任务进展。
8. 初步实验与开放问题（已完成，`lessons/0008-experiments-and-open-questions.html`）
   第 7–8 节。如实写实验设置、数字与限度；开放问题保持开放。
9. 总复习（已完成，`lessons/0009-cumulative-review.html`）
   不看原文，把整套架构讲一遍，并做交错练习。

## 学习记录
- 还没有 learning-records：等用户报测验分或追问后再写第一条。
- 2026-11-16：用户确认新课、吃透原文、可简单引用 always-on；工作区放在个人大脑 teaching/super-agent/。后改为一次写完全部课程，开一个 PR，先不合并。
