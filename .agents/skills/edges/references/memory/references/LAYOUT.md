# 项目记忆布局

[`PROTOCOL.md`](PROTOCOL.md) 的当前实现。作用域入口经材料清单或 Project 组成入口引用类型入口，类型入口再引用正文。常规运行只使用 `.edges`。init / remember / add-type 拒绝旧 `.memory` 层，doctor 只报告 `migration-required`，不移动或改写旧文件。0.3.0 起不再提供 `edges memory migrate`。仍停在 `.memory` 的，先用 `@viruspc/edges@0.2.7` 完成那次迁移，再按仓库 `docs/migrations/2026-10-27-rename-harness-to-edges.md` 把材料目录改成 `.edges`。

## 作用域与采用范围

`AGENTS.md` 是人和 Agent 的入口。本层硬约束直接写在所属层的硬约束区块，已有规则不覆盖；本层系统维护信息和下层系统维护信息只放链接与描述。区块外手写内容、其他工具区块和业务模块入口保持原文。

通用推荐模块为 `memory`、`skills`、`tasks`；推荐不代表自动创建。无参 `edges init` 创建 `AGENTS.md`、feedback / project / reference、skills 的 managed / referenced，以及 notes / projects 的 `.edges` 组织清单，并安装包内 skill；不创建 user、tasks。`edges memory init` 只初始化用户选择的 memory 类型，未选择时不写盘，也不创建其他模块的材料。`edges skills init` 初始化 skill 类型，并安装包内 skill。`edges tasks init` 只创建任务看板；tasks 首次写入仍会在看板缺失时补上同一份文件。未采用的模块和类型不创建空目录。模块之间不互相创建材料。

```text
<scope>/
├── AGENTS.md
├── .edges/
│   ├── memory/<plural>/README.md
│   │                  └── <type>_<slug>/INDEX.md
│   └── skills/
│       ├── managed/README.md
│       │           └── <name>/SKILL.md
│       └── referenced/README.md
└── .agents/skills/<name>/SKILL.md  # 原位正文或安装链接，只读
```

`memory/`、`skills/` 无必经总入口，不创建 `.edges/skills/AGENTS.md`。下层作用域可跨多层目录，也可在 `packages/evaluation` 等模块内；有可读 `AGENTS.md` 的真实目录就是节点；目录名称或业务类型不构成额外资格门槛。

CLI 目标选择依次为显式 `--scope`、`EDGES_SCOPE` / `EDGES_REPO`、cwd 向上的最近可读 `AGENTS.md`，没有入口时退回 Git 根；不会穿越嵌套 Git 边界。标记只界定工具可改写的区块，不界定节点资格。显式选择目标不自动初始化 Memory。类型入口、Task 看板和 Project 使用共同的组成节点能力；本层与下层引用决定发现路径，唯一 parent 遵循实际目录的最近有效组织入口，普通跨目录正文链接不会变成所有权。Doctor 只给已采用 Memory / Skills 类型的节点补相应契约，不给普通或业务节点强加空区块。

根参数优先：`--root-dir` 明确封住树，不跨其他 Git root/submodule。未给时取 Git 根，否则最近的受管层入口，否则目标自身。扫描允许穿过 `.edges` 到达真实子层，但跳过其他隐藏目录、node_modules、符号链接目录和嵌套 Git 根。

## 主题 Project 选择

根参数 `--project P` 与 `--scope S` 同级；P 是相对 `S/.edges/projects` 的真实 Project 路径，嵌套形式如 `P/projects/Q`。省略时材料位于 `S/.edges`；选择后直接使用 `P/memory/<plural>/README.md`、`P/skills/<type>/README.md`，复用同一套类型发现、权限与索引维护。Project 的 `INDEX.md` 登记这些类型入口，不创建 `P/AGENTS.md`、`P/.edges` 或 `P/.agents`。

初始化、remember、add-type、get、list、delete、doctor、backup、restore 使用同一选择。原 scope 仍须满足记忆写入的初始化条件；Project 自己必须已经采用目标类型，未采用时拒绝 remember。各 Project 的同名类型彼此独立。`--super` 不改写已选择的 Project；与 `--target-dir` / `--repo-dir` 的冲突由 CLI 拒绝。Doctor 选择 Project 时只诊断与修复该 Project 已采用的类型，不改兄弟或根层。

`referenced` 的索引可以位于 Project，来源仍是原 scope 的 `.agents/skills`，不改变安装关系。私有类型按实际 Project 路径生成 Git ignore 规则；备份归档保留通用的 `.edges/memory/users/` 成员格式，恢复到当前选择的 users 目录。

```bash
edges --scope S --project P memory init --memory-types project feedback
edges --scope S --project P memory remember --type project --slug decision \
  --title '主题决策' --description '适用情境' --content '结论与理由'
edges --scope S --project P/projects/Q skills init -- -y
```

## 查询入口与发现范围

`memory list` 与 `skills list` 共用其他目录材料模块的查询规则：

- 默认沿 `scope/AGENTS.md` 登记的组成递归查询；选择 Project 后改从它的 `INDEX.md` 组成开始。主题嵌套不需要 `--all`。
- `--super` 以运行时 `SuperAgentsNode` 挂载 scope 直属配置材料，再沿登记递归展开，不自动进入材料自身的 harness。已选 Project 时保持 Project 入口。
- `--all` 额外发现所选物理目录下的独立真实系统；与 `--super` 组合时包含当前 scope 的 Super 内容树，不给每个发现的系统再加 Super。Project 的发现范围留在该 Project 内。

这些查询选项不赋予写权限。`memory remember`、`add-type`、`get`、`delete`、`doctor`、`backup`、`restore` 按 `--scope` 与可选 `--project` 定位，当前这些 memory 命令不以 `--super` 切换写入或单条定位路径，也不以 `--all` 批量操作。类型采用、去重与私有规则始终按选定材料根检查。

## 选择式初始化

```bash
edges --scope S init -- -g -y
edges --scope S memory init --root-dir R \
  --memory-types project feedback reference user
edges --scope S skills init --skill-types managed referenced -- -g -y
edges --scope S tasks init
```

`edges init` 不读 `--super`，材料在 `<scope>/.edges`，指定 `--project` 时写到所选 Project 的直属模块。无参时创建本层系统入口、三个公开 memory 类型（feedback、project、reference）、skills 的 managed / referenced、notes / projects harness 组织清单，并安装包内 skill。`edges memory init` 省略类型时：新层返回 `selectionRequired: true`、`recommendations`（模块与类型），不修改任何文件；已有层只刷新已经采用的 memory 类型。`edges skills init` 省略类型时：尚未采用则采用 managed 与 referenced，已经采用则只刷新那些 skill 类型；两种情况都安装包内 skill。显式列表只追加采用，不删旧类型。memory init 不创建 notes / projects 桩。自定义类型不会被推荐清单重置。类型元数据与实际入口是注册事实源，无 JSON/YAML 注册表。`--memory-types` 需要 memory 模块，`--skill-types` 需要 skills 模块。祖先上的类型行只由该模块自己的 init 刷新，而且只刷新根上已经存在的该模块类型。

| type | 模块与入口（相对作用域） | 正文与权限 |
| --- | --- | --- |
| `user` | `.edges/memory/users/README.md` | `user_<slug>/INDEX.md`；正文和索引整类 gitignore |
| `feedback` | `.edges/memory/feedbacks/README.md` | 用户纠正、有效做法和禁止模式 |
| `project` | `.edges/memory/projects/README.md` | 接手背景、决策、约定；不记可从代码推出的事实 |
| `reference` | `.edges/memory/references/README.md` | 资料指针 |
| `managed` | `.edges/skills/managed/README.md` | `<name>/SKILL.md` 及附属文件；工具可维护 |
| `referenced` | `.edges/skills/referenced/README.md` | 只索引当前层 `.agents/skills/<name>/SKILL.md`；不写正文或安装关系 |

这六个名字是可选官方类型，不是每层必建集合。旧 `skills` / `agent_skills` 不是运行时别名。官方入口优先级仍为 user → feedback → project → reference → managed → referenced。

## 自定义类型与格式

```bash
edges --scope S memory add-type \
  --module memory --name recipes --description '可复用操作手册' --skills-format
```

`--module memory|skills` 默认 memory。`--gitignore` 忽略整类正文及索引；`--index-only` 使 remember 拒绝写正文；`--skills-format` 采用 `<name>/SKILL.md`。模块、格式、可写性是独立维度。自定义 Skill 格式类型默认仍在 `.edges/memory/<原复数目录>`，不能因格式自动移到 skills。自定义类型身份全层唯一，跨模块重复登记报错；官方名称和路径不能被覆盖。外部自定义来源参数暂不支持。

类型入口是组织清单 `README.md`：默认 `.edges/<module>/<plural>/README.md`，选择 Project 时为 `P/<module>/<plural>/README.md`（memory 与 skills 相同），列表用 `edges-entries-local` / `edges-entries-descendants`，标题「本层内容 / 下层内容」。系统入口经材料清单、Project 组成到达这些 README。写入只发 README 与 `edges-entries-*`。不要在类型目录上 init 一份 `AGENTS.md` 来装组织清单。空的同目录类型 `AGENTS.md` 桩删掉。不读 `project-entries-*`、`project-memory-type`、`project-memory-entries`。残留旧标记视为未登记。层系统入口仍是 `AGENTS.md`。

类型入口特权注释为 `edges-memory-type`，字段包括 `name`、`module`、`description`、`gitignore`、`writable`、`format`。省略 module 的现有自定义元数据默认 memory；`format` 为 `ordinary|skills`，布尔字段必须解析为 YAML boolean，推荐写成 `true` / `false`，不接受字符串。未知元数据不影响发现。刷新只替换当前索引的本层列表区块（README 上是 `edges-entries-local`，残留 AGENTS 上是旧列表标记），保留原 metadata 与手写引言。没有 metadata 的官方类型按官方契约推导；自定义类型必须保留 metadata 区块，且显式包含 writable 与 gitignore 权限字段；单个权限字段缺失也拒绝推断。索引或区块缺失时无法安全恢复身份与权限，报告 unsafe-layout 并拒绝写入，不能从目录名猜测可写/公开默认值。

类型入口地址均为**作用域相对路径**，默认包含 `.edges/<module>/...`，选择 Project 时包含 `.edges/projects/P/<module>/...`；类型描述同时记录所属模块。消费者通过 CLI 的类型发现与路径解析能力定位索引和正文；不能把全部 type 拼到 memory 容器下。

## 来源和写入边界

`remember --type managed --slug my-method --description '用途' --content '步骤'` 写本地 Skill。`referenced` 不接受 remember，即使元数据尝试开启 writable 也报错；`managed` 必须保持 writable: true 与 format: skills，元数据尝试改成只读或普通条目格式同样报错。类型与条目的真实路径必须留在选定 owner 内；受管容器、索引与写入路径上的符号链接不扩大权限。日常命令不更改安装链接。

每类只扫描当前来源的直接条目：普通记忆 `<type>_*/INDEX.md`，Skill 格式 `*/SKILL.md`。不递归吸收子作用域或全机技能。只读安装根可链接外部来源；本地内容不能越出所属 type。每类内部按 realpath 去重，同名不同真源保留；同一真源同时属于 managed 和 referenced 时两份入口各自保留。

缺失、断链、无法读取/解码来源不是成功空扫描。init 返回 `complete: false` 和 `diagnostics`（含 `source-scan-error`）；doctor 在 findings/remaining 保留此诊断，刷新保持已有索引原字节。初次选择 referenced 时可以创建类型入口，但来源缺失仍报告不完整，绝不代建 `.agents/skills`。存在且可读的空来源才是成功的空清单。格式缺陷由 doctor 报 `invalid-entry`，不改原位正文；frontmatter 必须有起止分隔符，未闭合时即使出现 description 也不算有效。

私有类型写正文或索引前先补 Git 根 ignore：`.edges/<module>/<plural>/` 与 `**/.edges/<module>/<plural>/`，包含类型入口。无 Git 时返回 skipped-no-git；不会创建仓库。已采用类型被刷新时重新保证其私有忽略规则。

## 受管区块与条目

区块标记改为 `<!-- edges:start -->` 外层，内部按 constraints → local → descendants。系统入口是 `AGENTS.md`。类型入口是 `README.md`，列表用 `edges-entries-*`，自定义特权元数据用 `edges-memory-type`。系统入口三类标题为「本层硬约束」、「本层系统维护信息」、「下层系统维护信息」。本层列表登记该节点持有的类型 README、任务看板 README 与其他材料；下层列表登记下层系统入口，保留显式跨层和跨目录关系及原描述。不读 `project-memory` 层标记，也不读 `project-entries-*`。写入只发 `edges` / `edges-entries-*` / `edges-memory-type`。任务记在所属材料根的看板 `README.md` 的 `edges-entries-*`；Project 统一在 `projects/` 组成清单中，任务没有独立的 Task Project 分组；层 `AGENTS.md` 挂这块 README，traverse 顺着已登记的 children 走到任务，不在 list 里另开一套 README 遍历，也不把项目列表抄进看板 `AGENTS.md`。旧 `task-projects` 标记只作迁移输入。不生成第四类工作与模块入口，不要求无内容的标题。修复不覆盖人工文本，也不因物理中间目录新增 AGENTS 就重归属已登记引用。

普通条目为 YAML frontmatter + Markdown，前缀仍是类型原值，slug 为 snake_case。Skill 格式 slug 为 kebab-case（1–64 字符），name 为目录名。详细字段见 [`frontmatter-fields.md`](frontmatter-fields.md)：顶层遵循 Agent Skills 闭集，实现字段放 `metadata.edges-*`；读取既有顶层字段不等于支持旧目录布局，常规 doctor 不重写文件头。

模板在 `templates/`：层入口 `AGENTS.tmpl.md`；官方类型 `USER/FEEDBACK/PROJECT/REFERENCE/MANAGED/REFERENCED.tmpl.md`；自定义类型 `TYPE.tmpl.md`；普通正文 `index.tmpl.md`、Skill 正文 `SKILL.tmpl.md`；列表行 `entry_line.tmpl.md`。类型模板正文写 `edges-entries-*` 与「本层内容 / 下层内容」，CLI 写到 README 时保持原文。不要把类型条目再抄进同目录 `AGENTS.md`。模板官方全集用于推荐与选中类型渲染，不自动采用全部类型。CLI 构建时携带这些模板；运行已构建的 CLI 不依赖另一个已安装 Skill 的源码目录。

## 执行入口

执行实现位于 `cli`，使用 TypeScript。`edges memory` 提供 init、remember、add-type、get、list、delete、doctor、backup、restore；完整参数以各命令 `--help` 为准。目标通过根参数 `--scope` 选择；`--target-dir` 可显式指定同一目标，归档命令沿用 `--repo-dir`。JSON 输出保留操作结果与诊断；Skill 承担内容判断、选择及人审，不再分发 Python 执行层。

作用域和目录 IO、类型发现、索引维护由 service 承担；Markdown/YAML 解析复用 CLI 内置的 gray-matter 默认行为，不另写 YAML 解析器。迁移器单独保留旧布局解析和恢复日志，日常操作仍不兼容旧布局。

## Doctor

默认只诊断；已有修复授权时使用 `--apply`。修复已采用官方类型的缺失入口（自定义入口丢失时无法恢复身份/权限，报告 unsafe-layout 要求恢复原索引）、有效节点上的漂移索引和已采用 Memory 的漏登记，补缺失硬约束区块；foreign AGENTS 只追加受管区块。重复组成引用或跨组重叠使 AGENTS 无效：报告路径、区块与原因，保留原文，不猜测该保留哪条；其依赖修复暂缓，独立有效节点仍可修复。不会初始化未采用类型、移动旧布局或改正文。返回 `findings`、`repaired`、`remaining`；每个 finding 同时含 `code` 与兼容消费字段 `issue`。无法读取的来源、无效正文和旧布局会留在 remaining，不宣称已全部修好。

## 统一目录节点与显式导入

普通记忆、Task、Note 只识别目录内 INDEX.md（读兼容 index.md）；Skill 使用 SKILL.md，name 必须是 1–64 字符小写 kebab-case，description 非空。AGENTS 的 local/descendant 是发现组成，两组不重叠；同目录内容的 AGENTS 是 harness，不是内容的 parent。资源与 harness 随整个内容目录移动，不成为 children。未受控正文保留。

新建不提供 file/directory 选项。remember 的 --import-entry 指向 canonical 入口，验证完整目录后整体复制；与 --content/--content-file 冲突，不修改来源。旧单文件通过仓库维护命令 pnpm migrate:directory-nodes --root <worktree> 显式预览，--apply 才执行，只迁移 tracked/public 内容。普通运行不读取旧单文件为节点；Doctor 不代为转换，不读取或迁移真实私有内容。
