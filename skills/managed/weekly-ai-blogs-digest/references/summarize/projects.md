# 开源项目

从 `cleaned/projects/` 的候选里单独筛选本期要展示的仓库，再写用途和本期变化。文章里提到某个仓库，可以在卡片里关联，不能代替这条项目链路。筛选由这一份说明决定。

## 契约

输入是 `cleaned/projects/`。输出是 `summary/projects/{id}.json`。ID 是仓库地址。Schema 是 `schemas/summary/projects/item.schema.json`。写不上的事实沿用清洗阶段的缺口，不新编星标或许可。

写完立刻校验：

```bash
python3 scripts/summarize/projects/validate.py issues/<生成日>
```

在本 skill 目录执行。整页汇合走 [整页校验](check.md)。

「GitHub Trending（weekly / all 前 5）」若作为一组出现，标题下面不要写概括前五名字的介绍句。名次仍用清洗结果里的 XML 顺序，不按文件名或数组顺序重排。只收每周总榜上的 GitHub 仓库，不要为语言榜单单独建发布方或页面板块。

项目候选变了，重写受影响的项目卡片和映射到这些 ID 的关键词。文章选文的变化不自动改写项目卡。
