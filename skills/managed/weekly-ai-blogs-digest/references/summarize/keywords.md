# 关键词

三路展示内容汇合之后才做。只从已经写入 `summary/articles/`、`summary/projects/`、`summary/models/` 的条目里提炼，包括榜单条目。不读全量候选，不在准备或清洗阶段抽词，也不和三路并行。

产出 `summary/keywords.json`。每个词有名称、权重，以及到稳定内容 ID 的多对多映射。映射要指到具体文章、项目、模型卡或榜单条目，不能只指章节。

权重记在词上，来源是这些已确定的展示内容。旧的全量候选计分不再使用：不再按窗口内全部 feed 计算 mentions 和 sources，不再用种类分 5、4、3 决定谁入词，也不再从全部标题里预选主题。`scripts/summarize/keywords/build_keywords.mjs --issue-dir issues/<生成日>` 读这三路卡片，写出 `summary/keywords.json`。

展示内容变了，只重算映射到这些 ID 的词和权重。词的变化不倒逼重抓原文，也不重做没引用它的卡片。

博客只读取这份映射。按关键词筛选的界面本次不做，也不要在渲染时现推关联。
