# 模型经验与榜单

把 `cleaned/models/` 的事实和榜单数字写成展示内容。不依赖文章选文，也不把 GitHub 项目榜写进来。

## 契约

输入是 `cleaned/models/`。

输出：

- `summary/models/{id}.json`：一张模型卡片，字段是 `id`、`source`、`title`、`link`、`lede`、`price`、`speed`、`effect`、`points`。三行是价格、速度、效果，数字和名次只用清洗结果。`rank` 不是正整数就不写名次，没有数字就写「暂无」。`lede` 是这张卡的一句话导语。`points` 是发布要点数组，每项是 `{label, text}`，`label` 和 `text` 都非空；允许空数组。上线、定位、成绩、实测、可用只是推荐 label，不是必填，也不限制只能用这五个。没有第三方实测就写可用。
- `summary/models/boards/`：只存绘图数据，包括给读者的一句说明，以及圈谁、Arena 榜单发布日。不另存 SVG 或 PNG。

Schema：

- `schemas/summary/models/item.schema.json`
- `schemas/summary/models/board.schema.json`

写完立刻校验：

```bash
python3 scripts/summarize/models/validate.py issues/<生成日>
```

在本 skill 目录执行。整页汇合走 [整页校验](check.md)。

说明句写这张榜相对上一期可核验的变化；没有对比就只说本期格局。不写「数据取自」「快照」「抓取于」。没有证据就不写上升、下降或新进。Arena 名次变化对照上一期 `summary/` 实际采用的那份榜，不用原始响应里的 `prior_publish_date` 代替。发布日与上一期相同就沿用那张图的数据，说明写榜没有换。对照时锁定上一期文件和版本。

Artificial Analysis 按智力指数取 Top 15。红圈只圈窗口内新发布、且出现在这张 Top 15 上的模型。OpenRouter 编程用量要写明是 token 用量，不是质量榜。

「GitHub Trending（weekly / all 前 5）」标题下面不要写概括前五名字的介绍句。那一组不属于模型榜。

发布要点写进 `points` 字段，一项一条，关键数字用一处 `<mark class="note-card-hl">` 包住原句里已有的数字。`lede` 和每条 `text` 里也可以放 `<a href="https://...">` 链接；每段最多一处 mark；不写 markdown，不写别的标签。`title`、`link` 和每条 `label` 是纯文本。

榜单数字或模型事实变了，重写对应卡片和榜单数据。这些卡片变了就重写本周总结，再重算关键词。
