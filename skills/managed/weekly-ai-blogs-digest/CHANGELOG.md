# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-22

### Added

- **版本：** frontmatter 增加 `version`。规则版本用 skill 名和这个 semver，不再用仓库和 commit。

### Changed

- **输入：** 数据仓库只保留 URL，以及可选的基准 commit（缺省为默认分支最新提交）。删掉规则仓库和站点仓库。脚本在数据仓库的工作副本里写 `issues/<生成日>/`。
