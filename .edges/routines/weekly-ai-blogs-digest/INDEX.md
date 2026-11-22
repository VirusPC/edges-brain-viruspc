---
name: weekly-ai-blogs-digest
description: '每周五 09:00 运行 AI 资讯周报，调用 weekly-ai-blogs-digest，周报与数据快照各开 PR、不合并。'
---
# 日程

这条 Grok Bot routine 何时跑、密钥留在哪。采集、选文、总结、章节和排版只看 [SKILL.md](../../../skills/managed/weekly-ai-blogs-digest/SKILL.md)，这里不抄那五步。这不是跨厂商共用格式。

- cron: `0 9 * * 5`
- timezone: Asia/Shanghai
- timing: flexible ±15 分钟（early/late 各 15）
- platform: Grok Bot routine
- id: ai-coding
- owner: AI 资讯
- skill: [SKILL.md](../../../skills/managed/weekly-ai-blogs-digest/SKILL.md)

## 定义来源与运行入口

仓库中的本入口是期望定义；外部平台负责实际调度与执行。维护这条记录不配置平台。

- repository: [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)
- entry: `.edges/routines/weekly-ai-blogs-digest/INDEX.md`
- ref: 默认读取仓库默认分支 `main` 的最新版本；接入方明确指定的 branch、tag 或 commit 优先于默认值。

平台每次运行前必须把所选 ref 解析成一次 commit，用这一版重新读取本 `INDEX.md`，再读取这里引用的 Skill。Skill 指向的 `references/` 也用同一 commit。所选 ref 不存在，或本入口、Skill、以及这次要执行的那份 reference 读不到，就停止本次运行并报告来源、ref、路径与失败原因。不回退到别的分支，也不沿用以前保存的提示词。

`owner` 只是原有作者标签，不表示平台账号、授权状态或运行状态。

## 平台接入

只记 `ai-coding` 这条定时任务怎么跑。窗口、正文和章节以 Skill 为准。

- 交付：回到这条定时任务所在的对话。
- 结果：周报 PR 写在本仓 `ai-news/`，快照 PR 写在 [VirusPC/ai-news-data](https://github.com/VirusPC/ai-news-data) 的 `issues/YYYY-MM-DD/`。两个 PR 都开着，不合并。回复里给出两个链接，以及这份快照缺了什么。
- 生成来源：动手前把所选 ref 解析成的完整 commit，连同本文件路径 `.edges/routines/weekly-ai-blogs-digest/INDEX.md` 和 skill 路径 `skills/managed/weekly-ai-blogs-digest/SKILL.md`，写入周报正文的 provenance 注释。数据快照用数据仓里已经存在的那次提交和 `issues/YYYY-MM-DD`，`kind` 为 `tree`。没解析到或没落库的一侧写 `null`。不要把即将提交的周报稿自己的 commit 填进去。格式见 skill 的排版一步。

### 密钥

`OPENROUTER_API_KEY` 和 `AA_API_KEY` 只在 box 的环境里。要这两份数据，就在 box 上拉。密钥不发给云端。

- 只在 box 上用 `[ -n "$OPENROUTER_API_KEY" ]` 和 `[ -n "$AA_API_KEY" ]` 看有没有设置。
- 不打印，不写进文件、日志或提交。
- 云端没有这两把密钥。没有密钥就按 Skill 跳过对应文件，在 manifest 和说明里写明没拉。

### 交接

box 把不含密钥的 JSON 写到：

`/cursor/stores/store-f2a99105-0bec-4f8e-95cf-507b07e0e1e9/ai-news-data/YYYY-MM-DD/`

云端读映射后的同一份：

`/cursor/stores/bot/ai-news-data/YYYY-MM-DD/`

日期与周报生成日相同。这只是 box 到云端的交接，不是另一份真源。入库位置仍是数据仓的 `issues/YYYY-MM-DD/`。

## 关键词

产品名和品牌名只收这一期覆盖窗口里新发布、或第一次公开的。窗口之前就有的产品，哪怕这期很多篇都提到，也不写进词云。Codex、Claude Code、OpenRouter 就是这种。

文章里的概念和已有说法可以留，例如常驻 Agent、本体、软件工厂、Skill 自进化、验证闭环。模型进展里本周新发布的模型，用它的官方名，可以留。不要把两件事拼成一个新词。

选词之外的计分和画图仍看 Skill 的榜单与图。

## 订阅源兜底

订阅真源仍是 Skill 目录的 [OPML](../../../skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.opml) 与 [meta.json](../../../skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.meta.json)。这一节只约定兜底。

同一发文方保留一个主源，另加若干备源。优先官方原生 RSS 或 Atom。没有原生源，或原生源停更时，用公开抓取 RSS 和转换源彼此作备源。列表页和 `listUrls` 是最后退路：主源和备源报错、停更，或当前 feed 覆盖不到这一期窗口（脚本标 `truncated`）时才用。feed 仍覆盖窗口时，不把官网列表和微信主源一起采。已经有可用原生 feed 的站，不再并一份抓同一页的源。

现有字段下，备源是一条独立 source，并写入 OPML。`publisher` 标发文方，`role` 为 `primary` 或 `backup`。`fallback` 只表示退路类型。只写在 notes 里的 URL，运行时不拉。

每次运行先体检。报错、条目为 0、最新条目早于约一个月的源，写入当期快照的 `health`，并在说明里照实写。没有拉到的就写没有拉到。

主源报错、停更，或 feed 覆盖不到窗口时，用该发文方的备源。备源再失败，走列表页。列表页只有标题、链接和日期时，就只记这些，不把列表简介写成全文，也不为了补长去打开文章页。列表页也补不到的，在 notes 写明。历史窗口的列表若当天页面已经滚走，可以用该 `listUrls` 在生成日附近的公开存档，并写下捕获时间。存档地址不是另一条 OPML 源。

多源合并先按规范化 URL 去重，再按规范化标题去重，留下正文更完整的一条。标题在去掉首尾空白和句末标点、合并空白并忽略大小写之后相同；较短的一条至少 16 个字符，且较长一条紧跟着句末标点时，也视为同一篇。日期对不上时，以官网列表或 sitemap 为准。

同一发文方连续两期主源和备源都失败时，在当期说明里提示换源。运行时不改 OPML。

## 非博客历史

OPML 仍是博客订阅的真源。这一节不是新的 OPML 源，脚本也不会因为写在这里就去拉。

OpenRouter 的历史用量首选官方 Data API，需要 `OPENROUTER_API_KEY`。公开榜只有 Today、This Week、This Month，历史图是周一桶并且只显示 Top 9 + Others，没有自定义历史榜或下载。官网浏览是能力有限的最后退路，不能当成完整周榜。`rankings-daily` 每天是 Top 50 加一行 other；脚本再聚合成 15 条，不是无损周榜。`category=programming&period=week` 是采样周，不是公开页按编程语言画的图。

Artificial Analysis 公开榜 `https://artificialanalysis.ai/leaderboards/models` 能打开，没有重定向。控件是 Weights、Size、Price、Reasoning、Status:Current，没有 as-of。免费接口 HTTP 200 只说明密钥有效、当前目录能取到，不提供历史排名。Intelligence Index 的版本史是方法变更，不是过去的名次。`artificial_analysis_coding_index` 恒为 null，因为不再发布 Coding Index，不是采集失败。文档里 performance-over-time 和原始测量属于 Commercial。OpenAPI 下载是 schema。这只覆盖实际打开的榜页和 Data API 文档，不据此说所有商业产品都没有历史。当前值不写入历史期。

GitHub Trending 没有官方历史接口。`since=weekly` 这个 URL 本身不能证明页面是 This week；浏览器里 Date range 为 Today 的捕获不能当周榜。能留下的历史只限文本写明 this week、并且保留页面顺序的捕获。按周增星重排的榜是另一种指标。这种捕获不是另一条 OPML。
