---
name: weekly-ai-blogs-digest
description: 当用户想要汇总一段时间内（默认过去一周）AI / AI Coding 领域的新进展时使用。先把完整抓取存进 VirusPC/ai-news-data，再只从这份快照选文、写总结、排版并开 PR。栏目名是「AI 资讯」。触发短语：「本周 AI 资讯」「AI Coding 资讯」「汇总一下 AI 博客」「weekly AI digest」「看看这周 AI Coding 有什么新东西」。不要为单篇文章总结（用 summarize-ai-article）。
---

# AI 资讯周报

一个 skill，五步。本文件只写顺序和入口。每步的命令、边界和版式在 `references/`。

生成日为 D。覆盖窗口是 D-7 到 D-1 的完整 UTC 日（含两端，不含 D）。快照目录是 `VirusPC/ai-news-data` 的 `issues/YYYY-MM-DD/`，日期与周报文件名相同。写正文和补已有周报的总结时，只读这份快照，不重新抓 feed。

## 步骤

1. [采集数据并存入 ai-news-data](references/01-采集数据并存入-ai-news-data.md)。RSS 全文、索引、GitHub Trending、Artificial Analysis、LLM Arena、OpenRouter、模型发布 facts，并更新 `manifest.json`。密钥只走环境变量。
2. [选文](references/02-选文.md)。只打开索引和 Trending 名次，不把整份全文读进上下文。
3. [并行写总结](references/03-并行写总结.md)。子 Agent 用 `--pick` 读快照里的 RSS 正文。订阅源偏短就按短文写，不开网页。
4. [榜单与图](references/04-榜单与图.md)。用快照里已有的榜单和模型发布数据画图、写词云。缺文件就省略对应小节，不现场重抓。
5. [排版与开 PR](references/05-排版与开-PR.md)。按固定章节写入 `ai-news/`，更新索引和说明文件，开 PR，不合并。

写周报时侧重 Agent 与产品。研究向、红队、纯学术长文可以不写。融资、IPO、营收、定价套餐、厂商客户案例等营销内容不收，除非里面有具体技术或产品细节。优惠和白嫖不写进周报。

不要编造数字、名次或快照里没有的事实。
