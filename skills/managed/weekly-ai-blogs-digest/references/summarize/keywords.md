# 关键词

本周总结写完之后才做。先按既有方式，只从已经写入 `summary/articles/`、`summary/projects/`、`summary/models/` 的条目里抽词，包括榜单条目。不读全量候选，不在准备或清洗阶段抽词，也不和三路并行。抽完再把各条主线的 tag 加回同一份列表。

`summary/keywords.json` 仍是词云的唯一来源。词云读的是合并之后的这份文件。不要用主线 tag 替换或删掉从三路卡片抽出的型号和产品名，那些词留在列表里。

## 契约

- 输入：已经写好的 `summary/articles/`、`summary/projects/`、`summary/models/`，以及 `summary/overview.json` 的 `themes[].tag` 和 `themes[].refs`。
- 输出：`summary/keywords.json`。每个词有名称、权重，以及到稳定内容 ID 的多对多映射。映射要指到具体文章、项目、模型卡或榜单条目，不能只指章节。
- 生成命令：`node scripts/summarize/keywords/build_keywords.mjs --issue-dir issues/<生成日>`
- 校验器：`scripts/summarize/keywords/validate.py`
- JSON Schema：`schemas/summary/keywords.schema.json`

```bash
node scripts/summarize/keywords/build_keywords.mjs --issue-dir issues/<生成日>
python3 scripts/summarize/keywords/validate.py issues/<生成日>
```

在本 skill 目录执行。没有 `summary/overview.json` 时，生成命令直接失败。`build_keywords.mjs` 先从三路卡片的标题里抽出模型名、产品名和重复出现的概念，不把整条标题当成一个词；再调用合并，把主线 tag 加回去。写完立刻跑校验。整页汇合走 [整页校验](check.md)。

抽词阶段的 16 个词上限只作用在这一步的前半段，并且仍然优先留下 `theme: true` 的概念和型号。合并发生在上限之后：已经留下的词一个都不删。主线 tag 若是新词，追加在后面，列表可以因此超过 16。型号和产品名不会为了给 tag 腾位置被删掉。

合并规则：

- 身份按去掉首尾空白后的大小写不敏感比较。对上已有词时，保留抽词时的写法，不把名字改成 tag 的大小写。
- 已有该词：权重提到下限 5。已经大于或等于 5 的保持原值，不往下压，也不抬过现有刻度。该主线每个 `refs.id` 并入 `targets`，已有的 targets 保留。
- 新词：追加一条，权重写成 5，`targets` 就是该主线的 `refs.id`。不写 `theme: true`。
- 权重下限是 5。这是 `keywordWeight` 的上限，也是词云字号刻度的顶端。从单条标题抽出的普通词通常远低于 5。新 tag 写成 5，使它和最热的普通词一样大，并高于普通标题词。站点渲染会把高于 5 的权重夹回 5，本次不改站点，所以不把权重写成 6 或更高。
- 正文逐字是「本周无重要模型发布」且 `refs` 为空的那条，tag 不进入本文件。`targets` 仍至少一条，schema 不放宽为空数组。这条 tag 因此也不要求出现在词云里。
- `theme: true` 仍只表示抽词阶段选出的那一个概念高亮：概念里 targets 最多的那条，在合并之前就标好。合并不重新选举，也不因为某个词是主线 tag 就写成 `theme: true`。某个主线 tag 若恰好就是那个概念，原来的 `theme: true` 保留。主线 tag 加回并提高权重，不等于把所有主线 tag 都标成主题高亮。

记录版本 >= 0.0.9 的 overview，校验要求：除上面那条例外，每个 `theme.tag` 都出现在本文件里，权重大于或等于 5，`targets` 盖住该主线的全部 `refs.id`。低于 0.0.9 的历史 overview 没有 tag，不因此失败。0.0.9 缺 tag，或 tag 没有按上面的规则进词表，不能通过。

卡片或主线 tag 变了，先重写本周总结（若卡片变了），再重算这份关键词。词的变化不倒逼重抓原文，也不重做没引用它的卡片。映射写在这份文件里，不在这一步现推。
