# 文章清洗

读取 `raw/articles/`。去掉重复条目，把链接规范成稳定 ID，留下可用正文，并写上来源路径。发布方在这一步写上，汇合阶段不再改这些文件。

## 契约

输入是 `raw/articles/feeds.json`，以及有的话 `raw/articles/backfill.json`。

输出：

- `cleaned/articles/index.json`：本期候选 ID 清单，供总结阶段阅读后再选
- `cleaned/articles/{id}.json`：一条一个文件，含标题、日期、来源、可用正文，以及 `publisher`、`category`、`url`

Schema：

- `schemas/cleaned/articles/index.schema.json`
- `schemas/cleaned/articles/item.schema.json`

条目文件写完后，用 OPML 补发布方，再校验：

```bash
python3 scripts/clean/stamp_publishers.py issues/<生成日> --lane articles
python3 scripts/clean/articles/validate.py issues/<生成日>
```

在本 skill 目录执行。阶段汇合走 [清洗汇合](check.md)。

订阅源偏短的正文保持原样，不在清洗时补写成五段。补录条目如果在 `raw/articles/backfill.json`，以原发日进入候选，不改日期。

候选清单不是精选结果。这一步不判断主类、公司，也不抽关键词。选文在 [精选文章](../summarize/articles.md)。
