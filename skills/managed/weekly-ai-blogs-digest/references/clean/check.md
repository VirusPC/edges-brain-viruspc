# 清洗汇合校验

准备校验通过之后，进入总结之前，再跑清洗校验。通过才算本阶段完成：

```bash
python3 scripts/clean/check/validate.py <数据仓库.本地检出>/issues/<生成日>
```

在本 skill 目录执行。准备校验没通过时，这条命令直接失败，不进入清洗。脚本按 [数据存储](../../SKILL.md#数据存储) 和 `schemas/cleaned/` 检查文件、`index.json` 和条目是否一一对应，以及来源是否回指 `raw/`。

三路都要有回指 `raw/` 的来源，才写入 `cleaned/`。一篇文章、一个项目、一个模型各一个文件。ID 用 Skill 里的依据。各目录的 `index.json` 只列这些 ID，不把文件名顺序当成身份。

无法核验的事实写入 `cleaned/gaps.json`，不编造星标、许可、价格或发布时间。来源引用断裂或文件读不出来的条目，不能标成可用。清洗结果里不做选文，不筛选本期要展示的项目，也不写给读者的摘要。

`cleaned/stage.json` 的 name 是 `cleaned`。规则 commit 用写出这份目录时的 40 位提交，入口路径是 `skills/managed/weekly-ai-blogs-digest/references/clean/clean.md`。

`raw/` 里某一路变了，只重做这一路和引用它的 `summary/` 条目。另外两路已经清洗的文件可以留用。规则 commit 变了，重做本阶段里使用这份规则的输出。
