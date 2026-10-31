---
name: weekly-ai-blogs-digest
description: 当用户想要汇总一段时间内（默认过去一周）AI / AI Coding 领域各大博客的新文章时使用此技能。先读 OPML 订阅并用脚本拉 RSS/Atom，再对条目做 200 字内摘要、总结技术风向，并按固定模版输出为 markdown。在以下短语触发："本周 AI 资讯"、"汇总一下 AI 博客"、"weekly AI digest"、"看看这周 AI Coding 有什么新东西"。不要为单篇文章总结（用 summarize-ai-article）或非博客类信源触发。
---

## 订阅从哪来

博客订阅的真源是 [`feeds/ai-coding-blogs.opml`](feeds/ai-coding-blogs.opml)，阅读器可以直接导入。Agent 用的退路、BestBlogs 对照和备注在 [`feeds/ai-coding-blogs.meta.json`](feeds/ai-coding-blogs.meta.json)。维护规则见 [`feeds/README.md`](feeds/README.md)。

不要再按一份写死的首页 URL 列表逐站爬。OPML 里没有的站，以 meta 的 `fallback` 为准。

同一份 OPML 还有分组「国内技术团队」。脚本会和英文博客一起拉。这些文章写进同一份周报，按发布日倒序。其中「千问 AI 平台」订的是 BestBlogs 上的通义实验室微信源，meta 里有对照。

## 任务执行流程

生成日记为 D。覆盖窗口是 D-7 到 D-1（含两端，不含 D）。用户指定了别的日期就用用户的。

1. 拉 feed。在本 skill 目录执行：

```bash
pip install -r scripts/requirements.txt
python3 scripts/fetch_feeds.py --since YYYY-MM-DD --until YYYY-MM-DD --out /tmp/ai-coding-feeds.json
```

日期显式传入，不要依赖跑脚本那台机器的时区。脚本读 OPML 和 meta，下载 feed，按发布日过滤、按链接去重，写出紧凑 JSON。每条只有 `title`、`date`、`link`、`summary`、`source`、`thin`。

2. 读 JSON，不要把原始 feed 再塞进上下文。
   - `summary` 够写摘要且 `thin` 为 false：直接用 feed 正文，不要再抓文章页。
   - `thin` 为 true：feed 正文太短（纯文本短于 280 字）。再抓该 `link` 的文章页，只为补这一篇。
   - `sources` 里 `truncated` 为 true：feed 最旧一篇仍落在窗口内，早于它的文章可能被 feed 截掉。用该站列表页把窗口早段补上。
   - `sources` 里 `error` 非空：这一站的 feed 失败，改走 meta 里的退路。
   - `feedOrigin` 以 `bestblogs-` 开头：这是 BestBlogs 的转换源（RSSHub、XGo.ing 或 Wechat2RSS），不是官网博客。先收 feed 里的条目。官网文章没出现在 JSON 里时，仍按该站 `fallback`（列表页）补。
   - `fallbacks` 里 `role` 为 `only`：这些站没有可订 feed。按 notes 抓列表页；列表页只有壳、或打不开时，再看 sitemap 枚举链接（不要把「整站同一次生成」的 lastmod 当成发布日）；浏览器是最后一步。`role` 为 `backup` 的站已经有 feed，列表页只补 feed 没覆盖到的官网文章。
   - meta 的 notes 若写了「feed 会漏文」（目前是 Hugging Face），用该站列表页对标题，只补 JSON 里没有的链接。
3. 对每一篇新文章写不超过 200 字的一段话摘要。和 AI Coding 相关时，再加一句话，写对研发的落地点或值得研究的方向。
4. 用全部摘要写「本周风向」，放在文章最前。播客不是逐期来源；只有用户要求，或这一窗口有和 AI / Agent 强相关的一期时，在风向里点名一句并附链接。不要把播客 feed 加进 OPML，也不要为播客跑这个脚本。
5. 按下面的模版保存 markdown。发布日倒序（新的在前）。链接必须是 feed、列表页、sitemap 或文章页里真实出现的地址；对不上就修，修不了就去掉。
6. 非博客数据单独成节，放在「本周风向」之后、「文章总结列表」之前。没跑或被跳过的小节不要留空标题。

## 非博客数据

博客 OPML 仍是阅读器要导入的订阅真源。下面三项不是博客文章，不要写进「文章总结列表」。

1. **GitHub Trending** 已在 OPML 分组「GitHub Trending」（mshibanami/GitHubTrendingRSS，`feedOrigin` 为 `third-party-scrape-rss`）。条目没有发布日，脚本用 channel 的 `pubDate` 当快照日期，并且不按博客窗口裁掉。周报里单独写「GitHub Trending」，注明是第三方抓取、不是 GitHub 官方 RSS。
2. **Artificial Analysis** 不是 RSS。跑 `python3 scripts/fetch_artificial_analysis.py --out /tmp/aa-language-models.json`。密钥放在环境变量 `AA_API_KEY` 或 `ARTIFICIAL_ANALYSIS_API_KEY`，不要写进命令行或仓库。没有密钥时脚本退出码 0 并写出 `skipped`。展示数据时必须注明来源 [Artificial Analysis](https://artificialanalysis.ai/)。可选 MCP：`https://mcp.artificialanalysis.ai/mcp`。
3. **LLM Arena** 没有公开 REST。跑 `python3 scripts/fetch_llm_arena.py --out /tmp/llm-arena.json`。它读 Hugging Face 数据集 `lmarena-ai/leaderboard-dataset`（默认 `text_style_control` / `latest` / `overall`），不是 OPML，不需要密钥。先 `pip install -r scripts/requirements-leaderboard.txt`。
4. **〇、薅羊毛** 用 OPML 分组「薅羊毛 / linux.do」的 `https://linux.do/c/welfare.rss`（`feedOrigin` 为 `linux-do-welfare-rss`），再加上其它博客 feed 里明显是优惠、额度、白嫖的帖子。只保留和 AI / Coding 相关的（模型额度、API、IDE、开发者订阅、给开发者的云主机等）。银行立减金、电商价保、会员日这类日常消费不写。写过的帖子不要再出现在「文章总结列表」。

```bash
python3 scripts/fetch_artificial_analysis.py --out /tmp/aa-language-models.json
python3 scripts/fetch_llm_arena.py --out /tmp/llm-arena.json
```

## 输出内容模版

文件名：`ai-news/YYYY-MM-DD-ai-coding-news.md`（日期是生成日 D）。写完后更新 [`ai-news/README.md`](../../../ai-news/README.md) 的索引。

### 文章整体框架

```
# {{yyyy-MM-DD}} AI Coding 资讯

## 本周风向：{{yyyy-MM-DD}}～{{yyyy-MM-DD}}
{{本周风向}}

## GitHub Trending（快照 {{yyyy-MM-DD}}）
来源：mshibanami/GitHubTrendingRSS（第三方抓取 GitHub Trending，不是官方 RSS）。

## 模型榜
### Artificial Analysis
数据来自 [Artificial Analysis](https://artificialanalysis.ai/)。

### LLM Arena
来源：Hugging Face 数据集 `lmarena-ai/leaderboard-dataset`（不是 RSS）。

## 〇、薅羊毛
来源：linux.do 福利羊毛 RSS，以及博客 feed 里和 AI / Coding 有关的优惠。不含银行立减金、电商价保等日常消费。

## 文章总结列表
{{ 文章总结1 }}
{{ 文章总结2 }}
{{...}}
{{ 文章总结n }}

```

### 单篇文章总结模版

```md
### {{标题}} - {{yyyy-MM-DD}}

{{一段话内容}}

> 原始链接：{{}}
```

内容总结要求：

1. 200 字以内
2. 一段话内讲完
3. 如果和 AI Coding 相关，则增加一句话总结对于研发的落地点或值得研究的方向。

## 强制要求

1. 网站链接必须真实有效。失效链接须修复或排除。
2. 文章总结按发布日倒序。
3. 优先用 feed 正文做摘要。只有 `thin`、feed 失败、feed 被截断，或该站在 `fallbacks` 里时，才抓列表页或文章页。
4. 没有原生 feed、但 BestBlogs 对上了转换源时，把该 `xmlUrl` 写进 OPML，`feedOrigin` 标成 `bestblogs-rsshub`、`bestblogs-xgo` 或 `bestblogs-wechat2rss`，并保留列表页退路。没有 BestBlogs 命中的站继续只走列表页。

## 参考播客列表（可选信源）

播客不是博客，默认不逐期总结；用户要求时，或本周有和 AI / Agent 强相关的一期时，在「本周风向」里点名一句并附链接。

```md
https://www.latent.space/podcast
https://www.dwarkesh.com/podcast
https://podcasts.apple.com/us/podcast/no-priors-artificial-intelligence-technology-startups/id1668002688
https://www.cognitiverevolution.ai/
https://lexfridman.com/podcast/
https://practicalai.show/
https://www.lennysnewsletter.com/podcast
https://cheekypint.substack.com/
https://www.xiaoyuzhoufm.com/podcast/626b46ea9cbbf0451cf5a962
https://www.xiaoyuzhoufm.com/podcast/60502e253c92d4f62c2a9577
https://www.xiaoyuzhoufm.com/podcast/640ee2438be5d40013fe4a87
https://openai.com/podcast/
https://aws.amazon.com/podcasts/aws-podcast/
https://ampcode.com/podcast
https://www.datacamp.com/podcast
```
