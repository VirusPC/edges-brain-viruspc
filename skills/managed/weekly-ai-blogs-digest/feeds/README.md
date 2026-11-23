# AI Coding 订阅源

阅读器要导入的是 [`ai-coding-blogs.opml`](ai-coding-blogs.opml)。里面是 feed（`type="rss"` + `xmlUrl`），Folo 或其他 OPML 阅读器可以直接导入。分组是「博客」「国内互联网」「GitHub Trending」。每条 feed 还有 `category`、`publisher`（团队名）和 `htmlUrl`（读者打开的网站，不是 RSS）。备源标 `role="backup"`，汇总时并进同一个发布方。文章抓取只拉点名的博客和国内互联网源；GitHub Trending 由开源项目脚本单独拉每周总榜。周报不再收「薅羊毛」，OPML 里没有这一组。模型榜单不是 RSS，发布方和榜单页写在 [`ai-coding-blogs.meta.json`](ai-coding-blogs.meta.json) 的 `boards`。

GitHub Trending 只用 [mshibanami/GitHubTrendingRSS](https://github.com/mshibanami/GitHubTrendingRSS) 的每周总榜（`weekly/all`），不订任何具体语言的榜，也不订 daily。这是第三方抓页生成的 RSS，不是 GitHub 官方源。`feedOrigin` 为 `third-party-scrape-rss`。条目没有 `pubDate`，日期用 channel 的 `pubDate`。订阅 id 是 `github-trending-weekly-all`。名次以 XML 原始顺序为准。展示哪些仓库由总结阶段决定，见 [开源项目](../references/summarize/projects.md)。

Artificial Analysis 和 LLM Arena 不是 OPML。见 [模型与榜单](../references/prepare/models.md)。脚本在 `scripts/prepare/models/fetch_artificial_analysis.py` 和 `scripts/prepare/models/fetch_llm_arena.py`。

[`ai-coding-blogs.meta.json`](ai-coding-blogs.meta.json) 只给 Agent 看：`lane`、退路、BestBlogs 对照、Olshansk 抓取源和过期 feed 说明。阅读器不需要 `lane`，OPML 里不写。

同一发文方的备源是另一条 source：自己的 `xmlUrl`，`publisher` 相同，`role` 为 `primary` 或 `backup`。`fallback` 只写退路类型（如 `list-page`），不写备源地址。只写在 notes 里的 URL，脚本不拉。运行约定见 [订阅退路](../references/prepare/articles.md#订阅退路)。

每条 source 有 `lane`：

- `product`：发布、功能、定价、面向用户的产品博客和 changelog。周报放进「产品动态」。
- `tech`：工程博客、实现、基础设施、深入的 how-to。周报放进「技术与工程」。
- `mixed`：同一份 feed 经常两种都有。写周报时按每一篇归类，不要整份 feed 丢进同一节。
- `special`：GitHub Trending。不进上面两节，写在「项目开源」。

`feedOrigin` 为 `third-party-scrape-rss` 时，来源要在 notes 里写明。GitHub Trending 用 mshibanami/GitHubTrendingRSS。博客抓取用 [Olshansk/rss-feeds](https://github.com/Olshansk/rss-feeds)（`feeds.yaml` 为登记，XML 在 `feeds/feed_*.xml`，经 GitHub raw 发布）。这是第三方按小时抓列表生成的 RSS，不是官网。

## 加一个站

1. 先找站点自己的 RSS 或 Atom（页面 `rel=alternate`，或 `/feed`、`/rss.xml`、`/atom.xml`）。找到了就同时写进 OPML 和 meta，`feedOrigin` 用 `native`。已经有可用原生 feed 的站不要再并一份抓取源。
2. 没有可用原生 feed（没有、停更、或对不上要订的页面）时，可以订 Olshansk/rss-feeds 里对上的 `feed_*.xml`。`feedOrigin` 用 `third-party-scrape-rss`，`fallback` 留 `list-page`。研究向和红队源不要加。registry 里标了暂停的源默认不加；例外要在 notes 里写明可能过期。
3. 还没有的话，到 [BestBlogs](https://github.com/ginobefun/BestBlogs) 的 `BestBlogs_RSS_Articles.opml`（以及根目录 `BestBlogs_RSS_ALL.opml`）里按域名找。对上了就写入 OPML。转换源可以订：`feedOrigin` 用 `bestblogs-rsshub`、`bestblogs-xgo` 或 `bestblogs-wechat2rss`，`bestblogs.adopted` 为 true，`fallback` 仍留 `list-page`。
4. 上面都没有：OPML 不动，meta 里 `xmlUrl` 留空，`fallback` 写 `list-page`。列表页打不开再用浏览器。
5. 给这条 source 写 `lane`（`product`、`tech` 或 `mixed`）。GitHub Trending 用 `special`。
6. 改完后，用 skill「运行环境」里的 Python 3.12 跑 `../scripts/prepare/articles/check_subscription.py`。

播客和推文都不进这份 OPML。周报里「精选推文」「精选播客」先标建设中，不从这里采集。窗口里确有相关播客时，仍只在关键词或相关章节点名。
