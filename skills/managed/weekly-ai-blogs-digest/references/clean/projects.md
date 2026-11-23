# 项目清洗

读取 `raw/projects/`。按仓库地址去重。核验能对上的发布时间、开源状态、许可和仓库事实，并写上来源。

产出：

- `cleaned/projects/index.json`
- `cleaned/projects/{id}.json`

对不上的字段写入 `cleaned/gaps.json`，不把猜测写成事实。只采用每周总榜的名次，仍以 XML 原始顺序为准。不要把语言榜或 daily 榜的条目写进清洗结果。

这一步不决定本期页面展示哪几个仓库。
