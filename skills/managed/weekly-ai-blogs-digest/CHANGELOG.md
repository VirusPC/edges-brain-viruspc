# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-22

### Changed

- **产出止于 summary/。** 不再把写站点、周报 markdown 或 Pages 发布算进本 skill。默认定时只开一个数据 PR。
- **脚本按阶段目录写数据树。** 采集、榜单、关键词脚本移到 `scripts/<阶段>/<子阶段>/`，输出进 `raw/`、`cleaned/`、`summary/`。
- **关键词**只从 `summary/` 三路卡片生成 `summary/keywords.json`。

## [0.1.0] - 2026-11-22

### Added

- **版本：** frontmatter 增加 `version`。规则版本用 skill 名和这个 semver，不再用仓库和 commit。

### Changed

- **输入：** 数据仓库只保留 URL，以及可选的基准 commit（缺省为默认分支最新提交）。删掉规则仓库和站点仓库。脚本在数据仓库的工作副本里写 `issues/<生成日>/`。
