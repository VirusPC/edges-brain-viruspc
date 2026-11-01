# AI Coding 订阅源

阅读器要导入的是 [`ai-coding-blogs.opml`](ai-coding-blogs.opml)。里面是 feed（`type="rss"` + `xmlUrl`），Folo 或其他 OPML 阅读器可以直接导入。英文博客在「AI Coding Blogs」，国内团队在「国内技术团队」，GitHub Trending 在「GitHub Trending」，linux.do 福利羊毛在「薅羊毛」。脚本这些分组都拉。

「薅羊毛」订 `https://linux.do/c/welfare.rss`（页面 `https://linux.do/c/welfare/36`），`feedOrigin` 为 `linux-do-welfare-rss`。周报「〇、薅羊毛」用它，并加上其它博客里和 AI / Coding 有关的优惠；日常消费类不写。

GitHub Trending 用 [mshibanami/GitHubTrendingRSS](https://github.com/mshibanami/GitHubTrendingRSS) 的每日榜（全部、Python、TypeScript）。这是第三方抓页生成的 RSS，不是 GitHub 官方源。`feedOrigin` 为 `third-party-scrape-rss`。条目没有 `pubDate`，快照日期用 channel 的 `pubDate`。

Artificial Analysis 和 LLM Arena 不是 OPML。见 skill 里的「非博客数据」，脚本在 `scripts/fetch_artificial_analysis.py` 和 `scripts/fetch_llm_arena.py`。

[`ai-coding-blogs.meta.json`](ai-coding-blogs.meta.json) 只给 Agent 看：`lane`、退路、BestBlogs 对照、Olshansk 抓取源和过期 feed 说明。阅读器不需要 `lane`，OPML 里不写。

每条 source 有 `lane`：

- `product`：发布、功能、定价、面向用户的产品博客和 changelog。周报放进「产品动态」。
- `tech`：工程博客、实现、基础设施、深入的 how-to。周报放进「技术与工程」。
- `mixed`：同一份 feed 经常两种都有。写周报时按每一篇归类，不要整份 feed 丢进同一节。
- `special`：GitHub Trending 和薅羊毛。不进上面两节，仍写各自专节。

`feedOrigin` 为 `third-party-scrape-rss` 时，来源要在 notes 里写明。GitHub Trending 用 mshibanami/GitHubTrendingRSS。博客抓取用 [Olshansk/rss-feeds](https://github.com/Olshansk/rss-feeds)（`feeds.yaml` 为登记，XML 在 `feeds/feed_*.xml`，经 GitHub raw 发布）。这是第三方按小时抓列表生成的 RSS，不是官网。

## 加一个站

1. 先找站点自己的 RSS 或 Atom（页面 `rel=alternate`，或 `/feed`、`/rss.xml`、`/atom.xml`）。找到了就同时写进 OPML 和 meta，`feedOrigin` 用 `native`。已经有可用原生 feed 的站不要再并一份抓取源。
2. 没有可用原生 feed（没有、停更、或对不上要订的页面）时，可以订 Olshansk/rss-feeds 里对上的 `feed_*.xml`。`feedOrigin` 用 `third-party-scrape-rss`，`fallback` 留 `list-page`。研究向和红队源不要加。registry 里标了暂停的源默认不加；例外要在 notes 里写明可能过期。
3. 还没有的话，到 [BestBlogs](https://github.com/ginobefun/BestBlogs) 的 `BestBlogs_RSS_Articles.opml`（以及根目录 `BestBlogs_RSS_ALL.opml`）里按域名找。对上了就写入 OPML。转换源可以订：`feedOrigin` 用 `bestblogs-rsshub`、`bestblogs-xgo` 或 `bestblogs-wechat2rss`，`bestblogs.adopted` 为 true，`fallback` 仍留 `list-page`。
4. 上面都没有：OPML 不动，meta 里 `xmlUrl` 留空，`fallback` 写 `list-page`。列表页打不开再用浏览器。
5. 给这条 source 写 `lane`（`product`、`tech` 或 `mixed`）。GitHub Trending 和薅羊毛用 `special`。
6. 改完跑 `python3 ../scripts/fetch_feeds.py --check`。

播客不进这份 OPML。周报 skill 仍只在「本周风向」里点名播客。
