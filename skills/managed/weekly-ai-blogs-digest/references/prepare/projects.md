# 开源项目

这一路只保存原始材料，不去重，不核验许可，也不决定本期展示哪些仓库。

目标文件在 `raw/projects/`：

- `github-trending.json`：`github-trending-weekly-all` 的全文。名次以 Trending feed 的 XML 原始顺序为准。`fetch_feeds.py` 会按日期和标题重排，数组顺序不是名次。
- Python、TypeScript 的 weekly 源留在文章抓取结果里，不写进这份 all 摘录。
- `releases.json`：仓库发布记录等原始响应。没有单独来源时，在 `raw/gaps.json` 写明，不编一份空发布列表。

不要再留 daily 源。GitHub 项目榜不是模型榜，不放进 `raw/models/`。

从 `raw/articles/feeds.json` 抽出 weekly/all，写入 `raw/projects/github-trending.json`。
