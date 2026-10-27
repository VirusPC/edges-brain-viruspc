# 题库（真实会话精选）

状态：**已导入 Langfuse Dataset** `harness-memory-ablation/v1`（30 题）。本题库替换原先改编草稿；尚未跑模型，不要把本文当成实测结果。

挑选口径：用户真实提问或纠正改写为可独立重放的单轮题；判对要点以 `origin/main` 的 `.edges/memory`、根 `AGENTS.md` 与相关 skill/目录说明为准。密钥与私人信息已排除。

| 类别 | 题数 | case_id |
|---|---:|---|
| memory-dependent | 12 | M01，M12 |
| memory-irrelevant | 10 | I01，I10 |
| conflict-stale | 8 | C01，C08 |
| **合计** | **30** | |

判对时优先看「判对要点」，允许表述不同，不允许结论相反或漏掉关键约束。

## memory-dependent（依赖 memory）

### M01

- **类别**：`memory-dependent`
- **问题**：要把一篇对话整理成笔记并开 PR，默认应该从哪个仓库入口开始？正文应写进哪里？
- **判对要点**：
  - 以 VirusPC/edges-workspace-viruspc（Compose 工作区根）为入口，先读其根 AGENTS.md
  - 正文写进 .edges/compose/ 下的子仓（默认公开脑 edges-brain-viruspc；敏感进 private）
  - 不在工作区根堆正文；在工作区根直接 edges notes create 会落在工作区自己的 notes/，不会自动进子仓
- **违反项**：
  - 把正文写在工作区根 notes/
  - 跳过工作区入口直接当单一仓处理且不说明 Compose 去向
- **来源**：Grok Bot，2026-10-21
- **真源文件**：`.edges/memory/projects/project_workspace_is_deposit_entry/INDEX.md`
- **原话摘要**：你现在默认不都是记在这里吗？把这个地方当做入口。

### M02

- **类别**：`memory-dependent`
- **问题**：公开脑某个 PR 已合入 main 之后，Compose 工作区还要做什么才算指针对齐？
- **判对要点**：
  - 单独 bump 工作区里对应 submodule / compose 指针
  - 指针必须指向子仓 main 上的提交，不能指向只存在于功能分支的提交
- **违反项**：
  - 只合子仓 PR 不 bump 工作区指针
  - 指针钉在未合入 main 的分支 tip
- **来源**：Grok Bot，2026-10-21
- **真源文件**：`.edges/memory/projects/project_workspace_is_deposit_entry/INDEX.md`
- **原话摘要**：你现在默认不都是记在这里吗？把这个地方当做入口。

### M03

- **类别**：`memory-dependent`
- **问题**：现在要改 Edges CLI 的行为，应该在哪个 GitHub 仓开 PR？个人笔记、教学呢？
- **判对要点**：
  - 框架 / CLI 去 VirusPC/edges 开 PR
  - 个人笔记、教学、个人任务、博客成稿等留在 VirusPC/edges-brain-viruspc（个人主干，不归档）
- **违反项**：
  - 把 CLI 改动开在 edges-brain-viruspc
  - 把个人笔记默认写进框架仓 VirusPC/edges
- **来源**：全栈开发专家，2026-10-20
- **真源文件**：`.edges/memory/projects/project_personal_repo_is_trunk/INDEX.md`, `AGENTS.md`
- **原话摘要**：我是说，是否archive，再拆2个仓更合适

### M04

- **类别**：`memory-dependent`
- **问题**：要引用拆仓前编号为 165 的旧 PR 链接，仓库名应该怎么写？
- **判对要点**：
  - 使用 VirusPC/edges-brain-viruspc/pull/165
  - 不要写 VirusPC/edges/pull/165：该名已给框架仓，GitHub 不会重定向回个人仓
- **违反项**：
  - 仍用 VirusPC/edges/pull/165 并当作能打开旧个人 PR
- **来源**：Task/拆仓相关会话，2026-10-20
- **真源文件**：`.edges/memory/projects/project_personal_repo_is_trunk/INDEX.md`
- **原话摘要**：旧仓改名为 VirusPC/edges-brain-viruspc（个人主干，保留） 新建公开框架仓 VirusPC/edges

### M05

- **类别**：`memory-dependent`
- **问题**：派云端 Agent 验证「某个约定会不会被自然用对」时，任务说明里应该写什么、不该写什么？
- **判对要点**：
  - 写清产出、要覆盖的要点、标题或交付形式（例如开 PR）
  - 不要提示期望落点、仓名或具体 --scope / 参数，避免作弊
- **违反项**：
  - 在提示里写明该写进哪个仓或该用哪个 --scope
  - 只有一句「按约定写」导致需求过模糊
- **来源**：Grok Bot，2026-10-21
- **真源文件**：`.edges/memory/projects/project_cloud_agent_blind_verification/INDEX.md`
- **原话摘要**：避免作弊 / 你这个需求太模糊了。

### M06

- **类别**：`memory-dependent`
- **问题**：在用户一台工作电脑上执行 edges init 或重装 edges skill 之前，应先做什么版本检查？
- **判对要点**：
  - 对比本机 edges --version 与 npm latest（npm view @viruspc/edges version）
  - 落后则先 npm i -g @viruspc/edges@latest
  - 若改动只在框架仓 main、尚未发版，先说明并让用户选，不默默用源码现编
- **违反项**：
  - 直接用本机旧版 edges 初始化
  - 凭记忆断言 npm 有没有发版而不查 registry
  - 未告知用户就用源码现编 CLI
- **来源**：全栈开发专家，2026-10-21
- **真源文件**：`.edges/memory/projects/project_use_latest_edges_cli_on_machines/INDEX.md`
- **原话摘要**：卧槽，应该用最新命令吧 / npm 发包了么

### M07

- **类别**：`memory-dependent`
- **问题**：对「记忆管理」「多 agent」这类长期存在、解法却在变的问题，本仓倾向怎么组织，而不是一次性调研？
- **判对要点**：
  - 先写成稳定的问题定义（范围、成功标准、不在范围内）
  - 再用 Routines 定期追踪公开进展，对照本仓实践记差异
  - 与「追一篇新文章 / 开一次调研」区分
- **违反项**：
  - 只当一次性调研堆链接
  - 另开独立 GitHub 仓专门追热点而不先定义问题
- **来源**：Grok Bot，2026-10-23
- **真源文件**：`.edges/memory/projects/project_enduring_ai_problems_timed_tracking/INDEX.md`
- **原话摘要**：AI时代，有些关键问题是始终存在但解决方案在不断演进的。比如记忆管理、自进化、长程任务、云端沙箱、多agent 协作、安全、human in the loop、可观测、评估等等。是不是应该不断地定义这种问题，然后用ai定时去追踪问题相关最新进展。

### M08

- **类别**：`memory-dependent`
- **问题**：在本仓 Langfuse agent 追踪约定里，要用来筛选、分组、dashboard 拆分的维度应该放 tags 还是 metadata？设备名怎么写？
- **判对要点**：
  - 要筛的维度都放 tags，写成 key:value；上报后不可改
  - metadata 放打开 trace 才看的附加信息；不要指望用嵌套 metadata 做筛选（尤其 Langfuse 4.59 以下）
  - 设备名 tag 写成 device:<短名>；没有 tags 口时才临时把设备名写进 environment
- **违反项**：
  - 把筛选维度只放进 metadata
  - 把设备名默认塞进 environment 且已有 tags 口
- **来源**：Grok Bot，2026-10-24
- **真源文件**：框架仓 `packages/skills/edges-langfuse-local-agent-tracing/SKILL.md`（主入口 `edges-langfuse-agent-tracing`；随 `@viruspc/edges` 分发。2026-10-25 前在本仓 `shared-extensions/skills/`，当时目录名尚未加 `edges-` 前缀）
- **原话摘要**：tags是Langfuse的概念吗？ / meta data对我有什么用？ / 我觉得你需要在skills里面写清楚tags和metadata的配置。

### M09

- **类别**：`memory-dependent`
- **问题**：像 harness memory 消融这种评估 harness 能力本身的实验材料，应该放在脑仓的哪个目录，而不是 notes 或某个 routine 下面？
- **判对要点**：
  - 放在脑仓根 evaluations/（例如 evaluations/harness-memory-ablation/）
  - 不进 notes/；也不挂到某个 routine 的 evaluations/（routine 专属评估仍挂 routine 下）
- **违反项**：
  - 把方法与题库写进 notes/ 当普通笔记
  - 挂到某个无关 routine 下冒充 routine 专属评估
- **来源**：Grok Bot，2026-10-24
- **真源文件**：`evaluations/harness-memory-ablation/README.md`, `evaluations/README.md`
- **原话摘要**：是否应该放到evaluation 里了。后续可能会不定期重测和优化🤔

### M10

- **类别**：`memory-dependent`
- **问题**：在本机修改 VirusPC/edges-brain-viruspc（commit/push 或改工作树文件）时，对 git worktree 有什么硬约束？
- **判对要点**：
  - 必须通过独立 git worktree：每个 Agent/任务一个 worktree + 独立分支
  - 禁止多 Agent 共用同一工作树并行改文件或切分支；同一分支不得挂两个 worktree
  - Cursor 云端 Agent 等已在独立 clone/环境中的任务视为已隔离；只读查询可不建 worktree
- **违反项**：
  - 多个 Agent 共用同一工作树改文件
  - 本机直接在主 clone 上切分支改文件而不建 worktree
- **来源**：全栈开发专家，2026-10-21
- **真源文件**：`AGENTS.md`
- **原话摘要**：请你直接在 VirusPC/edges-brain-viruspc 清债并开 PR（不要直推 main）。

### M11

- **类别**：`memory-dependent`
- **问题**：对本仓做清债或文档改动时，默认如何合入 main？可不可以直接 push 到 main？
- **判对要点**：
  - 开 PR 合入，不要直推 main
  - 公开仓之间不互挂；Compose 挂载在私有工作空间根
- **违反项**：
  - 直接 push 到 main
  - 在公开脑上挂框架仓 submodule
- **来源**：全栈开发专家，2026-10-21
- **真源文件**：`AGENTS.md`
- **原话摘要**：请你直接在 VirusPC/edges-brain-viruspc 清债并开 PR（不要直推 main）。

### M12

- **类别**：`memory-dependent`
- **问题**：AI 能不能自动创建、编辑、移动或删除本仓 posts/ 下的文件？posts 和 notes 的定位有何不同？
- **判对要点**：
  - AI 不得自动创建、编辑、移动、删除、重构或重写 posts/ 下任何文件
  - posts 是对外博客成稿；notes 是对内低成本捕获；二者不要混写
- **违反项**：
  - AI 擅自改 posts/
  - 把仅对内速记默认写进 posts/
- **来源**：约定来源 AGENTS + memory（posts 硬约束常见于维护会话），2026-10-20
- **真源文件**：`AGENTS.md`, `.edges/memory/projects/project_posts_public_astro_blog/INDEX.md`

## memory-irrelevant（与约定无关）

### I01

- **类别**：`memory-irrelevant`
- **问题**：在 Langfuse 里，scores 和 evaluators 分别是干什么的？请用产品概念回答，不必联系本仓约定。
- **判对要点**：
  - scores：对 trace/observation/session 等对象打的分值记录
  - evaluators：产生 score 的评估器（可 LLM-as-judge、代码或人工流程）
  - 不要求引用 Edges harness memory
- **来源**：Grok Bot，2026-10-24
- **原话摘要**：scores 和 evaluators干嘛的

### I02

- **类别**：`memory-irrelevant`
- **问题**：Langfuse 的 Dataset 功能怎么用？请概括创建题库、挂 expected output、再跑 Experiment 的主路径。
- **判对要点**：
  - 创建 Dataset，写入带 input/expectedOutput 的 items
  - 用 Experiment（或等价跑批）对 Dataset 逐条跑模型/Agent，产出与 expected 对照的结果与 score
- **来源**：Grok Bot，2026-10-25
- **原话摘要**：dataset功能怎么用

### I03

- **类别**：`memory-irrelevant`
- **问题**：Langfuse 里 evaluator 和 score 两块功能有什么区别？
- **判对要点**：
  - evaluator 是产生评价的机制/配置；score 是落在对象上的评价结果
  - 一个 evaluator 可对多条运行产生多条 score
- **来源**：Grok Bot，2026-10-25
- **原话摘要**：我没听懂evaluator和score两块儿功能的区别

### I04

- **类别**：`memory-irrelevant`
- **问题**：Langfuse 里 human annotation 和 experiments 各解决什么问题？
- **判对要点**：
  - human annotation：人工标注/打分，校准或直接产生 label
  - experiments：按 Dataset 批量跑并对比配置/模型/提示的系统化实验
- **来源**：Grok Bot，2026-10-25
- **原话摘要**：human annotation 与experiments 呢

### I05

- **类别**：`memory-irrelevant`
- **问题**：如果某段时间用量是 3750 万 token，问「占周额度多少」时，正确答法应依赖什么信息？
- **判对要点**：
  - 需要已知或可查的周额度上限，再算占比
  - 若额度未知应说明无法单凭 3750 万得出百分比，并去查套餐/账单，而不是编造比例
- **违反项**：
  - 编造一个没有来源的周额度百分比
- **来源**：Grok Bot，2026-10-24
- **原话摘要**：3750万token 占周额度多少？

### I06

- **类别**：`memory-irrelevant`
- **问题**：在自建 Langfuse 上创建一个用 MiniMax 的 LLM connection，需要哪些关键字段？不必涉及本仓 memory。
- **判对要点**：
  - 在 Langfuse 的 LLM connection / model 配置里填入 MiniMax 兼容的 base URL、模型名与 API key（或已有密钥引用）
  - connection 名称可自定（例如 minimax），供 evaluator / playground 选用
- **来源**：Grok Bot，2026-10-24
- **原话摘要**：帮我创建langfuse llm connection？用minimax 就行

### I07

- **类别**：`memory-irrelevant`
- **问题**：读取一段按行追加的 JSONL 会话导出时，「游标」通常指什么？
- **判对要点**：
  - 指已读到的偏移（字节偏移、行号或最后一条记录 id），用于断点续读，避免从头扫
  - 与图形界面里的鼠标指针不是同一概念
- **来源**：Grok Bot，2026-10-24
- **原话摘要**：说的游标是什么东西？

### I08

- **类别**：`memory-irrelevant`
- **问题**：有办法监听到编码 Agent「每轮会话结束」事件吗？请按通用工程思路回答可能方案，不要求本仓约定。
- **判对要点**：
  - 常见思路：宿主 hooks（session end / stop）、轮询会话状态、或在 Agent 侧显式上报 turn 结束
  - 答出至少一种可行机制即可；不要求引用 harness memory
- **来源**：全栈开发专家，2026-10-24
- **原话摘要**：有办法监听到每轮会话结束吗？

### I09

- **类别**：`memory-irrelevant`
- **问题**：C 方案如果听起来像要自建服务，是否一定要我再起一个服务端 API？请按通用架构判断如何回答。
- **判对要点**：
  - 先澄清 C 方案依赖的是已有宿主能力还是新服务
  - 若可用现有 hooks / 定时任务 / 客户端上报，则不必新起 API；只有缺口存在时才建议新服务
- **来源**：全栈开发专家，2026-10-24
- **原话摘要**：C的方案我没听懂，需要我起一个服务端API吗？

### I10

- **类别**：`memory-irrelevant`
- **问题**：对比几种上报方案时，如果不先看监控数据，应依据什么挑选「先跑哪一个」？
- **判对要点**：
  - 可依据实现成本、侵入性、能否覆盖目标 Agent、失败时可观测性等工程标准做定性比较
  - 并说明在缺少监控数据时结论是假设，需要后续实测验证
- **来源**：全栈开发专家，2026-10-24
- **原话摘要**：你觉得怎么合适，先不看监控，你觉得用哪个去跑比较合适

## conflict-stale（约定曾变 / 易被过时认知带偏）

下列题对应真实发生过的约定变更（拆仓改名、knowledge→notes、Compose 可写、沉淀入口改到 workspace、公开仓不互挂等）。实验 B 侧若另注入冲突 memory，只允许在实验 worktree，跑完删除，不得合入 main。

### C01

- **类别**：`conflict-stale`
- **问题**：个人主干大脑仓当前的 GitHub 仓库全名是什么？
- **判对要点**：
  - VirusPC/edges-brain-viruspc
  - VirusPC/edges 现为框架仓名，不再指个人主干
- **违反项**：
  - 答成 VirusPC/edges 且当作个人主干
- **来源**：全栈开发专家，2026-10-20
- **真源文件**：`.edges/memory/projects/project_personal_repo_is_trunk/INDEX.md`, `AGENTS.md`
- **过时陷阱**：仍以为个人仓叫 VirusPC/edges
- **原话摘要**：我是说，是否archive，再拆2个仓更合适

### C02

- **类别**：`conflict-stale`
- **问题**：本仓公开笔记目录的现行路径是什么？还是 knowledge/notes/ 吗？
- **判对要点**：
  - 现行路径是仓库根下的 notes/（叶子为 YYYY-MM-DD--slug/INDEX.md）
  - knowledge/notes/ 是迁目录前的旧路径，不应再当作写入目标
- **违反项**：
  - 仍指导写入 knowledge/notes/
- **来源**：全栈开发专家，2026-10-22
- **真源文件**：`notes/README.md`, `notes/AGENTS.md`
- **过时陷阱**：knowledge/ → notes/ 迁目录后仍沿用旧路径
- **原话摘要**：有问题啊，我的私密档呢？为什么我看还没有格式正确？还是有一个knowledge 文件夹？

### C03

- **类别**：`conflict-stale`
- **问题**：现在被 Compose 进来的子仓，还允不允许写入（例如在子仓开 PR 沉淀笔记）？
- **判对要点**：
  - 允许写：Compose 子仓可写（ADR 0045 / 框架仓相关合入后），由 Agent 读规则选择落点子仓
  - 不再把「Compose 只读」当现行约束
- **违反项**：
  - 仍断言 Compose 子仓一律只读不可写
- **来源**：Grok Bot，2026-10-21
- **真源文件**：`.edges/memory/projects/project_workspace_is_deposit_entry/INDEX.md`, `notes/2026-10-21--compose-子仓可写/INDEX.md`
- **过时陷阱**：Compose 只读特例已删除前的旧认知
- **原话摘要**：现在被compose 进来的仓库是不允许写的吗

### C04

- **类别**：`conflict-stale`
- **问题**：周复盘 / 对话沉淀是否已经改成以 edges workspace（Compose 工作区）仓库为入口？
- **判对要点**：
  - 是：沉淀与日/周复盘默认以 VirusPC/edges-workspace-viruspc 为入口
  - 正文仍写子仓，不在工作区根堆正文
- **违反项**：
  - 仍说只从单一脑仓根入口、无视 workspace
- **来源**：周复盘，2026-10-24
- **真源文件**：`.edges/memory/projects/project_workspace_is_deposit_entry/INDEX.md`
- **过时陷阱**：入口改动前的单仓习惯
- **原话摘要**：周复盘有改成从edges workspace仓库为入口做复盘么

### C05

- **类别**：`conflict-stale`
- **问题**：引用拆仓前的旧 PR 时，若有人仍给出 VirusPC/edges/pull/N，问题在哪里？正确写法是什么？
- **判对要点**：
  - VirusPC/edges 之名已给框架仓，旧个人 PR 链接不会重定向
  - 正确写法 VirusPC/edges-brain-viruspc/pull/N
- **违反项**：
  - 沿用 VirusPC/edges/pull/N 并声称能打开历史个人 PR
- **来源**：Task/拆仓相关会话，2026-10-20
- **真源文件**：`.edges/memory/projects/project_personal_repo_is_trunk/INDEX.md`
- **过时陷阱**：改名后仍用旧仓名拼 PR URL
- **原话摘要**：旧仓改名为 VirusPC/edges-brain-viruspc（个人主干，保留） 新建公开框架仓 VirusPC/edges

### C06

- **类别**：`conflict-stale`
- **问题**：公开个人脑还要不要把框架仓 VirusPC/edges 挂进自己的 Compose / submodule？
- **判对要点**：
  - 不要：公开仓之间不互挂；Compose 挂载在私有工作空间根 VirusPC/edges-workspace-viruspc
  - 本仓（公开脑）不把框架仓登记进 Compose
- **违反项**：
  - 在公开脑上挂框架仓
  - 主张公开仓互挂
- **来源**：全栈开发专家，2026-10-21
- **真源文件**：`AGENTS.md`
- **过时陷阱**：拆仓初期曾双向 Compose 登记，后改为公开仓不互挂
- **原话摘要**：用户决定：公开仓之间不互挂（私有根仓 VirusPC/edges-workspace-viruspc 已经挂了两个大脑）。

### C07

- **类别**：`conflict-stale`
- **问题**：私密脑里如果还看到顶层 knowledge/ 文件夹，按现行布局应如何理解？
- **判对要点**：
  - 现行公开/私密脑内容布局已不再以 knowledge/ 作为笔记根；笔记在 notes/
  - 若私密脑仍残留 knowledge/，视为未完成迁移或格式未对齐，应按现行 notes/（及对应 harness）纠正，而不是把 knowledge/ 当规范
- **违反项**：
  - 把 knowledge/ 当作现行规范路径继续写入
- **来源**：全栈开发专家，2026-10-22
- **真源文件**：`notes/README.md`
- **过时陷阱**：私密脑未拍平 knowledge/ 时的旧布局
- **原话摘要**：有问题啊，我的私密档呢？为什么我看还没有格式正确？还是有一个knowledge 文件夹？

### C08

- **类别**：`conflict-stale`
- **问题**：沉淀笔记时，能不能因为「工作区根也有 notes/」就默认写在 edges-workspace-viruspc 根目录？
- **判对要点**：
  - 不能：工作区根的 notes/ 不是子仓正文落点；正文写 composed 子仓
  - 要写进哪个脑，--scope 指到 .edges/compose/<name> 或直接在子仓 clone 操作
- **违反项**：
  - 默认写工作区根 notes/ 并开在工作区根的 PR
- **来源**：Grok Bot，2026-10-21
- **真源文件**：`.edges/memory/projects/project_workspace_is_deposit_entry/INDEX.md`
- **过时陷阱**：把「入口」误当成「正文落点」
- **原话摘要**：你现在默认不都是记在这里吗？把这个地方当做入口。

## 与 Dataset 的对应

- Langfuse Dataset 名：`harness-memory-ablation/v1`
- item id：`harness-memory-ablation-<case_id>`（例如 `harness-memory-ablation-M01`）
- `input.question` = 上表「问题」；`expectedOutput` = `{criteria, violations}`；`metadata` 含 `category`、`source_agent`、`source_date`、`original_text`、`source_files` 等
- 有源 observation 时已填 `sourceObservationId`（多数为 2026-10-24 起 Grok Bot 上报的 turn）

