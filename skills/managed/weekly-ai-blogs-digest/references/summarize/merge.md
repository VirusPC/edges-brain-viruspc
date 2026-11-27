# 汇合三路展示内容

精选文章、开源项目、模型经验与榜单都写完之后才汇合。汇合之后先写本周总结，再从这些卡片抽词。三路卡片仍是抽词的依据。汇合不另建目录，也不是第四阶段。

本周总结和关键词都还没写的时候，展示内容已经完整。后面的总结和关键词不能替换或删掉这些卡片。

## 契约

- 输入：已经写好的 `summary/articles/`、`summary/projects/`、`summary/models/`，以及 `raw/` 里的原文、窗口和 OPML 能对上的发布方。
- 输出：`summary/index.json` 的 `articles_coverage`、`sources`、章节和 ID。不另建文件。
- 生成命令：

```bash
python3 scripts/summarize/merge/article_coverage.py issues/<生成日>
python3 scripts/summarize/merge/write_index.py issues/<生成日> \
  --routine-repo <owner/name> \
  --routine-commit <40位sha> \
  --routine-path .edges/routines/weekly-ai-blogs-digest/INDEX.md
```

- 校验器：`scripts/summarize/merge/validate.py`
- JSON Schema：`schemas/summary/index.schema.json`

写完立刻检查三路 ID 不重复：

```bash
python3 scripts/summarize/merge/validate.py issues/<生成日>
```

通过才进入 [本周总结](overview.md)。整页汇合仍走 [整页校验](check.md)。

`articles_coverage` 的数字在这一步统计，不手填，也不读站点。命令见上面的契约。

- `raw`：`raw/articles/feeds.json` 里按规范化 URL 去重后的篇数，加上 `raw/articles/backfill.json` 中有、且不在这份 feeds 里的补录。同一规范化 URL 只算一篇，重复拉取不算。没有补录文件就不加。
- `selected`：`summary/articles/` 里的文章数，一篇一个 id。这就是页面上精选文章的总篇数。

规范化 URL 与准备阶段的 `normalize_link` 相同。`cleaned/articles/index.json` 的 id 数不写入这个字段。原文不能少于清洗后。

同时写入 `sources`。不改 raw，不改 cleaned，也不改卡片正文。发布方、分类和网站已经在清洗阶段写入 cleaned，汇合脚本只重写 `summary/index.json`。

`sources.categories` 固定四类，顺序是模型榜单、GitHub Trending、博客、国内互联网。每类有 `count`，以及 `publishers`：`{name, url, count}`。`name` 是 OPML 的 `publisher`（团队名，如字节跳动、大淘宝），备源并进这个名字，不写 feed 标题，也不写 RSS 地址。`url` 是读者打开的网站：feed 用 `publisherUrl`，没有就用主源的 `htmlUrl`。GitHub Trending 只有每周总榜这一份订阅，发布方网址就是 `https://github.com/trending?since=weekly`。模型榜单的网址在 meta `boards`。整页汇合走 [整页校验](check.md)。

已订阅的发布方全部列出，本周没有条目时 `count` 是 0。模型榜单没有可数的条目时，发布方的 `count` 和这一类的 `count` 写 `null`，不写 0。条数来自 raw：订阅和补录按规范化链接去重；榜单有 `items` 或 `data` 数组时用它的长度。补录算进它的发布方，不单列一类。`sources` 里不放 OPML 地址。以后页面上的下载按钮只链到脑仓这份文件：`https://github.com/VirusPC/edges-brain-viruspc/blob/main/skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.opml`。站点怎么展示 `sources` 还没定，先不渲染。
