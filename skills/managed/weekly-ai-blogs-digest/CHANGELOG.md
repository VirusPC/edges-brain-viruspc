# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.8] - 2026-11-23

### Added

- 总结阶段在关键词之后新增 `summary/overview.json`。Agent 按 `references/summarize/overview.md` 的提示词写 3 到 5 条主线，脚本只校验。正文 `text` 与引用 `refs`（`{id, label}`）分开存。
- 第一章在 `summary/index.json` 里改名为「本周概览」。词云仍来自 `keywords.json`，总结来自 `overview.json`。某一期没有 `overview.json` 时，校验不通过，站点构建也失败。
- 合进 main 之后的 annotated tag `skill/weekly-ai-blogs-digest@0.0.8` 先不打，留给维护者。

## [0.0.7] - 2026-11-23

### Changed

- 根 `SKILL.md` 只保留步骤顺序和子步骤链接。每个子步骤说明自己写输入、输出、脚本命令、schema 和校验命令；该步写完立刻校验，阶段汇合仍走 `check.md`。
- 文章抓取拆成三件工具：`check_subscription.py` 核对 OPML，`fetch_source.py` 按点名的源返回原文和体检，`write_feeds.py` 只合并调用方已经选定的源。脚本不再在主源不可用时自动并入备源，也不再列出全部已配置备源。备源是否启用写在 `references/prepare/articles.md`。
- 去掉 `feeds.index.json`。目录树里没有这个文件。
- 缺少 `--since` 或 `--until` 时直接退出，不用运行当天或昨天补窗口。OpenRouter 用量两个参数缺一就退出。LLM Arena 缺 `--until` 就退出，不读 `latest`。AA 全量和 OpenRouter 端点本来就不按文章窗口过滤。
- GitHub Trending 每周总榜改由 `scripts/prepare/projects/fetch_github_trending.py` 抓取，按 XML 原始顺序写入 `raw/projects/github-trending.json`，不再从 `feeds.json` 抽取。
- 发布方、分类和网站改在清洗阶段用 `scripts/clean/stamp_publishers.py` 写入 `cleaned/`。汇合脚本 `write_index.py` 只重写 `summary/index.json`，不回写 `cleaned/`。
- 合进 main 之后的 annotated tag `skill/weekly-ai-blogs-digest@0.0.7` 先不打，留给维护者。

## [0.0.6] - 2026-11-23

### Changed

- GitHub Trending 只订每周总榜（`github-trending-weekly-all`），从 OPML、元数据和抓取校验里去掉 Python、TypeScript 等语言榜，也不再订 daily。信息源汇总只保留这一份总榜，发布方网址是 `https://github.com/trending?since=weekly`。
- 准备阶段校验拒绝语言榜或 daily 榜出现在订阅、`feeds.json` 或 `github-trending.json` 里。合进 main 之后的 annotated tag `skill/weekly-ai-blogs-digest@0.0.6` 先不打，留给维护者。
- 本技能按「只升 patch」规则，把当日一度发布的 `0.1.0` 改回 `0.0.6`。内容与 GitHub Trending 每周总榜这次改动相同，版本号不再使用 minor。
- `fetch_feeds.py` 的默认 OPML / meta 路径改到技能根目录，`--check` 和 `--self-test` 不再误读 `scripts/prepare/feeds/`。

## [0.0.5] - 2026-11-23

### Changed

- `summary/index.json` 的 `skill` 改成 `{name, version}`，去掉顶层 `version` 和 `blocks`。`routine` 记录调用时的仓库、commit 和入口路径。整页校验拒绝 `blocks`，也拒绝 summary 里的 `<!-- provenance` 注释。
- 订阅发布方写在 OPML：每条 feed 有 `category`、`publisher`，备源标 `role="backup"`，读者看到的网站是 `htmlUrl`（不是 `xmlUrl`）。同一发布方多条 feed 合成一个名字。模型榜单不是 RSS，写在 `feeds/ai-coding-blogs.meta.json` 的 `boards`。
- 汇合脚本给 cleaned 条目补 `publisher`、`category`、`url`，并写入 `sources`：模型榜单、GitHub Trending、博客、国内互联网。每类有总条数，每个发布方有 `{name, url, count}`。补录算进该发布方，不单列。raw 不改。
- OPML 分组「AI Coding Blogs」改名为「博客」，「国内技术团队」改名为「国内互联网」。发布方用团队名，大淘宝技术记为「大淘宝」。
- `sources` 列出全部已订阅发布方，本周 0 条也保留。模型榜单没有可数条目时 `count` 为 `null`。不写 RSS 地址。以后的下载按钮只链到脑仓 `feeds/ai-coding-blogs.opml`，页面先不渲染。
- 去掉 `summary/index.json` 的 `data.commit`。数据版本由站点在构建时对数据仓库执行 `git log -1 -- issues/<生成日>`。
- 关键词脚本不再把卡片标题原样写成词。

## [0.0.4] - 2026-11-23

### Added

- `summary/index.json` 增加 `articles_coverage`。`raw` 是本期原文篇数，`selected` 是精选篇数，等于 summary 文章数。汇合时用 `scripts/summarize/merge/article_coverage.py` 统计，口径见 `references/summarize/merge.md`。整页校验要求 `selected` 等于 summary 文章数，并且原文不少于清洗后的 id 数。
- 合进 main 之后的 annotated tag `skill/weekly-ai-blogs-digest@0.0.4` 先不打，留给维护者。

## [0.0.3] - 2026-11-23

### Changed

- **去掉遗留。** 删掉一次性迁移脚本和词云渲染脚本。关键词阶段只产出 `summary/keywords.json`。references 里不再写站点渲染或 markdown 正文步骤。
- 这三个版本之前发布过为 0.1.0 / 0.2.0 / 0.2.1，现在按用户要求重排为 0.0.x。
- 版本号仍按 Edges skill 约定。合进 main 之后，在那个 commit 上打 annotated tag `skill/weekly-ai-blogs-digest@0.0.3`。

## [0.0.2] - 2026-11-22

### Changed

- **产出止于 summary/。** 不再把写站点、周报 markdown 或 Pages 发布算进本 skill。默认定时只开一个数据 PR。
- **脚本按阶段目录写数据树。** 采集、榜单、关键词脚本移到 `scripts/<阶段>/<子阶段>/`，输出进 `raw/`、`cleaned/`、`summary/`。
- **关键词**只从 `summary/` 三路卡片生成 `summary/keywords.json`。

## [0.0.1] - 2026-11-22

### Added

- **版本：** frontmatter 增加 `version`。规则版本用 skill 名和这个 semver，不再用仓库和 commit。

### Changed

- **输入：** 数据仓库只保留 URL，以及可选的基准 commit（缺省为默认分支最新提交）。删掉规则仓库和站点仓库。脚本在数据仓库的工作副本里写 `issues/<生成日>/`。
