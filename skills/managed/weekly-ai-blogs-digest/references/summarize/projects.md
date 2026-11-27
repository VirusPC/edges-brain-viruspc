# 开源项目

从 `cleaned/projects/` 的候选里单独筛选本期要展示的仓库，再写用途和本期变化。文章里提到某个仓库，可以在卡片里关联，不能代替这条项目链路。筛选由这一份说明决定。

## 契约

输入是 `cleaned/projects/`。输出是 `summary/projects/{id}.json`。ID 是仓库地址。Schema 是 `schemas/summary/projects/item.schema.json`。写不上的事实沿用清洗阶段的缺口，不新编星标或许可。

写完立刻校验：

```bash
python3 scripts/summarize/projects/validate.py issues/<生成日>
```

在本 skill 目录执行。整页汇合走 [整页校验](check.md)。

「GitHub Trending（weekly / all 前 5）」取本周榜单的前 5 个仓库，顺序就是榜单顺序。上周入选过的不因此跳过。标题下面不要写概括前五名字的介绍句。只收每周总榜上的 GitHub 仓库。

每张卡片和精选文章同一套字段：`title`、`link`、`lede`、`category`、`company`、`sections`，外加 `purpose` 和 `change`。`category` 固定「开源」，`company` 是仓库所有者，从仓库地址的 owner 取。`sections` 五段都要写且非空：解决什么问题、如何解决、效果怎样、洞察与启发、相关工作。不能省略。页面上「解决什么问题」显示成「什么问题」。`lede` 是导语，不能把「如何解决」再写一遍。`lede` 和每一段里用一处 `mark` 标出句中已有的词，也可以放 `<a href="https://...">` 链接；每段最多一处 mark；不写 markdown，不写别的标签。`title`、`category`、`company`、`purpose`、`change` 是纯文本。

`stars` 和 `license` 是卡片字段，不写在正文里。cleaned 里有整数 `stars` 时 `stars` 必须与之一致，没有就省略或写 null，不编造。cleaned 里有 `license` 时必须一致，没有就省略这个字段。

项目候选变了，重写受影响的项目卡片。卡片变了就重写本周总结，再重算关键词。文章选文的变化不自动改写项目卡。
