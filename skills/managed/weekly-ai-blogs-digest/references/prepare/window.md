# 确定窗口与入口

窗口以 Skill 为准：生成日 D 的前 7 个完整 UTC 日到前 1 日，含两端，不含 D。这里把它和入口一起写入 `raw/window.json`。抓取命令里的日期写死，不随运行时刻滑动。没有生成日就停止，不用运行当天代替。

## 契约

输入是生成日 D，以及 [`feeds/ai-coding-blogs.opml`](../../feeds/ai-coding-blogs.opml)、[`feeds/ai-coding-blogs.meta.json`](../../feeds/ai-coding-blogs.meta.json)。

输出是 `raw/window.json`。Schema 是 `schemas/raw/window.schema.json`。

先核对订阅，再写窗口：

```bash
python3 scripts/prepare/articles/check_subscription.py
```

`issue` 写 D，`since` 写 D-7，`until` 写 D-1。写完立刻校验：

```bash
python3 scripts/prepare/window/validate.py issues/<生成日>
```

在本 skill 目录执行。阶段汇合走 [准备汇合](check.md)。

同时确定三件事：

- 订阅列表，真源是 [`feeds/ai-coding-blogs.opml`](../../feeds/ai-coding-blogs.opml) 与 [`feeds/ai-coding-blogs.meta.json`](../../feeds/ai-coding-blogs.meta.json)
- 用户明确给出的补录入口。没有就不写补录文件
- 开源项目采集入口：仓库、发布记录、GitHub 项目榜

这一步不抓正文，也不决定哪些条目进入页面。
