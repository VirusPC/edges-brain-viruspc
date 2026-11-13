---
name: weekly-ai-blogs-digest
description: 当用户想要汇总一段时间内（默认过去一周）AI / AI Coding 领域的新进展时使用此技能。先读 OPML 订阅并用脚本拉 RSS/Atom，再按固定章节精选成 markdown 周报。栏目名是「AI 资讯」。触发短语："本周 AI 资讯"、"AI Coding 资讯"、"汇总一下 AI 博客"、"weekly AI digest"、"看看这周 AI Coding 有什么新东西"。不要为单篇文章总结（用 summarize-ai-article）或非博客类信源单独触发。
---

## 订阅从哪来

博客订阅的真源是 [`feeds/ai-coding-blogs.opml`](feeds/ai-coding-blogs.opml)，阅读器可以直接导入。Agent 用的退路、对照和备注在 [`feeds/ai-coding-blogs.meta.json`](feeds/ai-coding-blogs.meta.json)。维护规则见 [`feeds/README.md`](feeds/README.md)。

不要再按一份写死的首页网址列表逐站爬。OPML 里没有的站，以 meta 里的退路为准。同一份 OPML 也包含「国内技术团队」「GitHub Trending」和「薅羊毛」。

写周报时**侧重 Agent 与产品**（Agent 产品、编码工具、harness、企业落地）。研究向、红队、纯学术长文不要当作重点，可以不写或一笔带过。不要为了凑篇幅把窗口里每篇文章都铺进去。判断依据是内容，不是 URL 路径。

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

4. 按下面的章节精选成文，不要把窗口内所有文章平铺成清单。条目写短，文风参考既有的 REDoc 演示稿（无文首一级标题，条目用四级标题，有来源的标题直接链到原文）。

5. 跑非博客脚本（见下）。某一项没跑成、或拿不到该期可核验的历史快照，**不要留空标题，也不要拿后来的数据冒充当时，更不要编造**。这一小节直接省略，原因写进同期说明文件。

## 非博客数据

1. **〇、薅羊毛**来自 OPML 分组「薅羊毛」里的 linux.do 福利 RSS，再加上其它博客里明显是优惠、额度、试用的帖子。只保留和 AI / Coding 相关的（模型额度、API、IDE、开发者订阅、给开发者的云主机等）。银行立减金、电商价保、会员日这类日常消费不写。

2. **模型进展里的榜单**
   - Artificial Analysis：跑 `python3 scripts/fetch_artificial_analysis.py --out /tmp/aa-language-models.json`。密钥放在环境变量里，不要写进命令行或仓库。没有密钥或拉不到数据时，这一小节不写，原因写进说明文件。有数据时必须注明来源 [Artificial Analysis](https://artificialanalysis.ai/)。
   - LLM Arena：先 `pip install -r scripts/requirements-leaderboard.txt`，再跑 `python3 scripts/fetch_llm_arena.py --until <窗口结束日> --out /tmp/llm-arena.json`。`--until` 取 `leaderboard_publish_date` ≤ 窗口结束日的最近一份。这不是 RSS，不需要密钥。Arena 官方不提供按周图片存档，图由这份历史榜单重画；上一期已有同一发布日的图时直接复用。要把 Top-N 画成带标记的 SVG，并导出 PNG，用同级 skill [`llm-arena-marked-chart`](../llm-arena-marked-chart/SKILL.md)。图放在「模型进展」开头。图注只写榜单发布日，以及红圈是谁；和上一期是同一份榜时，再加上「较上周无新榜」。新模型标记优先用「相对上一份可核验快照、新进入 Top-N」；只有做不到对比时，才用该绘图 skill 的默认启发。路径和分割写在 `scripts/fetch_llm_arena.py` 开头：`--until` 读 `full` parquet，不带 `--until` 才读 `latest`。

3. **GitHub Trending**在 OPML 分组「GitHub Trending」（mshibanami/GitHubTrendingRSS，第三方抓页，不是 GitHub 官方 RSS）。周报里只保留 **daily / all 的前 5**，放到「项目开源」开头，并写快照日期。窗口内有可核验快照才列。没有可核验快照就整节省略，原因写进说明文件。

```bash
python3 scripts/fetch_artificial_analysis.py --out /tmp/aa-language-models.json
python3 scripts/fetch_llm_arena.py --until YYYY-MM-DD --out /tmp/llm-arena.json
```

## 输出内容模版

文件名：`ai-news/YYYY-MM-DD-ai-news.md`（日期是生成日 D）。写完后更新 [`ai-news/README.md`](../../../ai-news/README.md) 的索引。榜单图和 SVG 真源放在同一目录，正文用相对路径引用 PNG。

说明文件：`ai-news/YYYY-MM-DD-ai-news.notes.md`，与周报同目录。来源细节、密钥缺失、截断或快照缺失的原因写在这里。站点 `/ai-news/` 的列表和正文不展示、不链接这份文件。

栏目名是「AI 资讯」。索引、列表和 RSS 的标题写成 `YYYY-MM-DD AI 资讯`。正文不要写文首一级标题。章节固定为下面这个顺序；某一章确实没有任何可写内容时，整章去掉，不要留空标题。

```
覆盖窗口：{{yyyy-MM-DD}}～{{yyyy-MM-DD}}（生成日 {{yyyy-MM-DD}}）。

## 〇、薅羊毛

#### [标题](url)

短述。

## 一、本周关键词

一行短关键词，作列表摘要和图片 alt。

![一行短关键词](keywords-cloud-YYYY-MM-DD.png)

<!-- keywords-cloud
[{"word":"短关键词","score":5,"mentions":2,"sources":2}]
-->

## 二、模型进展

#### 整体排名

先放榜单图。图注写发布日和红圈是谁；和上一期同一份榜时写「较上周无新榜」。有 Artificial Analysis 就一并写。再写本窗口值得记的模型发布。

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

快照日期。只列前 5。窗口内没有可核验快照时，这一小节不写。后面可再写其它开源项目。

## 四、国内进展

#### &lt;标签&gt;[标题](url)

## 五、国际进展

#### &lt;标签&gt;[标题](url)
```

各章之间可用 `<br/>`。国内 / 国际按主体或主要发生地归类，不按「产品 / 技术」分栏。

### 本周关键词词云

第一行必须是纯文字。它同时是 PNG 的 alt，也是 /ai-news/ 列表页摘要。图片放在这一行下面，不要放到第一行。后面可以继续写短关键词，不要写成「本周风向」那样的长综述。

文件名是 `ai-news/keywords-cloud-YYYY-MM-DD.svg` 与同名 `.png`，日期与周报相同。正文用相对路径引用 PNG，同目录留 SVG。

权重写在章内 `<!-- keywords-cloud ... -->` 的 JSON 数组里。有 `weight` 就直接用（1.0–5.0，保留 1 位小数）。没有 `weight` 时：

```
mentionPart = min(mentions, 4) / 4 * 5
sourcePart = min(sources, 3) / 3 * 5
weight = clamp(round1(0.6 * score + 0.25 * mentionPart + 0.15 * sourcePart), 1, 5)
```

`score` 是模型给该词的 1–5 分，缺省 1。`mentions` 是本期 `####` 条目里出现该词的条数，关键词章不计，上限 4。`sources` 是这些条目标题链接和短述行内链接的 hostname 数，同一 hostname 只计一次，上限 3。对单条（标题行加短述）用 [`scripts/source_hostnames.mjs`](scripts/source_hostnames.mjs) 的 `sourceHostnames()` 提取；绘图脚本只消费这里写好的数字，有 `weight` 就直接画。字号是 `round(18 + (weight - 1) / 4 * 40)`：权重 1 为 18px，权重 5 为 58px。词全部水平放置。放不下就停，不要静默丢词。

默认配色 `--palette ink-sans`（2026-11-12 从三套样例里选定）：思源黑体粗体，家族名 `Noto Sans CJK SC`，字重 700。底色 `#fffcf7`，最大词 `#b4541f`，其余大词 `#1c1b19`，中小词 `#3d3a34`、`#5c574e`。另两套预设：`serif-earth`（思源宋体，暖褐）、`wenkai-pine`（霞鹜文楷，青绿）。测量和 PNG 用同一个字体文件。找不到该文件就停，不要换别的中文字体。

在本 skill 目录：

```bash
npm install
node scripts/render_keyword_cloud.mjs \
  --md ../../../ai-news/YYYY-MM-DD-ai-news.md \
  --out-svg ../../../ai-news/keywords-cloud-YYYY-MM-DD.svg \
  --out-png ../../../ai-news/keywords-cloud-YYYY-MM-DD.png
```

换预设或指定字体：`--palette serif-earth`，或 `--font-file <字体文件> --font-family <家族名>`。家族名要和字体文件里的名字一致。PNG 由 `@resvg/resvg-js` 从 SVG 导出。只给新的一期出图；更早各期是否补图另定。

### 单条模版

```md
#### {{可选标签}}[{{标题}}]({{url}})

{{短述}}
```

标签留在链接外。没有来源 URL 的标题保持纯文字，例如章节标题、「整体排名」、「本周关键词」和纯图标题。

要求：

1. 单条尽量短，不要超过 200 字。
2. 和 AI Coding / Agent 相关时，用一句话点出对研发的落地点。
3. 同一主题的多篇合成一条。标题用主链接：按书写顺序，取第一条链接文字不是「社区帖」的来源；来源都是「社区帖」时用第一条。其余链接接在短述末尾，链接文字保持原样。
4. 已经是列表项、项内自带链接的（如「其他短讯」），把加粗名称做成该项的链接，地址仍留在这项里。

## 强制要求

1. 网站链接必须真实有效。失效链接须修复或排除。
2. 只写窗口内的文章；生成日当天的内容不属于这一期。
3. 优先用 feed 正文。只有正文不够、失败或被截断，或该站只能走列表页时，才再抓页面。
4. 维护订阅时：没有可用原生 feed，可以订公开的抓取 RSS 或 BestBlogs 转换源，并保留列表页退路；已经有可用原生 feed 的站不要再并一份抓取源。研究向的源不要新加进订阅。
5. 不要编造 Trending 名次或榜单数字。缺了的原因写进说明文件。

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
