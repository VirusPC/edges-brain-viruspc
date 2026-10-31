# AI Coding 订阅源

阅读器要导入的是 [`ai-coding-blogs.opml`](ai-coding-blogs.opml)。里面是真实 feed（`type="rss"` + `xmlUrl`），Folo 或其他 OPML 阅读器可以直接导入。英文博客在「AI Coding Blogs」，国内团队在「国内技术团队」。脚本两个分组都拉。

[`ai-coding-blogs.meta.json`](ai-coding-blogs.meta.json) 只给 Agent 看：BestBlogs 对照、退路、过期 feed 说明。BestBlogs 也没有命中的站点不写进 OPML。

## 加一个站

1. 先找站点自己的 RSS 或 Atom（页面 `rel=alternate`，或 `/feed`、`/rss.xml`、`/atom.xml`）。找到了就同时写进 OPML 和 meta，`feedOrigin` 用 `native`。
2. 没有原生 feed 时，到 [BestBlogs](https://github.com/ginobefun/BestBlogs) 的 `BestBlogs_RSS_Articles.opml`（以及根目录 `BestBlogs_RSS_ALL.opml`）里按域名找。对上了就写入 OPML。转换源可以订：`feedOrigin` 用 `bestblogs-rsshub`、`bestblogs-xgo` 或 `bestblogs-wechat2rss`，`bestblogs.adopted` 为 true，`fallback` 仍留 `list-page`。已经有原生 feed 的站不要改去订转换源。
3. BestBlogs 也没有：OPML 不动，meta 里 `xmlUrl` 留空，`fallback` 写 `list-page`。列表页打不开再用浏览器。
4. 改完跑 `python3 ../scripts/fetch_feeds.py --check`。

播客不进这份 OPML。周报 skill 仍只在「本周风向」里点名播客。
