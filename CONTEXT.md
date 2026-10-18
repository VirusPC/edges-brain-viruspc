# Edges

Edges 采用通用的递归记忆与改进模型，当前以个人递归自我改进为实践目标，由知识资产、记忆与 Agent 协作支撑。

## Language

**系统入口（System Entry）**：
引出并承载系统二的入口文件，文件名为 `AGENTS.md`。它登记本层系统维护信息与下层系统维护信息，并可写硬约束与 Compose block；从作用域根起经系统维护信息登记可达的系统入口构成递归系统二树。任意目录都可由用户自行 init 出系统入口（`$project-memory-init` / project harness init；命令 `edges init` 只编排各模块，`edges <module> init` 只初始化该模块；`edges skills init` 另含安装技能，见 ADR 0036），以标记该目录为重点维护作用域；不是路径白名单。CLI 默认遍历根是 `--scope` 下的真实 `AGENTS.md`，只覆盖该系统的系统二；从真 AGENTS 出发到不了同目录 README 上的 tasks/notes 等是预期。对 edges 作用域（`isScope`：目录有可解析为带 edges 标记的 `AgentsNode` 的 `AGENTS.md`），本层系统维护信息**只**登记一条指向 `.harness/README.md` 的组成（材料索引）；各材料不再直接列在 AGENTS 本层。下层系统维护信息、本层硬约束与 Compose block 仍写在 AGENTS 上。见 ADR 0035。
_避免使用_：把内容叶子当成系统入口、未经用户 init 就自动给所有目录铺 AGENTS.md、从真 AGENTS 遍历时自动并进 README 组成边、在 edges 作用域的 AGENTS 本层逐条列出各 `.harness/` 材料、把无 edges 标记的普通 AGENTS.md 当成 edges 作用域

**虚拟超节点（SuperAgentsNode）**：
相对当前 `--scope` 的运行时系统入口，不落盘。实现类 **`SuperAgentsNode`，继承 `AgentsNode`**。仅当显式 **`--super`** 时启用。典型叙事：把整个仓库视为上一级主体（如个人）的系统二，向上为该系统构建虚拟根。traverse 时**当作普通 AgentsNode**（只走 `children`，无跨系统特判）。挂载优先 `<scope>/.harness/README.md` 并从它展开；这份组织清单不存在时，再回退按 `extensions/cli/src/domain/config/harness-materials.json` 扁平挂已有材料（材料 README；`scope`+path；不挂其它系统 `AGENTS.md`；可空）。不把作用域根 `README.md` 当作中间优先层。见 ADR 0035。缺 AGENTS 且未开 `--super` 不得自动合成。系统森林在 traverse 之外由 `SystemForestService` / `edges forest list` 拼装为 `BaseNode[][]`（`independent` 早停；`innermost` 只留内层）。
_避免使用_：虚拟系统入口、虚拟根、virtual-root、VirtualSuperNode、缺 AGENTS 就静默加上超节点、把超节点落盘、用真 AGENTS 遍历并边代替 `--super`、让一次 traverse 跨系统拼森林、Super 挂其它系统 AGENTS、在入口 README 已存在时仍只按 harness-materials.json 扁平挂载（目标行为）

**文档节点（Document Node）**：
模型中的 Markdown 单位：系统入口，组织清单，或内容叶子（Task / Note / Memory / Skill 等）。从作用域根（CLI scope 对应的真系统入口，或显式 `--super` 的虚拟超节点）起经登记可达才算节点。
_避免使用_：仅指文件夹、磁盘上未登记的 md

**组织清单（README.md）**：
用 `README.md` 承载组成登记的文档节点：本层内容挂系统一孩子（如 `tasks/`、Task、类型条目）；下层内容只挂其它 `README.md`（与 AGENTS 下层只挂 AGENTS 同理）。标记为 `project-entries-local` / `project-entries-descendants`，标题为「本层内容 / 下层内容」。给人看的说明与 entries 可同文件；工具只改标记区块。在「真系统」视角下这些是系统一材料；经 `SuperAgentsNode` 遍历时，同一批材料被当作**虚拟系统的系统二**展开。edges 作用域的 **`.harness/README.md`** 是该层的**材料索引**（标准组织清单，无 YAML frontmatter）：本层各 harness 材料挂在它的 entries 下，由上层 `AGENTS.md` 本层以单条组成指向它。见 ADR 0035。
_避免使用_：把叶子正文写成 README、把 README 当成真系统入口、无 entries 的普通包说明自动当节点、把 README 组成写成 project-harness-*、下层内容挂成 INDEX/SKILL、在 AGENTS 与 `.harness/README.md` 双写同一份材料索引

**内容叶子入口（INDEX.md）**：
Task / Note / Memory 等的入口文件，名为 `INDEX.md`。Skill 仍为 `SKILL.md`。有无子项仍看是否出现组成登记，不靠文件名分 Internal / Leaf。
_避免使用_：index.md（迁移前史料）、把叶子叫 README.md、把 INDEX.md 当成系统入口

**组成登记（entries）**：
系统入口或组织清单正文里受管 HTML 注释所登记的直属子节点；有登记则该节点当前有子节点，否则为叶子。普通正文链接与附件不构成组成。系统入口用 `project-harness-local` / `project-harness-descendants`（标题「本层系统维护信息 / 下层系统维护信息」）；组织清单用 `project-entries-local` / `project-entries-descendants`（标题「本层内容 / 下层内容」）。系统入口带组成登记是递归系统二的基础假设。同目录并存 `AGENTS.md` 与 `README.md` 时：系统一孩子只登记在 README；AGENTS 只登记系统二材料与下级系统入口——两套登记并列，持久化上互不为对方的 child。对 edges 作用域：各 `.harness/` 材料组织清单挂在 **`.harness/README.md`** 的 entries 下；上层 `AGENTS.md` 本层**只**登记这一条指向 `.harness/README.md` 的组成（不再在本层逐条挂各材料）。下层系统入口仍登记在 AGENTS 下层区块。目标模型下真 AGENTS 的 traverse **不**自动并同目录 README 边；要逛当前 scope 的内容面须换根到 `SuperAgentsNode`。见 ADR 0035。
_避免使用_：目录扫描结果、把任意 Markdown 链接当子节点、宣称 AGENTS.md 永不登记子项、把系统一孩子双写进 AGENTS 与 README、两套标记混用、把同目录 README 持久化挂成该 AGENTS 的 child、在 edges 作用域的 AGENTS 本层与 `.harness/README.md` 双写材料列表、把材料直接挂在 AGENTS 本层而不经 `.harness/README.md`

**组织节点 / 叶子节点（派生状态）**：
同一文档节点的当前状态：有组成登记为组织节点，否则为叶子。不是固定类型，模型不持久化 isLeaf。`AgentsNode` 与 `ReadmeNode` 继承 `InternalNode`（本层/下层 children 与索引编辑）；业务节点继承 `BaseNode`。`LeafNode` 是纯 text 节点。`type` 为 `agents` / `readme` / `task` / `memory` / `note` / `skill` / `text`（普通文本兜底），无 `internal`。
_避免使用_：用类层次代替组成登记来区分组织/叶子、type internal、按文件名区分组织/叶子、另造 entryKind

**维护关系（harness）**：
节点指向自身维护系统（系统二）的独立关系；系统入口即该关系在文件上的落点。默认不跟随 harness。真系统入口上的组成是该系统的系统二材料；内容面另经组织清单或 `SuperAgentsNode` 进入，不自动从真 AGENTS 并进。
_避免使用_：组成子节点、固定深度截断、把 harness 与「遍历时并 README 边」混为一谈

**Edges**：
「harness 任何目录」的模型及其可安装能力：任何目录（包括大脑这个虚拟目录）都能配一套 harness，经验按谁 × 在哪沉淀；名字来自 Edge。本仓是作者大脑的 harness 仓库，即个人实例。进入 Edges 自身的维护作用域时，Edges 又作为被维护的系统一；模型中的根主体不限于个人。
_避免使用_：Agent 工具箱、skill 合集、用「Edges」指本仓这个个人实例（说「本仓」或「作者的大脑仓库」）、与 `edges/` 目录或单条 Edge 混用

**组合（Compose）**：
把别的 harness 仓库（大脑、团队库、规范库、组件库等）叠加进当前工作空间的统一说法，对应 Devin Agent Memory 文章里的 composable。工作空间 = 自身就地 init 的 harness + 若干被组合的 harness 仓库；被组合的仓库各自保持独立的归属、权限和历史。被组合的仓库一律 clone 到本机，在当前作用域的 `AGENTS.md` 里用专用的 **Compose block** 登记本地入口，挂到目录树上。Domain 用虚拟节点 `ComposeNode`（`models/compose/`，运行时 id 是 `<所属目录>/.compose/README.md`）索引这些登记。默认 list / query 只含当前 scope。根级 `--with-composed` 穿过这个挂载点，把外部仓库的入口 `AGENTS.md` 纳入结果，并且只到这一层。落在当前仓库管理根之外的入口保持只读。Compose block 写在所属 `AGENTS.md`。edges 只管 git 仓库和本地目录树，不管远程入口和大规模检索。组合是 harness 的依赖声明，不是记忆库：`.harness/` 好比项目自己的源码，Compose block 里的本地入口好比依赖声明，Agent 开场读 `AGENTS.md`、顺着 Compose block 的路径走，就是解析并加载（不另做 `edges context` 命令，暂缓，见 ADR 0034）。它和 docker compose 一样用登记声明由哪些东西组合而成，但组合的是可复用的经验与约束，不是运行中的服务。见 ADR 0034。
_避免使用_：外部记忆、挂载、mount、把 edges 当成要接进工作空间的独立记忆库、用组合代替项目知识的就地 init、git submodule、另造 `compose.json` / `compose.yaml`、远程入口、远程 MCP 组合、服务端 clone、「一个模型两种部署」、把现有组成登记列表原样复用当外部记忆仓库登记、把 Compose block 当成层模型外的旁路

**外部记忆仓库登记**：
在当前作用域的 `AGENTS.md` 的专用 **Compose block** 里，登记被组合仓库在本机 clone 的入口目录。只有本地入口，没有远程入口。Agent 开场读 `AGENTS.md` 时就能看到其中的入口路径和 name / description。Domain 把 Compose block 收成虚拟节点 `ComposeNode`：被组合仓库是它的 children，`AgentsNode` 有一条 `compose` 边指向 `<所属目录>/.compose/README.md`。CLI 是 `edges compose register`、`unregister`、`list`、`clone`、`pull`、`push`。`register` 的 `--path` 可选，缺省检出目录是 `~/.edges/composed/<name>`，区块保留以 `~` 开头的路径，读和 `checkout` 时展开。unregister 按名字从区块去掉条目，不删除已 clone 的目录。clone / pull / push 用 `checkout` 给出的已展开目录；pull 与 push 在该目录执行该仓库自己的 `git pull` / `git push`。默认 list / query 不走进这条边。`--with-composed` 只纳入外部仓库入口 `AGENTS.md`。条目写在 `AGENTS.md` 的 `project-harness-compose` 区块，链接指向本地目录，`remote: <git-url>` 写在说明里。见 ADR 0034。
_避免使用_：组合清单、Compose List、`compose.json`、`compose.yaml`、`~/.harness/compose.json`、`.harness/compose.json`、挂载表、记忆源清单（`memory-sources`）、复用 `--super` 的 `harness-materials.json` 表示跨仓库入口、远程入口、MCP 目录根、MCP `remember` / 收件箱（`.harness/inbox/`）、由 edges 维护的远程大库索引（PageIndex 式）、另造与 Git 无关的独立 ACL、把 Compose block 当成不算本层的旁路

**dream**：
对整棵组合树做整理的过程：入口是工作空间的 `AGENTS.md`（其 Compose block），从该入口自下而上走树（就地 `.harness/` + Compose block 挂上的本地仓库）；大脑 / 团队库是树上的上层节点，不是入口。整理包括合并与删除记忆、清理目录结构、刷新 name / description，并把可跨项目复用的内容经 PR 提升到上层仓库（大脑 / 团队库）。定时 Agent 执行；每 24 小时检查一次，项目 harness 主分支有新提交才运行；产出走 PR。在哪运行另议。见 ADR 0034。
_避免使用_：以大脑或团队库为 dream 入口、直接指向大脑、只把 dream 当成「提升」单一职责、把整理目录树当成与 dream 无关的另套流程、消化收件箱、维护远程索引、无条件按固定周期跑、每次有变化就立即跑

**根作用域（Root Scope）**：
组织记忆与改进机制时选定的最外层范围，可面向个人、Agent、团队、公司或更大的系统；根代表所选主体或系统的作用域，其中的维护空间承载系统二。它相对于当前建模范围成立，可以独立存在，也可以纳入更大的作用域。以个人为主体时，根是大脑这个虚拟目录，位于此人自己的仓库之上；团队仓库的根沉淀的是团队在该目录下的经验。
_避免使用_：固定等于个人或 Git 仓库、唯一绝对根、把所选主体直接等同于系统二、工作空间（若指作用域；「工作区」只指专项工作区）

**个人递归自我改进（Personal RSI，Edges 语境）**：
以个人为主体，将学习、判断、行动及其记忆、方法、工具和 Agent 协作纳入同一改进循环，让提升后的能力继续用于改进自己及自我改进的方法。这是 Edges 当前个人实践的统一目标，知识闭环、认知复利与系统维护均服务于它；通用递归模型也允许面向其他主体。
_避免使用_：仅指 Agent 或工具自身升级、仅积累知识、把能力提升写成无条件保证

**系统一（System One，作用域角色）**：
在当前作用域中，以具体领域目标与问题为关注对象的系统；与维护它的系统二构成一组相对角色，对人和 Agent 都适用。
_避免使用_：固定目录或永久身份、快思考系统

**系统二（System Two，作用域角色）**：
在同一作用域内，负责支撑、维护与改进系统一，使其持续实现目标的系统；当它自身成为维护对象时，可在相应作用域作为系统一。
_避免使用_：全部过程记录、单纯的记忆集合、慢思考系统

**自身维护空间（Self-maintenance Space）**：
在某一作用域内，归属支撑、维护和改进其系统一的工作、记忆与机制的空间，承载该作用域的系统二职责。它按独立维护需求建立，既可集中承载材料，也可通过引用组织保留在工具约定位置的材料。
_避免使用_：全部领域内容、单纯的维护记忆、每层必建的目录

**维护知识（Maintenance Knowledge）**：
为接手、判断和改进某个作用域而持续保留的上下文、决策理由、纠正与资料指针，是其自身维护空间内的独立内容分组。任务进度、原始运行记录和评测结果保留在各自模块，形成可复用结论后通过引用关联维护知识。
_避免使用_：全部持久化内容、维护空间本身、原始记录的另一份副本

**知识资产（Knowledge Asset）**：
以未来产生决策收益为目的，被投入认知资本持续管理的材料或判断；Note 和专项承载在研资产，Edge 是能够反复部署的核心收益资产。
_避免使用_：内容、文档

**Edge**：
已经提炼出理由与适用边界、可检验且能相对原有判断或替代方案改善未来决策的可复用判断；是否经过现实验证不影响其身份，其价值也可能随环境变化而衰减。
_避免使用_：完整笔记、高质量内容、已验证结论

**认知资本（Cognitive Capital）**：
个人可投入知识生产与使用的稀缺时间、注意力和推理能力。
_避免使用_：信息、知识数量、货币资本

**知识投资（Knowledge Investment）**：
将认知资本有选择地投入知识的研究、提炼、部署与演化，以获得长期决策收益的过程。
_避免使用_：收集资料、整理文件、金融投资

**Agent Memory**：
让 Agent 跨任务保留并按需取回临时上下文、运营知识和长期认知资产的分层记忆能力；Memory 是资产管理基础设施，不等同于资产本身。
_避免使用_：单一目录、全部上下文、知识资产

**项目记忆（Project Memory）**：
服务于项目维护的有作用域运营记忆，保存无法从项目当前状态直接推导的约束、纠正、决策、资料指针和可复用流程。
_避免使用_：长期知识库、会话流水账、代码事实副本

**Memory Type（项目记忆）**：
项目记忆中一条记忆归入哪份类型入口的分类；每一类型在该层有一份类型入口，与该类型的条目同处。类型集合由 LAYOUT 实现与本层登记决定，不是 PROTOCOL 闭集枚举；类型入口与条目入口均复用统一节点模型。
_避免使用_：把 type 写成全局 JSON 注册表键、把看板状态夹直接叫 Memory Type、把每条 Task 升成 Memory Type（Q18=B，另卡）

**层入口 AGENTS.md**：
某一作用域上的系统入口，与「系统入口」同指；历史称呼。
_避免使用_：与系统入口并列的另一种文件

**类型入口**：
某一 Memory Type（或 Skills 类型）的索引文档节点，与条目同处，由上层系统入口的组成登记挂入。统一为组织清单：`README.md` + `project-entries-*`（`type=readme`），不是系统入口；该目录另经用户 init 才另有 `AGENTS.md`。
_避免使用_：把类型入口写成全局注册表、未加判断就等同层入口、类型索引继续用 AGENTS.md + project-memory-entries（迁移后）

**用户记忆（User Memory）**：
项目记忆的一种 Memory Type，保存绑定到某一仓库路径、且不宜公开的个人材料（个人偏好而非项目共享约定、凭据与密钥，以及其他不得公开的上下文）；权威副本在该仓库工作树内，但不进入版本历史。它不是独立于项目记忆的全局层，也不把私有仓当作真源。
_避免使用_：独立全局 vault、edges-private 当真源、机器级单一记忆库、项目共享约定

**可扩展 Memory Type**：
在指定记忆目录通过 skill（如 `$project-memory-add-type`）登记新的 Memory Type（name / description / 可选特权 metadata），与内置种子类型同构（类型入口 + 同处条目 + 层入口一行）、可被 remember / ask / doctor 发现；官方 init 种子不因示例类型膨胀。扩展面仍只在 LAYOUT，不另开类型注册表。
_避免使用_：单独 JSON/YAML 总配置平面、把示例 type 写进默认种子、把加 type 写成改 PROTOCOL

**检索评测（Retrieval Eval）**：
给定问题，被测系统返回文档路径，并按相关簇计算截断排序指标的评测。不判断答案文本对错。
_避免使用_：问答评测、评测冒烟（那是目的级别）、把分数当成项目记忆有效

**检索语料（Retrieval Corpus）**：
检索评测里被查找的那个 git repository。文档 id 是该仓库内的相对路径。仓库有没有组合别的仓库，由该仓库自己决定，不是评测配置的另一维。
_避免使用_：项目记忆、sandbox、memory 轴、把组合单独做成评测维度、MCP 的 team/scope

**评测冒烟（Evaluation Smoke）**：
以复现公开基准上「写入→检索→作答→打分」链路并产出可复查记录为目的的试跑；不构成项目记忆或 Agent Memory 有效性证据。
_避免使用_：记忆评测通过、benchmark 证明有效、把冒烟分数当成项目记忆增益

**公开基准证明（Benchmark Proof）**：
在构念匹配的公开基准上，用同底座、同 harness，以及空记忆/安慰剂/随机等对照，论证记忆机制带来可归因增益的评测。
_避免使用_：评测冒烟跑通、单次无对照的榜分数

**评测报告（Evaluation Report）**：
一次评测运行的可复现记录（含命令、底座、子集、分数与时间），落在 Edges 评测工作区中的报告落点，用于日后对照，不是知识资产本身。
_避免使用_：Edge、研究笔记里的口头分数、任务描述里的声称结果

**知识库 Observation 系统**：
面向知识库运行时的 traces / logs / dashboard 产品语义：看到检索、读写、代理使用过程与异常。
_避免使用_：自托管 Langfuse、自部署 Langfuse（若指 Observation 产品）、Evaluation（打分裁判）、仓内 `observation/` 运营笔记目录（若指同一产品）

**自托管 Langfuse**：
自运维的 Langfuse 实例，用作 LLM/Agent 可观测后端候选。看板卡名是「自部署 Langfuse」。
_避免使用_：知识库 Observation 系统、Observation 产品、Langfuse Cloud（若指 v1 部署目标）、云 VPS（若指 v1 宿主）、Windows 日常桌面（若指 v1 正常运行路径）、仅 Tailscale 或 Tailscale Funnel（若指当前访问面；现行说法是「公网 HTTPS 域名（经 Cloudflare Tunnel）」，见 ADR 0033）、把实例域名、Cloudflare 账号或 `.env` / 密钥写进本仓、HA 或定时机外备份（若指 v1 数据面已具备）、一次接上全部 Grok / edges Agent（若指本卡 v1 验收）

**知识管理 Agent（Knowledge Management Agent）**：
在人设定的目标、授权与风险边界内，承担研究、提炼、检索、部署和反馈处理的主动知识资产管理者。
_避免使用_：被动文件工具、自主决策者、无人监督的基金经理

**决策收益（Decision Return）**：
知识调用相对原有判断或替代方案带来的可观察改善，包括判断质量、行动效果、决策速度、认知成本和外部反馈的变化。
_避免使用_：文档数量、内容产量、必然可货币化的回报

**认知复利（Cognitive Compounding）**：
知识复用产生的收益与使用反馈被重新投入知识闭环，使未来研究成本下降、判断质量提高的累积效应。
_避免使用_：文件积累、信息囤积、一次性收益

**Edge 组合（Edge Portfolio）**：
由多个相互补充、交叉检验并服务于不同决策的 Edge 构成的认知资产组合。
_避免使用_：目录分类、知识总量、需要固定配置比例的金融组合

**知识流动性（Knowledge Liquidity）**：
知识资产能够被快速、可靠并带着必要上下文检索和部署到决策中的程度。
_避免使用_：搜索结果数量、正式评分、知识质量

**认知风险（Cognitive Risk）**：
Edge 因证据不足、超出适用边界、环境变化或新证据反驳而降低决策质量的可能性。
_避免使用_：任何不确定性、金融风险指标、单纯缺少资料

**Note**：
不要求预先形成目标或结论的轻量知识捕获，可作为 Edge 的原材料。
_避免使用_：专项、Edge、任意 Markdown 文件

**复盘四栏**：
整理对话 Note 时使用的四段结构（背景→过程→所学→行动指南），灵感来自 After Action Review，但不是官方 AAR 模板本身。
_避免使用_：Facts–Insights–Actions、主要结论/认知更新旧三分法、官方 AAR 模板（若指本结构）、阶段性复盘

**阶段性复盘**：
对已经过去的一日或一周所做的回看：事先本该怎样、实际怎样、差距可能因为什么、下次做什么，以及该进入维护体系却尚未进入的候选。记录的是回看本身。
_避免使用_：复盘四栏、Note、Task、项目记忆、Edge、Skill

**背景（对话整理）**：
复盘四栏的第一栏：这次对话为何发生、意图与议题。
_避免使用_：讨论主题（若指本栏）

**过程（对话整理）**：
复盘四栏的第二栏：对话中实际发生的事实，评价尽量少。
_避免使用_：主要结论、Facts（若指本栏）、所学的同义改写

**所学**：
复盘四栏的第三栏：可带走再用的判断，不是过程的复述。
_避免使用_：认知更新、Insights、过程栏的复述

**行动指南（对话整理）**：
复盘四栏的第四栏：带触发条件与具体做法的行动说明。
_避免使用_：裸待办清单、Actions（若指本栏）

**对话三角色（笔记 / 记忆 / 任务）：**
同一段对话可以分出三类产物，不要揉成一张：`conversation-to-notes` 记「这次澄清了什么」（复盘四栏）；`project-memory-remember` 记「以后还该记住什么」（结论 → 为何 → 做法）；`conversation-to-tasks` 记「谁下一步做什么、怎样算完」（背景 → 目标 必填；完成标准与动作可选，完成标准可留到 grill-with-docs；背景须写出产生任务的对话过程；有完成标准时它给循环验收）。`conversation-to-notes` 与 `project-memory-remember` 只成文，写入另一步；`conversation-to-tasks` 成文后交人审，用户确认后再用 CLI 落库。
_避免使用_：把任务写成记忆结论；把复盘笔记写成看板待办；交人审确认前就对任务看板写盘；正文栏名中英混写；动作可选却拿它顶替完成标准；背景只有出处标签、没有对话过程；背景或目标不足却硬编或不问；完成标准未定时硬编而不留给 grill

**专项工作区（Initiative Workspace）**：
围绕一个明确目标持续组织材料、状态和产出的有边界工作空间；可直接产生需要提炼为 Edge 的经验。
_避免使用_：长笔记、主题分类、知识资产

**项目工作区（Project Workspace）**：
以解决问题或交付产出为目标的专项工作区。
_避免使用_：教学工作区、专题笔记

**Edges 扩展（Edges Extension）**：
因 Agent 或外部系统需要接入、操作 Edges 而存在的可复用能力。
_避免使用_：共享扩展、通用 Agent 工具

**能力面（Capability Surface）**：
Agent 与人发现并调用 Edges 扩展能力的入口集合；本仓定为 CLI、Skill 与 MCP 三者。
_避免使用_：仓根 `bin/`、把 npm `package.json` 的 `bin` 字段当成单独一层、仅 CLI+Skill（漏掉 MCP）

**CLI**：
以 `edges` 为名的命令行界面（含 `notes`、`projects`、`tasks`、`skills`、`artifacts` 等子命令）；人和有 shell 的 Agent 共用同一套命令与契约。
_避免使用_：仓根脚本、`edges-note`、把 CLI 定义为「bin entry」

**NodeService**：
节点读写与组成登记的门面。内容叶子的创建、读取、更新与删除都经它完成。commands 不直接装配它，只调用该领域的 `services/<module>/service.ts`；主文件可以 re-export 已有实现。
_避免使用_：records 旁路、扫盘后直接改叶子或父索引、commands 直接 `new NodeService` 或调用 `dated-leaf`

**House CLI surface（标准 CRUD 旗标）**：
全仓 `list` / `get` / `create` / `update` / `delete` 共用的旗标形状。已用于 notes、skills 与 projects；README / 组织列表、memory、tasks 以后照此跟随。

| 命令 | 旗标 |
| --- | --- |
| `list` | 共享 `--filter` / `--group-by` 信封，外加全局 `--scope` / `--super` / `--all`。不另造域专用 list 旗标 |
| `get` | 只收目标 |
| `create` | metadata + `--body`，外加该类型真正需要的旗标 |
| `update` | metadata + `--body`，外加该类型真正需要的旗标 |
| `delete` | 只收目标 |

类型旗标只在必要时出现：note 标题经正文 H1 或 `--title`；skill 用 name / description。正文用 `--body`。metadata 用可重复的 `--metadata key=value`。
_避免使用_：`--content`、域专用 list 旗标、在 get/delete 上挂 body 或 filter

**Skill（Edges 接入语境）**：
用于接入 Edges、教 Agent 何时及如何调用能力面的说明性能力包：有 shell 则调 CLI，无 shell 则调作为对等能力面入口的 MCP；不承载 git 或入库实现。
_避免使用_：实现脚本目录、仓根 `bin/` 封装、业务逻辑真源

**受管技能（Managed Skill）**：
由 Project Memory 沉淀并维护正文与索引的可复用方法；受管关系描述正文维护职责，与作者身份、来源和是否安装无关。
_避免使用_：仅指 Agent 生成的技能、未安装技能、全部本地技能

**引用技能（Referenced Skill）**：
由 Project Memory 维护发现索引、正文及安装关系由原有机制维护的技能；可以是本仓自写或接入的技能。
_避免使用_：仅指第三方技能、全部 Agent 技能、Project Memory 可直接改写的正文

**安装技能（Install Skill）**：
把随 `@viruspc/edges` npm 包分发的 Edges 自有 Skill 装进本机 Agent 的 skill 目录（如 `~/.agents/skills`、`~/.claude/skills`）。`edges skills init` 的安装步骤是固定版本 `skills@1.7.2` 的薄封装：`skills add <包内 skills 目录绝对路径> --skill '*'`，`--` 之后的 token 原样转交；agent、`-g`、`-y`、有无 TTY、同名覆盖都按 vercel-labs/skills 的默认。同一条命令还建 skill 类型索引（Managed / Referenced）。无参 `edges init` 的默认集含 skills，其 `--` 之后只转交给这一步。vercel skills 非零退出则 init 失败。与 Managed / Referenced 的类型索引是两件事：装进 Agent 目录不等于登记进作用域的索引。见 ADR 0036。
_避免使用_：`edges skills install`、把安装当成可跳过的附加步骤、安装时从 GitHub 拉 skill、把 shared-extensions 里的通用 skill 算进安装范围

**MCP（Edges）**：
在无 shell 宿主上暴露 Edges 扩展能力的机器入口；与 CLI、Skill 同属能力面，调用同一套领域契约而非另一套产品。
_避免使用_：唯一入口、替代 CLI、直连仓根脚本（已否决）

**Project Harness（Edges 语境）**：
Git 项目里递归系统二落在系统入口 `AGENTS.md` 上的写法：本层硬约束、本层系统维护信息（edges 作用域下本层只指向 `.harness/README.md`）、下层系统维护信息，以及 Compose block；`.harness/` 是材料目录，**`.harness/README.md` 是该层材料索引**（标准组织清单），不是另一套系统入口。各材料挂在该 README 的 entries 下，不必在 AGENTS 本层逐条列出；内容节点由组织清单或系统入口的组成登记挂入，不必自身也是系统入口。见 ADR 0035。
_避免使用_：Agent Harness 的同义词、只等于 `.harness/` 目录、本层组成/下层节点（旧标题）、Project Memory 三章的旧称、要求每个内容目录都有 AGENTS.md、把「AGENTS 本层列出每个材料」当成目标形状

**Agent Harness（Edges 语境）**：
让 Agent 持续有效工作的支撑机制，组织上下文、记忆、工具、约束与反馈；它可承担系统二的角色，也可作为被维护的系统一，不与系统二严格同义。
_避免使用_：Project Harness 的同义词、系统二落在 AGENTS 层入口上的名称、单纯的记忆库、固定归属某一层的组件

**大脑（虚拟目录）**：
把一个人看成一个不落盘的虚拟目录，位于此人自己的仓库之上。它和任何物理目录一样可以设置 harness，这个 harness 落成一个仓库（作者的那一个就是本仓），跨所有目录、只对此人成立。团队仓库的上一层是团队，不是某个人的大脑；此人在团队仓库里工作时，他的大脑 harness 按共享范围叠加生效。虚拟超节点的典型用法就是表示这一层。
_避免使用_：本机某个物理父目录（如 `~/projects/`）、只给 personal agent 用的特殊机制、把大脑等同于承载其 harness 的仓库、把大脑当成团队仓库的父目录

**共享范围（Sharing Scope）**：
一份 harness 文件对谁成立、给谁读写，由它提交进哪个仓库、谁能访问该仓库来表达：目录所在仓库的 harness 对该仓库的协作者成立；大脑 harness 仓库对此人及其装入的 Agent 成立；团队自己的 harness 仓库对团队成员成立。「谁」按人或人群算，Agent 只负责写入。目录决定经验沉淀在哪里，共享范围决定它属于谁。gitignore 只用于把密码等隐私材料挡在仓库外，不构成「谁」的一层。
_避免使用_：按写入的 Agent 划分归属、把公开仓库的可读范围当成协作者范围、把用户记忆当成个人经验的沉淀层

**Agent 客户端（Agent Client）**：
在仓库工作目录里阅读并给出结果的程序，例如 Claude Code、Codex、Cursor。检索评测里它负责交出文档路径。
_避免使用_：Harness 客户端、通用 SDK、codewiz、把 Project Harness 或 `.harness/` 当成客户端

**Personal Agent**：
harness 对象是大脑这个虚拟目录的 Agent 客户端；它跨应用和渠道长期为同一个人服务，如 ChatGPT dots、Meta Muse、Manus Cue、Grok Bot。code agent、work agent 的 harness 对象是仓库或子目录。各类 Agent 同等重要，机制相同，区别只在对象是哪个目录。
_避免使用_：Edges 的唯一用户或主角、按产品清单而非 harness 对象下定义、把 personal agent 的 harness 对象当成某个仓库目录、把承载 harness 的仓库当成被 harness 的对象

**Meta-harness（Edges 语境）**：
以 harness 为支撑、维护与改进对象的系统，相对于该 harness 承担系统二的角色；meta 表示相对层级，本身不承诺自动优化或自我修改。业界另有两种用法：自动搜索并改写 harness 代码的外层循环（Stanford Meta-Harness），以及在多个厂商 harness 之上统一编排的一层（如 Databricks Omnigent）。Edges 两者都不是，对外文案不用这个词。
_避免使用_：自进化 harness 的同义词、递归自我改进的同义词、对外文案与 README 标语

**共享 Agent Harness（Shared Agent Harness）**：
不依赖 Edges 仍有价值，并可跨机器、跨 Agent 客户端使用的个人 Agent 能力。
_避免使用_：Edges 扩展、连接器

**教学工作区（Teaching Workspace）**：
以学习进展和能力获得为目标的专项工作区。
_避免使用_：笔记、Edge、项目工作区、教学站点（若指公网入口）

**教学站点（/teaching/）**：
与教学工作区对应的公网持久入口，固定路径 `/teaching/`，与其它 edges 衍生站同一阿里云 ECS 路径心智。
_避免使用_：教学工作区（若指公网入口）、Artifacts 预览服务、`/tasks/` 持久看板站

**Post**：
从知识资产或专项成果编辑而来的对外发布物；它是知识资产部署后的输出，把知识闭环接入读者与公共讨论，但不替代其来源知识。
_避免使用_：最终形态的 Edge、内部知识真源

**知识调用（Knowledge Invocation）**：
在新问题中检索并部署 Edge，使其影响判断或行动，并用产生的决策收益继续检验原判断。
_避免使用_：阅读、发布、归档

**知识出口（Knowledge Outlet）**：
让活跃知识跨越当前系统边界、被更多人或外部系统消费的闭环扩展点，包括对外发布和机器可读的检索接口。
_避免使用_：终点、Archive、知识目录、备份

**知识闭环（Knowledge Loop）**：
研究线索经认知资本投入形成 Edge，Edge 被调用后产生决策收益，使用结果、外部反馈和新洞察再投入知识生产的循环；它可以通过知识出口连接更多参与者，形成更大的嵌套循环。
_避免使用_：笔记入库、单向发布、Archive

**自进化 Harness（Self-improving Harness，Edges 语境）**：
将任务执行与 harness 改进机制纳入同一系统边界，由执行反馈推动改进，经验证和采纳后用于后续任务的演化方式；人可以参与判断和采纳，增加 meta 层级本身不构成自进化。
_避免使用_：仅积累日志或记忆、仅增加维护层、默认无人监督

**受控自进化（Controlled Self-Evolution）**：
知识闭环的反馈持续改善知识资产以及 Agent 的记忆、检索、工具和工作流，但重要变更仍由人判断和采纳的演化方式。
_避免使用_：默认无人监督、把有人参与等同于不能递归改进

**递归自我改进（Recursive Self-Improvement）**：
系统经验证和采纳的改进进入下一轮自身改进，使改进后的能力继续用于改进自身；可以涉及记忆、工具、工作流及改进机制，不要求修改底层模型权重。人参与判断和采纳不排除递归关系。
_避免使用_：普通反馈闭环、知识更新、仅增加 meta 层级、未展开的 RSI

**Archive**：
暂存从活跃知识空间移除、但仍需保留来源和恢复可能性的材料；它是退出机制，不是知识出口。
_避免使用_：知识出口、历史知识库、失效 Edge 专区

**Task**：
跨 Agent 接力的工作项（idea 捕获后经细聊与开发直至收口）；分组属 Task Project，再按 edges-tasks-status 分夹；需求先后用 edges-task-priority，不改状态夹。
_避免使用_：todo（若指工作项本身）、普通勾选清单、Multica 式可抢单队列条目、`tasks` Memory Type（若指看板工作项）

**Task stem（edges）**：
Task 文件去掉 `.md` 的文件名，是 `edges tasks` 的查找键；不是展示标题，也不等于 frontmatter / 文档 `name`（三者常碰巧相同）。
_避免使用_：title、name、把展示名当 CLI 查找键

**Task Project（edges）**：
选定看板内对 Task 的分组单位（对齐 Multica Project 概念，本轮不做完整 parent/stage）；领域板目录为 `tasks/<project-slug>/`，维护板目录为 `.harness/tasks/<project-slug>/`，未分组用保留名 `_default`。每个已存在的 project 带标题与描述，是用户已设的分类质心；索引与 per-project AGENTS.md 只在元数据层，看板 markdown 仍是 Task 真源。
_避免使用_：把 edges-tasks-status 当 project、用任意深层目录当 project、根下直接放 status 夹（迁移后）、项目工作区（若指看板分组）、把 Task Project 当 Memory Type、把未确认的候选当成已有 project

**Task Project 索引**：
所选板 `tasks/README.md` 或 `.harness/tasks/README.md` 的 `project-entries-local` 列表；由 CLI 维护各 project 的标题与描述指针，只做索引/描述层（Q18=A），不把每条 Task 升成 Memory Type。用户 init 为系统入口的 `<project>/AGENTS.md` 仍登记在看板 `AGENTS.md`。
_避免使用_：手改该节、把它当 Memory Type 入口、把看板文件当记忆条目

**Task Project README.md**：
每个 Task Project 目录（含 `_default`）内的 `README.md` 组织清单：标题、描述（可选指针）与列出 Task 的 `project-entries-local`。CLI 新建 project 只写 README；用户明确 init 时才有 `AGENTS.md` 系统入口。
_避免使用_：每 project 一套完整项目记忆、把 Task 文件登记为 Memory Type

**Task Project 候选（edges）**：
proposeTypes 输出的一行：建议 slug、描述，以及支撑该类型的 `_default` Task stem 列表（文件名去 `.md`，不是 title）。人确认并 `project create` 之前还不是 Task Project。
_避免使用_：已落盘的 Task Project、自动当成质心、Memory Type

**Task Doc（edges）**：
一份 Task 的文档：`name`、`description`、`metadata`，以及 Markdown 正文 `body`。字段约定独立于某一页；CLI 的 frontmatter 与看板条目嵌入的文档对齐同一形状。
_避免使用_：自造轻量配置、看板专用的另一套文档、预编译 HTML 正文、Task stem、edges-title（若指 `name`）

**Task Project 审阅页（edges）**：
classifyTasks、proposeTypes、本地 `edges tasks project review-page` 与 `/tasks/` 共用的那一份审阅壳：由 CLI 渲出的 HTML，载荷仍是通用 groups+items。组是已有 Task Project 还是 proposeTypes 候选由调用方 Skill 解释；审阅页本身不是 Task Project，也不是分类算法，也不负责托管。页仍只渲染。
_避免使用_：把它当 Task Project、当分类算法、`--mode`、把它当 Artifacts 预览服务、让 review-page 负责发布、把它当成 `/tasks/` 站点本身、status station、按用途再拆一壳

**审阅壳（Review Shell）**：
Task Project 审阅页这一份交互界面。仓库只留下源码和构建管线：源码在仓根 `extensions/apps/tasks-review-app/`（包名 `tasks-review-app`，与 CLI 分开，`extensions/apps/` 可再放别的预构建壳），产物在 `extensions/cli/src/commands/tasks/project/assets/review-page/`（`index.html`、`review.js`、`review.css`）且不入库，由 `build:tasks-review-app`、prepack、CI 或 ECS 部署链生成。Vite 把产物写进 CLI 那份目录；`review-page.ts` 只读产物，不读 `extensions/apps/` 源码。写出的页把预构建 JS/CSS 内联成一份 HTML，数据是页内 JSON script `#edges-review-payload`。导航是 hash 或 hash 上的 query，同一份产物用于 `file://`、Artifacts 与 `/tasks/`。左栏是 Task Project：点选既是筛选也是拖放落点，拖到左栏只改 project。中栏是按 edges-tasks-status 分的列，只展示状态。右栏展示所点条目的 Task Doc 正文。顶栏筛全文、edges-task-priority、edges-task-assignee 与 edges-tasks-status。视口不窄于 Tailwind `md`（`≥768px`）时仍是这一套三栏。窄于 `md` 时同一壳改成纵向长滚动：项目筛选区、状态板，点卡片后详情接在状态板下方，仍在同一页里滚动。每张任务卡都有「移到项目…」，桌面与窄屏都能把卡片改到另一个 Task Project；这只改页内 JSON，写回仍是 Copy JSON。桌面左栏拖放还在。
_避免使用_：三套页面、status station、本轮在中栏改状态、把语义检索算进这份壳、用另一套看板产品充当 Task 的领域模型、在用户机器上现编这份壳、把预构建产物提交进 git、默认用 zip+base64 装载荷、path history、靠服务器 rewrite 的 react-router、窄屏只做抽屉、底栏分页、左右滑页、窄屏另做一壳、窄屏在状态列上改状态

**`/tasks/` 持久看板站**：
固定公网路径 `/tasks/` 上的持久入口，始终反映 main 看板；部署链从看板生成分组列表，经薄映射喂给同一审阅壳。页内文档来自分组条目嵌入的 Task Doc。不是新的 status station 产品，也不是 Artifacts 短 TTL 预览。
_避免使用_：status station、Artifacts 预览服务、把它当 Task Project 审阅页命令本身、本轮按 project 拆 URL 树、本地 HTML 视图、教学站点、浏览器去读仓内 `.md`、本轮把页上拖拽写回 git

**列表分组**：
四种叶子的 `list --group-by` 共用的输出：`{ status: "success", groupBy, groups: [{ key, items }] }`。字段只认一层键。缺字段的 `key` 是 `__undefined__`，过滤也把缺字段当成这个值。对象和数组按键名排序后的 JSON 文本参加比较和分组。`/tasks/` 把任务的这份输出映射成审阅页自己的 groups 与 items，这一组的 id 和 title 同样是 `__undefined__`。审阅页输入不是列表输出。
_避免使用_：`edges.tasks.grouped/v1`、`a.b` 路径取值、按资源各做一种分组契约、`null`、`unspecified`、review-page 输入 schema、把扁平 list 当成分组结果

**doc（看板条目）**：
分组列表 `items[]` 上可选嵌入的 Task Doc（`name`、`description`、`metadata`、`body`）。审阅页只读页内 JSON 里的这份文档。
_避免使用_：另开看板顶层 schema、浏览器读取磁盘 `.md`、生成器里的预编译 HTML 正文

**审阅导出行（edges）**：
Task Project 审阅页导出 JSON 的一行：`stem`、`current`、`suggested`、`action`，可选 `note`。查找键是 Task stem，不是 title 或 `name`。
_避免使用_：用 title 或 name 当查找键、把展示字段当 apply 键

**classifyTasks（edges）**：
独立工作流 Skill（约定路径 `extensions/skills/project-tasks-classify/`，展示名 classifyTasks）：以用户已设、带描述的 Task Project 为质心，对整板做归属建议（LLM / agent 判断，不要求 embedding），经 Task Project 审阅页给人改组（无 GUI 时 Markdown 建议表回退），人贴回审阅导出行后再经现有 CLI 落地。新类型由 proposeTypes 另议，本 skill 不自动建 project。
_避免使用_：通用 edges-tasks Skill+MCP CRUD、自动批量建 project、Embedding NCC、K-means 命名、要求 embedding / 向量分类、只整理 `_default`、公开 `edges tasks classify`、把审阅页当成分类器

**proposeTypes（edges）**：
独立工作流 Skill（约定路径 `extensions/skills/project-tasks-propose-types/`，展示名 proposeTypes）：从 `_default` Task 与已有 Task Project 质心提议新的 Task Project 候选，复用同一 Task Project 审阅页给人确认（无 GUI 时候选表回退），本身不落地为 Task Project。
_避免使用_：并进 classifyTasks、自动建 project、Embedding NCC、K-means 命名、公开 `edges tasks propose`、为 proposeTypes 另开 `--mode`

**edges-task-project**：
frontmatter `metadata.edges-task-project`，与目录 project-slug 双写；`_default` 对应 `default` 或不写字段。
_避免使用_：只改 frontmatter 不改路径、或只改路径不同步 frontmatter

**edges-tasks-status**：
Task（Issue 层）的唯一状态字段，取值为 backlog | todo | in_progress | in_review | done | blocked | cancelled；与 Task Project、edges-task-priority 正交，不表达谁先做或属于哪个分组。迁移后状态夹落在所属 Task Project 目录内。
_避免使用_：裸 status 字段名、Run 层状态、open/discussing/building 旧枚举、把状态夹当成 Task Project

**edges-task-priority**：
Task Issue 层的需求优先级，枚举 `urgent | high | medium | low | none`，写在 frontmatter `metadata.edges-task-priority`；与 edges-tasks-status、Task Project 正交，不决定状态夹或 project 目录。缺省或旧文件无字段时视为 `none`。
_避免使用_：用文件夹或文件名编码优先级、把 P0/P1 事故等级直接当看板 priority、改 priority 时搬状态夹

**edges-task-assignee**：
Task 的指派，写在 frontmatter `metadata.edges-task-assignee`；与 edges-tasks-status、edges-task-priority、Task Project 正交。
_避免使用_：用状态夹或 Task Project 表达谁负责、在看板条目上再造一份与 Task Doc 平行的必填指派字段

**edges tasks（CLI）**：
以 `edges tasks` 为入口的 Task 看板命令面：Issue 层 list/get/create/update/status；`delete` 不删除文件，只提示改用 `status <target> cancelled`；Run 层只读 runs / run-messages。create/update 用 `--priority`，list 可用 `--sort priority`；`list --group-by` 产出列表分组，条目可嵌入可选的 Task Doc（`doc`）；`/tasks/` 再把它映射成审阅页输入；`status` 不带优先级，只在同一 Task Project 内搬家；跨 project 用 `update --project`。`project list|get|create|update` 读写 Task Project 元数据；`project review-page` 只读不入库的预构建审阅壳，把 JS/CSS 内联成单份 HTML，把 groups+items 写成 `#edges-review-payload` 的 JSON script，不算分类、不落地、不托管，运行时不现编，页只读载荷里的 `doc`，导航用 hash 或 hash 上的 query。`/tasks/` 持久看板站是部署链消费者，不新开看板动词。
_避免使用_：手搓 git 改看板、仓根 bin、自造 `log` 动词顶替 runs/run-messages、用 status 跨 project 搬家、公开 `classify` / `propose` / `apply-review` 动词（本轮）、把 review-page 扩成 Artifacts 预览服务或 `/tasks/` 托管、把分组 schema 命名成 review-page 专属、为看板另开顶层 schema、让浏览器读仓内 `.md`、在用户机器上现编审阅壳、把预构建产物提交进 git、默认用 zip+base64 装载荷、path history、靠服务器 rewrite 的 react-router

**Artifacts 预览服务**：
稳定的短生命周期托管 + 真浏览器可开 URL，用来打开需要人交互的 Agent HTML；聊天内嵌预览是绕开的不可靠路径。与 `/tasks/` 持久看板站硬边界：后者是固定路径、无 TTL、始终反映 main。
_避免使用_：长期站点/博客、Astro、site-and-content、本地 HTML 视图、聊天 HTML 预览、审阅结果回传 Agent 客户端（若指同一件事）、`/tasks/` 持久看板站、教学站点

**Artifact（edges）**：
一次短生命周期托管的静态包（通常是交互 HTML）；不是知识资产，也不是对外 Post。上传后先是草稿，公开后才有可打开的 URL。
_避免使用_：Post、知识资产、长期站点页面、聊天附件预览、`/tasks/` 持久看板站

**Artifact 草稿**：
已上传、尚未公开的 Artifact。没有公开 URL，存活时间尚未起算。
_避免使用_：已公开的 Artifact、本地 HTML 文件、把上传直接当成已经可以打开

**edges artifacts（CLI）**：
`edges artifacts` 命令面：`init` 准备 token；`create` 只保存草稿；`publish` 公开已有草稿，或对本地路径先保存再公开；`delete` 删除草稿或已公开的包。`edges tasks project review-page` 仍只渲染，不发布。
_避免使用_：把 review-page 扩成托管、手搓上传绕过 CLI、`rm`、把 `create` 当成已经公开

**聊天 HTML 预览**：
Agent 客户端把 HTML 嵌进聊天窗口的预览（如 Grok Bot HTML preview）。
_避免使用_：Artifacts 预览服务、系统浏览器打开的托管 URL、把它当交互闸门

**本地 HTML 视图**：
对着仓内数据文件的持久本机/仓内查看层（数据与视图分离），不是一次性渲出的人闸，也不是对外可达的短生命周期托管，也不是公网 `/tasks/` 持久看板站。
_避免使用_：Artifacts 预览服务、云临时托管、Task Project 审阅页的临时 HTML、`/tasks/` 持久看板站

**Task Run（edges）**：
对应 Multica Run 的一次执行尝试；仓内落在 Task 同目录 sidecar `.{stem}.log.md` 中带稳定 `run-id` 的记录，由 `edges tasks runs` / `run-messages` 只读查看。
_避免使用_：把 Run 状态写成 Issue 的 edges-tasks-status、用行号当长期主键

**Task Run Log**：
某个 Task 的 Run 落盘载体：同目录、同 stem 的点文件 sidecar（`.{stem}.log.md`），由记录方只追加带稳定 `run-id` 的执行记录，不写入 Task 正文。本轮 `edges tasks` CLI 只经 `runs` / `run-messages` 读取。
_避免使用_：正文内【执行记录】表、把 Run 嵌进 frontmatter、自造 `log` 动词顶替 runs/run-messages

**backlog（Task）**：
tasks 层内「已进入任务系统但未排期」的筛选池；也是 agent 衍生提案的默认入口。人侧存量从旧 todos 迁入时默认落此态。
_避免使用_：knowledge/todos 系统外池、Draft
