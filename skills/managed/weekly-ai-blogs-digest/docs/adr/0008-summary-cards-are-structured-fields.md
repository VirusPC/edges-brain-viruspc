---
status: accepted
---

# Summary 卡片只存结构化字段，站点只从字段渲染

11-27 期的文章卡和项目卡已经在 JSON 里写了分类、公司和五段，但页面仍读错：站点先把 `text` 里的 markdown 和 HTML 拼回去，再靠标题前的 `<分类><公司>` 前缀和 `details.article-more` 把结构解析出来。那一期的 `text` 少了这两处标记，34 张卡既没有分类标签，五段也没有按栏展示。决定：summary 里的文章卡、项目卡和模型卡只存字段，不再保留用作排版的 `text` 整段；站点只从字段渲染，不为旧格式写兼容层。

出处：第一轮 grill，2026-11-27。用户原话：「太不稳定了。summary 最后的数据应该是足够结构化的」。同轮还定下：不合入解析补丁 #620；先改技能到 0.0.12，再把已发布各期改成新格式，最后改站点。

## Considered Options

- 继续让模型生成带标记的 HTML，站点靠解析器容错。否决：11-27 已经证明少一个 class 或少一段前缀就会整页崩掉。#620 正是这种兼容层，已定不再合入。
- 新字段落地后仍保留 `text` 作备份。否决：模型和校验会继续围着第二份正文转，结构还是不稳定。
- 项目卡只补星标、许可证和五段，不收文章卡的分类和公司。否决：用户要求项目卡保留文章卡的全部字段，再补项目特有字段。

## Consequences

- 文章卡必填 `title`、`link`、`lede`、`category`、`company` 和五段 `sections`。删除 `text` 和 `sentence`。导语改称 `lede`。
- 项目卡包含文章卡的全部字段，并补上 `stars`、`license`、`purpose`、`change` 和同一套五段。删除 `text`。清洗结果没有的星标或许可证不编造。`category` 和 `company` 的取值还没有定。
- 模型卡的发布要点是不定长的 `{label, text}` 列表。「上线」「定位」「成绩」「实测」「可用」是推荐字段，不是必填，也不限制只能用这几个 label。是否同时必填 `title`、`link`、`lede` 并删除 `text`，还没有定。
- 只有导语和各段正文可以带 `<mark class="note-card-hl">` 和链接；标题、标签等为纯文本。不允许任意 HTML。
- 榜单 `models/boards` 和 `overview.themes` 已经是结构化数据，本轮不改它们的形状。
- 技能版本只升 patch，因此这一次是 0.0.12。

参考：[第一轮 plan](https://edges.viruspc.tech/artifacts/1fd7abc2-127d-41a3-8ecc-2536ca35c642/)。已发布各期如何迁到新格式，见 [0009](0009-convert-published-issues-to-structured-fields.md)。
