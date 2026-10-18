---
name: project-memory-init
description: 对用户选定的任意目录初始化或刷新系统入口 AGENTS.md（硬约束 + 组成登记），并按选择采用 Project Memory / Skills 类型。无参 edges init 与 edges skills init 还会安装包内 skill。仅当用户明确要求 init 时使用。标准命令是 edges init；各域 init 只初始化本模块。
version: 4.0.0
---

# Project harness init（`$project-memory-init`）

面向用户的名称是 **project harness init**；Skill 名仍为 `$project-memory-init`。标准命令是 `edges init`：它只做公共的系统入口步骤，再依次调用各模块自己的 init。`edges memory init`、`edges skills init`、`edges tasks init`、`edges notes init`、`edges projects init` 各自只初始化本模块。只在用户明确要求 Init 时运行；Ask、Remember、Doctor 不得代为 Init。用户明确要求 reshape 已有入口时可按该流程初始化。先读 [PROTOCOL](references/PROTOCOL.md) 与 [LAYOUT](references/LAYOUT.md)：前者规定发现形状，后者规定当前路径、类型与写入边界。

**谁该 init：** 用户认定需要重点维护、要挂 Memory / Skills 模块或登记下层系统入口的目录——空目录或已有内容目录均可。Init 写出合法**系统入口** `AGENTS.md`（`project-harness-*` 区块，标题「本层硬约束 / 本层系统维护信息 / 下层系统维护信息」），并按选择创建 `.harness` 下类型入口 `README.md`（`project-entries-*`，标题「本层内容 / 下层内容」）。层入口的本层系统维护信息链到这些 README。

**谁不该 init：** 仅为列系统一孩子、尚未需要系统二材料的目录（用同目录 `README.md` + `project-entries-*`，或迁移脚本另建）；未经用户要求不要给全仓或批量目录铺 `AGENTS.md`。看板和类型目录上的 README 是组织清单，不是系统入口。不要在类型目录上 init `AGENTS.md` 来装组织清单，空的同目录桩删掉。不要让 list 另开一套 README 遍历。层系统入口仍是 `AGENTS.md`。Init **不会**在作用域根自动创建组织清单 `README.md`——那是系统一入口，由用户或迁移单独建立。

无参 `edges init` 写出 `AGENTS.md`、memory 的 feedback / project / reference、skills 的 managed / referenced 类型索引，以及 `.harness/notes/README.md` 与 `.harness/projects/README.md`，并把 npm 包内的 Edges skill 装给本机 agent。不建 user、tasks。`edges init` 不读 `--super`，材料落在 `<scope>/.harness`。`edges init <module>` 与 `edges <module> init` 写同一批文件，而且只写该模块。模块之间不创建对方的材料。安装只在这次 init 包含 skills 时发生。

类型选择按模块拆开。memory 类型走 `edges memory init`；skill 类型走 `edges skills init`。推荐模块仍含 memory、skills、tasks、projects、notes，推荐不代表无参命令会全建。新层先展示 memory 的 project / feedback / reference / user 与 skills 的 managed / referenced 用途，让用户选择，不预建全部。未选择时 `edges memory init` 返回 `selectionRequired` 和推荐清单且不改文件。已有 memory 层不传选择只刷新已采用的 memory 类型。`edges memory init` 不创建 notes、projects、tasks、skills 的文件。`edges skills init` 在未选择且尚未采用 skill 类型时采用 managed 与 referenced；已经采用时只刷新那些 skill 类型，并安装包内 skill。传给安装器的旗标写在 `--` 后面。agent 调用时不要跑裸的 `edges init`：`skills@1.7.2` 没探测到自己在 agent 里、stdin 又不是 TTY 时会退出 1。非交互且保留它的 agent 自动探测，用 `-- -g -y`。`-g` 装到用户目录，`-y` 跳过确认；探测到当前 agent 时只装给那一个，没探测到则按本机已安装的 agent 装（一个都没有则装给全部）。要钉死某一个 agent，再加 `--agent <name>`，例如 `-- -y --agent claude-code`（不加 `-g` 时写项目目录下的 `.claude/skills`）。`edges tasks init` 只建任务看板；首次 tasks 写入仍会在看板缺失时补上同一份文件。

```bash
edges --scope <目录> init -- -g -y
edges --scope <目录> init notes
edges --scope <目录> notes init
edges --scope <目录> memory init \
  [--target-dir <scope>] [--root-dir <root>] \
  [--memory-types project feedback reference user] \
  [--description <本层职责>]
edges --scope <目录> skills init \
  [--skill-types managed referenced] \
  -- -g -y
edges --scope <目录> tasks init
```

memory 与 skill 的选择分别执行。显式选择追加采用，不删除既有或自定义类型。自定义类型使用 `$project-memory-add-type`，不要改官方推荐模板。`--memory-types` 需要 memory 模块，`--skill-types` 需要 skills 模块。

层入口直接链到 `.harness/memory/<plural>/README.md` 与 `.harness/skills/<type>/README.md`，固定两跳到正文，无容器总入口。新索引只写 README。尚未迁走、仍带条目列表的旧 `AGENTS.md` 类型入口只读兼容；空桩不是索引。可读 AGENTS 都是节点；本层和下层按显式登记区分，容器可跨层直达。已有登记不因中间目录新增入口而重归属，节点身份不自动采用 Memory。`--root-dir` 是边界；默认先取 Git 根，否则最近受管层入口，否则目标自身，不能从工具安装目录推断目标。

`managed` 可写本地 Skill；`referenced` 仅索引当前层 `.agents/skills`，不创建来源目录、不动原位正文或安装链接。同源别名在类型内去重，不同真源同名保留。私有类型先补 ignore 再创建索引。

按 JSON 汇报 created / preserved、agentsAction / indexAction 和下层条目移动。`needs-doctor` 表示只有人工 AGENTS，文件未被覆盖；交给 doctor 追加区块。`complete: false` 的 diagnostics 必须说明，尤其来源缺失或不可读时保留原索引，不能称为空来源刷新成功。旧层返回 `migration-required`，转 `$project-memory-migrate`，不让 doctor 迁移。

工具只维护自己的区块，现有硬约束与手写正文不覆盖。需先安装提供 `edges memory` 的 Edges CLI；运行 `edges memory init --help` 检查命令可用性。模板随 CLI 构建分发，类型和字段结构见 references/templates。实现分层见 [运行时说明](references/runtime.md)。

普通记忆正文统一为 `<type>_<slug>/INDEX.md`；Skill 保持 `<name>/SKILL.md`。Init 不转换旧单文件；公开 tracked 内容转换使用 `$migrate-directory-nodes`。

新建子作用域由 init 按路径登记到父级：目标 `AGENTS.md` 在父级 `.harness` 下记入本层，否则记入下层。已有登记保持原组。`edges memory doctor --apply` 按同一规则补缺失的父级链接。这些命令没有 `--index-group`。缺失 owner 不代为初始化。任务范围只用根上的 `--scope`、`--super`、`--all`：不传 `--super` 时看板在 `<scope>/.harness/tasks`，`--super` 时看板在 `<scope>/tasks`。`tasks list` 顺着主体 `AGENTS.md` 的 children 做一次 traverse；`--all` 从当前 scope 走森林。不要从真 AGENTS 再读同目录 README 的 `project-entries`，也不要把 README 链接抄进 `AGENTS.md`。遇到 `task-projects` 旧标记时，先对用户选定范围运行 `scripts/migrate-agents-indexes.mts --root /absolute/scope --check`，明确执行迁移才加 `--write`；普通命令不自动迁移。
