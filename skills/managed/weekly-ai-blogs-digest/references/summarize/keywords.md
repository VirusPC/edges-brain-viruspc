# 关键词

三路展示内容汇合之后才做。只从已经写入 `summary/articles/`、`summary/projects/`、`summary/models/` 的条目里提炼，包括榜单条目。不读全量候选，不在准备或清洗阶段抽词，也不和三路并行。

## 契约

输入是已经写好的 `summary/articles/`、`summary/projects/`、`summary/models/`。输出是 `summary/keywords.json`。Schema 是 `schemas/summary/keywords.schema.json`。每个词有名称、权重，以及到稳定内容 ID 的多对多映射。映射要指到具体文章、项目、模型卡或榜单条目，不能只指章节。

```bash
node scripts/summarize/keywords/build_keywords.mjs --issue-dir issues/<生成日>
python3 scripts/summarize/keywords/validate.py issues/<生成日>
```

在本 skill 目录执行。`build_keywords.mjs` 从三路卡片的标题里抽出模型名、产品名和重复出现的概念。不要把整条标题当成一个词。写完立刻跑校验。整页汇合走 [整页校验](check.md)。

展示内容变了，只重算映射到这些 ID 的词和权重。词的变化不倒逼重抓原文，也不重做没引用它的卡片。映射写在这份文件里，不在这一步现推。
