# 汇合三路展示内容

精选文章、开源项目、模型经验与榜单都写完之后，才把它们收成关键词的唯一依据。三路卡片留在 `summary/` 里，汇合不另建目录，也不是第四阶段。

关键词还没写的时候，展示内容已经完整。后面的关键词不能替换或删掉这些卡片。

写 `summary/index.json` 时带上 `articles_coverage`。数字在这一步从本期 `raw/` 和 `cleaned/` 统计，不手填，也不读站点：

```bash
python3 scripts/summarize/merge/article_coverage.py issues/<生成日>
```

- `raw`：`raw/articles/feeds.json` 里按规范化 URL 去重后的篇数，加上 `raw/articles/backfill.json` 中有、且不在这份 feeds 里的补录。同一规范化 URL 只算一篇，重复拉取不算。没有补录文件就不加。
- `cleaned`：`cleaned/articles/index.json` 的 id 数，一篇一个 id。

规范化 URL 与准备阶段的 `normalize_link` 相同。这是原文和清洗后的篇数，不是精选入选数。精选仍按文章规则另选，不把入选数写进这个字段。
