# Tasks、Memory、Note 通用能力收敛

状态：已实施并验收（2026-10-06）；本次根据用户对文件过散的质疑及 Service 边界的纠正重新梳理。保留四项收敛目标，补充已确认的 Schema 生成与获取；替代上一版新增文档包装和查询包装的方案。

## 目标

统一节点保存、AGENTS 结构与索引维护、物理路径原语及登记树查询。减少重复基础设施与调用方需要理解的概念，保留 Tasks、Memory、Note 的业务行为。以 TS 数据契约生成 TaskDoc Schema，供校验和 CLI 导出使用。

## 架构与调用方向

采用 Service 协调操作、Model 承载领域数据与行为的分工。Service 是外部操作入口；Model 可以有方法，但修改并持久化一个节点的完整流程由 Service 负责。

```mermaid
flowchart TD
    CLI[CLI / MCP / Skills] --> Business[Tasks / Memory / Note 业务 Service]
    Business --> Nodes[NodeService]
    subgraph Domain[domain]
      Models[models：领域变更、校验、parse / serialize]
      Operations[operations：遍历与查询算法] --> Models
    end
    Nodes --> Models
    Nodes --> Operations
    Nodes --> Files[已有文件持久化实现：快照、原子写、恢复]
```

- **业务 Service** 决定做什么：Tasks 状态与项目规则、Memory 类型与私有内容规则、Note 的 Git 发布顺序；准备输入并调用 NodeService。现有函数式 Service 可继续使用，不要求全部改成类。
- **NodeService** 协调怎么完成节点操作：加载受管对象、调用 Model、维护受影响索引、检查冲突并保存。沿用 get/create/update/move/destroy/import/query，不新增 NodeDocument、DocumentService 或 save 包装。
- **Model** 定义节点内容和有效状态；parse/serialize、校验、关系变更与纯内存初始化均无文件 IO。Model.create 与 Service.create 同名时，前者只是服务内部的内存初始化步骤，后者才是完整创建操作。
- **operations** 实现纯遍历/集合算法，由 NodeService 提供加载；保留此前确认的分文件组织。
- **内部文件工具** 保持现有 node-files、node-lock、node-cache 等职责；它们是 NodeService 的实现协作者，不再在其上增加一层面向业务的持久化接口。

业务正常写流程通过 `NodeService.update(node, input)` 提交变更，避免分散为调用方先改 node 再决定保存什么。模型仍采用已确认的可变、原地更新实现；不引入 immutable、只读代理或禁止 setter 的类型重构。模型单元测试可直接调用纯内存方法。

锁继续覆盖整个 CLI 写命令，必须早于业务读取。它不因本次分层说明被缩小为单次 NodeService 方法调用；NodeService 的直接调用不被描述为自动取得 CLI 命令锁。

### 单个节点、集合操作与完整用例的边界

2026-10-06 用户确认：Model 管单个节点自身的职责，operations 管集合处理与树遍历，Service 协调跨节点和文件系统操作。按职责归属判断，不按方法参数中是否出现数组判断。

| 归属 | 负责 | 示例 |
| --- | --- | --- |
| domain/models | 单个节点的内容、有效状态与纯内存行为 | parse、serialize、validate、字段更新，以及 InternalNode 自身的子节点索引维护 |
| domain/operations | 节点关系遍历与集合算法 | traverse、filter、map、groupBy、find、惰性查询链；通用集合算法不强制依赖节点类型 |
| services | 完整用例的加载、关联协调与持久化 | 创建、更新、移动、删除，维护受影响节点、文件冲突检查与保存 |

例如，InternalNode.addChild 修改该节点持有的 localChildren/descendantChildren 索引，属于 Model；它不创建子目录、不加载或修改其他节点、不保存文件。创建子节点并登记父索引的完整过程由 Service 协调。traverse 虽可从一个根开始，仍属于 operations；Service 注入加载回调，遍历算法不自行访问文件系统。

保留带行为的节点类与现有继承关系，不实施“Model 仅保留数据、全部行为搬到 operations”的方案；也不因 React 类比引入 reducer、dispatch 或不可变快照。既有同路径共享实例和原地更新决策继续有效。

JSON Schema 描述对外交换的数据或操作参数，与上述分工独立。生成源应是明确的 TS 数据契约，不直接扫描包含 getter、方法和私有状态的完整节点类；不为生成 Schema 搬迁 Model 方法，也不要求所有节点立即配齐 Schema。本计划 Task 5 从 TaskDoc 接入生成器和 Ajv 契约测试；不扩大为全节点 Schema 重构。

TaskDoc 的纯数据定义位于对应模型目录的 `tasks/task-doc-contract.ts`，前端与生成器直接消费；`task-doc.ts` 保留 Markdown 解析适配并重导出类型。仅使用 `import type` 仍会让 TypeScript 检查被引用模块的解析依赖，因此通过文件边界隔离 Node 运行时依赖，不给浏览器补 Node 类型来掩盖问题。

Schema 技术选型及决策原因见 [ADR 0025](../../adr/0025-typescript-source-generated-json-schema.md)：ts-json-schema-generator、Node 22，运行时结构校验按需使用 Ajv；先迁移 TaskDoc，保留本节职责边界。

## Service 依赖约束

依赖方向固定为 `CLI → 各业务 Service → NodeService → 模型 / operations / 文件实现`。Tasks、Memory、Note 是并列业务模块，当前用例不需要互相调用；共享机制下沉至 NodeService，不能由 Tasks 调 Memory.init 等业务操作获得。NodeService 不导入业务 Service；业务需要的写政策通过现有构造选项传入。

scope 解析和命令锁由入口编排，先确定目标并获取写锁，再执行写用例。node-files、node-cache、node-lock 等是通用内部实现，位于 services 目录不表示它们是需要业务逐层调用的 Service。memoryNodes/projectNodes 仅构造带政策的 NodeService，也不构成额外的 CRUD 服务层。业务模块内部直接导入实际定义文件，不通过自身 index.ts 聚合导出绕回入口。

当前运行时静态导入检查未发现 Tasks/Memory/Note 跨模块依赖，也未发现通用 node 模块反向导入业务 Service；但 Memory 的 paths.ts、types.ts、blocks.ts、templates.ts 构成循环。具体有 `paths → types → paths` 及 `paths → types → blocks → templates → paths`，不能把目标架构描述成已经完成。

在现有文件内断环：将依赖 discoverLayerTypes 的 typeIndexPath、typeContentDir，以及调用它们的 listTypeFiles 从 paths.ts 移至 types.ts。paths.ts 保留不读取类型登记的路径/命名原语；templates.ts 和 blocks.ts 可以依赖这些原语，types.ts 可以依赖模板和区块，但 paths.ts 不再依赖 types.ts。类型相关的盘点依旧是 Memory 的业务能力，不下放到公共 filesystem，也不改成登记树查询。

## 文件归属

将现有 models 与 operations 一起归入 domain/，二者保持同级；services、commands、utils 保持在 src 顶层。不增加 package 或调用层，不为四个目标分别建立公共入口文件。

```text
src/
├─ domain/
│  ├─ models/
│  └─ operations/
├─ services/
├─ commands/
└─ utils/
```

依赖为 `services → domain/operations → domain/models`，services 也可以直接使用 domain/models。models 不反向依赖 operations，domain 不依赖任何业务 Service（包括类型依赖），不直接执行文件 IO；可以使用纯 Markdown/日期/路径工具。traverse 的 resolve/load 回调继续由 Service 注入，filter/groupBy 等仍保持泛型，不因为归入 domain 而绑定节点类型。

迁移时一并纠正现有 `models/note/validation.ts → services/note/types.ts` 的类型反向依赖：该文件校验的是入库请求，应移至 `services/note/validation.ts`，与 IngestRequest 同属 Note 业务 Service。保持原校验行为、错误信息与 CLI 返回结果，不把请求类型下沉到领域模型。

批量移动和引用重算使用 TypeScript 脚本，覆盖源码、测试、仓库迁移脚本及当前开发文档；相对导入仍使用 .js。原 src/models、src/operations 不留转发目录。测试目录暂不搬迁。已完成的历史 spec/plan 保留其当时路径，本次 spec/plan 对新布局有优先解释权。

| 能力 | 落点 | 本次收敛 |
| --- | --- | --- |
| 节点 CRUD、查询与关联保存 | `services/node-service.ts` | 业务直接复用已有接口；不新增 `services/node-documents.ts` 或 `services/node-query.ts` |
| 文件冲突检查、原子保存、恢复 | `services/node-files.ts` | 保持现有实现；Memory 的 `.gitignore` 写也复用它 |
| AGENTS 结构与文本格式 | `domain/models/agents/agents-node.ts`、同目录 `domain/models/agents/` | 骨架使用现有 serializeNode；区块算法集中到 blocks.ts；不新增 agents/documents.ts |
| 索引转义与路径编码 | 现有 `domain/models/agents/serialize.ts` | 迁入 Memory 的两个纯函数，所有索引生成者复用；不新建 utils/markdown/index-rendering.ts |
| 基础路径机制 | 现有 `utils/filesystem.ts` | 包含关系、真实路径、链接检查与祖先查找共用 |
| Memory 的节点访问政策 | `services/memory/node-documents.ts` 改名为 `service.ts` | 保留 Service 构造和写入准备政策，删除 MemoryDocument/load/save 包装 |
| Tasks / Note 业务流程 | 各自现有 Service | 删除重复基础机制，不迁走业务规则 |

内部的 parse.ts、serialize.ts、blocks.ts 可继续拆分，它们有明确的格式职责。纯格式函数可以被业务 Service 的文档适配代码使用；函数返回文本或值，不制造另一份受管节点，也不执行保存。

## 四项目标的具体处理

### 1. 保存由 Service 统一协调

Tasks 的项目、看板及 owner AGENTS.md 改走 NodeService。业务 Service 加载原节点后生成更新参数并调用 update；新建由 create 调用模型初始化并落盘。简单的“get 后判断创建还是更新”可保留在业务操作内，不再抽取带 existed 状态的文档句柄。

Tasks 索引操作采用 managedRoot 为 canonical scope 的 Service，assertWrite 仅覆盖当前 board 及已存在的 owner AGENTS。TaskNode CRUD 原来的 board 边界保持。缺失 owner 不自动创建；分组执行调用方明确选择，已有关系分组、标签和链接拼写保留。

移动节点保留原登记状态：已有关系随目录移动保留原分组；原来未登记的节点移动后仍未登记，不凭空增加 descendant 引用。本轮不增加独立 reparent 或隐式位置推断。

Memory 保留写前的 scope / 类型 / ignore 准备和只读来源限制。Note 保留 checkout/pull 后才加载节点，以及父索引 Git 状态检查和附件导入流程。不同 managedRoot 或策略可以使用不同 Service；同一操作链、相同视图复用已加载对象。

完整 Markdown 输入只在 import 或既有文本适配路径中出现；在 Service 内先校验，再应用到受管节点并持久化。普通结构化创建不要求调用方先组装 Markdown。

`.gitignore` 是普通文本，不建立 Node：在现有 Memory Service 内调用 readEntry/saveEntries。先读快照再生成新文本，无变化不写。既有文件保留 mode，新文件沿用 0o600。run log 等资源继续走其业务文件接口。

### 2. AGENTS 共用一套格式实现

三段名称和顺序继续由 layout/serializer 定义。Tasks 新文档骨架调用现有 serializeNode(createNodeModel())；Memory 的分发模板保留其内容与占位符，区块填充共用已有 blocks.ts。Model 仍负责最终解析与校验，不增加第二个 Document 模型。

所有 Tasks 项目索引统一使用 InternalNode 通用关系与序列化能力，不再生成或维护 task-projects 专属区块。正常服务保留业务标题/描述、所属范围和排序政策，通过 NodeService 更新相关引用；其他模块引用及非受控正文保留。

旧 task-projects 的转换由独立 scripts/migrate-agents-indexes.mts 承担，支持显式范围、预览、冲突检查、可恢复原文和幂等执行；正常写入遇到冲突旧格式只提示迁移，不夹带兼容性搬迁分支。通用区块工具保留必要的 Memory 模板用途，不能因统一索引删掉类型约定或用户正文。

用户确认：位置由 LLM 根据语义和上下文判断，CLI 只负责执行明确输入。本层/下层分组不根据任务用途、节点类型或物理目录深度自动推导；CLI 接收目标路径及 local/descendant，验证路径、格式与关系一致性，并通过 Service 完成登记。更新未要求改组时保留既有位置；新增关系缺少必要位置输入则在写前报错，不采用隐式默认或先登记后纠正。harness 独立关系继续遵循原协议，不混成 children。

### 3. 路径工具提供机制，Service 保留政策

公共工具判断目录包含、解析缺失叶子的真实路径、定位范围内符号链接及查找祖先；业务 Service 决定允许范围、是否允许链接及错误信息。保持各选项既有的 `~`、显式 root、Git 边界语义。`..draft` 与 `..` 区分，目录同名前缀不表示包含。

### 4. 全仓查询直接使用 NodeService.query

删除 Tasks 内的通用 repositoryNodeQuery 包装；Tasks 的全仓任务列表与项目分组直接调用 NodeService.query(root, options)。includeDescendants / includeHarness 显式控制范围，任务查询传 ['task']，项目查询传 ['internal']。其他业务可直接使用相同 API，不需要另一个 repository Service。

不改变默认局部范围；只有 value() 执行查询；filter 不自动剪枝；types 可跳过无关叶子正文，但不能遗漏其 harness。禁止加入物理扫描兜底。Memory 的 doctor / 索引重建需要盘点未登记文件，继续保留物理扫描。

## Schema 生成、校验与获取

本轮执行采用 Schema 为准：完整 TaskDoc JSON 输入共享生成 Schema + Ajv 校验，删除两个入口各自的字段判断；Ajv/formats 是运行时依赖，生成器仍是开发依赖。以下约束以此裁定为准。

按 ADR 0025 实施 TaskDoc 首个契约：普通 TS 数据类型及公共枚举是定义源，生成器只在构建期运行；JSON Schema 与最小清单输出到 dist/schemas/，不提交 Git，随 CLI 包分发。保留旧 v1 的字段、开放 metadata 与约束，显式验证 draft-07 与原 2020-12 的接受/拒绝语义，不能只改方言标签或静默收窄契约。

新增 edges schema list 和 edges schema get task-doc/v1。list 返回 key/id/title/description；get 直接输出 Schema。命令仅从安装包相对路径读取产物，不解析 scope、不取锁、不等待 stdin、不回退源码或现场生成。未知 key、无效参数及产物缺失时 stderr 报错并非零退出，不能输出业务命令的 JSON 错误包装。

Ajv 8 与 ajv-formats 3 用于完整 TaskDoc JSON 输入及兼容性测试，关闭 coerceTypes/useDefaults/removeAdditional。不在 schema get 中执行校验，不把完整 TaskDoc 输出契约用于校验可省略字段的原始 Markdown。grouped/review-page 共用同一 TaskDoc 校验函数，其他输入须选用途匹配的契约。

审阅页切换到纯契约公共常量/类型，去掉手写 JSON 路径与内联 properties 假设；消费者的独立 dev/build/test/typecheck 不依赖残留 dist。通过兼容性验收后删除旧手写 Schema。干净构建、重复生成确定性、仓库外无源码及开发依赖的分发包 list/get 都是验收项。选型、替代路线、探针及采用依据保留在 ADR 0025。

grouped/review-page 的 TaskDoc JSON 输入适配器也纳入迁移：旧 Schema 允许未知 metadata 的 JSON 值，但现有适配器一律要求字符串，应修复此既有差异，验证对象、数组、数字、布尔、null 均无损通过。Markdown parser 的现有标量行为不变；完整 TaskDoc 输入以 Schema 为准，其他契约保持原有行为。

## 全局约束

- TypeScript；Node >=22，以 Node 22 作为运行、构建和测试基线；不新增独立 package。Task 5 增加 ts-json-schema-generator 2.9.0 开发依赖及 Ajv 8、ajv-formats 3 运行时依赖；仅在适用的数据边界校验。
- 仅在独立 worktree 修改；不迁移仓库真实内容或用户私有数据。
- 创建、更新、删除、导入与持久化通过 Service 协调；Model 保留纯内存领域行为。
- 保留 NodeService 内同路径单实例、原地更新与实际受影响节点保存语义。
- 保留命令写锁、文件快照冲突检查、单文件原子保存与既有失败恢复。
- 保留 Markdown 非受控区域；不要求保留 YAML 注释或 YAML 样式。
- 保留既有 CLI 输出协议、默认 scope 与查询范围；涉及新关系登记的入口补充显式位置输入，不保留隐式猜测分组。新增全局只读 schema list/get，成功输出纯 JSON，失败仅写 stderr 并非零退出。
- domain/models 与 domain/operations 同级，算法按文件拆分；domain 不依赖 services（含类型依赖），不直接读写文件；不引入 NodeTree、全局 Service 或事务框架。

## 取舍与验收

接受业务操作中少量直接调用 create/update/query 的重复代码，换取更少的公开概念和调用层次；业务政策本身仍需集中。文件数不是唯一指标，不能把独立的锁、文件恢复或模型语法全部塞进 node-service.ts。

同一用例内同根、同政策的 NodeService 向内部操作传递复用，避免 helper 重建缓存；不同政策仍可有独立视图。扩展复用现有模型 hooks、集合组合和契约清单，不新增插件引擎或跨命令全局缓存。简化验收分别记录 Task 1–4 删除的重复机制和 Task 5 新增的工具链成本，不以总行数必然减少作为承诺。

验收重点：四个收敛目标与 Schema 生成/获取均落实；项目/看板 AGENTS 不再直接 writeFile；无 NodeDocument/MemoryDocument 保存状态包装；无另一套 Memory 原子写；全仓查询复用已有 query；通用底层无业务 Service 反向依赖；涉及 Service 的运行时导入图无循环。保留现有单次生命周期操作的失败恢复，但不承诺整条业务命令的多个调用构成多文件 ACID。

参考的是 [Service Layer](https://martinfowler.com/eaaCatalog/serviceLayer.html) 协调操作与 [Domain Model](https://martinfowler.com/eaaCatalog/domainModel.html) 承载数据/行为的分工，不要求额外引入 Repository 框架。步骤见[实施计划](../plans/2026-10-06-shared-node-capabilities.md)。
