# edges init 是标准初始化命令，域 init 委托同一个 init service

模块初始化原先只有 `edges memory init`，notes 与 projects 的 harness 桩顺手挂在这条命令上。根命令 `edges init` 成为标准入口；`edges memory init`、`edges notes init`、`edges projects init` 只委托 `services/init/service.ts`。挂载表 `harness-materials.json` 仍只提供 path，init 模块表用 material id 引用，path 只经 `placeHarnessMaterial`。

**Status:** accepted（ADR 0031；grill 确认于 2026-10-08；2026-10-18 由 ADR 0036 修订默认集与 skills init）

**See also:** ADR 0027（CRUD 动词）、ADR 0030（叶子 CRUD 经 NodeService；该决定不改 memory / tasks / README 命令）

**Amended by:** [ADR 0036](0036-edges-init-installs-bundled-skills.md) — 无参 `edges init` 的默认集加入 skills；`edges skills init` 在建类型索引之外，还把 npm 包内的 skill 装给本机 agent。下文「不建 user、skills……」「`edges skills init` 只采用 skill 类型」两处以 0036 为准；其余不变。

## Decision

`edges init [module...]` 只做编排：先做公共的系统入口步骤，再按模块表依次调用各模块自己的 init。不给模块时写 `AGENTS.md`、notes 与 projects 的 `.harness` 组织清单，以及 memory 的 feedback / project / reference。不建 user、skills、tasks、evaluation、observation。`edges init <module>` 可重复，与 `edges <module> init` 写同一批文件。每个模块只创建、只登记自己的材料，不顺手创建别的模块。

`edges memory init` 只采用 memory 类型。`edges skills init` 只采用 skill 类型；未指定且尚未采用时采用 managed 与 referenced。`edges tasks init` 只建 `.harness/tasks/README.md` 并登记到本层系统入口。`edges notes init` 与 `edges projects init` 只建各自的 harness 组织清单。evaluation 与 observation 在挂载表里有材料，但没有领域命令，本决定不为它们发明 init。`edges artifacts init` 仍只写本机 artifacts token 配置，不进 harness 编排。

`--memory-types` 只在本次包含 memory 时有效；`--skill-types` 只在本次包含 skills 时有效。祖先类型行的刷新只发生在该模块自己的类型 init 里，而且只刷新根上已经有的该模块类型行。

init 不读 `--super`，材料永远落在 `<scope>/.harness`。帮助把「本次会创建」和默认集之外的 tasks、skills 分开。无 TTY。无参 `edges memory init` 仍返回 `selectionRequired` 且不写盘。根 init 与 notes / projects / skills / tasks init 的成功信封是 `status: success`；memory init 仍是 `ok: true`。

创建或补齐 scope `AGENTS.md` 是 init service 的公共步骤。桩缺了才建；类型索引继续刷新；AGENTS 只补受管区块。节点文件经 NodeService。tasks 看板不走 NodeService 的自动登记，由 tasks init 自己把这一份文件挂到 scope `AGENTS.md`。唯一例外是非节点 `.gitignore`，仍由 `saveEntries` 写入。

`extensions/cli/src/commands` 不 import `harness-materials`。tasks list 要看板 README 的位置、是否存在，以及某个节点是不是看板 README 时，走 `services/tasks/service.ts`。
