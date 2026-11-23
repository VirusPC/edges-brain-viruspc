# 整页校验

清洗校验通过，三路卡片、关键词映射和本周总结都写完之后，跑整页校验。通过才算 `summary/` 写完：

```bash
python3 scripts/summarize/check/validate.py issues/<生成日>
```

在本 skill 目录执行。清洗校验没通过时，这条命令直接失败。脚本按 [数据存储](../../SKILL.md#数据存储) 和 `schemas/summary/` 检查 `summary/index.json`、条目来源是否回指 `cleaned/`、关键词映射里的 ID，以及 `summary/overview.json`。

三路卡片、关键词和本周总结都在之后，写 `summary/index.json`。它只排章节和 ID，不另写一套摘要。三路内容必须还在，关键词和本周总结不能替换它们。缺了内容 ID 的映射不能用旧稿补上。`overview.json` 不能用缺口代替。

章节顺序：

1. 本周概览。词云引用 `summary/keywords.json`，总结引用 `summary/overview.json`。没有词就在 `gaps.json` 标明 `keywords.json`，这一章仍保留，不在这里重算词。没有 `overview.json` 不能通过。
2. 模型进展：先 `summary/models/boards/`，再模型卡片 ID。
3. 项目开源：项目卡片 ID。标题下面不要写概括前五名字的介绍句。
4. 精选文章：按国内模型厂、国外模型厂、国内非模型厂、国外非模型厂分组。空组不写。组内公司顺序用 `site/src/lib/ai-news-category-filter.mjs`。
5. 精选推文。建设中，没有条目，也不为此改 OPML。
6. 精选播客。同样建设中。窗口里确有相关播客时，只在已有卡片或关键词里点名，不写入这一章。

`summary/index.json` 的 `skill` 是 `{name, version}`，`version` 必须等于本 skill frontmatter。`routine` 是调用方给出的仓库、commit 和入口路径。不再写顶层 `version`，也不写 `blocks`。summary 里不能留 `<!-- provenance`。同一份 index 还要有 `articles_coverage` 和 `sources`。`articles_coverage` 的 `raw` 和 `selected` 必须等于 [汇合](merge.md) 里那个统计命令的结果。`selected` 还要等于 summary 文章数。`raw` 不能小于 `cleaned/articles/index.json` 的 id 数，清洗后不能比原文多。`sources` 必须等于汇合脚本按 raw 和 OPML 算出的四类发布方。cleaned 条目上的 `publisher`、`category`、`url` 也必须和这次汇总一致。对不上就不能通过。`summary/stage.json` 的 name 是 `summary`，入口路径是 `skills/managed/weekly-ai-blogs-digest/references/summarize/summarize.md`。缺口和过程说明留在 `summary/gaps.json`，不写进读者能看见的榜单说明。

默认定时只开一个数据 PR，不自动合并。站点渲染不是这一步。
