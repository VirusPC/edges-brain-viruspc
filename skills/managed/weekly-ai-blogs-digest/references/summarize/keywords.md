# 关键词

三路展示内容汇合之后才做。只从已经写入 `summary/articles/`、`summary/projects/`、`summary/models/` 的条目里提炼，包括榜单条目。不读全量候选，不在准备或清洗阶段抽词，也不和三路并行。

产出 `summary/keywords.json`。每个词有名称、权重，以及到稳定内容 ID 的多对多映射。映射要指到具体文章、项目、模型卡或榜单条目，不能只指章节。

权重记在词上，来源是这些已确定的展示内容。`scripts/summarize/keywords/build_keywords.mjs --issue-dir issues/<生成日>` 从三路卡片的标题里抽出模型名、产品名和重复出现的概念，写出 `summary/keywords.json`。不要把整条标题当成一个词。

展示内容变了，只重算映射到这些 ID 的词和权重。词的变化不倒逼重抓原文，也不重做没引用它的卡片。映射写在这份文件里，不在这一步现推。
