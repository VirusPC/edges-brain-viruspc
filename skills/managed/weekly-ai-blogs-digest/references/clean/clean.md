# 数据清洗

只读本期 `raw/`。文章、项目、模型三路可以并行。汇合时每条保留回指 `raw/` 的来源；对得上以后才写入 `issues/YYYY-MM-DD/cleaned/`。不覆盖 `raw/`。

本阶段不做选文，不筛选本期要展示的项目，也不写给读者看的摘要。

- [文章](articles.md)：去重、规范链接、整理可用正文和候选清单
- [项目](projects.md)：按仓库去重并核验事实
- [模型](models.md)：整理模型事实和榜单数字

一篇文章、一个项目、一个模型各一个文件。ID 用 [Skill](../../SKILL.md) 里的依据：文章是规范化链接，项目是仓库地址，模型是官方名。清单 `index.json` 只列这些 ID，不靠文件名顺序当身份。

`cleaned/stage.json` 记下规则 commit，入口路径是 `skills/managed/weekly-ai-blogs-digest/references/clean/clean.md`。缺口写入 `cleaned/gaps.json`。无法核验的事实标成缺口，不编造星标、许可、价格或发布时间。来源引用断裂或文件读不出来的条目，不能标成可用。

`raw/` 里某一路变了，只重做这一路和引用它的 `summary/` 条目。另外两路的可用文件可以留用。规则 commit 变了，重做本阶段里使用这份规则的输出。
