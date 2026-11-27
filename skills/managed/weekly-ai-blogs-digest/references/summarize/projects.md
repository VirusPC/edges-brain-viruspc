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

每张卡片和精选文章同一套：标题、导语，然后五段都要写：解决什么问题、如何解决、效果怎样、洞察与启发、相关工作。不能省略。页面上「解决什么问题」显示成「什么问题」。导语是标题下面、完整总结之前的那一句，不能把「如何解决」再写一遍。一句话里用一处 `mark` 标出句中已有的词。

完整总结必须写成带 `article-more` class 的 HTML 折叠块，并使用 `<summary>完整总结</summary>`；五段各自放在 `<p><strong>标签：</strong>……</p>` 中：

```html
<details class="article-more">
<summary>完整总结</summary>
<p><strong>解决什么问题：</strong>……</p>
<p><strong>如何解决：</strong>……</p>
<p><strong>效果怎样：</strong>……</p>
<p><strong>洞察与启发：</strong>……</p>
<p><strong>相关工作：</strong>……</p>
</details>
```

星标和许可证写在标题行，紧跟链接，先星标后许可证。清洗结果里没有的那一项不写，也不编造。

项目候选变了，重写受影响的项目卡片。卡片变了就重写本周总结，再重算关键词。文章选文的变化不自动改写项目卡。
