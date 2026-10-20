---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-20T03:20:00.000Z'
  edges-title: 把个人大脑从 VirusPC/edges 系统仓拆出去
  edges-tasks-status: in_progress
  edges-task-priority: none
name: 把个人大脑从_viruspc_edges_系统仓拆出去
description: 现在系统实现和个人知识混在同一个公开仓里。拆开以后，edges 只放系统本身，个人大脑走独立仓，再用 Compose 挂回来。
---

**背景：**
peng cheng 觉得 VirusPC/edges 不该把 Edges 系统和个人大脑混在一起。现在这个仓既有 CLI、extensions、skills、协议，也有笔记、教学、任务和记忆等内容。Compose 已经合进 main，正好可以挂外部记忆仓。公开仓还有脱敏约束，个人材料本来就不适合和系统代码同仓维护。
- 相关现状：Compose 已落地（#270/#271/#272）；登记默认检出到 `~/.edges/composed/<name>`；按工作空间再 checkout worktree 仍是待定
- 预期收益：系统仓只谈产品本身；个人知识独立演进、权限更干净；Compose 有第一个真实用例
- 非目标：不在本卡里改 Compose 实现与 ADR 0039（worktree / sync）；迁移脚本细节在实现阶段落，不另开产品决策
- 关联：Compose 方案与实现；兄弟卡「Compose worktree 写入与 compose sync」仍待定

**已拍板的边界（2026-10-20）：**
- 系统仓留下：`extensions/`（CLI）、`scripts/`、`docs/`（ADR、架构）、`posts/`、根目录 AGENTS/README/CHANGELOG/CONTEXT 与构建配置、`.github`；`.harness/tasks` 中的 `evaluation`、`site-and-content` 等讲 Edges 系统的项目留系统仓。
- 个人仓搬走：`edges/`（知识主体）、`notes/`、`archive/`、`teaching/`（连同其部署）、`retrospectives/`、`memory/`、`tasks/`、`projects/`、`shared-extensions/`、`.obsidian`。
- 个人仓保持公开，沿用脱敏约束。
- 待定：无（grill R1–R3 已收口）。

**grill R1 拍板（2026-10-20）：**
- `.harness/memory`（feedbacks / projects / references）整体留系统仓：条目几乎都在讲 Edges 开发；个人仓以后自己 `edges init`。
- `.harness/observation`（Langfuse 接收器代码与冒烟）留系统仓。
- `.harness/skills`：`managed/linux-nas-direct-link` 去个人仓；`managed/preview-tasks-with-box-obsidian` 与 `referenced/` 留系统仓。
- `.harness/notes`、`.harness/projects`：系统仓保留模块入口；`projects/2026-10-11--CrewAI概念与协作边界` 去个人仓，`projects/2026-10-11--code-review` 留。
- 其余 `.harness/tasks` 项目：`_default`、`agent-clients-ux`、`edges-routines`、`edges-tasks`、`observation`、`project-memory` 留系统仓；只有 `tech-reading` 去个人仓。
- 根 `tasks/`：搬走前先把讲系统的卡挪进 `.harness/tasks` 同名项目（如「整理posts文件夹并建站」「edges-connector自建远程MCP」「笔记洗成project-memory格式」），其余随 `tasks/` 走。
- `.agents/`、`.claude/`、`.factory/`、`skills-lock.json`、`.gitmodules` 留系统仓。
- 个人仓名：`VirusPC/edges-viruspc-brain`。
- 迁移用 `git filter-repo` 抽出搬走的路径，保留历史。


**grill R2 拍板（2026-10-20）：**
- Compose：**双向，含义不同。** 系统仓为主体时，根 `AGENTS.md` 登记 `VirusPC/edges-viruspc-brain`，作 Compose 第一个真实用例，个人仓是额外挂载的个人工作区。个人仓为主体时，也登记 `VirusPC/edges`，此时 edges 只是参考项目（相对次要但也做）。
- teaching 部署：个人仓自带部署 workflow；系统仓 `deploy.yml` 删掉 teaching 相关段；线上地址仍是 `https://edges.viruspc.tech/teaching/`。
- retrieval eval 的 edges 用例：锁到拆仓前最后一个提交（评测支持按 ref 检出），用例内容不改。
- 迁移顺序四步，每步可回退：（1）系统仓 PR：根 `tasks/` 系统卡挪进 `.harness/tasks`；（2）`filter-repo` 建 `VirusPC/edges-viruspc-brain`，`edges init`，核对文件数；（3）系统仓 PR：删搬走路径 + 改 deploy / eval / AGENTS / README / CHANGELOG + Compose 登记；（4）仓外引用统一改：日/周复盘 skill 路径、edges-publish、各助手记忆，并通知相关助手。第 3 步单独一个 PR，不与第 1 步合并。
- 仓外引用：由实现方统一改完再通知各助手，不甩给各助手自行改。
- 默认保留：系统仓不重写历史（只删除，不 force-push 受保护的 main）；`edges-private` 保持独立私有仓，不并入、不登记进公开系统仓。
- 本轮结论只写任务卡，不另写 ADR / 术语表。


**grill R3 拍板（2026-10-20）：**
- ECS：两份检出。系统仓 `/home/cheng-dev/projects/edges` 继续跑 tasks / artifacts（`deploy.yml` 去掉 teaching）；个人仓单独检出 `/home/cheng-dev/projects/edges-viruspc-brain`，nginx `/teaching/` 指到它的 `teaching/`；线上 URL 不变。
- 部署密钥：把 `TEACH_DEPLOY_HOST / USER / SSH_KEY` 复制到个人仓的 GitHub Environment（同名），系统仓密钥不动。
- 反向 Compose（个人仓登记 `VirusPC/edges` 作参考项目）：第 2 步建仓时就写进个人仓 `AGENTS.md`；系统仓侧登记仍在第 3 步 PR。
- 新仓：由实现方用 peng cheng 的 GitHub 权限全部完成：建公开仓 `VirusPC/edges-viruspc-brain`，main 开与 edges 同级保护（强制 PR、enforce_admins、禁 force-push / 删分支）。

**目标：**
VirusPC/edges 只承载 Edges 系统；个人大脑落在独立仓库，经 Compose 挂到系统仓使用。

**完成标准：**
- [x] 有一份拍板的边界：系统仓留什么、个人仓放什么
- [ ] 个人大脑有独立仓库，并从 edges 通过 Compose 登记挂上
- [ ] 该迁出的内容已迁出；edges 公开仓不再混入个人大脑主体
- [ ] AGENTS.md / README 写清两边各自职责，以及怎么用 Compose 挂个人仓
