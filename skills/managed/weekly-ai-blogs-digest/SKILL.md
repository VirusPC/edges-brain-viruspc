---
name: weekly-ai-blogs-digest
description: 当用户想要汇总一段时间内（默认过去一周）AI / AI Coding 领域的新进展时使用此技能。先读 OPML 订阅并用脚本拉 RSS/Atom，再按固定章节精选成 markdown 周报。触发短语："本周 AI 资讯"、"汇总一下 AI 博客"、"weekly AI digest"、"看看这周 AI Coding 有什么新东西"。不要为单篇文章总结（用 summarize-ai-article）或非博客类信源单独触发。
---

## 订阅从哪来

博客订阅的真源是 [`feeds/ai-coding-blogs.opml`](feeds/ai-coding-blogs.opml)，阅读器可以直接导入。Agent 用的退路、对照和备注在 [`feeds/ai-coding-blogs.meta.json`](feeds/ai-coding-blogs.meta.json)。维护规则见 [`feeds/README.md`](feeds/README.md)。

不要再按一份写死的首页网址列表逐站爬。OPML 里没有的站，以 meta 里的退路为准。同一份 OPML 也包含「国内技术团队」「GitHub Trending」和「薅羊毛」。

写周报时**侧重 Agent 与产品**（Agent 产品、编码工具、harness、企业落地）。研究向、红队、纯学术长文不要当作重点，可以不写或一笔带过。不要为了凑篇幅把窗口里每篇文章都铺进去。

## 任务执行流程

生成日记为 D。覆盖窗口是 D-7 到 D-1（含两端，不含 D）。用户指定了别的日期就用用户的。时间窗必须写进正文，而且要严格遵守。

1. 在本 skill 目录拉订阅：

```bash
pip install -r scripts/requirements.txt
python3 scripts/fetch_feeds.py --since YYYY-MM-DD --until YYYY-MM-DD --out /tmp/ai-coding-feeds.json
```

日期要显式传入，不要依赖跑脚本那台机器的时区。

2. 读脚本写出的结果来写周报，不要把原始 feed 整份塞进上下文。正文够写摘要，就不要再打开原文；正文太短、某站失败、或 feed 明显被截断时，再用该站列表页或文章页补。链接必须是 feed、列表页、站点地图或文章页里真实出现的地址；对不上就修，修不了就去掉。

3. 优惠、额度、白嫖类只进「〇、薅羊毛」，不要在后面章节再出现一次。

4. 按下面的章节精选成文，不要把窗口内所有文章平铺成清单。条目写短，文风参考既有的 REDoc 演示稿（无文首一级标题，条目用四级标题，链接写成「原始链接」）。

5. 跑非博客脚本（见下）。某一项没跑成、或拿不到该期可核验的历史快照，**不要留空标题，也不要拿后来的数据冒充当时，更不要编造**；在相应章节里用一句话如实说明缺了什么。

## 非博客数据

1. **〇、薅羊毛**来自 OPML 分组「薅羊毛」里的 linux.do 福利 RSS，再加上其它博客里明显是优惠、额度、试用的帖子。只保留和 AI / Coding 相关的（模型额度、API、IDE、开发者订阅、给开发者的云主机等）。银行立减金、电商价保、会员日这类日常消费不写。

2. **模型进展里的榜单**
   - Artificial Analysis：跑 `python3 scripts/fetch_artificial_analysis.py --out /tmp/aa-language-models.json`。密钥放在环境变量里，不要写进命令行或仓库。没有密钥或拉不到数据时，**整节不写**，也不要在「模型进展」里留一个空的 Artificial Analysis 小标题。有数据时必须注明来源 [Artificial Analysis](https://artificialanalysis.ai/)。
   - LLM Arena：先 `pip install -r scripts/requirements-leaderboard.txt`，再跑 `python3 scripts/fetch_llm_arena.py --out /tmp/llm-arena.json`。这不是 RSS，不需要密钥。要把 Top-N 画成带标记的 SVG，并导出 PNG，用同级 skill [`llm-arena-marked-chart`](../llm-arena-marked-chart/SKILL.md)。图放在「模型进展」开头。新模型标记优先用「相对上一份可核验快照、新进入 Top-N」；只有做不到对比时，才用该绘图 skill 的默认启发。当前脚本默认只拉最新一期，若最新发布日落在本窗口之外，不要把它写成窗口内快照。

3. **GitHub Trending**在 OPML 分组「GitHub Trending」（mshibanami/GitHubTrendingRSS，第三方抓页，不是 GitHub 官方 RSS）。周报里只保留 **daily / all 的前 5**，放到「项目开源」开头，并写明快照日期。脚本现在往往只能拿到「今天」的快照；如果那一天不属于本窗口，就不要当作当周 Trending，并写明未能取回窗口内的历史快照。

```bash
python3 scripts/fetch_artificial_analysis.py --out /tmp/aa-language-models.json
python3 scripts/fetch_llm_arena.py --out /tmp/llm-arena.json
```

## 输出内容模版

文件名：`ai-news/YYYY-MM-DD-ai-coding-news.md`（日期是生成日 D）。写完后更新 [`ai-news/README.md`](../../../ai-news/README.md) 的索引。榜单图和 SVG 真源放在同一目录，正文用相对路径引用 PNG。

不要写文首一级标题。章节固定为下面这个顺序；某一章确实没有任何可写内容时，整章去掉，不要留空标题。

```
覆盖窗口：{{yyyy-MM-DD}}～{{yyyy-MM-DD}}（生成日 {{yyyy-MM-DD}}）。

## 〇、薅羊毛

#### 标题

短述。

> 原始链接：[标题](url)

## 一、本周关键词

一行一条短关键词，不要写成「本周风向」那样的长综述。

## 二、模型进展

#### 整体排名

先放榜单图（有 Artificial Analysis 就一并写；没有就只写 Arena，不要空着 AA）。再写本窗口值得记的模型发布。

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

来源与快照日期。只列前 5。后面可再写其它开源项目。

## 四、国内进展

#### &lt;标签&gt;标题

## 五、国际进展

#### &lt;标签&gt;标题
```

各章之间可用 `<br/>`。国内 / 国际按主体或主要发生地归类，不按「产品 / 技术」分栏。

### 单条模版

```md
#### {{可选标签}}{{标题}}

{{短述}}

> 原始链接：[{{标题}}]({{url}})
```

要求：

1. 单条尽量短，不要超过 200 字。
2. 和 AI Coding / Agent 相关时，用一句话点出对研发的落地点。
3. 同一主题的多篇可合并成一条，并附上全部原始链接。

## 强制要求

1. 网站链接必须真实有效。失效链接须修复或排除。
2. 只写窗口内的文章；生成日当天的内容不属于这一期。
3. 优先用 feed 正文。只有正文不够、失败或被截断，或该站只能走列表页时，才再抓页面。
4. 维护订阅时：没有可用原生 feed，可以订公开的抓取 RSS 或 BestBlogs 转换源，并保留列表页退路；已经有可用原生 feed 的站不要再并一份抓取源。研究向的源不要新加进订阅。
5. 历史快照缺失时如实说明，不要编造 Trending 名次或榜单数字。

## 参考播客列表（可选信源）

播客不是博客，默认不逐期总结；用户要求时，或这一窗口有和 AI / Agent 强相关的一期时，只在「本周关键词」或相关章节点名一句并附链接。不要把播客加进 OPML，也不要为播客跑这个脚本。

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
