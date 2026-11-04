---
name: reference_official_skills_spec
description: 写或核对 SKILL.md / 普通记忆 YAML 头时查：顶层闭集、name 规则、metadata 用途。规范 https://agentskills.io/specification；本仓与生态落差见 extensions 的 reference_skill_format_spec。
metadata:
  edges-title: Agent Skills 规范正文
  edges-type: reference
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-08T17:31:08+08:00"
---

规范正文在 <https://agentskills.io/specification>。校验器用 [`skills-ref`](https://github.com/agentskills/agentskills/tree/main/skills-ref)（`skills-ref validate ./my-skill`）。客户端名录 <https://agentskills.io/clients>。

**Why:** 普通记忆 frontmatter 已按这份闭集落盘；写 skill 或改 `type_slug.tmpl.md` / `SKILL.tmpl.md` 时要以规范为准，不要凭印象加顶层字段。本仓对「生态普遍不遵守闭集、自定义数据仍该进 metadata」的实测在 [`.edges/memory/references/reference_skill_format_spec`](../../../../../../../../../.edges/memory/references/reference_skill_format_spec/INDEX.md)，不要在这里再抄一遍。

**How to apply:** 顶层只允许 `name`、`description`（必需）和 `license`、`compatibility`、`metadata`、`allowed-tools`（可选）。其余一律进 `metadata`，键名加前缀（本实现用 `edges-`）。真实 skill 的 `name` 必须等于父目录、kebab-case、1–64 字符、不能首尾或连续连字符；普通记忆的 `name` 仍是文件名去后缀（snake_case 带类型前缀），不套这条目录名规则。字段有争议时打开规范页，不要改 PROTOCOL。
