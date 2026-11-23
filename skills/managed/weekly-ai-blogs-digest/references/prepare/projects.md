# 开源项目

这一路只保存原始材料，不去重，不核验许可，也不决定本期展示哪些仓库。不从 `raw/articles/feeds.json` 抽取。

## 契约

输入是 `raw/window.json` 的 `since`、`until`，以及 OPML 里的每周总榜。没有生成日就停止。

输出：

- `raw/projects/github-trending.json`：只保存 `github-trending-weekly-all` 的全文。名次是 XML 原始顺序，脚本不按日期或标题重排。不要写入任何语言榜或 daily 榜。
- `raw/projects/releases.json`：仓库发布记录等原始响应。没有单独来源时，在 `raw/gaps.json` 写明，不编一份空发布列表。

Schema：

- `schemas/raw/projects/github-trending.schema.json`
- `schemas/raw/projects/releases.schema.json`

命令：

```bash
PY=/tmp/weekly-ai-blogs-digest-py312/bin/python
$PY scripts/prepare/projects/fetch_github_trending.py \
  --since <raw/window.json 的 since> --until <raw/window.json 的 until> \
  --out issues/<生成日>/raw/projects/github-trending.json
```

抓取失败时脚本不写这个文件，标准输出是体检（`status` 为 `error` 或 `empty`）。把原因写入 `raw/gaps.json`。

校验：

```bash
python3 scripts/prepare/projects/validate.py issues/<生成日>
```

在本 skill 目录执行。文件写完后立刻跑。阶段汇合走 [准备汇合](check.md)。

不要再留 daily 源。GitHub 项目榜不是模型榜，不放进 `raw/models/`。`feeds.json` 里也不要保留周榜、语言榜或 daily 榜。
