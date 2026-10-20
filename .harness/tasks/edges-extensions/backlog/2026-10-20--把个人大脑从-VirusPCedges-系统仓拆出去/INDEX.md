---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-20T02:29:59.057Z'
  edges-title: 把个人大脑从 VirusPC/edges 系统仓拆出去
  edges-tasks-status: backlog
  edges-task-priority: none
name: 把个人大脑从_viruspc_edges_系统仓拆出去
description: 现在系统实现和个人知识混在同一个公开仓里。拆开以后，edges 只放系统本身，个人大脑走独立仓，再用 Compose 挂回来。
---
**背景：**
peng cheng 觉得 VirusPC/edges 不该把 Edges 系统和个人大脑混在一起。现在这个仓既有 CLI、extensions、skills、协议，也有笔记、教学、任务和记忆等内容。Compose 已经合进 main，正好可以挂外部记忆仓。公开仓还有脱敏约束，个人材料本来就不适合和系统代码同仓维护。
- 相关现状：Compose 已落地（#270/#271/#272）；登记默认检出到 `~/.edges/composed/<name>`；按工作空间再 checkout worktree 仍是待定
- 预期收益：系统仓只谈产品本身；个人知识独立演进、权限更干净；Compose 有第一个真实用例
- 非目标：本卡不定私人仓名字、不定迁哪些目录、不定迁移脚本；不在本卡里改 Compose 实现
- 关联：Compose 方案与实现；兄弟卡「Compose worktree 写入与 compose sync」仍待定

**目标：**
VirusPC/edges 只承载 Edges 系统；个人大脑落在独立仓库，经 Compose 挂到系统仓使用。

**完成标准：**
- [ ] 有一份拍板的边界：系统仓留什么、个人仓放什么
- [ ] 个人大脑有独立仓库，并从 edges 通过 Compose 登记挂上
- [ ] 该迁出的内容已迁出；edges 公开仓不再混入个人大脑主体
- [ ] AGENTS.md / README 写清两边各自职责，以及怎么用 Compose 挂个人仓
