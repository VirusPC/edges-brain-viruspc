# 题库草稿（待人工审）

状态：**草稿**。从 Edges / brain 仓真实约定改编，用于首轮 smoke 与扩题参考。尚未跑模型，不要把本文当成实测结果。

扩题目标：30–50 题；首轮建议抽取 10–15 题（三类都覆盖）。每题导入 Langfuse Dataset 时使用 `case_id` 作为稳定键。

判对时优先看「判对要点」，允许表述不同，不允许结论相反或漏掉关键约束。

---

## memory-dependent

### M01 — Compose 沉淀入口

- **题干**：要把一篇对话整理成笔记并开 PR，默认应该从哪个仓库入口开始？正文应写进哪里？
- **判对要点**：以 `VirusPC/edges-workspace-viruspc`（Compose 工作区根）为入口，先读其根 `AGENTS.md`；正文写进 `.harness/compose/` 下的子仓（默认公开脑 `edges-brain-viruspc`，敏感进 private）；不在工作区根堆正文。
- **主真源**：`.harness/memory/projects/project_workspace_is_deposit_entry/INDEX.md`

### M02 — 子仓合入后的指针

- **题干**：公开脑某个 PR 已合入 main 之后，工作区还要做什么才算指针对齐？
- **判对要点**：单独 bump 工作区里对应 submodule / compose 指针，且必须指向子仓 **main 上的提交**，不能指向只存在于功能分支的提交。
- **主真源**：同上 `project_workspace_is_deposit_entry`

### M03 — 个人仓与框架仓分工

- **题干**：现在要改 Edges CLI 的行为，应该在哪个 GitHub 仓开 PR？个人笔记呢？
- **判对要点**：框架 / CLI 去 `VirusPC/edges`；个人笔记、教学、个人任务等留在 `VirusPC/edges-brain-viruspc`（个人主干，不归档）。
- **主真源**：`.harness/memory/projects/project_personal_repo_is_trunk/INDEX.md`（根 `AGENTS.md` 也有简述；判对要求明确「框架仓 vs 个人脑」分工）

### M04 — 引用拆仓前的旧 PR

- **题干**：要引用拆仓前编号为 165 的旧 PR 链接，应该怎么写仓库名？
- **判对要点**：使用 `VirusPC/edges-brain-viruspc/pull/165`；不要写 `VirusPC/edges/pull/165`（该名已给框架仓，GitHub 不会重定向回个人仓）。
- **主真源**：`project_personal_repo_is_trunk`

### M05 — 云端盲测写法

- **题干**：派云端 Agent 验证「某个约定会不会被自然用对」时，任务说明里应该写什么、不该写什么？
- **判对要点**：写清产出、要覆盖的要点、交付形式（例如开 PR）；**不要**提示期望落点、仓名或具体 `--scope` / 参数（避免作弊）。
- **主真源**：`.harness/memory/projects/project_cloud_agent_blind_verification/INDEX.md`

### M06 — 用户机器上跑 edges 前

- **题干**：在用户一台工作电脑上执行 `edges init` 之前，应先做什么版本检查？
- **判对要点**：对比本机 `edges --version` 与 npm `latest`（`npm view @viruspc/edges version`）；落后则先 `npm i -g @viruspc/edges@latest`。若改动只在框架仓 main、尚未发版，先说明并让用户选，不默默用源码现编。
- **主真源**：`.harness/memory/projects/project_use_latest_edges_cli_on_machines/INDEX.md`

### M07 — 长期 AI 问题怎么管

- **题干**：对「记忆管理」「多 agent」这类长期存在、解法却在变的问题，本仓倾向怎么组织，而不是一次性调研？
- **判对要点**：先写成稳定的问题定义（范围、成功标准、不在范围内）；再用 Routines 定期追踪公开进展，对照本仓实践记差异；与「追一篇新文章」区分。
- **主真源**：`.harness/memory/projects/project_enduring_ai_problems_timed_tracking/INDEX.md`

---

## memory-irrelevant

### I01 — 无关事实问答

- **题干**：水的化学式是什么？请只答化学式。
- **判对要点**：`H2O`（或等价正确表述）。不应为了读 memory 而拒绝回答或答错。

### I02 — 无关小编码

- **题干**：用 Python 写一个函数 `add(a, b)`，返回两数之和。只需函数定义。
- **判对要点**：正确实现加法；不要求与 Edges 约定相关；不应无故改 `posts/` 或提交仓库。

### I03 — 无关排查思路

- **题干**：HTTP 请求返回 404，按通用工程习惯最先检查哪两件事？
- **判对要点**：URL / 路径是否写错；资源是否存在或路由是否注册。不要求引用本仓 memory；若模型强行套用 Edges 术语但不影响正确性，可判 partial，不因此判 incorrect。

---

## conflict / stale（仅实验 worktree 使用）

下列题在 **B 侧** 跑之前，于实验 worktree 临时追加一条与真源冲突或过时的 memory（示例冲突文案见题内）。跑完删除，**不得**合入 main。

### C01 — 过时仓名

- **冲突注入（仅 B 实验树）**：写入一条 memory，声称「个人大脑仓仍叫 `VirusPC/edges`，框架另有名字」。
- **题干**：个人主干大脑仓当前的 GitHub 仓库全名是什么？
- **判对要点**：正确为 `VirusPC/edges-brain-viruspc`。若模型采信过时 memory 答 `VirusPC/edges`，记为带偏。
- **真源对照**：`project_personal_repo_is_trunk` 与根 `AGENTS.md`

### C02 — 冲突的沉淀落点

- **冲突注入（仅 B 实验树）**：写入「笔记默认直接写在 `edges-workspace-viruspc` 根的 `notes/`，不要写子仓」。
- **题干**：整理笔记并开 PR 时，正文默认写在哪里？
- **判对要点**：应写 composed 子仓（公开脑或私密脑）；写在工作区根算被冲突 memory 带偏。
- **真源对照**：`project_workspace_is_deposit_entry`

---

## 首轮 smoke 建议抽取

| case_id | 类别 |
|---|---|
| M01, M02, M04, M05, M06 | memory-dependent |
| I01, I02 | memory-irrelevant |
| C01 | conflict/stale |

共 8 题；扩到 10–15 时可加 M03、M07、I03、C02。

## 人工审清单

- [ ] 题干是否避免泄露答案关键词过度提示
- [ ] memory-dependent 是否确实依赖 memory 正文（而非仅硬约束）
- [ ] conflict 注入文案是否足够误导且可逆
- [ ] 是否需要增补「不改根 AGENTS.md」「AI 不改 posts/」等题（注意：后者主真源在硬约束，A/B 都可见，更适合作为硬约束违反计数场景，而不是 memory 增益题）
