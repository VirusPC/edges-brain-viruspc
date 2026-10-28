---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-28T01:24:42.010Z'
  edges-title: 框架 README 新人安装改为 npx skills
  edges-tasks-status: backlog
  edges-task-priority: medium
name: 框架_readme_新人安装改为_npx_skills
description: 根 README「怎么开始」改为以 npx skills 安装随包 skill 为主路径，去掉 raw SKILL.md URL 粘贴法
---
## 背景

2026-10-28 用户对 Grok Bot 说：框架仓 README 有问题，安装方式应让大家直接装 Skill（`npx skills`）。当时开过云端代理改 README，用户随即改口要先核对项目记忆与 skill 布局，代理被取消，窗口内未再落卡、也无 PR。

## 目标

- 根 README 新人主路径改为 `npx skills@latest add …`（具体子路径以当时 packages/skills 布局与项目记忆为准）。
- 不再把 raw.githubusercontent.com 的 SKILL.md URL 粘贴当主安装法。
- 与「随包 skill 默认 edges 总入口」约定一致；必要时同步 onboarding / 文档里仍写旧路径的句子。

## 完成标准

- [ ] 根 README「怎么开始」以 npx skills 为主，旧 raw 链接降级或删除
- [ ] 与现行 `packages/skills/` 布局（总入口 edges + 例外）一致，无过期路径
- [ ] 开到 VirusPC/edges main 的 PR，经用户审后合入

## 备注

实现应在框架仓 VirusPC/edges；本卡在公开脑跟踪漏记。grill 前先 memory ask。
