# 项目清洗

读取 `raw/projects/`。按仓库地址去重。核验能对上的发布时间、开源状态、许可和仓库事实，并写上来源。发布方在这一步写上。

## 契约

输入是 `raw/projects/github-trending.json`，以及有的话 `raw/projects/releases.json`。

输出：

- `cleaned/projects/index.json`
- `cleaned/projects/{id}.json`：含 `publisher`、`category`、`url`

Schema：

- `schemas/cleaned/projects/index.schema.json`
- `schemas/cleaned/projects/item.schema.json`

```bash
python3 scripts/clean/stamp_publishers.py issues/<生成日> --lane projects
python3 scripts/clean/projects/validate.py issues/<生成日>
```

在本 skill 目录执行。文件写完后立刻跑。阶段汇合走 [清洗汇合](check.md)。

对不上的字段写入 `cleaned/gaps.json`，不把猜测写成事实。只采用每周总榜的名次，仍以 XML 原始顺序为准。不要把语言榜或 daily 榜的条目写进清洗结果。

这一步不决定本期页面展示哪几个仓库。展示哪些仓库在 [开源项目](../summarize/projects.md)。
