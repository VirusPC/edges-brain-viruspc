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

同时写入 `sources` 和 cleaned 条目上的发布方。不改 raw，也不改卡片正文：

```bash
python3 scripts/summarize/merge/write_index.py issues/<生成日> \
  --routine-repo <owner/name> \
  --routine-commit <40位sha> \
  --routine-path .edges/routines/weekly-ai-blogs-digest/INDEX.md
```

`sources.categories` 固定四类，顺序是模型榜单、GitHub Trending、博客、国内互联网。每类有 `count`，以及 `publishers`：`{name, url, count}`。`name` 是 OPML 的 `publisher`（团队名，如字节跳动、大淘宝），备源并进这个名字，不写 feed 标题，也不写 RSS 地址。`url` 是读者打开的网站：feed 用 `publisherUrl`，没有就用主源的 `htmlUrl`。GitHub Trending 每一份列表的 `htmlUrl` 仍是该列表页面，汇总后的发布方网址用每周总榜。模型榜单的网址在 meta `boards`。

已订阅的发布方全部列出，本周没有条目时 `count` 是 0。模型榜单没有可数的条目时，发布方的 `count` 和这一类的 `count` 写 `null`，不写 0。条数来自 raw：订阅和补录按规范化链接去重；榜单有 `items` 或 `data` 数组时用它的长度。补录算进它的发布方，不单列一类。`sources` 里不放 OPML 地址。以后页面上的下载按钮只链到脑仓这份文件：`https://github.com/VirusPC/edges-brain-viruspc/blob/main/skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.opml`。站点怎么展示 `sources` 还没定，先不渲染。
