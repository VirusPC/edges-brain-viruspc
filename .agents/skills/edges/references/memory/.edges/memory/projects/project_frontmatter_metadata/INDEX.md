---
name: project_frontmatter_metadata
description: >-
  改普通记忆条目的 YAML 头、或读旧扁平文件时：写入只留 name/description/metadata，实现字段进
  metadata.edges-*；闭集以 https://agentskills.io/specification 为准。读取兼容顶层旧键。
metadata:
  edges-title: 普通记忆 frontmatter 跟 Agent Skills 闭集
  edges-type: project
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-09-08T17:31:08+08:00'
---

普通记忆（feedback / project / reference）落盘改为 Agent Skills 闭集：顶层只有 `name` / `description` / `metadata`，实现字段进 `metadata.edges-*`。读取同时认旧的扁平顶层键，两边都有时 metadata 赢。闭集以 <https://agentskills.io/specification> 为准。

**Why:** 用户要求记忆文件遵循 skill 规范，避免顶层自定义键和将来 vendor 字段静默撞车。2026-08-26 选扁平是为了 `rg` 一行命中；现在解析会摊平 metadata，索引与更新不再依赖顶层。`skills` 类型本来就是这套形状，普通记忆与它对齐后，remember 更新也能找回写在 metadata 里的 title。

**How to apply:** 新写入走 `index.tmpl.md`，条目使用 `<type>_<slug>/index.md`，name 来自内容目录名。不要手写顶层 `title` / `type` / `username` / `email` / `updatedAt` / `originSessionId` / `agentClient`。存量扁平顶层键在读取时摊平。不要调用已删除的 `project-memory-doctor`。新写入走模板，正文不动。PROTOCOL 的 `description` 必需、`name`/`type`/`updatedAt` 含义不变，只是后两个不再出现在 YAML 顶层。规范有更新时先打开 spec 页，再决定要不要改模板。
