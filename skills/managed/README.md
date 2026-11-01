# skills/managed

不绑定 Edges 的通用 skill。跨机靠 Compose 挂本脑仓即可用，不再做全局 `~/.agents` 安装，也不再打 `shared-extensions@*`。

本仓维护向 skill 仍在 [`.edges/skills/managed/`](../../.edges/skills/managed/README.md)（现有 `linux-nas-direct-link`）。`.edges/skills` 是本仓 materials，不放这批通用 skill。

## 索引

- [html-plan](html-plan/SKILL.md) — 把实现计划写成一页可交互 HTML：论断树（why › what › how › where），每条论断配一个证据，决策点放在它改变的那条论断上。用户要计划、RFC 或动到多个文件的设计时使用。
- [horizontal-vertical-research](horizontal-vertical-research/SKILL.md) — 当用户想要对某个产品、公司、技术概念或人物做一份完整的深度研究报告时使用。采用横纵分析法：纵向还原发展史与决策逻辑，横向对比竞品与生态位。
- [learn-repo](learn-repo/SKILL.md) — 当用户想长期学习、精读某个外部代码仓库，并把它关联进 teaching 教学工作区时使用。以 git submodule 挂到对应主题的 `repos/` 下，并在 RESOURCES.md 登记。
- [paper-10-questions](paper-10-questions/SKILL.md) — 当用户想要系统性地阅读、分析、审阅、总结或批判一篇学术论文时使用。应用沈向洋的「论文十问」做结构化分析。
- [summarize-ai-article](summarize-ai-article/SKILL.md) — 当用户想要快速理解一篇 AI 技术文章的核心时使用：问题、解法、效果，加上后续行动建议和与最新进展的关联。要落盘的完整笔记改用 summarize-ai-article-ultra。
- [summarize-ai-article-ultra](summarize-ai-article-ultra/SKILL.md) — 当用户想把一篇文章或页面整理成可归档的中文结构化笔记时使用。按 Facts、Insights、Actions 组织，输出 `YYYY-MM-DD--主题简述.md`。
- [weekly-ai-blogs-digest](weekly-ai-blogs-digest/SKILL.md) — 当用户想要汇总一段时间内（默认过去一周）AI / AI Coding 领域各大博客的新文章时使用。订阅真源是可导入阅读器的 OPML，脚本先拉 RSS/Atom，再做 200 字内摘要并按固定模版输出 markdown。
- [llm-arena-marked-chart](llm-arena-marked-chart/SKILL.md) — 当需要把 LLM Arena（或同类）排行榜画成带红圈/NEW 标注的 SVG 与 PNG 时使用。输入 Arena JSON 或显式模型名，输出矢量源和导出图。
