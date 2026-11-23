# 汇合三路展示内容

精选文章、开源项目、模型经验与榜单都写完之后，才把它们收成关键词的唯一依据。三路卡片留在 `summary/` 里，汇合不另建目录，也不是第四阶段。

关键词还没写的时候，展示内容已经完整。后面的关键词不能替换或删掉这些卡片。

写 `summary/index.json` 时带上 `articles_coverage`。数字在这一步统计，不手填，也不读站点：

```bash
python3 scripts/summarize/merge/article_coverage.py issues/<生成日>
```

- `raw`：`raw/articles/feeds.json` 里按规范化 URL 去重后的篇数，加上 `raw/articles/backfill.json` 中有、且不在这份 feeds 里的补录。同一规范化 URL 只算一篇，重复拉取不算。没有补录文件就不加。
- `selected`：`summary/articles/` 里的文章数，一篇一个 id。这就是页面上精选文章的总篇数。

规范化 URL 与准备阶段的 `normalize_link` 相同。`cleaned/articles/index.json` 的 id 数不写入这个字段。原文不能少于清洗后。
