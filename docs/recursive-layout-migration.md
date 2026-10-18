# Edges 递归目录迁移与所有权纠正

当前根节点的领域 Task 在 `tasks/`，维护 Task 在 `.harness/tasks/`；各节点的维护记忆在自己的 `.harness/memory/<type>/`，技能类型在 `.harness/skills/{managed,referenced}/`。评测、观测归 `.harness/`，研究与教学分别在 `projects/`、`teaching/`。有可读 `AGENTS.md` 的目录可成为节点；节点发现本身不初始化 Memory。当前状态见 [ADR 0024](adr/0024-scope-first-content-ownership.md)。

## 2026-10-03 目录迁移快照

[原审阅清单](superpowers/plans/2026-10-03-recursive-scope-ownership.json)逐项记录当时 103 条 Task、100 份既有 Run、4 张附件、52 条局部记忆。3 条 Task 当时没有 Run，不补造。该清单及旧实施计划保留审计事实；其将五个子节点记忆上收根层的决定已在 2026-10-05 被纠正，不能用它覆盖当前记录。Git 更新已将公开纠正送到后续克隆，勿对现行公开树重放旧快照。

若某独立克隆仍处于**适用旧布局的原始状态**，先核对清单源哈希和当前文件，再在其独立 worktree 上审阅旧迁移命令的 `--dry-run`；只有预检证明该克隆与旧快照完全对应，才可考虑 `--apply`。命令形式为 `pnpm migrate:recursive-layout --worktree /absolute/path/to/owned-worktree --dry-run`（再将最后一项改成 `--apply`）。这不是已经提升或后来编辑的公开记录的恢复命令。迁移保留 Task stem、状态、Project、手写元数据和资源，遇源哈希、保护文章或 submodule 指针差异即停。

## 2026-10-05 公开纠正

[现行纠正清单](superpowers/plans/2026-10-05-local-ownership-correction.json)按当前源字节恢复了 43 条公开记录：`extensions` 16、`extensions/skills/project-memory-init` 17、`shared-extensions` 1、`knowledge/notes` 1、旧 `knowledge/tasks` 的 8 条归 `.harness/tasks`。25 份类型入口保留人工说明与未知元数据；根层后来新增的记忆仍在根层。`pnpm restore:local-ownership --root <独立克隆绝对路径> --manifest <已审阅清单绝对路径> --dry-run` 是针对**仍符合这份纠正清单源状态**的公开纠正审阅入口；目标碰撞、源漂移会拒绝写入，已纠正则不再移动。普通 `edges memory migrate --recursive` 保留旧 owner 关系，不代替实例归属纠正。

## 2026-10-05 目录入口采用

本仓已用 `pnpm migrate:directory-nodes --root <独立工作树绝对路径> --apply` 转换 117 条公开 Memory、103 条 Task、88 条 Note 和 100 份 Task runlog；原有 2 条目录 Task 保留。17 份既有引用文档同步更新；一条 Note 复用同 stem 附件目录，附件没有移动或覆盖。应用后 425 份计划写入的内容与权限符合预览，4,072 份无关 tracked/public 文件内容未变；第二次计划为零移动、零更新。

此工具从具备依赖的 Edges checkout 运行，默认 dry-run，显式 `--apply` 才写入；安装日常 CLI 或 Skill 不会分发该仓库维护脚本。它只选择目标工作树中的 tracked、非 ignored、公开受管条目，排除 users/private、文章、第三方/安装目录与历史 ADR/spec。转换保持本地 owner、未知元数据、权限、相对链接的目标与 fragment/query；既有 canonical 节点内的资源不重新解释为 Note。详情见[目录迁移 Skill](../extensions/skills/migrate-directory-nodes/SKILL.md)。

存在 `.recursive-layout-migration/journal.json`、`.ownership-correction/public.json` 或 `.ownership-correction/private.json` 时，**目录转换一律拒绝**，无论旧流程是否看似完成；只检查存在性，不读取 payload，也不自动删除、归档或续跑。先人工核实旧状态，或在无这些本机日志的独立工作树审阅公开转换。下文旧流程的 resume/权限规则仅适用于对应旧迁移器，不是新目录转换器的行为。

日常创建与读取已采用目录入口。`edges memory remember --import-entry` 导入完整目录。`edges notes create` 只在本地写下笔记叶子，不再导入目录或文档路径。旧单文件由显式转换处理，Doctor 不代为迁移；重复或跨组重叠的 AGENTS 需修正作者意图，Doctor 不自动去重。这里不包含真实私有内容的目录转换，也不证明其他克隆已迁移。

## 每个克隆的私有材料

Git 不分发 ignored 用户材料，也不证明别的克隆已完成私有纠正。新实例迁移映射保留 owner-local 关系：根归根，`extensions`、`extensions/skills/project-memory-init`、`shared-extensions`、`knowledge/notes` 各归本节点，旧 `knowledge/tasks` 归 `.harness/tasks`，旧 `evaluation` 归 `.harness/evaluation`，旧 `knowledge/teaching` 归 `teaching`。不能凭标题或正文猜私有归属。

曾被旧版本提升到根的私有记录须在**该克隆**凭 `.recursive-layout-migration/journal.json` 的可信旧 owner 与源身份显式 opt-in 纠正。先保留原 journal 和源/目标字节，核对其权限、忽略规则和 provenance，再在隔离副本用 `pnpm restore:local-ownership --root <该克隆绝对路径> --private --dry-run` 审阅。来源缺失、歧义、目标冲突或旧版仍 pending 的提升 journal 会给出诊断并拒绝猜测；请人工核实后处理，勿删除 journal 或覆盖编辑。完成旧迁移的新 journal 可继续安全 resume，纠正过程使用独立的 ignored `.ownership-correction/private.json`，与旧实例日志分开。这里没有对当前克隆执行私有纠正。

迁移及纠正保留文件名、附件、权限和未知元数据；已建立的目标目录只收紧私有权限，不放宽。旧私有类型索引缺失时预检拒绝，不能把缺索引当作没有私有数据。已采用官方 `user` 类型而缺 ignored 索引的教学、评测等节点，实例迁移按实际记录生成或使用官方空模板；不会凭空采用自定义类型。任何后来编辑的副本不能被旧 journal 强制重放。

## 验证与边界

通用迁移器的 `.project-memory-migration/journal.json` 与实例迁移、纠正 journal 各自独立。升级前未完成且缺目录权限记录的通用日志会报 `journal-directory-permissions-missing`；需在受保护副本核实可信权限及文件状态，不能删日志重跑。详见[迁移 Skill 的旧版日志恢复说明](../extensions/skills/project-memory-migrate/SKILL.md#旧版未完成日志的恢复)。

在独立工作树内，可只读运行 `pnpm --filter @viruspc/edges exec tsx src/index.ts memory doctor --target-dir <节点目录>`、`edges tasks --scope <工作树> --purpose domain list` 与 `--purpose maintenance list`。Doctor 对不存在的 referenced 安装来源给出诊断，不意味着可制造空 `.agents/skills` 或正文；公共索引刷新只针对实际存在的源，并保留人工前缀。`scripts/link-agent-skills --dry-run` 与 `--check` 只检查安装关系。`project-tasks-propose-types` 尚无实际源码目录；通用 Task Skill/MCP、自动复盘与 Agent Teams 编排也不因这次归属纠正而完成。

前述归属及目录入口迁移不改动博客。2026-10-05 用户另行明确要求去掉 `knowledge/` 层：当前博客目录为 `posts/`，本次只移动目录、保留文件字节；今后仍禁止 AI 自动修改博客正文。未初始化 submodule 只保留精确 gitlink，不据此宣称其内部测试已运行。迁移不执行 benchmark、部署、全局安装、合并或发布。

## 根层目录与扩展应用

`notes/`、`edges/`、`posts/`、`archive/` 直接位于根目录；全局共享的应用实现位于 `extensions/apps/`。Note CLI 写入所选作用域的 `notes/<条目>/index.md`。旧清单中的 `knowledge/notes` 是当时的归属路径，内容上移时其局部 `.harness` 随目录一起移动，不提升到根记忆。平铺时保留的根 `resources/` 已由下述内容目录迁移退役。

旧布局的独立工作树可用 `pnpm migrate:top-level-layout --root <绝对路径>` 预览，确认目标无碰撞后加 `--apply`。工具只读取、重写 tracked/public 文件的引用；目录中的 ignored 材料随目录原样搬迁，不读取或重写其内容，必要的私有链接调整留给所有者。`posts` 文件字节保持不变。遇目标目录已存在、symlink 或预览后源文件变化即拒绝；普通 IO 失败尽力恢复，不承诺进程崩溃原子性。

此工具只做本次仓库目录调整，不改写旧迁移 manifest 的源状态，也不读取／续跑旧 journal。旧版归属清单与迁移工具中的路径保留历史含义；先完成适用的旧归属／目录入口迁移，再做本次平铺。Git 更新已交付公开搬迁的克隆无需重复 apply。

迁移同时更新 pnpm workspace 与 lockfile 中的应用路径，不升级依赖版本。迁移或拉取后运行 `pnpm install --frozen-lockfile` 重建本机依赖链接，再执行构建。

## 全部知识内容与附件目录化

用户进一步明确：目录单元不只用于 Note，也用于 Edge、Post 及归档内容。`pnpm migrate:content-units --root <独立工作树绝对路径>` 默认预览，将 `edges/`、`notes/`、`posts/`、`archive/` 中的普通 `topic.md` 转为 `topic/index.md`。已有入口和目录说明 `AGENTS.md`、`SKILL.md`、`README.md` 保持角色，局部 `.harness` 不搬迁。

本次用户选择的附件策略：

- 独占附件随引用它的内容进入目录；多个内容共用时用 `--copy-shared` 各自保存字节相同的副本。
- `--archive-unreferenced` 将根 `resources/` 中未找到引用的附件移入 `archive/unassigned-resources/resources/`，保留原文件名，不删除。
- 用户进一步要求：旧 `img/` 中未找到引用的附件用 `--archive-unused-img` 迁入 `archive/img/<原仓库相对路径>`，保留层级和文件名。已有 archive 不会再次归档，已找到引用或不在 img 目录中的附件不受该选项影响。

```bash
pnpm migrate:content-units --root /absolute/worktree --copy-shared --archive-unreferenced --report /tmp/content-preview.json
# 审阅后应用；报告路径必须尚不存在。
pnpm migrate:content-units --root /absolute/worktree --copy-shared --archive-unreferenced --apply --report /tmp/content-applied.json
# 归档旧 img 中未找到引用的附件；默认预览，加 --apply 写入。
pnpm migrate:content-units --root /absolute/worktree --archive-unused-img
```

脚本处理公开的 tracked 与非忽略 untracked 内容；排除用户记忆、第三方目录、私有迁移日志和 Obsidian workspace。它利用 Markdown/HTML 标准解析器定位引用，并支持 Obsidian wikilink；只改实际引用目标，保留标题、别名、正文、代码示例与 YAML。歧义 Wiki 链接要求先改成明确路径，碰撞、忽略的目标、符号链接或预览后文件变化都会拒绝写入。IO 失败在当前进程内回滚；不承诺断电／强杀后的事务恢复，应在可审阅、可恢复的独立 Git worktree 执行。

2026-10-05 本仓转换 787 篇内容（785 篇 Edge、2 篇归档文档），既有目录 Note 保持入口；`posts/` 当前只有目录说明，没有待转换文章。2,157 个原附件产生 2,167 个新目标（5 个共用附件各复制给 3 篇文章）。根 `resources/` 的 71 个附件全部迁出，其中 13 个未找到引用的附件进入归档；其余旧 `img/` 中 320 个未解析到引用的附件按用户后续决定迁入 `archive/img/`。这 320 项与原清单逐一比对，迁移后核验全部 4,785 个公开文件字节不变，重复运行零写入。

迁移前后独立核验了 1,707 份 Markdown 的非引用正文、2,861 个原本有效的引用，以及 4,784 个目标文件的字节；第二次计划为零写入。迁移报告还列出 16 处原有无法解析的引用，其中 2 处核实实际目标后补正；剩余 14 处为示例占位符及一张本就缺失的图片，不把它们当作新迁移丢失。此步骤明确授权 posts 的结构与必要引用调整，不扩大为今后自动改写博客正文的许可。

## 2026-10-06 Task 递归索引采用

目录入口迁移与组成索引采用是独立步骤。Task 正常查询现已只沿登记的 AGENTS 链调用 NodeService；无入口的旧板须先显式迁移，不再回退为目录扫描。板和项目是 InternalNode，单条任务是 TaskNode，状态目录不增加 AGENTS 或新节点类型。

```bash
pnpm migrate:task-indexes --root /absolute/worktree --report /tmp/task-index-preview.json
pnpm migrate:task-indexes --root /absolute/worktree --apply --report /tmp/task-index-applied.json
pnpm migrate:task-indexes --root /absolute/worktree
```

默认只预览；apply 在同一进程重新形成并核验计划。报告记录来源／目的与索引前后文本，不是可重放的事务日志。工具通过 InternalNode 补登记，保留人工正文、约束、项目标题／描述及非 Task 引用。冲突、格式错误、越界引用，以及预览后 Task、AGENTS 或归属入口的新增／删除／修改／身份替换均拒绝写入；当前进程 IO 失败回滚，不承诺断电恢复。私有 users、journal、博客与第三方目录排除；不读取或续跑旧私有日志。

本次公开迁移为 11 个项目索引登记 105 个 Task（领域 5、维护 100）。迁移前后入口路径集合精确一致，277 个非索引文件的路径、字节与 Git blob 不变，包括正文、元数据、附件与 runlog；重复预览零修改。非索引路径→SHA-256 映射的摘要为 `ba3789fd6dc6227157f8b7da7fc93028c43efd865246407fc725373f854247a1`，105 个有序入口路径的摘要为 `011680194a7a6703b0bafeb3aa66e9578cda28971e4ba74a51fa6eebfb2de641`。这些数字是本次迁移审计基线，不是将来任务数量约束。

真实全仓验证使用仅复制 tracked/public 任务板的受控临时投影，NodeService、分组输出与 HTML payload 的 105 条来源身份逐项一致（12 组）。未对可能访问私有 users 索引的真实根执行全仓查询，不据此声称私有材料已覆盖。多层任务 harness、非 Task 节点维护任务与重复引用由隔离 fixture 验证。正常 `list` 默认当前作用域维护板；`list --all-scopes` 与持久看板共享登记查询、涵盖所有维护层级，显式 `--purpose domain|maintenance` 才缩小用途。索引补齐与查询切换应一起交付；本次未部署线上站点。
