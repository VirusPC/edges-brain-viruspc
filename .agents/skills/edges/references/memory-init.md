本文件是总入口 skill `edges` 的模块说明，不是独立 skill。

# Project harness init

面向用户的名称是 **project harness init**。从总入口 `$edges` 进入本文件。标准命令是 `edges init`：它只做公共的系统入口步骤，再依次调用各模块自己的 init。`edges memory init`、`edges skills init`、`edges tasks init`、`edges notes init`、`edges projects init` 各自只初始化本模块。只在用户明确要求 Init 时运行；Ask、Remember、Doctor 不得代为 Init。先读 [PROTOCOL](memory/references/PROTOCOL.md) 与 [LAYOUT](memory/references/LAYOUT.md)：前者规定发现形状，后者规定当前路径、类型与写入边界。

**谁该 init：** 用户认定需要重点维护、要挂 Memory / Skills 模块或登记下层系统入口的目录——空目录或已有内容目录均可。Init 写出合法**系统入口** `AGENTS.md`（`edges-*` 区块，标题「本层硬约束 / 本层系统维护信息 / 下层系统维护信息」），并按选择创建 `.edges` 下类型入口 `README.md`（`edges-entries-*`，标题「本层内容 / 下层内容」）。层入口的本层系统维护信息链到这些 README。

**谁不该 init：** 仅为列系统一孩子、尚未需要系统二材料的目录（用同目录 `README.md` + `edges-entries-*`，或迁移脚本另建）；未经用户要求不要给全仓或批量目录铺 `AGENTS.md`。看板和类型目录上的 README 是组织清单，不是系统入口。不要在类型目录上 init `AGENTS.md` 来装组织清单，空的同目录桩删掉。不要让 list 另开一套 README 遍历。层系统入口仍是 `AGENTS.md`。Init **不会**在作用域根自动创建组织清单 `README.md`——那是系统一入口，由用户或迁移单独建立。

无参 `edges init` 写出 `AGENTS.md`、memory 的 feedback / project / reference、skills 的 managed / referenced 类型索引，以及 `.edges/notes/README.md` 与 `.edges/projects/README.md`，并把 npm 包内的 Edges skill 装给本机 agent。不建 user、tasks。`edges init` 不读 `--super`，材料落在 `<scope>/.edges`。`edges init <module>` 与 `edges <module> init` 写同一批文件，而且只写该模块。模块之间不创建对方的材料。安装只在这次 init 包含 skills 时发生。

选择 `--project <相对 .edges/projects 的路径>` 时，init 只采用该主题容器的直属模块，将类型 README 登记到已有 Project `INDEX.md`；不自动建立 Project 的 AGENTS、.edges 或 .agents。省略 Project 时保持 scope 初始化行为。嵌套选择可写成 `P/projects/Q`。

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
edges --scope <目录> --project <P/projects/Q> memory init --memory-types project feedback
```

memory 与 skill 的选择分别执行。显式选择追加采用，不删除既有或自定义类型。自定义类型使用 `$edges-memory-add-type`，不要改官方推荐模板。`--memory-types` 需要 memory 模块，`--skill-types` 需要 skills 模块。

系统入口经本层材料清单或 Project 组成索引到达类型入口，再打开正文；实际路径见 [LAYOUT](memory/references/LAYOUT.md)。新索引只写 README。尚未迁走、仍带 `edges-entries-*` 或 `edges-memory-type` 的类型目录 `AGENTS.md` 可以读取。`project-entries-*`、`project-memory-type`、`project-memory-entries` 不读。空桩不是索引。可读 AGENTS 都是节点；本层和下层按显式登记区分，容器可跨层直达。已有登记不因中间目录新增入口而重归属，节点身份不自动采用 Memory。`--root-dir` 是边界；默认先取 Git 根，否则最近受管层入口，否则目标自身，不能从工具安装目录推断目标。

`managed` 可写本地 Skill；`referenced` 仅索引原 scope 的 `.agents/skills`，即使类型索引位于 Project 也不另建来源目录、不动原位正文或安装链接。同源别名在类型内去重，不同真源同名保留。私有类型先补 ignore 再创建索引。

按 JSON 汇报 created / preserved、agentsAction / indexAction 和下层条目移动。`needs-doctor` 表示只有人工 AGENTS，文件未被覆盖；交给 `edges memory doctor` 追加区块。`complete: false` 的 diagnostics 必须说明，尤其来源缺失或不可读时保留原索引，不能称为空来源刷新成功。旧层返回 `migration-required`。0.3.0 起没有 `edges memory migrate`。仍停在 `.memory` 的，先用 `@viruspc/edges@0.2.7` 完成那次迁移，再按 [迁移说明](../../../../docs/migrations/2026-10-27-rename-harness-to-edges.md) 把材料目录改成 `.edges`。不要让 `edges memory doctor` 做那次迁移。

工具只维护自己的区块，现有硬约束与手写正文不覆盖。需先安装提供 `edges memory` 的 Edges CLI；运行 `edges memory init --help` 检查命令可用性。模板随 CLI 构建分发，类型和字段结构见 memory/references/templates。实现分层见 [运行时说明](memory/references/runtime.md)。

普通记忆正文统一为 `<type>_<slug>/INDEX.md`；Skill 保持 `<name>/SKILL.md`。Init 不转换旧单文件。公开 tracked 内容转换没有随包技能，在具备依赖的 Edges checkout 里用 `pnpm migrate:directory-nodes --root <工作树>` 预览，`--apply` 才写入。

新建子作用域由 init 按路径登记到父级：目标 `AGENTS.md` 在父级 `.edges` 下记入本层，否则记入下层。已有登记保持原组。`edges memory doctor --apply` 按同一规则补缺失的父级链接。这些命令没有 `--index-group`。缺失 owner 不代为初始化。Project 的直属材料登记到其 INDEX，不走子作用域登记；查询入口与 `--super` / `--all` 的区别见 [LAYOUT](memory/references/LAYOUT.md#查询入口与发现范围)。
