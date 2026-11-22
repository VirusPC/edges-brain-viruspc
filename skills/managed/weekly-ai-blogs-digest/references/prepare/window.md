# 确定窗口与入口

窗口以 Skill 为准：生成日 D 的前 7 个完整 UTC 日到前 1 日，含两端，不含 D。这里把它和入口一起写入 `raw/window.json`。抓取命令里的日期写死，不随运行时刻滑动。

同时确定三件事：

- 订阅列表，真源是 [`feeds/ai-coding-blogs.opml`](../../feeds/ai-coding-blogs.opml) 与 [`feeds/ai-coding-blogs.meta.json`](../../feeds/ai-coding-blogs.meta.json)
- 用户明确给出的补录入口。没有就不写补录文件
- 开源项目采集入口：仓库、发布记录、GitHub 项目榜

这一步不抓正文，也不决定哪些条目进入页面。
