---
status: accepted
---

# 工作空间由就地 harness 加若干被组合的 harness 仓库构成

2026-10-17 的 grill 确认：edges 接入其他工作空间时，不把 edges 当成一个要挂进去的独立记忆库。项目自己的知识在项目里就地 init；大脑、团队库、规范库、组件库这类跨项目的 harness 仓库，用同一套机制叠加进来，统称「组合（compose）」，对应 Devin Agent Memory 文章里的 composable。一个工作空间 = 自身就地的 `.harness/` + 若干被组合的 harness 仓库。

**edges 只管 git 仓库和本地目录树**：被组合的仓库一律 clone 到本机，在当前作用域 `AGENTS.md` 的 **Compose block** 里登记本地入口，挂到树上；Compose block **算本层**。读 = 顺着目录走；本地组合进来的仓库和 `.harness/` 一样可以直接写。远程入口、远程 MCP 服务、服务端 clone、远程大库索引和大规模检索都不在 edges 的范围内：谁需要远程的大规模知识管理系统，自己选用什么都行，edges 不管也不集成。

本 ADR 补全 ADR 0032 的「接入方式」（code agent 经用户级配置接入大脑仓库、personal agent clone），并部分取代其 Consequences 里「其他仓库里的 code agent 接入大脑 harness」「团队这一层的 harness 仓库」两项未实现说明：接入方式改由本 ADR 规定（本地 clone + Compose block），实现仍待做。`--super` 跨多个仓库不在本 ADR 范围内。

**Status:** accepted（ADR 0034；grill 确认于 2026-10-17，同日经十一轮修订，被推翻的做法见 Considered Options）

**See also:** ADR 0032（大脑是虚拟目录）

## Decision

1. **术语**：大脑、团队库、规范库、组件库都叫被组合的 harness 仓库，动作叫「组合」。不用「外部记忆」「挂载」，这两个词会让人以为 edges 是一个独立记忆库，和「harness 任何目录」冲突。组合是 harness 的依赖声明，不是记忆库：`.harness/` 好比项目自己的源码，AGENTS.md Compose block 里的本地入口好比依赖声明，Agent 开场读 `AGENTS.md`、顺着 Compose block 的路径走，就是解析并加载。它和 docker compose 一样用登记声明由哪些东西组合而成，但组合的是可复用的经验与约束，不是运行中的服务。
2. **入口登记在 AGENTS.md 的 Compose block，不用组合清单文件；Compose block 算本层**：在当前作用域的 `AGENTS.md` 里增加一个专用的 **Compose block**，在其中登记被组合仓库在本机的入口；不另造 `compose.json`、`compose.yaml` 或任何组合清单文件，也不是把现有组成登记列表原样多挂一个节点。Compose block 与「本层硬约束」「本层系统维护信息」同一层语义，属于当前作用域本层材料，不是层模型外的旁路；对当前作用域做 traverse、本层硬约束收集时，Compose block 归入该层。入口可以登记在任意作用域的 `AGENTS.md` 里，和「harness 任何目录」一致。每个入口条目的字段形态另议。
3. **只有本地入口**：被组合的仓库先 clone 到本机，Compose block 里登记的是本机目录。traverse 走到入口就和读本仓子目录一样，顺着目录往下走——即沿 Compose 边跨入本地组合仓库，而不是停在同仓子节点（见 Decision #10）。没有远程入口，没有 MCP 暴露的目录根，也没有服务端 clone。clone 放在哪（如 `~/.harness/` 下或用户自选目录）另议。
4. **读写规则**：读 = 顺着目录树走。写：项目内就地的 `.harness/` 由人和 Agent 直接写，随代码提交；本地组合进来的仓库同样可以直接写，与 `.harness/` 一致，改完按该仓库自己的 git 流程提交。以后可加读写权限控制，且要和底层 Git 仓库权限关联（谁能读/写该仓），不另造一套独立 ACL；具体方案本 ADR 不定。
5. **检索就是顺树走，不承诺大规模检索**：Agent 从入口开始，看各层 `README.md` / `AGENTS.md` 组成登记里的 name / description，选分支、逐层往下，最后读原文。维护要求仍然有用：每层子节点控制在几十个以内，过多就拆目录；name / description 要能帮模型判断该走哪个分支。edges 不承诺几千篇文档规模的检索，不建索引、不做向量库；需要这种能力的，用别的系统。
6. **`AGENTS.md` 本身就是入口，不另做开场命令**：主流代码 Agent 开场本来就会读 `AGENTS.md`；Compose block 写在 `AGENTS.md` 里、算本层，Agent 开场就能看到各入口的路径和 name / description，再自己顺着路径往下走（见第 5 条）。不提供 `edges context` 命令，也不要求在客户端配置里加开场指令（第九轮修订，原因和回头再议的条件见 Considered Options）。`--super` 用的 `harness-materials.json` 只列同仓相对路径、不挂其他系统的 `AGENTS.md`，不能拿来当入口登记。
7. **dream 是整理整棵组合树**：dream 是定时运行的 Agent，**入口是工作空间的 `AGENTS.md`（其 Compose block）**，从该入口出发自下而上走完整棵组合树（就地 `.harness/` + Compose block 挂上的本地仓库），而不是直接以大脑或团队库为入口——大脑 / 团队库是树上的上层节点，不是入口。整理包括记忆的合并与删除、目录结构清理、刷新各层 name / description，以及把可跨项目复用的内容经 PR 提升到上层仓库（大脑 / 团队库）。产出一律走 PR，由维护者审核。不把「提升」与「整理目录」拆成两套独立职责。每 24 小时检查一次，只有项目 harness 主分支自上次运行以来有新提交才运行，没有变化就跳过，省成本、把一天的变化攒成一批；整理结果仍一致时开 PR。dream 不消化收件箱、不维护远程索引。在哪运行（GitHub Actions 定时任务、自建机器 cron 等）和需要哪些权限另议。
8. **分支记忆不做特殊标记**：分支上的记忆留在该分支自己的 `.harness/`，分支丢弃就随之消失；合入项目主分支时和代码在同一个 PR 里被审到。dream 的触发与提升素材仍看项目 harness 的主分支，分支上的零碎经验到不了被组合的仓库。中心化方案（Mem0、OpenViking、Hy Memory 等）所有写入进同一个库，只能靠事后打标签（如 `workspace_id`、`branch`）隔离，这是 git 分布式方案的一个优势。
9. **暂不提供 `remember` 和收件箱**：它们原本只为没有本地 harness 的宿主（如 ChatGPT）准备，这类宿主已不在本 ADR 范围内。这里说的是此前设想的 MCP `remember` 工具和 `.harness/inbox/`，与现有的 `$project-memory-remember` skill（往本地 `.harness/` 写记忆）无关。
10. **Compose 需要 Domain、Service、CLI 三层一起改；traverse 须沿 Compose 边跨仓；CLI 至少支持 clone 与 pull，并需 push**：Compose 不是只加几个命令——Domain 要有 Compose 节点模型，Service 要能 clone / pull / push / 登记 / traverse，CLI 把这些能力暴露出来。**traverse 须沿 Compose 边走**：走到 Compose block 里登记的本地组合仓库时，继续跨仓向下遍历，而不是只遍历同仓子节点。已确认的最小 CLI 面：clone（把 Compose block 里登记的仓库拉到本机路径）与 pull（更新已有 clone）。CLI / Service 还需要对组合进来的仓库支持 **push**，且须兼容各仓自己的既有 git 流程（兼容现有流程），不另造一套提交流程。完整操作列表仍在 grill，本轮只确认 clone / pull / push / traverse，其余不定。入口条目的字段形态仍另议；clone 放在哪仍另议。（第十一轮修订）

## Considered Options

- **把 edges 当外部记忆库挂进各个工作空间：** 否决。与「harness 任何目录、记忆离被 harness 对象最近」冲突；项目知识应就地 init。
- **远程 MCP 入口 / 「一个模型，两种部署」（本地入口 + 远程 MCP 目录根，服务端持有 clone、同一 CLI 顺树读）：** 否决（2026-10-17 同日第六轮修订）。用户觉得远程 MCP、收件箱、dream 叠在一起太重。把关注点分开，edges 只管 git 仓库和本地目录树，更简单；远程大规模知识管理是别的系统的事。
- **由 edges 管理的 PageIndex 式远程大库索引（全库一棵带摘要的树，dream 离线维护，`search` 逐层推理）：** 否决（2026-10-17 同日第六轮修订）。大规模检索不是 edges 的事，交给别的系统；edges 只保留顺树走和目录维护要求。
- **MCP `remember` + 记忆仓库内的收件箱（`.harness/inbox/`）：** 否决（2026-10-17 同日第六轮修订）。它们只为没有本地 harness 的宿主存在，这类宿主不在范围内。
- **dream 消化收件箱、维护远程索引：** 否决（2026-10-17 同日第六轮修订）。收件箱和远程索引都已去掉。
- **dream 只做提升、整理目录树只是顺带的轻量附带职责：** 否决（2026-10-17 同日第七轮修订）。用户确认 dream 概念更简单：就是整棵组合树的整理过程（自下而上），合并/删除记忆、清理目录、刷新 name / description、经 PR 提升到大脑/团队库，同属这一过程，不拆成独立职责。
- **dream 以大脑 / 团队库为入口，或直接指向大脑：** 否决（2026-10-17 同日第八轮修订）。用户确认 dream 应以工作空间的 `AGENTS.md`（Compose block）为入口，从该入口自下而上走组合树；大脑 / 团队库是树上的上层节点，不是入口。
- **另造组合清单文件（`compose.yaml` / `compose.json`，含用户级与项目级、`repo`+`mcp` 字段）：** 否决（2026-10-17 同日第三轮修订；第四轮明确落点）。入口登记在 `AGENTS.md` 的专用 Compose block 里。另造清单与「harness 任何目录」重复，且要单独维护覆盖规则。
- **把 Compose block 当成层模型外的旁路（不算本层）：** 否决（2026-10-17 同日第五轮修订）。用户确认「compose block算本层」。
- **强制大脑必须走远程 MCP：** 否决（第三轮）；第六轮起远程入口整体不在范围内。
- **按团队 / 项目 / 个人划分记忆的接入方式：** 否决（2026-10-17 同日修订）。接入方式统一为本地 clone + Compose block，不由归属标签决定。
- **一律只走远程、客户端禁止 clone：** 否决（2026-10-17 同日修订）。第六轮起反过来定为一律本地 clone。
- **`edges search` 远程 MCP 工具：** 否决（第六轮）。检索就是本地顺树读。
- **用户或 Agent 直接改远程记忆仓库正文：** 第六轮起不再有远程仓库这一类，问题不存在；本地组合进来的仓库可直接写。
- **本地登记的记忆仓库写规则另议 / 默认仍建议走 PR，或强制走 dream / PR：** 已取代 / 否决（2026-10-17 同日第四轮修订）。本地入口允许直接写，与就地 `.harness/` 一致。读写权限控制以后再加，且要和 Git 仓库权限关联。
- **`remember` 直接改仓库正文：** 否决（早期轮次）；第六轮起 `remember` 整体暂不提供。
- **git submodule：** 否决。会把别人的仓库塞进项目历史，同事被迫跟着拉。
- **让用户手动维护路径配置、不进 AGENTS.md：** 否决。路径无法随代码提交，也与层模型脱节；入口登记在 Compose block。
- **用中心化记忆服务做真相源（Mem0 一类）：** 否决。git 仓库是唯一真相源，人可读、可审、可回滚。
- **复用 `--super` 的 `harness-materials.json` 表示跨仓库入口：** 否决。它只列同仓相对路径，不挂其他系统的 `AGENTS.md`。
- **`edges context` 命令 + 客户端用户级配置里写一句「开场先运行 `edges context`」：** 暂缓（2026-10-17 同日第九轮修订）。原设计是从当前作用域 `AGENTS.md` 顺树取本层硬约束和一级索引、拼成 Markdown 输出。暂缓的原因：主流代码 Agent 开场本来就读 `AGENTS.md`，Compose block 在 `AGENTS.md` 里、算本层，Agent 已能看到入口路径和 name / description 并自己往下走；这个命令和这一步重复，还多了一个必须做的开场步骤。出现以下情况再回头看：组合树很深，硬约束需要手动展开才看得到；或者 Agent 实际不顺着 Compose block 的路径走。跟进见任务卡 [评估是否需要 `edges context`](<../../.harness/tasks/project-memory/backlog/2026-10-17--评估是否需要-edges-context/INDEX.md>)。
- **用会话启动 hook 保证注入：** 暂缓。各宿主的 hook 不统一；第九轮起连开场配置指令也不要求，靠 Agent 原生读 `AGENTS.md`。
- **给分支记忆打标签隔离：** 否决。分支自己的 `.harness/` 已经天然隔离。
- **检索时在线现建索引；向量加 BM25 混合检索、索引作为 CI 产物另存；直接用 PageIndex 开源代码：** 否决 / 暂不采用（早期轮次）；第六轮起 edges 不做大规模检索，这些都不在范围内。
- **dream 按固定周期无条件运行，或每次有变化都立即运行：** 否决。前者在没有变化时白花成本，后者 PR 太碎、审不过来；改为每 24 小时检查且有变化才运行。
- **MCP 动态加载 tools 来表示目录树：** 否决（早期轮次）；第六轮起不再有 MCP 入口。

## Consequences

- Compose block 在作用域 `AGENTS.md` 的 `project-harness-compose` 区块。条目是本地目录链接，名字是链接文字，说明在破折号后，git 地址写 `remote: <url>`。Domain 收成 Compose 节点。`edges compose register` / `list` / `unregister` 经 NodeService 读写该区块。`unregister` 按名字去掉条目，不删除已 clone 的目录。`edges compose clone` 把 `remote` 克隆到条目中的目录；目录已是同一 origin 的检出时保持不动。`edges compose pull` 与 `edges compose push` 在该目录执行该仓库自己的 `git pull` / `git push`。traverse 沿 Compose 边进入该目录的 `AGENTS.md` 再向下，本层遍历同样包含这些边。
- dream（入口为工作空间 `AGENTS.md` / Compose block，自下而上整理整棵组合树：合并/删除记忆、目录清理、刷新 name / description、经 PR 提升到大脑/团队库）及其调度（每 24 小时检查、主分支有变化才运行）待做。实现跟进不另开任务卡；以 Decision #10 为准。
- 还没定的：Compose 在 register / list / unregister / clone / pull / push 与 traverse 之外的操作（仍在 grill）；dream 在哪运行、要看哪些项目仓库的主分支、读和开 PR 需要哪些权限。
- 未核实：主流代码 Agent 开场读到 `AGENTS.md` 的 Compose block 后，是否真的会顺着入口路径往下读。第九轮决定依赖这一点，验证与是否需要 `edges context` 的判断见任务卡 [评估是否需要 `edges context`](<../../.harness/tasks/project-memory/backlog/2026-10-17--评估是否需要-edges-context/INDEX.md>)。
- 没有本地 harness 的对话框类宿主（如手机上的 ChatGPT）不由 edges 直接支持。
- 经 dream 整理并提升的经验要等下一轮和 PR 合并后才对他人可见，可能隔天；在本机直接写组合仓库的，按该仓库自己的提交、推送节奏对他人可见。
- 检索质量依赖目录结构和 name / description 写得好不好；edges 不承诺几千篇文档规模的检索。
- 以后可做：为组合进来的仓库加读写权限控制，且要和底层 Git 仓库权限关联，不另造独立 ACL；本轮不定方案。
- 术语见 `CONTEXT.md` 的「组合（Compose）」「外部记忆仓库登记」（均指向 AGENTS.md 的 Compose block）与「dream」。
