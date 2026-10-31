# AI Coding 订阅源

阅读器要导入的是 [`ai-coding-blogs.opml`](ai-coding-blogs.opml)。里面只有真实 feed（`type="rss"` + `xmlUrl`），Folo 或其他 OPML 阅读器可以直接导入。

[`ai-coding-blogs.meta.json`](ai-coding-blogs.meta.json) 只给 Agent 看：BestBlogs 对照、退路、过期 feed 说明。没有可用 feed 的站点不写进 OPML，避免导入一条订不到的订阅。

## 加一个站

1. 先找站点自己的 RSS 或 Atom（页面 `rel=alternate`，或 `/feed`、`/rss.xml`、`/atom.xml`）。找到了就同时写进 OPML 和 meta，`feedOrigin` 用 `native`。
2. 没有的话，到 [BestBlogs](https://github.com/ginobefun/BestBlogs) 的 `BestBlogs_RSS_Articles.opml`（以及根目录 `BestBlogs_RSS_ALL.opml`）里按域名找。只采纳原生 feed。RSSHub、Wechat2RSS、XGo.ing 记在 `bestblogs.note` 里，`adopted` 保持 `false`。
3. 还是没有：OPML 不动，meta 里 `xmlUrl` 留空，`fallback` 写 `list-page`。列表页打不开再用浏览器。
4. 改完跑 `python3 ../scripts/fetch_feeds.py --check`。

播客不进这份 OPML。周报 skill 仍只在「本周风向」里点名播客。
