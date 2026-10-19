# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-19

### Added

- 新增 beta 引导：用 `edges compose` 把外部 harness 仓库挂到当前 scope。`register` 必须带 `--description`，写清这个仓存什么、什么时候该写进去。常见流程是 register、clone、list；pull、push、unregister 可选。git 鉴权由用户在自己的终端完成，AI 不经手 token。
