# 项目清洗

读取 `raw/projects/`。按仓库地址去重。核验能对上的发布时间、开源状态、许可和仓库事实，并写上来源。

产出：

- `usable/projects/index.json`
- `usable/projects/{id}.json`

对不上的字段写入 `usable/gaps.json`，不把猜测写成事实。Python、TypeScript 周榜若只出现在文章抓取结果里，不在这里改写成 all 榜的名次。名次仍以 XML 原始顺序为准。

这一步不决定本期页面展示哪几个仓库。
