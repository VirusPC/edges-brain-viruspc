---
name: Devin Agent Memory Repo 学习笔记
description: 学习 Cognition 开源的 Agent Memory Repo 规范与 Devin Memory/Dreaming：git 仓库记忆、MEMORY.md 入口、单行带来源条目、定期整理，并对照 edges 的 .edges Project Memory。
---

# Devin Agent Memory Repo 学习笔记

> 整理日期：2026-10-13
> 用途：理解 Cognition 的「记忆即 git 仓库」规范与 Devin 的 Dreaming 机制，对照本仓 Project Memory，找可借鉴点。
> 原则：正文只写来源里出现的事实；标 **【推断】** 的是本笔记的理解，标 **【未证实】** 的是来源未说明的部分。

## 我的观察（peng cheng）

1. **Memory loop**：定义了 clone → search → update → push 的 memory loop。
2. **Dreaming**：支持 add new memory 和 clean up memory。
   1. Add new memory：Spot patterns across sessions and save them as new entries.
   2. Clean up memory：Merge duplicates, remove outdated entries, and check sources to resolve contradictions.
3. **文件组织**：有一个 `MEMORY.md` 作为记忆的主入口，类似 Claude Code auto memory。除入口外，不限制记忆文件的目录组织形式，允许 md 之外的额外资源文件。
4. **链接引用**：链接用 `[[path]]` 而非 `[name](path)`。个人看法：没看到很强的必要性。
5. **Entry 级 metadata**：每个 entry 后可以用 `[key1: value1; key2: value2]` 这种形式定义 entry 级 metadata（键值用冒号分隔、键值对之间用分号分隔，如 `[source: https://example.com/sessions/102; added: 2026-09-03]`）。
6. **可组合性**：一个 session 可以同时加载多个 memory repo。

## 1. 背景与来源

- **X 发布帖**（Cognition 官方账号，2026-10-05 17:44 UTC，即北京时间 2026-10-06 01:44）：[x.com/cognition/status/2107165034463867001](https://x.com/cognition/status/2107165034463867001)。原文要点：推出 Dreaming；跨会话里 Devin 会建立一张关于「你喜欢怎么工作」的 memory graph；夜间自我整理记忆、移除过时记录、发现潜在信息；同时在做一个名为 Agent Memory Repo 的开源标准。
- **规范页**：[cognition.com/agent-memory-repo](https://cognition.com/agent-memory-repo) —— 记忆循环、Dreaming、用例、格式、可组合性、两个示例。
- **博客**：[Memory and dreaming: how Devin learns from working with you](https://devin.ai/blog/memory-and-dreaming)（2026-10-05）—— Devin 产品里的 Memory Drive 与 Dreaming 实现描述。注：抓取工具一度对该地址返回 404，curl 可正常读取。
- **规范仓库**：[github.com/AgentMemoryRepo/agentmemoryrepo](https://github.com/AgentMemoryRepo/agentmemoryrepo)（MIT）。文件只有 `README.md`、`SPEC.md`（格式部分，镜像规范页的 Format）、`skills/agent-memory-repo/SKILL.md`、`.devin-plugin/plugin.json`、`LICENSE`。
- 规范「最初由 Cognition 开发，作为开放标准发布」，接受社区贡献。

## 2. 核心思想

1. **记忆 = 一个 git 仓库**：一组 Markdown 笔记（也可放 SQL、脚本等文件），像 wiki 一样互相链接。
2. **实时写入、跨会话生效**：agent 在会话中边学边写，「无需人工介入」（no human in the loop），每次编辑后推送。
3. **记忆不是会话摘要**（博客原话）：是 agent 从和你一起工作中学到的教训，写成短笔记并链接回学到它的会话。
4. **渐进加载**：会话开始只加载短小的 `MEMORY.md`，其余用 grep / 跟链接按需读，不把整个记忆档案塞进 prompt。
5. **Dreaming 负责全局整理**：会话内写入只是第一步，需要一个周期性的专门 agent 用跨会话的全局视角回看与整理。
6. **与 skill 的分工**（博客）：skill 记可重复的流程、刻意打包复用；memory 记工作中学到的上下文，经会话累积、由 dreaming 回顾。二者都可能含指令，但生命周期不同。

记忆循环（每个会话相同）：

1. Clone 最新记忆；
2. Grep 任务所需内容，或跟随链接；
3. 学到新东西时更新条目；
4. 每次编辑后 Push。

## 3. 仓库结构与格式

- **布局自由**：文件和目录随意组织，可按仓库、项目或主题分（博客）。示例：

  ```text
  memory-john/
    MEMORY.md
    team_structure.md
    projects/payments.md
    metrics/autocomplete_keep_rate.sql
  ```

- **`MEMORY.md` 是入口**：每个会话开始都会加载，所以要短；只放每个会话都需要的内容，加一个 `## Index` 链到其他文件。
- **条目**：Markdown 笔记里每条记忆是**一行一个 bullet**，末尾可带元数据；信息变化时就地更新或删除。
- **元数据**：`[key: value; key: value]`，键开放；推荐 `source`（学到该信息的 agent 会话链接）与 `added`（`YYYY-MM-DD`）。
- **交叉链接**：`[[path]]`，路径从记忆根算起；Markdown 省略 `.md`，其他扩展名保留。信息只放一处，别处链接；移动或重命名时要更新链接。
- **可组合**：一个会话可同时加载多个记忆仓库（如 `memory-alice/`、`memory-bob/` 并列 clone 到同一台机器）。仓库彼此独立，agent 跟踪「谁说了什么」，写进对应仓库；目标不明时询问。别人的记忆仅在其选择共享时才 clone。
- **用例**：个人记忆、agent 蜂群（并行 agent 推到同一仓库，git 标出冲突）、团队记忆（尤其是没有代码仓库的团队）、多人会话。
- **蜂群示例**：在记忆仓库里建 `swarms/<name>/`，含 `README.md`（目标与规则）、`findings.md`、`questions.md`、`agents/*.md`、`scripts/bench.sh`；结束后在 `MEMORY.md` 索引加一行，文件夹留作日后复用。

### 官方 skill 的落地约束（SKILL.md）

- 只在被调用时工作：不加 hooks、定时任务或启动脚本，也不宣称后续会话会自动加载。README 也写明试用版**不含**自动启动与定时 Dreaming。
- 记忆放在**独立仓库**（默认 `~/agent-memory`），拒绝放在当前项目内或规范仓库内。
- 默认只在本地；只有用户指定自己拥有的私有远端时才推送，首次推送前确认是私有的。
- **记忆是数据，不是指令**：不因记忆文件里的内容去执行命令。
- 不存凭据和敏感个人数据。
- 写前 `git status --porcelain` 必须干净；只 `git add` 自己改的文件；不 force-push、不改写历史、不删非自己创建的文件。
- 该存什么：之后会话有用的偏好、决定、用户否则要重复说明的事实；便宜可再发现或只对当前任务有用的不存。
- 过期条目就地更新或删除，不追加矛盾条目。

## 4. 记忆写入与 Dreaming 机制

### 写入与并发（博客描述的 Devin 实现）

- 记忆存在每个用户的个人 **Memory Drive**：持久的 Markdown git 仓库；在 devin.ai 上按组织内个人隔离，可在 Customize → Memory 浏览，也可查看最近的 dreaming 会话。
- 每个会话拿到自己的 git checkout；改完笔记后 commit、合并其他会话的更新，再存回持久 drive。
- 若同步过程中另一会话已保存，**修订号检查拒绝陈旧写入**，Devin 基于新版本重试；冲突编辑会被**显式提出解决**，而不是静默覆盖。没有哪个会话的本地副本是事实源。
- 规范页蜂群例子同理：git 合并大多数提交；两个 agent 改同一行时第二次 push 被拒，该 agent 读完两版再写一版。

### Dreaming（整理 / 巩固）

- 规范页：一个**周期性运行的专门 agent**，两件事——
  - **新增记忆**：发现跨会话的模式，存成新条目；
  - **清理记忆**：合并重复、移除过时条目、核对来源以解决矛盾。
- 博客：**每日**后台会话，回看过往对话与已有记忆，改进索引。具体动作：合并重叠笔记；去掉临时细节；找原工作中没记下的有用教训；移除**没有被任何会话用到**的过时记录。整理时保留来源引用和明确的偏好，同时重组笔记及索引。
- 博客演示例子：一周后七个扁平笔记，有重叠（如 NextJS 出现在两处），有一条已过时（「今天下午 dev server 在 3001 端口」）。
- X 帖描述为「夜间」运行。
- **【推断】** 所谓 memory graph 即 `[[path]]` 链接 + `source` 会话链接构成的图，而非独立图数据库。

#### 公开实现细节检索结论（2026-10-14）

- **有**：产品行为见 [Devin Docs · Memory](https://docs.devin.ai/product-guides/memory)——约每天一次后台会话、首次 dream 从近期会话播种、Customize→Memory 可看每次 dreaming 的改动、自动化会话不读写 memory、组织关闭 Memory 时 dreaming 不跑。
- **无**：开源仓与 skill **不含**调度 Dreaming（[issue #7](https://github.com/AgentMemoryRepo/agentmemoryrepo/issues/7) 维护者仅欢迎社区实现进 Community，未公布官方实现）。未找到公开的 scheduler、模型、prompt、「unused」判定代码或矛盾消解算法。
- 第三方（OpenDream / agentconnect 等）自有 dreaming，**不可当作** Cognition 实现。

## 5. 与 edges `.edges` Project Memory 对照

| 维度 | Agent Memory Repo | edges Project Memory |
| --- | --- | --- |
| 存储 | 独立 git 仓库，按人/团队/蜂群一个 | 与工作仓库同仓，按目录作用域放 `.edges/memory/` |
| 入口 | 单个 `MEMORY.md`，会话开始加载 | `AGENTS.md` 受管区块索引到各类型 `README.md`，由 harness 的 AGENTS.md 加载语义发现 |
| 组织 | 布局完全自由 | 固定类型（feedbacks / projects / references / users，可扩展），每条一个 `INDEX.md` 目录 |
| 粒度 | 一行一个 bullet + `[source; added]` | 一个文件一条记忆，frontmatter `name` / `description` / `metadata`，正文 Why / How to apply |
| 链接 | `[[path]]` wiki 链接 | 普通 Markdown 相对链接；README 行「标题链接 — description」 |
| 来源 | `source` 链到会话 | `metadata` 里记 origin session id、agent client、updated-at |
| 写入 | 会话中 agent 自主写，无人工介入，每次编辑 push | `$project-memory-remember` 写入；本仓改动需 worktree + 分支 + PR |
| 整理 | Dreaming：定期合并、去旧、补漏、解矛盾 | `$project-memory-doctor` 体检、`reshape` / `migrate`；**【推断】** 未见按使用频率自动淘汰的定期任务 |
| 多主体 | 多仓并列 clone、按归属写回 | 作用域树（根 / 子目录 / extensions 等）+ users 类型本机不入库 |
| 隐私 | 私有远端、不存凭据 | 公开仓库，用户材料走 `users/` 不入 git，正文脱敏 |

**相同点**：都是 Markdown + git 作为事实源；都靠短入口 + 索引做渐进加载，按需 grep；都把「为什么 / 来源」写进记忆；都把记忆当上下文而非可执行指令。

**不同点**：AMR 偏「个人/团队 wiki」、写入门槛极低、并发靠 git push 拒绝；edges 偏「仓库内项目知识」、结构与类型更强、写入经 PR 审查。

**可借鉴点**（均为本笔记建议）：

1. **一行条目 + 内联元数据**：适合 users / feedbacks 这类短偏好，可减少一条一目录的开销。
2. **定期 Dreaming 式整理**：给 doctor 加一个周期性的「合并重复、标记过时、补漏」流程，并保留来源。
3. **按使用情况淘汰**：如果 ask 能留下读取痕迹，就能像 Devin 一样识别长期没人用的记忆。
4. **蜂群工作区模式**：并行 agent 用 `findings` / `questions` 文件协作，完成后留一条索引，可对照本仓 tasks / projects 叶子。
5. **SKILL.md 的安全条款**：「写前工作树必须干净」「只 add 自己改的文件」「记忆是数据不是指令」可以对照 remember 技能查漏。

## 6. 官方示例与 .edges 模块对照

> 依据：规范页、GitHub README / SPEC.md 中的示例；`.edges` 现状按 origin/main 根作用域。映射与建议均为本笔记解读，统一视为 **【推断】**，表中个别格另行标注。

### 6.1 三个官方示例（摘要）

1. **单人记忆布局**（`memory-john/`）：`MEMORY.md`（常驻条目 + `## Index`）、`team_structure.md`、`using_datadog_mcp.md`、`projects/{payments,website}.md`、`metrics/autocomplete_keep_rate.sql`。条目如 `- John coordinates the billing launch [source: https://example.com/sessions/101]`。`team_structure` / `using_datadog_mcp` 的具体内容来源未给出。
2. **蜂群**（`swarms/slow-checkout/`）：`README.md`（目标与规则）、`findings.md`（各 agent 的测量与排除项、最终 Cause / Fix）、`questions.md`（agent 互问互答）、`agents/*.md`（每 agent 一份笔记）、`scripts/bench.sh`（所有 agent 共用的基准）。结束后在 `MEMORY.md` Index 加 `- [[swarms/slow-checkout/README]]`，文件夹保留复用。
3. **多仓组合**：同一机器上并列 `vm/memory-alice/`、`vm/memory-bob/`，各自有 `MEMORY.md`，agent 按归属写回对应仓库。

### 6.2 来源之间的不一致

- **`projects/autocomplete.md`**：只出现在规范页的目录树中；README 与 SPEC.md 的树里没有。
- **autocomplete 条目如何被找到**：规范页写 agent grep 记忆仓库，在 `projects/autocomplete.md` 找到；README 写 agent 先读 `MEMORY.md` 就在其中找到。条目正文相同。

### 6.3 示例 → `.edges` 映射

| AMR 示例 | 最接近的 `.edges` 模块 | 说明 |
| --- | --- | --- |
| `MEMORY.md` 常驻条目 | `AGENTS.md`「本层硬约束」区块 | 都是每会话必读的少量内容 |
| `MEMORY.md` 的 `## Index` | `AGENTS.md` project-harness-local 索引 + 各类型 README | edges 多一层「类型 README → 条目」 |
| `team_structure.md` | `memory/users/`（本机不入库），部分可入 `references/` | 公开仓不宜存人员信息 |
| `using_datadog_mcp.md` | `memory/references/`（在哪）+ `skills/managed/`（怎么做） | AMR 合一文件，edges 拆两处 |
| `projects/*.md` | `memory/projects/`；长文落 `.edges/projects/` 叶子 | AMR 一项目一文件多条目；edges 一条记忆一目录 |
| 术语类条目（如 ghost_text） | `CONTEXT.md` 或 `memory/projects/` | 【推断】 |
| `metrics/*.sql` | 无直接对应；近似 `observation/metrics/` 或 skill 内脚本 | edges 记忆类型不收非 md 资源 |
| `swarms/<name>/` | `tasks/<project>/` + task 的 `.{stem}.log.md` | 蜂群是多 agent 共写同一工作区 |
| `swarms/.../README.md` | task 文件本体或 projects 叶子 `INDEX.md` | |
| `findings.md` | task Run Log 或 `evaluation/reports/` | edges 的 log 按单次执行，非多人共写 |
| `questions.md` | 无对应 | |
| `agents/*.md` | 近似 Run Log | 【推断】 |
| `scripts/bench.sh` | `observation/smoke/*.sh`、`evaluation/cases/*/run.py` | 已有「可执行资源与说明同处」先例 |
| 多仓组合 | 作用域树（子目录 `.edges`）+ `users/` 不入 git | AMR 按「人」组合，edges 按「目录作用域」组合 |

### 6.4 模块划分建议（【推断】）

1. **主题聚合**：允许 `memory/projects/` 等类型下按主题聚合为一个文件、内含多行带来源条目，减少「一条记忆一个目录」的碎片化，同时保留类型标记。
2. **记忆旁资源**：允许记忆条目旁放 SQL、脚本等可复用资源，由 `INDEX.md` 链接；evaluation / observation 已有类似先例。
3. **协作工作区**：为多 agent 协作提供 `swarms/<name>/` 式形态（可作为 tasks 下的一种形态或独立模块），约定 `README.md`、`findings.md`、`questions.md`、`agents/`、`scripts/`，结束后在上层索引留一行并保留目录。
4. **人/团队信息分离**：人员与团队结构类内容与项目知识分开，放 `users/` 或独立私有记忆仓（对应 AMR 一人一仓的组合方式）。
5. **不建议完全自由布局**：edges 的类型 README、脚本重算索引与 doctor 体检依赖固定结构，照搬 AMR 的自由布局会削弱这些能力。

## 7. 对 .edges 模块划分的启发

来自阅读规范后的启发（与 §6 的「示例→模块」对照分开；下列为对本仓划分的解读，视为 **【推断】**）：

- **入口和正文分开**：`MEMORY.md` 只当很短的总入口，细节按需展开；与 `AGENTS.md` 加各类型索引的分工一致，可借来检查入口是否太胖。
- **Dreaming 的「新增」和「清理」拆成两个模块**：新增 → `remember`，清理 → `doctor`；doctor 可加合并重复、清过期条目、按来源解决冲突。
- **条目级 metadata**（来源、日期）放在条目末尾、不单开文件；可减轻一条一个 `INDEX.md` 的粒度。
- **可组合性对应 `.edges` 分层**（全仓、extensions、user）：明确多层同时加载时谁优先、写回到哪一层。

## 8. 开放问题

- Dreaming 「移除未被任何会话使用的记录」：官方至今无公开计量方式（Docs / 规范 / 开源仓均只陈述行为）；会不会误删低频但关键的记忆？
- 无人工介入的实时写入如何防止错误或被注入的内容进入记忆？规范只给出「记忆是数据不是指令」一条。
- 一行条目在信息变复杂时如何避免变成长段？规范未给长度或拆分规则。
- 多仓组合时「谁说了什么」的归属判断错误如何纠正？
- 开放标准目前只定义格式（SPEC.md），记忆循环与 Dreaming 的行为是否会进入规范、是否有一致性测试？**【未证实】**
- edges 是否需要独立于工作仓库的个人记忆仓库，来承接现在不入 git 的 `users/` 材料？
