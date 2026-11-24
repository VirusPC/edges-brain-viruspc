# 数据总结

输入是本期 `cleaned/`。输出是 `issues/YYYY-MM-DD/summary/`。完整目录见 [数据存储](../../SKILL.md#数据存储)。

三路等层级、并行，互不代替：

- [精选文章](articles.md)
- [开源项目](projects.md)
- [模型经验与榜单](models.md)

然后按这个顺序：

1. [汇合三路展示内容](merge.md)
2. [本周总结](overview.md)
3. [关键词](keywords.md)
4. [整页校验](check.md)

先定主线，并为每条选一枚代表性 tag。再从三路卡片抽词，把这些 tag 加回 `keywords.json` 并提高权重。词云只读合并后的这份关键词。
