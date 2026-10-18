# Compose 虚拟节点

状态：方案，2026-10-18。本文件只定模型，不含实现。基线是 `main` 的 `56850a06`。

磁盘格式沿用 ADR 0034：组合条目仍写在所属 `AGENTS.md` 的 `project-harness-compose` 区块，链接指向本地目录，`remote: <git-url>` 写在说明里。本方案改的是这块文本在 Domain 里的节点形状。

## 现状

`AgentsNode` 自己持有一份 `ComposeRecord[]`。对外有三条旁路：

- `composeEntries`：目录、href、name、description、remote
- `composeChildren`：把每条收成 `NodeReference`，id 是该目录下的 `AGENTS.md`
- `registerCompose` / `unregisterCompose`

`BaseNode.composeChildren` 默认 `undefined`。`children` 不含这些边。`operations/traverse.ts` 在结构 children 之后再拼上 `composeChildren`。`localOnly` 仍然拼上，因为 Compose block 属本层。`NodeService` 用 `isComposeOnlyReference` 把「只出现在 compose 列表里的 id」排除出登记图和写前校验；查询则用 `#insideEnteredCompose` 记住跨仓根，以便走出 `managedRoot`。

`models/agents/compose.ts` 是一组散函数：从说明里抠 `remote:`、比较说明是否原样、拼回说明、把 href 解成绝对目录、再收成 `ComposeEntry`。`AgentsNode` 解析时走 `resolveComposeDirectory`；`services/compose/service.ts` 登记时又对同一路径做 `expandHomePath` + `path.resolve` + `path.relative`，节点里再 `path.resolve` 一次。git 的 clone / pull / push 在 Service，目标目录和 remote 从 `ComposeEntry` 上读。

`SuperAgentsNode` 与 `AgentsNode` 同放在 `models/agents/`。它继承 `AgentsNode`，路径用运行时的 `.super/AGENTS.md`，不 parse、不 serialize、不落盘。

## 目标

组合仓库不再挂在 `AgentsNode` 的旁路列表上。

- 新增虚拟节点 `ComposeNode`。不落独立文件，按需从所属 `AGENTS.md` 建出。
- 被组合的仓库是 `ComposeNode` 的普通 children。增删走 `addChild` / `removeChild`。
- `AgentsNode` 只多一条指向这个 `ComposeNode` 的边，形状对齐 `harness`：一条 `NodeReference`，不是一列。
- `BaseNode` / `AgentsNode` 去掉 `composeChildren`。
- traverse 走到 `ComposeNode` 之后按普通 children 往下。`localOnly` 仍然走进这条边。
- 序列化时 `AgentsNode` 读写该子节点，写回 `project-harness-compose`。
- clone / pull / push 的目录和 remote 由 `ComposeNode` 给出。git 进程仍在 Service。
- 依赖方向保持 models → core。core 不知道标记名、remote 语法和 git。

## 目标目录树

一种节点一个文件夹，与 `agents/`、`readme/` 平级。允许跨目录继承。`node/` 继续放路径判定和区块文书，它不是节点类。

```text
extensions/cli/src/domain/models/
├── agents/
│   ├── agents-node.ts       # AgentsNode。一条 compose 边，序列化时读写 ComposeNode
│   └── harness-agents.ts    # 判断路径和正文是不是带 project-harness 的 AGENTS.md
├── super-agents/
│   └── super-agents-node.ts # SuperAgentsNode extends AgentsNode
├── compose/
│   └── compose-node.ts      # ComposeNode extends BaseNode；说明里的 remote、目录解析、checkout
├── readme/
│   └── readme-node.ts
├── tasks/ …                 # 保持现状
├── memory/ …
├── notes/ …
├── projects/ …
├── skills/ …
├── node/                    # layout.ts、document.ts、stem.ts
└── index.ts                 # 按新路径再导出 AgentsNode、SuperAgentsNode、ComposeNode
```

`models/agents/compose.ts` 删除，其中的说明解析和路径解析进 `compose/compose-node.ts`。`models/agents/super-agents-node.ts` 移到 `super-agents/`。

运行时虚拟路径 `<所属目录>/.compose/README.md` 是 `ComposeNode.path`，不是源码目录。源码目录是 `models/compose/`。文件名用 `README.md`（`ENTRY_NAMES.readme`）：这条边是组合索引，贴近组织清单，不是系统入口。类仍是 `ComposeNode extends BaseNode`，`type` 仍是 `"compose"`；不从磁盘按 README 装载。

## SuperAgentsNode 搬家

另开一个小 PR，放在 Compose 实现之前。

这一步只搬文件、改 import 和文档里的路径。类仍是 `SuperAgentsNode extends AgentsNode`，flag 仍是 `--super`，仍不落盘，行为不变。公共出口仍是 `models/index.ts`，多数调用方继续从 index 导入。需要改路径的是 index 本身、直接引用 `agents/super-agents-node.js` 的测试，以及写出现路径的 README。

Compose 实现 PR 不再夹带这次搬家。`ComposeNode` 从第一天就放在 `models/compose/`，不先堆进 `agents/` 再挪。

搬家 PR 不改 `composeChildren`，也不改 traverse。

## 节点职责

### ComposeNode

继承 `BaseNode`，`type` 为 `"compose"`。不继承 `AgentsNode`：它不是系统入口，没有硬约束、本层/下层分组和 harness。不继承 `InternalNode`：子节点只有一份列表，且每条要带目录、href 和 remote，`NodeReference` 放不下。

构造只接受所属 `AGENTS.md` 的绝对路径。`path` 每次从所属节点的当前 path 算出：

`join(dirname(ownerPath), ".compose", "README.md")`

所属 `AgentsNode` 被 `setNodePath` 搬走之后，这条边的 id 跟着变。`parse` 与 `serialize` 抛错，与 `SuperAgentsNode` 一样不落自己的文件。

子节点图上的 `NodeReference` 是 `{ id, name, description }`。`id` 是检出目录下的 `AGENTS.md`。`description` 只是说明正文。目录、写入用的 href、remote、原文说明后缀留在节点内部。

方法：

- `addChild({ name, directory, description?, remote?, href? })`：名字空则报错；同一名字替换该条；目录重复报错；目录等于所属 `AGENTS.md` 所在目录报错。`directory` 与 `href` 只在这里解析一次（含 `~`、相对所属文件、拒绝 URL 和片段）。
- `removeChild(id)`：`id` 是该仓库的 `AGENTS.md`。没有这条则报错。
- `updateChild(id, patch)`：改 name、description、remote。name 与目录的唯一性仍校验。
- `children` 与 `localChildren` 是同一份列表，顺序即区块顺序。`descendantChildren` 为空。
- `checkout(name)`：返回 `{ name, directory, remote? }`，给 clone / pull / push 用。没有该名字则报错。

`AgentsNode` 通过 `composeNode()` 取得实例。没有条目时也要能拿到空实例，以便第一次 `addChild`。

### AgentsNode

去掉 `composeEntries`、`composeChildren`、`registerCompose`、`unregisterCompose`。

`composeNode()` 返回它持有的那一个 `ComposeNode`。没有条目时也返回空实例，供第一次 `addChild`。

`get compose(): NodeReference | undefined`。有至少一条组合时返回 `{ id: composeNode.path, name: "组合" }`，否则 `undefined`。`BaseNode.compose` 默认 `undefined`，traverse 因此不必认识 `ComposeNode` 的类。

`parseBody` 从文书的 compose 段建出 `ComposeNode`。`serializeBody` 向文书要回该段的链接列表。硬约束、本层、下层的读写保持原样。

### SuperAgentsNode

继承关系不变。`compose` 固定为 `undefined`：它的组成是构造时传入的材料挂载，不读 Compose block。文件位于 `models/super-agents/`。

## 图与 traverse

`expandedChildren` 只返回结构 children：`localOnly` 时用 `localChildren`，否则用 `children`。不再拼接 `composeChildren`。

访问一个节点时，边的顺序是：结构 children，然后 `node.compose`（有则一条），然后在 `includeHarness` 时的 `harness`。`ComposeNode` 自己的 `compose` 为空，它的仓库列表走普通 children。

**localOnly 走进 Compose 边。** Compose block 属本层，和本层硬约束、本层系统维护信息同一层。`localOnly` 排除的是所属 `AgentsNode` 的下层索引，不是这条边。走进某个被组合仓库的 `AGENTS.md` 之后，那个节点自己的 `localOnly` 照常生效：它的下层不再展开。仓库入口是否展开下层，与现在相同：`/repo/AGENTS.md` 在 `localOnly` 下走到 `/brain/AGENTS.md`，不走到 `/brain/nested/AGENTS.md`。路径序列中间多出 `/repo/.compose/README.md`。

harness 仍是显式 `includeHarness` 才走。Compose 边不看这个开关。

traverse 照常 yield `ComposeNode`（`type === "compose"`）。不在 traverse 里按类型把它藏起来。按类型过滤的查询（例如只收 `task`）仍会穿过它再往下，因为类型过滤只决定 yield，不决定是否展开。无类型的 `NodeService.list` 会多出这条虚拟节点；实现 PR 更新对应断言。命令输出若要只列文件入口，在命令或该查询的类型过滤处排除 `compose`，不写进 traverse。

`#registered` 与写前 `#validateGraph` 不跟随 `parent.compose` 这条边。被组合仓库不属于本仓的写图。这取代现在的 `isComposeOnlyReference`。该函数删除。

查询的 resolve：若 `reference.id === parent.compose?.id`，直接返回该 id，不要求磁盘上存在 `.compose/README.md`。load 返回所属 `AgentsNode` 已持有的那一个 `ComposeNode` 实例。其子节点是真实 `AGENTS.md`，继续走现有的存在性检查。

`#insideEnteredCompose`：父节点 `type === "compose"` 时，把子 id 的目录记为组合根，并允许这次查询走出 `managedRoot`。已经走进某个组合根之后，仍用路径前缀判断。组合根之外的节点，`includeHarness` 时仍限制在 `managedRoot` 内。落在 `managedRoot` 外的节点维持现在的只读标记；本方案不新开跨仓写入。

环检测沿用 path。`.compose/README.md` 与所属 `AGENTS.md`、与被组合仓库的 `AGENTS.md` 都不是同一 path。

## 持久化

所属 `AGENTS.md` 仍是唯一文件。`InternalSyntax` 的 compose 段不变：标题「组合」，标记 `project-harness-compose`。

读：段内链接 → `ComposeNode` 内部记录。说明里的 `remote:` 解析成字段 `remote`，其余文字是 `description`。原文后缀留着，字段未改时原样写回。

写：`ComposeNode` 交出链接列表（href、name、说明）。remote 有值时写回 `remote: <url>`，形式与现在相同。`AgentsNode.serializeBody` 把这份列表放进文书的 compose 段。最后一条被 `removeChild` 去掉之后，序列化不再写出该链接；空段的去留与现在 `unregisterCompose` 之后的正文一致。

`ComposeNode` 不实现自己的文件 parse/serialize。

## clone / pull / push

Service 仍执行 `git`。它先取 `AgentsNode.composeNode().checkout(name)`，再用返回的 `directory` 与 `remote`。

- clone：没有 remote 则报错；目录已是同一 origin 的检出则保持不动；目录存在但不是 git 检出则报错；否则 `git clone remote directory`。
- pull / push：目录必须已是 git 检出，然后在该目录执行该仓库自己的 `git pull` / `git push`。

Service 不再自己展开 `~`、不再自己算相对 href。登记是 `composeNode.addChild(...)`，注销是 `removeChild(id)`。CLI 子命令名不变：`register`、`unregister`、`list`、`clone`、`pull`、`push`。

## 与 SuperAgentsNode 对照

| | SuperAgentsNode | ComposeNode |
| --- | --- | --- |
| 目录 | `models/super-agents/` | `models/compose/` |
| 父类 | `AgentsNode` | `BaseNode` |
| 何时出现 | 显式 `--super`，作为遍历根 | 所属 `AGENTS.md` 有组合条目，或调用方要添加第一条 |
| 路径 | `<scope 的父目录>/.super/AGENTS.md` | `<所属目录>/.compose/README.md` |
| 磁盘 | 不读不写 | 不读不写；内容写在所属 `AGENTS.md` 的 Compose block |
| 子节点 | 构造时的材料 README，之后拒绝增删 | 被组合仓库的 `AGENTS.md`，经 `addChild` / `removeChild` |
| 谁把它接进图 | 它自己就是根 | 所属 `AgentsNode.compose` 一条边 |
| traverse | 当普通 `AgentsNode` 走 `children` | 先沿那一条边进入，再当普通节点走 `children` |

两者都是按需建出的虚拟节点。超节点是另一个系统入口；Compose 节点是一条本层边上的索引，不是系统入口。

## 未采用

- **保留 `composeChildren` 数组，只把散函数收进类。** 旁路还在，traverse 和 Service 仍按「这份 id 在不在旁路列表」分支。
- **把被组合仓库塞进 `AgentsNode.localChildren`。** 会写进本层系统维护信息区块，和 Compose block 混在一起。也没有单独的一条边。
- **`ComposeNode extends AgentsNode`，照搬超节点。** 组合索引不是系统入口。超节点继承 `AgentsNode` 是因为它有系统入口的组成形状。
- **`ComposeNode extends InternalNode`，增删一律 `addChild("local", reference)`。** 分组参数没有对应的本层/下层；remote 和目录只能再塞回 description。
- **在 core 做边的注册表。** `BaseNode.compose` 一条可选引用就够，和 `harness` 同级。core 不出现标记名。
- **虚拟 id 用 `.compose/AGENTS.md`。** 这条边是组合索引，文件名用 `README.md`。
- **把 `ComposeNode` 写成 `.compose/README.md` 文件。** 持久化位置仍是所属 `AGENTS.md` 的区块。
- **改掉说明里的 `remote:` 写法，另起字段或文件。** 磁盘形式保持 ADR 0034。变的是解析之后 remote 成为节点字段，说明原文只负责往返。
- **让 `ComposeNode` 自己执行 git。** 模型不做 IO。
- **`localOnly` 不进 Compose。** 与「Compose block 属本层」和现有遍历测试相反。
- **Compose 边改成和 harness 一样默认不走。** harness 是维护关系，默认关闭。Compose 是本层。
- **先把 `ComposeNode` 放进 `agents/`，以后再拆目录。** 目录规则在本方案里一次定清。
- **搬家 `SuperAgentsNode` 和 Compose 实现放进同一个 PR。** 搬家没有行为变化，和换图混在一起会让 diff 难以读。

## 改动面

搬家 PR（先做）：

- `models/agents/super-agents-node.ts` → `models/super-agents/super-agents-node.ts`
- `models/index.ts` 的导出路径
- 直接引用旧路径的测试（`test/services/super-agents-node.test.ts`、`test/services/system-forest-service.test.ts`）
- 写出现路径的 `models/README.md`、`domain/README.md`、`operations/README.md`

Compose 实现 PR：

- 新增 `models/compose/compose-node.ts`
- 删除 `models/agents/compose.ts`
- `models/agents/agents-node.ts`：去掉旁路，持有 `ComposeNode`，序列化来回
- `models/super-agents/super-agents-node.ts`：`compose` 固定为空
- `models/index.ts`：导出 `ComposeNode`
- `core/base-node.ts`：删除 `composeChildren`，增加默认空的 `compose`
- `operations/traverse.ts`：跟随 `node.compose`；删除 `isComposeOnlyReference`
- `services/node/node-service.ts`：装载虚拟节点；组合根记在 `type === "compose"` 的那一步；登记图与写前校验不跟随这条边
- `services/compose/service.ts`：登记/注销改走 `addChild` / `removeChild`；git 使用 `checkout(name)`
- 测试：`test/models/compose-node.test.ts`、compose 命令测试、受无类型 list 影响的断言
- 现状文档：`models/README.md`、`domain/README.md`、CLI README 里描述 Compose 边的句子；`CONTEXT.md` 里「Domain 把 Compose block 收成 Compose 节点」改成现在的虚拟节点和目录。历史 plan / spec / ADR 0034 的决定记录不动

命令文件 `commands/compose/` 只在 Service 的函数签名变了的时候跟着改。子命令集合不变。

## 下一实现 PR 的范围

先合并搬家 PR，再做 Compose 实现 PR。实现 PR 包含上一节的模型、traverse、Service、测试和现状文档。

不包含：dream、跨仓权限、`edges context`、磁盘格式变更、把 git 搬进模型、改 CLI 命令名。

## 测试要点

- 现有区块往返：name、目录、说明、remote；说明未改时后缀原样；`remote:` 仍出现在说明里。
- `addChild` / `removeChild` 写回区块，本层系统维护信息链接仍在。去掉最后一条后正文里没有该链接。
- 同名替换、目录重复、指向自身目录、空名字，仍报错。
- traverse：结构 children 之后是 `ComposeNode`，然后是被组合仓库的 `AGENTS.md` 及其下层。`localOnly` 含 `ComposeNode` 和该仓库入口，不含该仓库的下层。
- `NodeService.list` 能跨过这条边读到仓库内的 `AGENTS.md`；尚不存在的检出目录仍可先 `addChild` 再保存区块。
- 登记路径只解析一次：`~`、相对路径、绝对路径得到同一个 directory 和写回用的 href。
- `checkout(name)` 给出的 directory / remote 与 clone、pull、push 使用的是同一份。
- `#registered` 与写前校验不要求 `.compose/README.md` 存在，也不把仓外组合树纳入本仓写图。
