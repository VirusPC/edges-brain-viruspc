<!-- project-memory-type:start -->
name: managed
module: skills
writable: true
gitignore: false
format: skills
<!-- project-memory-type:end -->

# SKILLS — 可复用技能

> 记：项目内可复用的能力说明、操作流程与使用规范。
> 本文件只是索引，内容放在 `skills/`，其内部结构遵循 Agent Skills 自身协议。

<!-- project-entries-local:start -->
## 本层内容

- [linux-nas-direct-link](linux-nas-direct-link/SKILL.md) — 当要把消费级 NAS（尤其绿联 UGOS）用网线直连到 Linux 主机时使用：共享上网/NAT、专用用户 SMB 挂载、Tailscale（含 tailscale0 缺 IPv4）、SSH 防锁与管理页访问。
- [html-plan](html-plan/SKILL.md) — 把实现计划写成一页可交互 HTML：论断树（why › what › how › where），每条论断配一个证据，决策点放在它改变的那条论断上。用户要计划、RFC 或动到多个文件的设计时使用。
- [horizontal-vertical-research](horizontal-vertical-research/SKILL.md) — 当用户想要对某个产品、公司、技术概念或人物做一份完整的深度研究报告时使用。采用横纵分析法：纵向还原发展史与决策逻辑，横向对比竞品与生态位。
- [learn-repo](learn-repo/SKILL.md) — 当用户想长期学习、精读某个外部代码仓库，并把它关联进 teaching 教学工作区时使用。以 git submodule 挂到对应主题的 `repos/` 下，并在 RESOURCES.md 登记。
- [paper-10-questions](paper-10-questions/SKILL.md) — 当用户想要系统性地阅读、分析、审阅、总结或批判一篇学术论文时使用。应用沈向洋的「论文十问」做结构化分析。
- [summarize-ai-article](summarize-ai-article/SKILL.md) — 当用户想要快速理解一篇 AI 技术文章的核心时使用：问题、解法、效果，加上后续行动建议和与最新进展的关联。要落盘的完整笔记改用 summarize-ai-article-ultra。
- [summarize-ai-article-ultra](summarize-ai-article-ultra/SKILL.md) — 当用户想把一篇文章或页面整理成可归档的中文结构化笔记时使用。按 Facts、Insights、Actions 组织，输出 `YYYY-MM-DD--主题简述.md`。
- [weekly-ai-blogs-digest](weekly-ai-blogs-digest/SKILL.md) — 当用户想要汇总一段时间内（默认过去一周）AI / AI Coding 领域各大博客的新文章时使用：逐站收集、逐篇 200 字内摘要、总结技术风向，并按固定模版输出 markdown。
<!-- project-entries-local:end -->
