# 本周总结

关键词写完之后才做。这一步只读本期 `summary/` 里已经精选的内容和关键词，不读 `cleaned/` 或 `raw/`，也不把页面上看不到的条目写进来。

本周总结是独立产物。它不并进 `index.json` 或 `keywords.json`。`index.json` 只排章节和 ID。

## 契约

输入：

- `summary/articles/` 的 id、title、sentence
- `summary/projects/` 的 id、标题和摘要
- `summary/models/` 的模型卡片（不含 `boards/`）以及卡片要点
- `summary/keywords.json` 的词、权重和 targets。榜单条目 ID 可以出现在引用里，但是否算「有模型发布」只看模型卡片，不含榜单

输出是 `summary/overview.json`。Schema 是 `schemas/summary/overview.schema.json`。

`text` 是纯文本，不含链接标记。`refs` 是 `{id, label}`。`label` 必须是对应 `text` 里的原文片段。字数是 `len(text)`，标点和英文都算 1 个字符。每条不超过 280 字。除「本周无重要模型发布」外，少于 120 字只警告，不因此失败。建议写到 180 到 280 字。

由 Agent 按下面的提示词撰写。不要写生成脚本，也不要调用 LLM API。

写完立刻校验：

```bash
python3 scripts/summarize/overview/validate.py issues/<生成日>
```

在本 skill 目录执行。通过才进入 [整页校验](check.md)。警告写到标准错误，退出码仍是 0。报错则退出码不是 0。

## 提示词

你在写 AI 资讯周报「一、本周概览」的总结。

输入只有本期 summary 里已经精选的内容：

- summary/articles/*.json 的 id、title、sentence
- summary/projects/*.json 的 id、标题和摘要
- summary/models/*.json 的 id 和模型卡要点
- summary/keywords.json 的词、权重和 targets

不要读 cleaned/ 或 raw/。不要写入页面上看不到的条目、数字或事实。

任务：写出 3 到 5 条本周主线。有材料时尽量写 4 或 5 条，不要为了凑数把一件事拆开。每条不超过 280 字，建议 180 到 280 字。字数按去掉链接标记后的 Unicode 字符数计算，标点和英文都算 1 个字符。

规则：

1. 第一条的 kind 必须是 model，且只写模型主线。有模型卡片时，用完整的句子点名具体模型，写出它这周实际发生了什么。本期 summary/models/ 下没有模型卡片时，第一条文本必须逐字写成「本周无重要模型发布」，refs 为空。
2. 其余各条 kind 为 other。主线之间不要重复同一件事。第一条之后按重要性排序，不要按章节目录复述。本期既有精选项目又有精选文章时，这两类都不能整类缺席：other 主线的 refs 里要同时出现项目 ID 和文章 ID。
3. 除「本周无重要模型发布」外，每条必须在 refs 里列出所依据的 summary 条目 ID，并给出这些 ID 在正文里出现的锚文字（label）。label 必须是 text 里的原文片段。
4. 用完整、自然的句子把事情讲清楚，说明为什么值得关注，或者它和其他条目是什么关系。不要用「某某发布了，它重要是因为……」这种套话，句式要有变化。

语气：陈述事实，不编造材料里没有的数字和关系，不鼓吹。不确定就不要写。材料确实只够三条时可以只写 3 条。

输出写入 summary/overview.json，形状见 schema。

## 校验

报错（不能通过校验）：

- 不是 3 到 5 条，或 skill.version 不等于当前 skill
- 去掉链接标记后，某条超过 280 字
- 首条 kind 不是 model，或首条之外还有 kind=model
- 本期有模型卡片，但首条写成「本周无重要模型发布」
- 引用 ID 不在本期 summary 的已知 ID 里
- 除「本周无重要模型发布」外，某条 refs 为空
- 某条 refs.label 在对应 text 里找不到
- 本期既有精选项目又有精选文章，但主线没有引用其中一类

警告（校验仍通过）：

- 除「本周无重要模型发布」外，某条少于 120 字
- 同一 label 在 text 里出现多次，站点只链第一处
- 本期 keywords 里 theme 为 true 的词，总结正文完全没有出现

有无模型发布，以 `summary/models/` 下是否有模型卡片为准，不含榜单。不检查「本期没有模型卡片，但首条不是这句原文」。
