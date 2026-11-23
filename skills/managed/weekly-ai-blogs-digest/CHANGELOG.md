# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.4] - 2026-11-23

### Added

- `summary/index.json` 增加 `articles_coverage`。`raw` 是本期原文篇数，`cleaned` 是清洗后篇数。汇合时用 `scripts/summarize/merge/article_coverage.py` 从本期 `raw/` 和 `cleaned/` 统计，口径见 `references/summarize/merge.md`。这不是精选入选数。
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
