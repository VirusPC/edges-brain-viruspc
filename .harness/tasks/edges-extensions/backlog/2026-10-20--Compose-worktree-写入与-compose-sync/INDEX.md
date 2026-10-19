---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-19T17:58:46.413Z'
  edges-title: Compose worktree 写入与 compose sync
  edges-tasks-status: backlog
  edges-task-priority: none
name: compose_worktree_写入与_compose_sync
description: clone/pull 后建 worktree；写入走 worktree；compose sync 做 commit+push+PR；合入后 prune。
---
**背景：**
本会话从「本地 Cursor 改完没 push」出发，先 grill 同步时机，后澄清 compose 还可挂组件仓与学习仓。行业方案（submodule/subtree/meta/ghq 等）比对后仍用现有 compose + Node Tree，不设 write/pin/learn 种类。第二轮起改为「每主仓 worktree，从 worktree push/PR」，并拍板路径、分支名、同步命令与并发策略。
- 相关现状：compose 已有 register/clone/pull/push；CLI 写盘不 commit（见 ADR 0034）
- 预期收益：写完可稳定同步到远程，合入后本地不留脏树
- 非目标：替换 compose 底座；抢 npm/Go；自动合 PR；引入挂载种类枚举
- 关联：笔记 notes/2026-10-20--多仓整仓挂载行业方案与-compose/；html-plan 多轮 artifacts；ADR 0039 / 0034

**目标：**
Agent/CLI 写仓时默认落 worktree；可交付或用户说「提交」时能用 compose sync 稳定同步到远程（含 PR）；合入后 prune 干净。

**动作：**
- clone/pull 成功后自动建 ~/.edges/worktrees/<name>/<branch>；分支 agent/<slug>-<短哈希>
- 新增 edges compose sync（push 保留底层）；skill 规定可交付或「提交」时调用
- 主检出默认只 pull；同仓可并行多 worktree；合入后 prune
- 写 ADR 0039；更新 compose skill；开实现 PR（不合入除非用户说 merge）

**完成标准：**
- [ ] clone/pull 后自动出现约定路径 worktree
- [ ] 默认写入不落主检出
- [ ] compose sync 完成 commit+push+开/更新 PR
- [ ] 合入后 prune 可清 worktree+分支
- [ ] skill 写明调用时机；有 ADR 0039
