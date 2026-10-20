---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-20T03:45:00.000Z'
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
- 个人仓保持公开，沿用脱敏约束（commit 历史不刻意脱敏）。
- 待定：无（grill R1–R3 已收口）。

**grill R1 拍板（2026-10-20）：**
- `.harness/memory`（feedbacks / projects / references）整体留系统仓：条目几乎都在讲 Edges 开发；个人仓以后自己 `edges init`。
- `.harness/observation`（Langfuse 接收器代码与冒烟）留系统仓。
- `.harness/skills`：`managed/linux-nas-direct-link` 去个人仓；`managed/preview-tasks-with-box-obsidian` 与 `referenced/` 留系统仓。
- `.harness/notes`、`.harness/projects`：系统仓保留模块入口；`projects/2026-10-11--CrewAI概念与协作边界` 去个人仓，`projects/2026-10-11--code-review` 留。
- 其余 `.harness/tasks` 项目：`_default`、`agent-clients-ux`、`edges-routines`、`edges-tasks`、`observation`、`project-memory` 留系统仓；只有 `tech-reading` 去个人仓。
- 根 `tasks/`：搬走前先把讲系统的卡挪进 `.harness/tasks` 同名项目（如「整理posts文件夹并建站」「edges-connector自建远程MCP」「笔记洗成project-memory格式」），其余随 `tasks/` 走。
- `.agents/`、`.claude/`、`.factory/`、`skills-lock.json`、`.gitmodules` 留系统仓。
- ~~个人仓名：`VirusPC/edges-viruspc-brain`。~~（R5：新个人仓 `VirusPC/edges-brain-viruspc`）
- ~~迁移用 `git filter-repo` 抽出搬走的路径，保留历史。~~（R5 作废：改为 archive + 两个新仓）


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


**grill R4（已作废，被 R5 取代）：** ~~现有 edges 改名为个人仓、框架新建仓~~。作废原因：个人仓以后可能转私有，届时旧 PR 与发展历史对外不可见；peng cheng 希望外部用户能方便了解 Edges 发展历史。保留的结论：commit 历史动机、个人仓不刻意脱敏、框架仓沿用 `VirusPC/edges` 且单个初始提交。

**grill R5 拍板（2026-10-20）：archive + 两个新仓**
- 今天这个节点把现有 `VirusPC/edges` 改名为 **`VirusPC/edges-archive`**，README 顶部加归档说明（链到两个新仓）后 **archive**；保持公开，完整历史与 PR 讨论留作 Edges 发展史。代价已接受：截至今天的笔记随旧仓永久公开。
- 新框架仓 **`VirusPC/edges`**：单个初始提交；README / CHANGELOG 写明拆分前历史见 `edges-archive`；ADR / 文档里的裸 PR 号统一改成指向归档仓的完整链接。
- 新个人仓 **`VirusPC/edges-brain-viruspc`**：单个初始提交（冻结点个人路径快照），公开，以后可转私有。
- R1 边界、R2 双向 Compose 语义、仓外引用由实现方统一改并通知、`edges-private` 不动、新仓由实现方用 peng cheng 的 GitHub 权限建并保护 main（同 edges 级别）——均仍有效。
- 配置按内容归属：框架仓配 Environment `production`（tasks 站点）+ `npm-publish` + npm Trusted Publishing；个人仓配 Environment `production`（teaching）；`TEACH_DEPLOY_*` 两个新仓各复制一份；ECS 上 `~/projects/edges` 重新克隆新框架仓，新增 `~/projects/edges-brain-viruspc`，nginx `/teaching/` 指过去；线上 URL 不变；retrieval eval edges 用例 ref 锁到归档仓最后一个提交。
- 迁移五步：（1）冻结：合完或关掉开着的 PR（含本卡 PR），根 `tasks/` 系统卡挪进 `.harness/tasks`；（2）按 R1 边界从冻结提交生成两份快照，本地核对文件数；（3）旧仓改名 `edges-archive` → 加归档说明 → archive；（4）建 `VirusPC/edges` 与 `VirusPC/edges-brain-viruspc`：推快照、保护 main、配 Environments / secrets / Trusted Publishing、双向 Compose 登记；（5）ECS 重新检出 + nginx、eval ref、仓外引用与助手记忆，通知各助手。第 3→4 步 `VirusPC/edges` 名字空窗尽量短。
- 作废：R1 filter-repo 抽个人仓；R2 四步迁移与「系统仓不重写历史」；R3 只给个人仓复制密钥与「系统仓 deploy.yml 删 teaching 段」的做法（改为两个新仓各自配置）；R4 改名方案。
- 改名、归档、建仓三个不可逆动作前，实现方再与 peng cheng 确认一次。

**目标：**
`VirusPC/edges` 只承载 Edges 系统；个人大脑落在 `VirusPC/edges-brain-viruspc`，两边双向 Compose；拆分前历史保存在归档的 `VirusPC/edges-archive`。

**完成标准：**
- [x] 有一份拍板的边界：系统仓留什么、个人仓放什么
- [ ] 个人大脑有独立仓库，并从 edges 通过 Compose 登记挂上
- [ ] 旧仓已改名 `edges-archive` 并归档；新 `VirusPC/edges` 历史里不含个人大脑内容
- [ ] AGENTS.md / README 写清两边各自职责，以及怎么用 Compose 挂个人仓
