# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

本文件只记 Edges 这个仓库本身的重要变化，方便扫一眼「系统最近能做什么」。某个对外技能自己的版本记录，看 [`extensions/skills/`](extensions/skills/) 下面各自的 changelog；跨机器共用、但不绑定 Edges 的扩展，看 [`shared-extensions/CHANGELOG.md`](shared-extensions/CHANGELOG.md)。尚未发版的变化按功能模块分组。Unreleased 的 `###` 用功能模块原名，不要改成「模块：摘要」或只留摘要；每条 `-` 前面加短小标题，写成 `- **小标题：** 正文…`。完整约定在项目记忆 `project_repo_changelog`，示例是 commit `a80d1b0`。

领域决策、术语表和实现计划不写进这份根 changelog，分别看 [`docs/adr/`](docs/adr/)、[`CONTEXT.md`](CONTEXT.md) 和 [`docs/superpowers/plans/`](docs/superpowers/plans/)。

## [Unreleased]

### 组合仓库

- **登记组合仓库必须写说明：** `edges compose register` 现在要求 `--description`。不传，或只传空白，命令以校验错误退出（退出码 2，`errorCode` 为 `VALIDATION_ERROR`），不会把缺说明的条目写进作用域 `AGENTS.md`。说明要写清这个仓存什么、什么时候该往里写。操作见 [`edges-compose`](extensions/skills/edges-compose/SKILL.md)（beta，版本 `0.1.0`）。

### CLI

- **发往 main 的 PR 先做冻结安装：** `.github/workflows/frozen-install.yml` 在 pull request 的目标分支是 main 时，用根 `package.json` 的 `packageManager` 跑与 Deploy 相同的 `pnpm install --frozen-lockfile --filter @viruspc/edges... --filter tasks-review-app...`。锁文件和 `.pnpmfile.cjs` 对不上时，在合入前失败。
- **npm 发版工作流使用仓库锁定的 pnpm：** `.github/workflows/publish-edges-cli.yml` 不再在 `pnpm/action-setup` 里写 `version: 10`。根 `package.json` 的 `packageManager` 已是 `pnpm@10.34.7`，两边同时指定会让 `@viruspc/edges@*` 的发布在安装前失败。

### 项目记忆（project-memory）

- **旧平铺记忆可以迁到当前布局：** 在仍使用早期 `.memory/` 平铺文件的仓库里，先跑 `edges memory migrate --dry-run`，确认映射后再跑 `edges memory migrate`。它按 `project` / `feedback` / `reference` / `user` 前缀把 `<type>_<slug>.md` 收进 `.harness/memory/<plural>/<type>_<slug>/INDEX.md`，大写的 `FEEDBACK.md`、`PROJECT.md`、`REFERENCE.md`、`USER.md` 重写成类型 `README.md`。条目用相对路径引用的附件目录一起搬走。对不上的路径列在结果的 `diagnostics` 里，正式迁移时进 `.project-memory-migration/unclassified/`，不再因为一个文件让整次迁移失败。`edges init` 碰到旧层时，会直接提示这两条命令。

## [1.5.0] - 2026-10-19

### CLI

- **正式发布到公共 npm：** `@viruspc/edges` 已可在装了 Node.js 22.20 及以上的机器上执行 `npm install -g @viruspc/edges`，然后 `edges --help`；`edges init` 与 `edges memory remember` 不必再克隆本仓。命令名仍是 `edges`。审阅页随安装包 `dist` 里编好的 HTML/JS/CSS 走，不另发 `tasks-review-app`。仓库里开发用 `pnpm --filter @viruspc/edges`（旧名 `edges-cli` 已改掉）。命令行包已可发布，不再保持 private。版本记录见 [`extensions/cli/CHANGELOG.md`](extensions/cli/CHANGELOG.md)。
- **推 annotated tag 经 GitHub Actions 发版：** 在 main 上把 `extensions/cli/package.json` 的 `version` 对齐后，打 annotated tag `@viruspc/edges@x.y.z` 并推送，会跑 `.github/workflows/publish-edges-cli.yml`：先测，再进入 Environment `npm-publish` 等人批，批准后用 OIDC Trusted Publishing 执行 `pnpm --filter @viruspc/edges publish --no-git-checks --access public`，不放长效 `NPM_TOKEN`。版本号必须和 `package.json` 一致。
- **init 安装包内 skills：** `edges skills init` 和无参 `edges init` 在建 skill 类型索引之后，用依赖里的 `skills@1.7.2` 把包内 Edges skill 装给本机 agent。edges 只补包内目录和 `--skill '*'`；`--` 之后的旗标原样转交。没有 TTY、安装器又没探测到 agent 时，在 `--` 后加 `-g -y`（例如 `edges init -- -g -y`），否则安装器退出 1，init 用同一退出码失败，信封里的 `errorCode` 是 `SKILLS_INSTALL_FAILED`。

### 复盘与 routines

- **日复盘和周复盘把回看送回仓库：** `retrospectives/` 记阶段性回看。日复盘覆盖过去一天，写在 `retrospectives/daily/<日期>--日复盘/INDEX.md`，必写范围与建议补充内容清单。周复盘覆盖过去一周，写在 `retrospectives/weekly/<周一日期>--周复盘/INDEX.md`，一级标题下用二级标题写六节：范围、本该怎样、实际怎样、为什么、下次做什么、建议补充内容清单。清单里的候选送回 Harness：Memory 用 `edges memory remember`，Skill 用 `edges skills`，Note 用 `edges notes`，Task 用 `edges tasks`，`AGENTS.md` 硬约束写进目标作用域的「本层硬约束」。日复盘回顾过去 24 小时各助手的对话，把候选落成文件，和当天这篇放进同一个开到 `main` 的 PR，不自动合并。周复盘回顾上一个自然周的 GitHub 记录（commits、PR、Issue、看板状态、CI），经 PR 写入；这次运行不读其他助手的对话，不改代码、不动看板，对话层由主聊天补进后再合成。
- **日复盘和周复盘各有一份 routine：** `projects/routines/daily-conversation-deposit/` 与 `projects/routines/weekly-retrospective/` 各放一份。`SKILL.md` 放提示词，同目录的 `schedule.md` 只放日程并引用这份 Skill。

### 评测与观测

- **检索评测冒烟可按仓库 URL 跑：** `.harness/evaluation/retrieval_eval/run.py` 用三维配置（git 仓库 URL 与可选 ref、agent client、样本集）克隆仓库后执行 `codex exec --sandbox read-only`，按簇算 P@5 / R@5 / nDCG@5；有序题综合分用 R@5。`print-command` 只打印克隆与执行命令。第一组是本仓 `main`、`codex` 与 6 道自有题，实跑 R@5 为 `0.8333`。这是评测冒烟，不是公开基准证明。
- **MemoryBench 小规模对照可复跑：** 新增 `.harness/evaluation/cases/memorybench-smoke/run.py`，固定官方代码和 NFCats 数据，比较无记忆与 BM25-M；`--prepare-only` 准备数据且不调用模型，`--output` 指定新的运行目录。默认最多 40 次模型请求，保存真实检索、作答、评分和用量，接口失败时终止并标记失败。附 MiniMax-M2.5 的实际试跑报告；该用例验证官方基准链路，尚未接入 Edges 项目记忆。
- **自建 Langfuse 的仓库记录与实例对齐：** 在仓库根执行 `bash .harness/observation/smoke/langfuse-otlp-smoke.sh`，可以向自建 Langfuse 发一条名为 `edges-langfuse-smoke` 的 OTLP trace，并用 v2 observations 回查。先在环境里设置 `LANGFUSE_HOST`、`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`，脚本和仓库都不存放这些值。公网入口记为经 Cloudflare Tunnel 的 HTTPS，仓库不写实例域名。

### 组合仓库

- **组合进来的仓库可以登记、clone、pull 和 push：** `edges compose register --name <名字> [--path <目录>] [--remote <git 地址>] [--description <说明>]` 把仓库写进作用域 `AGENTS.md` 的组合区块，不传 `--path` 时目录是 `~/.edges/composed/<名字>`。`edges compose list` 列出已登记的仓库；`edges compose unregister --name <名字>` 删掉一条登记，已经 clone 的目录不动。`edges compose clone` 把 remote 拉到登记目录，如果那里已经是同一 origin 的检出就不动；`edges compose pull`、`edges compose push` 在这个目录里执行该仓库自己的 `git pull` / `git push`，不额外建提交。
- **查询可以带上一层组合仓库：** 默认的 list 和查询只看当前作用域，不进组合仓库。根命令加 `--with-composed` 时，结果里多一层组合仓库的入口 `AGENTS.md`，只到这一层，不能代替 `--all`，写命令也不顺着这条边走。

### 项目记忆（project-memory）

- **本层材料清单移到 `.harness/README.md`：** 对 edges 作用域执行 `edges init` 时，会创建或保留 `<scope>/.harness/README.md`，这份 README 是普通组织清单，没有 YAML frontmatter。笔记、项目、记忆类型索引和任务看板都登记在它上面，`AGENTS.md` 的本层区块只留一条「本层 harness 材料索引」指向它。根命令 `--super` 先挂这份 README 再展开，找不到时退回 `harness-materials.json`。已有仓库执行 `pnpm migrate:harness-readme-index` 预览迁移，加 `--apply` 写入，重复执行不会多改。
- **初始化按路径登记子作用域：** `edges init`、`edges memory init`、`edges notes init`、`edges projects init`、`edges skills init` 和 `edges tasks init` 不再接受 `--index-group`。新的子作用域按路径挂到父级：`AGENTS.md` 在父级 `.harness` 下记入本层，否则记入下层。已经登记的保持原来的组。`edges memory doctor --apply` 按同一规则补上缺失的父级链接。

### 任务看板与项目

- **中文标题的任务名保留汉字：** 用 `edges tasks create` 新建任务、又没有写 `--name` 时，生成的名字会留下标题里的汉字和数字，不再只剩夹在中间的英文词。已有任务可以用 `edges tasks update <目标> --name <名字>` 改这个字段。标题里没有任何字母或数字时，名字仍是 `task`。
- **写命令拒绝森林开关：** `edges --all tasks create`、`edges --all tasks update` 和 `edges --all tasks status` 现在会明确报错且不修改文件；其他内容写命令也采用同一检查，避免把森林查询开关误用于写入。
- **项目列表保留完整描述：** `edges tasks project list` 与 `edges tasks project get` 返回一致的项目信息，包括自定义标题和多段描述；`--all` 列表也沿用同一解析方式。查询只读取当前范围内已登记的项目，不补建元数据或系统入口。
- **旧任务入口继续可用：** `edges tasks status` 对旧 `index.md` 任务仍能正常流转，保留入口文件的拼写，并一起移动日志和附件；索引迁移不会因同一文件的 `INDEX.md` 别名重复登记。
- **改状态时不动软链登记：** `edges tasks status` 把任务移到另一个状态目录时，只迁移任务自己的登记。父级里指向它的软链登记原样保留，移动后可能断开，和 `mv` 一样；不再报 `Node path contains a symbolic link`。
- **`--scope` 大小写不同也不越界：** 在大小写不敏感的文件系统上，传给 `--scope` 的路径和实际目录大小写不一致时，`edges tasks list`、`edges tasks get`、`edges tasks update`、`edges tasks project list` 和 `--all` 列表返回的 `path` 不再带 `..`，仍留在作用域内。真正在作用域外的路径会被拒绝，错误码是 `VALIDATION_ERROR`。
- **持久看板汇总该根下的全部任务板：** 生成页的 `extensions/cli/scripts/generate-tasks-site.ts` 不再接受 `--purpose`。传入 `--scope` 后，它汇总这个根下面发现到的 domain 与 maintenance 板，列表和页面里的 `source.purpose` 仍从目录推出来。

### 笔记入库与能力面

- **中文标题的笔记和项目目录保留汉字：** 用 `edges notes create` 或 `edges projects create` 新建叶子时，日期目录会留下标题里的汉字和数字。标题「中文标题」得到形如 `YYYY-MM-DD--中文标题` 的目录，不再收成 `untitled-` 加时间。英文单词仍转成小写，词与词之间用 `-`；连续空白会折成一个 `-`。标题里没有任何字母或数字时，目录名仍是 `untitled-` 加时间。很长的标题会被截短，使整个日期目录名不超过 255 字节。

### shared-extensions

- **通用 skill 移出 extensions：** `paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`、`horizontal-vertical-research`、`learn-repo` 改到 `shared-extensions/skills/`，不打进 `@viruspc/edges`。整层版本记为 `4.0.0`。

### 文档与系统

- **README 改为对外门面：** 根 README 现在先回答外部访客「这是什么、能不能拿去用」：标语「harness 任何目录。你的大脑，也是一个目录。」、七条要点、一张知识闭环图、照着就能跑通的快速开始（`npm install -g @viruspc/edges` 后对任意仓库执行 `edges init`），以及本仓的目录地图。根目录有 `memory/`，放跨主题的短备忘，专题长文仍放在 `projects/`。原来写在 README 里的内容标准下放到所属目录：Edge 准入与演化在 `edges/README.md`，归档与附件规则在新的 `archive/README.md`；原「理念」「系统实现」原文保存在 `docs/architecture.md`。
- **全局 skill 安装脚本按实际行为改名：** `pnpm skills:install` 改名为 `pnpm skills:install-claude-global`，旧名不保留。它执行 `npx -y skills@1.7.2 add ./extensions/skills -g -a claude-code -y`，只把每个 skill 实体拷进 `~/.claude/skills`，不写中枢 `~/.agents/skills`，也不建软链。外部用户改用 `edges skills init`。
- **仓库固定使用 pnpm 10：** 根 `package.json` 的 `packageManager` 固定为 `pnpm@10.34.7`。开了 Corepack 的机器会自动换到这个版本，`pnpm install --frozen-lockfile` 不再因为 pnpm 9 的 `pnpmfileChecksum` 对不上而失败。不要把锁文件降到 pnpm 9。

## [1.4.0] - 2026-10-08

从 1.3.0 升级时先看这几处：`edges note` 改为 `edges notes`，`edges skill` 改为 `edges skills`，没有兼容别名。Project Memory 的 Python 执行层已移除，相关 Skill 改为调用 `edges memory`，使用前需要先构建或安装 Edges CLI。根上的维护记忆、技能、任务、评测和观测已迁入 `.harness/`，领域任务在 `tasks/`。

### 领域模型细化

- **节点按入口归属：** `edges tasks` 与 `edges memory` 可从显式作用域或最近的可读 `AGENTS.md` 选择节点；本层索引登记直属内容，下层索引登记子节点，普通交叉链接不改变归属。入口沿用硬约束、本层系统维护信息、下层系统维护信息三部分，发现节点不会自动初始化 Memory。
- **看清系统森林：** `edges forest list` 列出当前作用域里各系统入口组成的森林，默认形态是 `independent`，也可以用 `--form innermost`。任务、笔记、项目、技能和记忆的 list 默认只走当前这一棵系统；要一次走完这片森林，在根命令加上 `--all`，例如 `edges --scope <目录> --all tasks list`。`--super` 只换列出的根，不代替 `--all`。
- **命令名对齐目录：** 顶层命令 `edges skill` 改为 `edges skills`，与 `.harness/skills` 对齐；`edges note` 改为 `edges notes`，与 `notes/` 对齐。没有兼容别名。`edges tasks` 与 `edges memory` 已经和目录同名，保持不变。`edges artifacts`、`edges schema`、`edges forest` 没有同名内容目录，不改名。不为 `.harness/evaluation` 或 `.harness/observation` 新增命令。
- **统一文档与归属操作：** Task、项目记忆、Note 和 Skill 由类型化节点模型与 `NodeService` 读取、保存和维护 AGENTS 索引；`edges tasks`、`edges memory remember` 和 `edges notes` 是这些内容的命令入口。唯一父归属遵循物理目录，索引用于发现；列出时默认顺着当前系统已登记的本层和下层引用一起展开，不自动进入节点自己的 harness。
- **显式选择索引归属：** `edges memory init --index-group local|descendant` 与 `edges memory doctor` 接收调用方选择的本层或下层归属。`edges tasks` 与 `edges notes` 的列出和写入不接收 `--index-group`。已有关系保留分组，移动未登记节点不会凭空增加下层引用。旧 `task-projects` 区块通过 `pnpm --filter edges-cli exec tsx ../../scripts/migrate-agents-indexes.mts --root <作用域> --check` 显式审阅，改用 `--write` 才迁移。
- **初始化作用域：** `edges init` 在选定目录写下系统入口 `AGENTS.md`，并编排 memory 的 feedback、project、reference，以及 notes、projects 两份 `.harness` 组织清单。材料落在该作用域的 `.harness`，这条命令不读 `--super`。`edges init <模块>` 与 `edges <模块> init` 写同一批文件。各模块只初始化自己：`edges memory init` 不带 `--memory-types` 时仍只返回待选择、不写盘，也不再创建 notes 或 projects；`edges skills init` 在尚未采用时写入 managed 与 referenced；`edges tasks init` 只建立任务看板并登记到本层入口。不指定模块时，不会创建 tasks、skills、user memory、evaluation、observation。`edges artifacts init` 仍只保存预览服务的地址和 token，不参与这套编排。
- **目录内容带着资源走：** Task、普通项目记忆和 Note 统一使用目录中的 `INDEX.md`，Skill 使用 `SKILL.md`；旧的 `index.md` 仍可读，新建不再使用这个文件名。不再提供单文件创建或资源清单参数。`edges memory remember --import-entry` 校验并复制完整目录，保留来源；Task 状态流转以及节点移动、删除按目录处理。
- **笔记和技能在本地经 NodeService 写入：** `edges notes` 与 `edges skills` 的创建、读取、更新和删除都调用 NodeService。`edges notes create` 只在本地写下 `notes/` 里的叶子，不再 commit、push 或开 PR。`edges skills create` 与 `edges skills update` 会写下受管的 `SKILL.md`。
- **项目叶子与 harness 索引：** `edges projects` 用和 `edges notes` 相同的本地创建、读取、更新和删除，写在作用域的 `projects/`。projects 与 notes 的组织清单由 `edges projects init`、`edges notes init` 或无参 `edges init` 写入根 `.harness`，不再由 `edges memory init` 顺手带上。
- **显式采用目录入口：** `pnpm migrate:directory-nodes --root <工作树>` 先预览，再通过 `--apply` 转换 tracked/public 内容。本仓已转换 117 条 Memory、103 条 Task、88 条 Note 和 100 份 runlog，保留附件、权限及引用目标，重复预览为空；私有内容、文章、第三方目录与旧审计材料不在范围内。

### 任务看板与项目

- **部署先生成数据契约：** 持久 `/tasks/` 在生成页面前运行 `pnpm --filter edges-cli run build:schemas`。审阅页校验任务正文时读取这份构建产物；仓库不提交它。
- **站点迁移走固定免密入口：** Deploy 不再对仓库里的脚本使用 sudo。在服务器上用 root 执行一次 `sudo bash extensions/services/artifacts-preview/deploy/install-site-layout.sh`，之后只免密运行 `/usr/local/sbin/edges-migrate-site-layout`，把 teaching 与 tasks 的磁盘路径改到当前布局。
- **仓库根列出维护任务：** 在仓库根运行 `edges tasks list` 会顺着根入口登记的 `.harness/tasks/README.md` 列出维护任务。`--super` 仍只列出领域目录 `tasks/` 下的任务。材料与类型的名单留在各自 README 的组织清单里。memory 与 skills 类型目录上的空 `AGENTS.md` 桩已删除；层系统入口仍是 `AGENTS.md`。
- **任务看板跟材料配置走：** `edges tasks` 的看板目录和入口文件来自 `domain/config/harness-materials.json` 的 `tasks` 材料（当前相对路径 `tasks/README.md`）。维护系统写在 `<scope>/.harness/` 加上该路径；`--super` 写在 `<scope>/` 加上该路径。新建维护登记挂这份材料，不创建、也不要求 `tasks/AGENTS.md`。已有登记若已经挂着看板目录里的入口，则保持原样。
- **获取当前版本的数据契约：** `edges schema list` 列出可用契约，`edges schema get task-doc/v1` 直接输出 TaskDoc JSON Schema，无需进入仓库或选择 scope。契约从 TS 数据定义生成，随构建包分发，不再手工维护仓库内的 JSON 文件。分组 JSON 与审阅页输入使用同一契约校验：保留对象、数组等扩展 metadata；非法状态、日期和未知顶层字段会明确报错，不自动修正输入。

### 项目记忆（project-memory）

- **层入口改用 project-harness 标记：** `AGENTS.md` 受管外层与三章改为 `project-harness` / `constraints` / `local` / `descendants`，写入标题为本层硬约束、本层系统维护信息、下层系统维护信息；旧标题本层组成、下层节点仍可读，刷新时写回现行标题。`edges memory` 读兼容旧 `project-memory-*` 层标记，刷新时写回新标记。类型目录的组织清单是 `README.md`，列表用 `project-entries`（本层内容 / 下层内容）；类型元数据仍用 `project-memory-type`。存量用 `pnpm migrate:project-harness-markers -- --root <作用域>` 预览，加 `--apply` 才写入。
- **局部记忆回到所有者：** 将先前上收根层的 43 条公开记忆按当前内容恢复到 `extensions`、`project-memory-init`、`shared-extensions`、`knowledge/notes` 和 `.harness/tasks` 的本地索引，保留人工说明；`pnpm restore:local-ownership --root <独立克隆路径> --manifest <已审阅清单> --dry-run` 可审阅符合旧状态的公开纠正。其他克隆的 ignored 私有记录须各自按 journal 显式审阅。
- **统一 CLI 执行入口：** Project Memory 的初始化、写入、类型登记、检查、旧布局迁移和私有归档统一由 TypeScript 的 `edges memory` 执行；模板随 CLI 分发。相关 Skill 改为调用 CLI，移除原 Python 执行层。需先构建或安装 Edges CLI，再升级这些 Skill。
- **私有内容写入前检查：** `edges memory remember` 及迁移、归档恢复命令会核对实际文件的 Git 忽略结果，遇到例外规则放行私有文件时先拒绝写入。强制恢复失败会回滚原目录，无法回滚时保留受保护的恢复副本。

### 文档与系统

- **统一 Node 22 环境：** CLI、MCP 和扩展应用的运行与构建最低要求为 Node 22；从源码使用 `pnpm test`、`pnpm build` 时也采用同一版本基线。
- **按归属迁移目录：** 根维护记忆、技能、任务、评测和观测进入 `.harness/`，领域任务位于 `tasks/`，研究与教学分别位于 `projects/`、`teaching/`。`pnpm migrate:recursive-layout --worktree <独立工作树绝对路径> --dry-run` 审阅实例清单，改用 `--apply` 执行并保留本机恢复记录；各克隆的私有旧材料须分别迁移。

## [1.3.0] - 2026-09-30

### 任务看板与项目

- **共用三栏审阅页：** `edges tasks project review-page` 和固定入口 `/tasks/` 共用同一个审阅页，按 Projects、Tasks、Details 展示项目、任务和正文。左侧点项目筛选，中间按状态展示任务，右侧渲染所选任务的 Markdown 正文；任务名显示在 Details 标题下面。卡片突出任务标题，带日期的文件标识默认收起。
- **筛选与归属调整：** 可以按全文、`urgent` / `high` / `medium` / `low` / `none`、指派和 `edges-tasks-status` 筛选任务。把卡片拖到左侧项目，或使用「移到项目…」，只调整页内的项目归属；「复制导出 JSON」会带上调整结果，供审阅后回传。状态列只负责展示，页面操作不会直接写回仓库。
- **桌面布局可调：** 宽屏把 Edges 顶栏和筛选控件放在同一行，详情栏默认宽 220px，为中间看板留出更多空间。两条分隔线可以拖动调整栏宽，中栏不会被拖没；桌面状态列间距保持不变。
- **窄屏纵向浏览：** 页面窄于 768px 时，Projects、Tasks、Details 接在同一页中纵向滚动。项目列表收成显示数量的下拉框，弹出层锚在触发器上；筛选收进 Lucide `ListFilter` 图标按钮，抽屉标题为「筛选」，右上角用 × 关闭。任务按 Backlog、In Progress、Done 等英文状态标题分段，空状态不显示，有卡片的状态默认展开。
- **分段吸顶与折叠：** 窄屏当前章节标题吸在 Edges 下方，状态标题吸在 Tasks 下方，两者均可通过箭头图标折叠。同一时间只吸顶当前章节；所有状态段收起时，标题紧挨成一列，不留深色空隙；仍有状态段展开时，保留卡片与段间距。项目下拉和项目列表的间距不受这次状态折叠调整影响。
- **标题层级更清楚：** 顶栏使用色带，Edges 旁是 Lucide `Layers2` 浅色图标块。章节标题使用介于顶栏与页面背景之间的过渡色面，不加左侧色条；状态标题贴近页面背景，字号比章节标题小一档，保持扁平列表的层级。
- **跳转与返回定位：** 双击 Projects、Tasks、Details 标题可滚到对应章节，双击 Edges 回到页顶。窄屏 Details 中的「回到看板」会滚到当前卡片、保留选中状态，并让开吸顶的 Tasks 和状态标题。修复窄屏滚动范围问题后，从页顶可以滚到详情，返回看板后也能再滚回 Projects。
- **按项目分组列出：** 可以用 `edges tasks list --group-by project` 按任务项目分组列出看板，需要时加 `--format json`。输出为稳定的 `edges.tasks.grouped/v1` 分组 JSON；原有筛选和排序先执行，再分组。这个输出与审阅页输入格式不同，部署生成器会完成转换。
- **构建为单份页面：** 生成审阅页前，先用 `pnpm --filter tasks-review-app run build` 构建前端资源，随后由 `edges tasks project review-page` 将脚本和样式内联到一份 HTML 中；构建产物不进 git。`deploy.yml` 会在同步 main 后完成构建、格式转换和静态页生成，并修复了读取 Artifacts token 的引号错误，避免部署因语法错误中断。
- **固定看板随部署更新：** nginx 首次配置完成后，`/tasks/` 与 `/teaching/` 在同一台机器上提供固定入口；看板随 main 的成功部署更新。首次配置使用 `extensions/cli/deploy/setup-nginx-tasks.sh`，后续部署自动生成页面。它是长期入口，不使用 Artifacts 临时链接的到期机制。

### Artifacts 预览

- **发布临时预览链接：** 可以把静态文件或目录上传成浏览器和手机可打开的 URL，到期自动删除。本机先用 `edges artifacts init --base-url <url> --token <server-token>` 保存服务地址并复用服务器的 token，再用 `edges artifacts publish` 发布，提前删除用 `edges artifacts rm`。审阅页先由 `edges tasks project review-page` 渲染，再单独发布。
- **公网地址与鉴权：** 公网示例和 `edges artifacts init --base-url` 使用 `https://edges.viruspc.tech`，`/health`、`/artifacts` 路径不变。上传和删除需要共享 token，浏览器打开预览链接无需登录；给手机的地址必须从手机可达。客户端写请求带固定的浏览器式 User-Agent，以处理该公网入口对缺少此标识的 `POST /artifacts` 返回 Cloudflare 1010 的问题。
- **安装与启停分开：** 在与教学站点相同的宿主上，用 `edges artifacts server install` 准备环境和服务，再用 `edges artifacts server start` 启动。日常通过 `stop` / `restart` 管进程、`status` 查看状态；`install` 不启动进程，也没有 `server init` 命令。
- **复用现有反代：** 一次性运行 `edges artifacts server setup-nginx`，把反代写入已有的 `teaching.conf`；配置必须包含 `/teaching/`，不另开公网端口。后续常规部署不需要重复配置 nginx。
- **部署后更新服务：** 合并到 main 后，若服务器已有 Artifacts 服务配置且 token 已设置，`deploy.yml` 会在同步 main 后执行 `edges artifacts server install` 和 `edges artifacts server restart`；缺少配置或仍使用占位 token 时跳过。
- **修复 CLI 完整编译：** `edges artifacts server setup-nginx` 成功结果中的 `command` 保留子命令名 `artifacts.server.setup-nginx`，sudo shell 命令字符串放到 `sudoCommand`。修复两个含义共用字段的问题后，`pnpm --filter edges-cli build` 可以完整通过。

### 笔记入库与能力面

- **任务人审后落库：** 新增 `conversation-to-tasks`（`extensions/skills/conversation-to-tasks`），从对话整理任务草稿，正文按背景 → 目标 → 动作 → 完成标准组织，使用中文栏名。背景和目标必填，动作和完成标准可选；完成标准可在 `grill-with-docs` 后补齐。通过 `edges tasks create` 或 `edges tasks update` 落库，可以在对话确认后写入，也可以写在独立分支上提 PR 审阅。
- **CLI 目录改名：** 多命令 CLI 的代码目录从 `extensions/clis` 改为 `extensions/cli`，引用旧路径的本地脚本需要同步调整。当时 npm 包名仍为 `edges-cli`，二进制仍为 `edges`，`pnpm --filter edges-cli` 和命令行为不变。（现行包名是 `@viruspc/edges`，见 Unreleased「一行安装 edges 命令」。）
- **明确本地 CLI 使用方式：** 当时文档写明包名 `edges-cli` 保持 `private`，不发布到 npm registry。日常可用 `pnpm --filter edges-cli exec tsx src/index.ts` 运行；本地 `edges` 二进制来自 `dist/index.js`，需先让 `pnpm --filter edges-cli build` 成功，`prepack` 会运行同一构建流程。（此条已过时：见上方 Unreleased「一行安装 edges 命令」。现行包名是 `@viruspc/edges`，可以发布到 npm。）

### 文档与系统

- **本地窗口状态不再入库：** `.obsidian/workspace.json` 已移出版本管理并加入忽略规则，Obsidian 的本地窗口布局不再随仓库提交共享。

## [1.2.0] - 2026-09-18

### 任务看板与项目

- 跨 Agent 接力的工作项看板改到 [`knowledge/tasks/`](.harness/tasks)。原来 `knowledge/todos/` 里的条目已经改成现在的任务记录格式并迁了过来；旧目录已删除，没有再留跳转说明。
- 可以用 `edges tasks` 管理这块看板：`edges tasks list`（列出）、`edges tasks get`（查看）、`edges tasks create`（创建）、`edges tasks update`（更新）、`edges tasks status`（改状态）。运行记录可以只读查看：`edges tasks runs`、`edges tasks run-messages`。目前还不能从命令行删除任务，也还没有和 GitHub 同步。创建或更新时可以用 `--priority` 标优先级，取值为 `urgent` / `high` / `medium` / `low` / `none`（写在 `metadata.edges-task-priority`，缺省为 `none`）；列出时可以用 `edges tasks list --sort priority` 按优先级排序。改优先级不会把任务挪到别的状态文件夹。
- 任务可以归到一个任务项目里，文件放在 `knowledge/tasks/<项目>/` 下；还没分组的放在 `_default`。创建或筛选时用 `--project`，换项目用 `edges tasks update --project`；`edges tasks status` 只在同一个项目内移动。项目的标题和说明用 `edges tasks project list`、`edges tasks project get`、`edges tasks project create`、`edges tasks project update` 管理；任务正文仍以看板上的 markdown 为准。
- 新增命令 `edges tasks project review-page`：根据分组建议生成一个本地网页，方便用浏览器拖拽调整任务归属。点左侧分组可以筛选列表，拖到分组上可以改归属。新增 classifyTasks 技能（`extensions/skills/project-tasks-classify`）按你已经建好的任务项目给整板提出归属建议；确认时默认打开上面的审阅页，再用 `edges tasks update --project` 落地。没有图形界面时可以退回用表格。

### 项目记忆（project-memory）

- 可以用 `$project-memory-add-type` 给某个项目的记忆目录登记一种新的记忆类型；之后查询和写入都会认到它。官方自带的六类不变。用户个人记忆可以写在本机的 `.memory/users/`，这份副本不进 git；换机器时用 `$user-memory-backup` 打包，用 `$user-memory-restore` 恢复。
- 类型记忆入口从 `.memory/FEEDBACK.md` 一类平铺文件改到对应复数目录下的 `AGENTS.md`（例如 `.memory/feedbacks/AGENTS.md`），与该类型条目同处。层入口 `AGENTS.md` 的本层清单改链到这些类型入口。旧平铺文件由 `$project-memory-doctor` 迁走后删除。

### 评测与观测

- 仓库里新增 `evaluation/`，用来检查整套 Edges 能不能跑通。目前有一条 LoCoMo 冒烟评测：只能说明评测链路能跑，不能当成「项目记忆有效」的公开证明。同时新增 `observation/`，用来放脱敏后的运行记录和指标笔记，不替代记忆里的决策。

### 笔记入库与能力面

- 把笔记写入仓库的入口现在是命令 `edges note`、对应的 `edges-note` 技能（`extensions/skills/edges-note`），以及 MCP。旧命令名 `edges-note` 和仓库根目录脚本已经去掉，没有留下兼容别名。仓库根目录不再提供 `bin/` 脚本，也不再用 `EDGES_SCRIPT` 环境变量去找这些脚本；安装时也不会再把仓库根的 `bin/` 加进 PATH。笔记入库时的 git 操作改在命令 `edges note` 里完成。根目录 `inbox/` 里旧的自动入库测试草稿已删除。

### 教学站点

- 教学工作区从 `knowledge/teach/` 改名为 `knowledge/teaching/`，网站上的路径也一起改了。部署改成：GitHub Actions 登录服务器后，在仓库里直接拉取最新的 main，不再单独推送教学目录。README 上加了部署状态徽章。新增 `learn-repo` 技能（`extensions/skills/learn-repo`）：把要长期学习的外部仓库挂到对应教学主题下，主仓库只记一个提交指针。Obsidian 会忽略这些学习仓库，避免搜索和图谱被外部文件占满。

## [1.1.0] - 2026-09-09

### Added

- `shared-extensions/`：跨机器、跨 Agent 共享的个人 harness（skills、MCP 配置、plugins、hooks）。接入 Edges 的能力仍在 `extensions/`。整层发版：`VERSION` + `CHANGELOG.md` + tag `shared-extensions@`。
- MIT 许可证。
- README 增加「隐私与脱敏」节。
- `extensions/cli/`：面向 agent 的 `edges-note` CLI（JSON stdout，复用 `bin/new-note`）。本地 agent 优先走它；MCP `new-note` 保留。
- `pnpm skills:link`：把 `extensions/skills` 里每个 skill 以相对软链挂到 `.agents/skills`。
- 项目级 `teach` skill / `knowledge/teaching/` 教学工作区。
- 项目级 `.agents/skills` 增加 `grill-with-docs`：grilling 同时产出 ADR 与 glossary。

### Changed

- 根 README 按“理念 → 知识模型 → 系统实现 → 使用与维护”重构；从投资视角串联认知资本、Agent Memory、Edge、知识流动性、决策收益和反馈复利，并明确各知识角色的边界及演化规则。
- `extensions/` 收录标准收窄为「接入或操作 Edges」；跨机器共用但不绑定 Edges 的扩展改走 `shared-extensions/`。
- project-memory 的 `AGENTS.md` 增加本层硬约束区块：最重要的规则直接写在入口里。
- project-memory 的 `AGENTS.md` 受管区块之间空一行。
- `AGENTS.md` 作为记忆入口只保留硬约束、本层索引、下层索引；检索与沉淀时机写进硬约束。根入口正文收到身份、指针和硬约束，目录细则仍看 README。
- 根 `AGENTS.md` 硬约束收成：ask / remember 聚光灯、硬约束写在本区块、公开仓脱敏、git 纪律。目录约定与交互口吻不再占硬约束。

### Fixed

- 根 `pnpm build`、`pnpm test` 改为通过 `pnpm recursive run` 执行 workspace 的对应脚本。

### Removed

- `AGENTS.md` 独立的自动化策略区块。

## [1.0.0] - 2026-09-06

从 2026-01 起的系统收成首个按 semver 跟踪的仓库版本。`package.json` 的 `version` 自 2026-02-19 起就是 `1.0.0`，此前没有 changelog 和 `v*` tag。

### Added

- 知识库流转：`knowledge/notes` → `edges` → `archive`，`new-note` MCP 作为写入入口。
- 对外接口层 `extensions/`：skills、MCP、tools、system-prompt。
- 用 `npx skills@latest` 分发 skill；本机中枢 `~/.agents/skills`，Claude Code 走软链。
- project-memory 系列 skill（init / ask / remember / doctor / reshape）及仓库内 `.memory/`。
- 公开仓库的隐私与脱敏规则。
- 每个 skill 一份 Keep a Changelog，tag 为 `skill/<name>@<version>`。

### Changed

- 维护脚本收到 `scripts/`，用户命令留在 `bin/`。
- 卸掉 OpenSpec；规划与决策改走 `.memory`。
- 各 agent 目录里的 skill 拷贝收到 `.agents/skills` 一份中枢。

### Removed

- 办公文档（`.docx` / `.xlsx` / `.pptx`）入库。
- 未公开的专利交底材料。

[Unreleased]: https://github.com/VirusPC/edges/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/VirusPC/edges/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/VirusPC/edges/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/VirusPC/edges/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/VirusPC/edges/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/VirusPC/edges/releases/tag/v1.1.0
[1.0.0]: https://github.com/VirusPC/edges/releases/tag/v1.0.0
