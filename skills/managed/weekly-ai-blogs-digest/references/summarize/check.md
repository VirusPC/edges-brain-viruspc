# 整页校验

清洗校验通过，三路卡片和关键词映射都写完之后，跑整页校验。通过才算 `summary/` 写完：

```bash
python3 scripts/summarize/check/validate.py issues/<生成日>
```

在本 skill 目录执行。清洗校验没通过时，这条命令直接失败。脚本按 [数据存储](../../SKILL.md#数据存储) 和 `schemas/summary/` 检查 `summary/index.json`、条目来源是否回指 `cleaned/`，以及关键词映射里的 ID 是否都存在。

三路卡片和关键词映射都在之后，写 `summary/index.json`。它只排章节和 ID，不另写一套摘要。三路内容必须还在，关键词不能替换它们。缺了内容 ID 的映射不能用旧稿补上。

章节顺序：

1. 本周关键词，引用 `summary/keywords.json`。没有词就整章标缺口，不在这里重算。
2. 模型进展：先 `summary/models/boards/`，再模型卡片 ID。
3. 项目开源：项目卡片 ID。标题下面不要写概括前五名字的介绍句。
4. 精选文章：按国内模型厂、国外模型厂、国内非模型厂、国外非模型厂分组。空组不写。组内公司顺序用 `site/src/lib/ai-news-category-filter.mjs`。
5. 精选推文。建设中，没有条目，也不为此改 OPML。
6. 精选播客。同样建设中。窗口里确有相关播客时，只在已有卡片或关键词里点名，不写入这一章。

`summary/index.json` 记下 skill 名和 `version`，以及本期数据已经落库的 commit。数据 commit 没有就写 `null`。不填周报稿自己的提交。`summary/stage.json` 的 name 是 `summary`，入口路径是 `skills/managed/weekly-ai-blogs-digest/references/summarize/summarize.md`。缺口和过程说明留在 `summary/gaps.json`，不写进读者能看见的榜单说明。

默认定时只开一个数据 PR，不自动合并。站点渲染不是这一步。
