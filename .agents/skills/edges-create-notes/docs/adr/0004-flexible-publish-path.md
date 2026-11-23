# ADR 0004: 入库提交路径灵活，不强制云 agent

## Status
Accepted

## Context
旧 skill 强制 Cursor cloud agent。用户允许本助手直接提交；大代码改动仍宜走云端。

## Decision
不强制单一入库通道。文档类笔记更新可由已授权助手直接 commit/push；大范围代码需求仍走云 agent。须带 Co-authored-by；用户明示除外的静默乱推仍禁止。

## Consequences
edges-publish 与本 skill 对齐为「灵活」；助手凭任务性质选择通道。
