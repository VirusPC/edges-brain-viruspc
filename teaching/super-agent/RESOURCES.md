# Super-agent 设计探索 Resources

## Knowledge

### 一手资料（优先）
- [专栏 / 动态：Super-agent 设计探索：迈向更自主的 Agent 系统（DeepSeek Harness 团队）](https://www.bilibili.com/opus/1265361021143351318)
  本课的唯一主来源，中文原文。同步发布在 [B 站专栏 cv53698541](https://www.bilibili.com/read/cv53698541)。作者行写明：Yujia Qiao 完成系统实现和本文写作，DeepSeek Harness 团队共同实践；文末列出审阅讨论的同事。B 站专栏页显示编辑于 2026-10-31 21:34（北京时间）。开篇声明：这是面向工程实践的架构思路探讨，并非对 DeepSeek Harness 现有产品功能的介绍。Use for: 每一课一切「原文怎么说」的问题；复述、测验解释、术语定义都以这篇中文为准。

- [X 长文：Exploring Super-agent Design: Towards a More Autonomous Agent System](https://x.com/DeepSeekHarness/status/2116857257245987236)
  同一篇文章由 [@DeepSeekHarness](https://x.com/DeepSeekHarness) 于 2026-11-01 发布的英文版。页面标明原文为中文，英文是机器翻译。Use for: 对照英文术语（如 Super-agent、Router、Worker、Trigger、Watchdog、Chain of Recall）；与中文冲突时以中文原文为准，不拿译文当新的主张。

### 原文指向的实现（只用来核对原文提到了什么，不当作教学大纲）
- [仓库：deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)
  原文结语写道：部分设计已在这个仓库里实现；它只是为了验证技术路线而提供的原型，并非 DeepSeek 的正式产品。实现与文章并不等同。Use for: 想核对原文「部分设计已实现」这句话指向哪里时打开；本课不按仓库结构来讲，也不把仓库里的取舍读回原文。

### 可以简单引用
- [Article: Building always-on agents（William Hu，Claude / Anthropic）](https://claude.com/resources/articles/building-always-on-agents)
  个人大脑里已有一门 [always-on-agents](../always-on-agents/) 课。本课不是对比课；只在真正能帮助理解本篇原文时，用一两句话点一下，例如两边都不把「一直在」写成一个永不停止的单循环。Use for: 可选的一句澄清，不代替本篇原文，不按并列对照组织课文。

- [Research: Scaling Managed Agents: Decoupling the brain from the hands（Anthropic，2026-04-08）](https://www.anthropic.com/research/managed-agents)
  原文第 5.2 节写：把 Agent Loop 放在云端、执行环境留在原地，并通过端侧 daemon 按需接入，与 Anthropic 提出的「脑手分离」一致；接着写明场景不同——那篇文章主要讨论托管服务、按需沙箱和客户 VPC，这里首先要接入的是可能间歇在线、带有未提交修改和本地凭据的个人机器。Use for: 第 6 课讲解原文自己写下的对照与区别；不要用那篇文章改写本篇的两步解耦，也不要展开成对比课。

## Wisdom (Communities)
- [@DeepSeekHarness](https://x.com/DeepSeekHarness)
  文章作者团队的公开账号，适合追踪后续讨论与补充，但它首先是发布渠道，不是高信号的问答社区。Use for: 看团队有没有对这篇文章的后续说明；不要把账号下的转述当成原文。
- 目前没有找到专门讨论这篇架构文章的、有稳定主持的高质量社区。用户尚未表达是否愿意加入社区；先不主动推。

## Gaps
- 没有官方的独立 HTML 博客页：中文在 B 站专栏 / 动态，英文在 X 长文，阅读器和引用都要带着这一限制。
- 公共 RSSHub 的 B 站路由不稳定。团队账号的自建订阅源在 [ai-x-feeds 的 DeepSeekHarness.xml](https://raw.githubusercontent.com/VirusPC/ai-x-feeds/main/feeds/DeepSeekHarness.xml)，用于追踪后续帖子，不能代替去读原文。
- 原文第 7 节的实验基于合成负载与简化环境，作者写明只作初步参考；课里如实写出方法和数字，不把它们升级成普遍结论。
- 原文第 8 节列出的扩展、协作、A2A、安全与隐私问题没有给出完成态的答案。课里保持开放，不编造方案。
