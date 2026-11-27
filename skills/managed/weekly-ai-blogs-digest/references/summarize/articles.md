# 精选文章

读 `cleaned/articles/` 的候选。ID 沿用清洗阶段的文章 ID。产出 `summary/articles/{id}.json`。选哪些文章由这一份说明决定，不由脚本决定。

## 契约

输入是 `cleaned/articles/`。输出是入选文章的 `summary/articles/{id}.json`。Schema 是 `schemas/summary/articles/item.schema.json`。

写完立刻校验：

```bash
python3 scripts/summarize/articles/validate.py issues/<生成日>
```

在本 skill 目录执行。三路、本周总结和关键词都齐了之后，再跑 [整页校验](check.md)。

## 理解候选

先读候选正文。内部阅读笔记只用于判断，不是给读者的摘要，也不必给全部候选都写正式摘要。不能只靠标题或索引开头。

## 选文

侧重点是 Agent 与产品。研究向、红队、纯学术长文可以不写。融资、IPO、营收、定价套餐、厂商自写客户案例不收，除非其中有具体技术或产品细节。优惠和白嫖不写。判断依据是内容，不是 URL 路径。补录若已在候选里，可以入选，日期仍是原发日，并标明补录。非 GitHub 链接不放进开源项目；仍值得写的留在这里。

## 正式摘要

入选的才写正式摘要。每张都有标题、链接、导语，以及五段：解决什么问题、如何解决、效果怎样、洞察与启发、相关工作。五段都要写，不能因为材料短或没有新洞察就整段省略。没有数字就写定性结果，不编数字。导语是标题下面、完整总结之前的那一句，不能把「如何解决」再写一遍。一句话里用一处 `mark` 标出句中已有的词，不改写成新词。页面上「解决什么问题」显示成「什么问题」。

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

另有 `category` 和 `company`。主类只能是模型、架构、产品、实践、开源、其他。发文公司按 `site/src/lib/ai-news-category-filter.mjs` 归并。

候选或某篇正文变了，重写受影响的卡片。卡片变了就重写本周总结，再重算关键词。项目筛选和模型榜的变化不重写没引用它们的文章。
