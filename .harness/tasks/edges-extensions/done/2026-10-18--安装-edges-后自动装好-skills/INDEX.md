---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-18T16:27:29.817Z'
  edges-title: 安装 edges 后自动装好 skills
  edges-tasks-status: done
  edges-task-priority: none
name: 安装_edges_后自动装好_skills
description: 只装 npm 包拿不到 edges skills；目标是一次安装加一次初始化，同时装好 CLI 和 skills。
---
**背景：**
2026-10-18 `@viruspc/edges@0.1.0` 首次发布到 npm（PR #264，用 stage 暂存加人工批准的方式上线）。验证安装时讨论到：用户从零开始用 edges，只装一个 CLI 够不够？结论是不够。CLI 只负责搭目录、读写笔记、记忆和任务；真正让 agent 用起来的是 `extensions/skills/` 下的 skill（conversation-to-notes、project-memory-* 等），而 npm 包只打了 `dist`，不包含这些 skill。用户确认：安装过程要把 skills 也装好。
- 现状：CLI 已有 `edges skills` 命令组（list / get / create / update / delete / init），create / update 写到 `skills/managed/<name>/SKILL.md`
- 非目标：ChatGPT、Claude 网页端接入（另有 edges connector 卡）
- 关联：PR #264；卡「edges CLI 发布到 npm」；卡「入库类 skill 增加无工作区降级模式」

**目标：**
新用户执行 `npm install -g @viruspc/edges` 加一次初始化命令后，同时拿到 CLI 和一套可用的 edges skills，本地 agent 能直接按 skill 调用 CLI。

**决策记录：**
2026-10-18 grill-with-docs，由 peng cheng 逐题拍板；同日追加 Q12、Q13，两次修订 Q7，20:53（Asia/Shanghai）定下总原则并据此修订 Q4–Q9、Q12；21:00 追加 Q14、Q15。长期决定见 [ADR 0036](../../../../../docs/adr/0036-edges-init-installs-bundled-skills.md)，术语见 `CONTEXT.md`「安装技能」。

- **总原则：安装技能是 vercel skills 的薄封装**（2026-10-18 20:53，Asia/Shanghai）
  - 结论：`edges skills init` 的安装步骤运行固定版本的 `skills@1.7.2`：`skills add <包内 skills 目录的绝对路径> --skill '*'`。edges 只补两样：skill 源地址、选中全部 skill。agent、`-g`、`-y`、有无 TTY、同名覆盖等其余行为一律按 vercel skills 默认，用户给的旗标原样透传。edges 不加任何额外逻辑：不替用户选无 TTY 默认旗标、不强制 `--agent`、不比较版本、不另行筛选 skill。这一块有疑问都以 vercel skills 的行为为准
  - 理由（用户原话）：没有终端时用什么参数调用，也按默认行为。/ 反正安装skill这块儿，有问题都参考 vercel skills。/ 这里只要薄封装，不要加任何额外逻辑。/ 你做的无非是补充了一个skills地址 + 选中安装所有skill。
  - vercel skills 1.7.2 的默认行为（核对 `dist/cli.mjs`）：需要交互而 stdin 不是 TTY 时，打印「Interactive prompt required but stdin is not a TTY. Nothing was installed. Use --agent <name> (or --agent '*') and -y to run non-interactively.」，不装、退出码 1（约 L4680–4685）；探测到自己在 agent 里运行时非交互安装（约 L5309、L6652）；无 TTY 时打印安装提示（约 L5310）；同名 skill 先列 `overwrites:` 清单并确认后覆盖，`-y` 跳过确认（约 L4926–4950）
- **Q1 skill 从哪来**
  - 选项：A 打进 npm 包 `@viruspc/edges`；B 安装时从 GitHub 拉（`VirusPC/edges/extensions/skills`）
  - 结论：A。`extensions/cli/package.json` 的 `files` 加 skills 目录，与 CLI 版本锁定
  - 理由：CLI 与 skill 同一次发布，不会错版；不依赖 GitHub 可达。现状：PR #264 发布的 0.1.0 只含 `dist`
- **Q2 用什么安装器**
  - 选项：vercel-labs/skills（`npx skills add <本地路径>`）；GitHub `gh skill`（官方，2026-04 起 public preview，需 gh ≥ 2.90，见 [changelog](https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/)）；APM / PSPM / paks（各有注册表，用户少）
  - 结论：vercel-labs/skills；skill 格式遵循 [Agent Skills 规范](https://agentskills.io/specification)
  - 理由：用得最广，支持 40+ agent，支持本地路径源；装 edges 的用户本来就有 Node / npx
- **Q3 何时安装**
  - 选项：A 只在文档里让用户自己跑；B 作为 init 的一部分
  - 结论：B
  - 理由：agent 没有 skill 就用不上 CLI。后果：根 `edges init` 默认集（ADR 0031 里是 memory、notes、projects）要加 skills
- **Q4 装哪些**
  - 选项：A 全装、不筛选；B 可筛选
  - 结论：A。同时把与 edges 无关的 6 个 skill 从 `extensions/skills/` 移到 `shared-extensions/skills/`：`paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`、`horizontal-vertical-research`、`learn-repo`。npm 包只打剩下的
  - 理由：这 6 个都不调用 edges CLI；先移走，剩下的全装，保持简单
  - **按总原则对齐（2026-10-18）**：「全装」由 edges 传 `--skill '*'` 实现，这是 edges 补的两样之一；包里有什么就选中什么，edges 不另做筛选
- **Q5 / Q6 装到哪、怎么问**
  - 选项：A 写死目录；B 自己实现 agent 探测；C 交给 vercel skills
  - 结论：C。把包内 skills 目录的绝对路径（如 `node_modules/@viruspc/edges/skills`）交给 vercel skills。有 TTY 时让它交互询问装给哪些 agent、全局还是项目；无 TTY（CI / agent 调用）时非交互，按用户原话是 `-g -y --all`，靠它的自动探测；允许透传 `--agent`
  - 理由：各 agent 目录差异由安装器维护，edges 不重造
  - 实现注意（2026-10-18 核对 `skills@1.7.2` 源码）：`--all` 等于 `--skill '*' --agent '*' -y`，会装给**全部**支持的 agent，不走自动探测。要「自动探测本机 agent」应传 `-g -y --skill '*'` 且不带 `--agent`（探测到 0 个时它才回退为全部 agent）。另外它探测到自己在 agent 里运行时，只装给那一个 agent。实现时按「自动探测」这一意图选旗标，需要时再找用户确认
  - **已修订（2026-10-18，见 Q12）**：上面「无 TTY 时 `-g -y --all`、靠自动探测」一句作废。无 TTY 时不再替用户选默认 agent，改为必须显式指定；有 TTY 时交给 vercel skills 交互不变
  - **再次修订（2026-10-18 20:53，按总原则）**：上一条「必须显式指定」也作废。edges 不传 `-g`、`-y`、`--agent`，也不判断 TTY；装到哪、问不问，全按 vercel skills 默认，用户给的旗标原样透传。结论 C（交给 vercel skills）本身不变
- **Q7 已有同名 skill**
  - 问题：目标 agent 目录里已有同名 skill 时怎么办？
  - 选项：A edges 自己按各 skill 的 semver 比较、检测本地改动；B 一律覆盖；C 一律跳过；D 照搬 vercel skills 的行为，edges 不另做判断
  - 结论（最终，2026-10-18 第二次修订）：D。edges 不做版本比较，也不加 `-f` / `--force`，全部交给 vercel skills：它在 Installation Summary 里列出 `overwrites: <agents>` 清单，不带 `-y` 时确认「Proceed with installation?」后覆盖；带 `-y` 时直接覆盖。`-y` 由用户给（或 vercel skills 自己的非交互模式决定），edges 不替用户加（按总原则，2026-10-18 20:53 修正原文「无 TTY（传 `-y`）」一句）
  - 理由（用户原话）：抄他的行为
  - 依据（2026-10-18 核对 `skills@1.7.2` 的 `dist/cli.mjs`）：`skills add` 安装前对每个（skill, agent）调用 `isSkillInstalled`（约 L2435）检查目标是否已存在，在 Installation Summary 里列出 `overwrites:`，不带 `-y` 时问「Proceed with installation?」，然后覆盖（约 L4926–4950）。它从不比较版本、也不检测本地改动；lock 文件里的 `skillFolderHash` 只供 `check` / `update` 与源比较，不用于判断本地是否改过
  - 决策历史（保留，均已被上面的结论取代）：
    - grill 首答：A。已装版本更低 → 覆盖；版本相同 → 跳过；版本相同但本地改过 → 跳过并警告。理由：每个 skill 各有 semver；保护用户的本地改动
    - 同日第一次修订：本地版本更高、或本地版本低但被改过 → 都不安装并打印提示；用 `-f` / `--force` 强制覆盖，类似 npm。用户原话：本地已装版本比包内高、或本地版本低但被改过 → 都不安装，打印提示；用户可用 `-f`/`--force` 强制覆盖，类似 npm 行为
    - 同日第二次修订：核对 vercel skills 1.7.2 源码后改为照搬它的行为（即最终结论）
- **Q8 命令形状与升级后刷新**
  - 选项：新开 `edges skills install`；并进 `edges skills init`
  - 结论：不新开命令。`edges skills init` 既建 skill 类型索引（managed / referenced），也把包内 skill 装给 agent；重跑即刷新。CLI 升级后重跑 `edges skills init`（或 `edges init`）
  - 理由：用户否决 `edges skills install` 这个名字；init 本来就是可重复的
  - **按总原则对齐（2026-10-18）**：「重跑即刷新」就是再跑一次 `skills add`，覆盖与否按 vercel skills 默认（见 Q7）；edges 不判断哪些 skill 需要刷新
- **Q9 能否跳过**
  - 选项：可用 `--no-skills` 跳过；必做
  - 结论：必做。安装失败则 `edges skills init` / `edges init` 失败；不提供 `--no-skills`
  - 理由：没有 skill，CLI 对 agent 没用；静默成功只会把问题推后
  - **按总原则对齐（2026-10-18）**：「失败」只指 vercel skills 非零退出（或起不来，如 npx 不可用）；edges 把它的退出码传出去，不另加失败条件。例：无 TTY 又需要交互时 vercel skills 退出码 1，init 随之失败
- **Q10 vercel skills 的版本**
  - 选项：A 固定一个测过的确切版本（如 `skills@1.7.2`）；B `@latest`
  - 结论：A
  - 理由：上游行为会变；本仓吃过老包静默丢文件的亏
- **Q11 文档落点**
  - 结论：新写 ADR 0036「edges init / skills init 顺带把 skills 装给 agent」，并注明修订 ADR 0031 的默认集；0031 加一行 Amended by 链接
  - 理由：会写用户级 agent 目录，难以撤回；有真实取舍（打包 vs 从 GitHub 拉、init vs 单独命令、vercel vs gh skill）
- **Q12 无 TTY 时的 agent 选择**（修订 Q5 / Q6 的无 TTY 部分）
  - 问题：没有终端（CI、agent 调用）时，装给哪些 agent？
  - 选项：A 默认 `-g -y --skill '*'`，靠 vercel skills 自动探测；B 默认 `--all`，装给全部 agent；C 用户调用 CLI 时必须显式指定
  - 结论：C。edges 提供 `--agent` 旗标，透传给 vercel skills 的 `--agent`，支持三种写法：`*`、`all`（等同 `*`）、或列出部分 agent。无 TTY 且未给 `--agent` 时报错（非零退出），提示用 `--agent '*'` 或列出 agent，不静默选默认值。注意：`skills@1.7.2` 的 `--all` 等于 `--skill '*' --agent '*' -y`
  - 理由（用户原话）：没有终端时用户需要调用cli时指定吧；* 或 all 或指定部分 都支持。
  - **已修订（2026-10-18 20:53，按总原则）**：上面结论 C 作废，改为 D：无 TTY 时也按 vercel skills 默认，edges 不报错、不要求 `--agent`；用户给的 `--agent`（`'*'` 或部分 agent）、`-y`、`--all` 等原样透传。vercel skills 自己在需要交互而无 TTY 时打印提示并退出码 1（见总原则）。用户原话：没有终端时用什么参数调用，也按默认行为
- **Q13 Node engines**
  - 问题：`skills@1.7.2` 要求 node ≥ 22.20.0，`@viruspc/edges` 声明 `>=22`，怎么对齐？
  - 选项：A 把 `engines.node` 提到 `>=22.20.0`；B 保持 `>=22`，init 前检查并报错
  - 结论：A。`extensions/cli/package.json` 的 `engines.node` 改为 `>=22.20.0`
  - 理由（用户原话）：提到 `>=22.20.0`（vercel skills@1.7.2 要求）。
- **Q14 用户能否自带 `--skill`**（2026-10-18 21:00）
  - 问题：edges 固定补 `--skill '*'`，用户再传 `--skill` 怎么办？
  - 选项：A 不开放，CLI 写死 `--skill '*'`；B 开放，用户的 `--skill` 取代 `'*'`；C 两者都传给 vercel skills
  - 结论：A。`--skill` 不对用户开放，CLI 总是写死 `--skill '*'`（选中全部）
  - 理由（用户原话）：`--skill` 不开放，CLI 写死 `--skill '*'`（全选），用户不能自己传 `--skill`
- **Q15 用户旗标怎么转交给 vercel skills**（2026-10-18 21:00）
  - 问题：用户的 `-g`、`-y`、`--agent` 等旗标怎么传到 `skills add`，`edges init` 又怎么转交给 skills 模块？
  - 选项：A 用 `--` 分隔，`--` 之后的内容原样转交；B 在 edges 上重新声明 `-g`、`-y`、`--agent` 等旗标；C 一个字符串选项（如 `--skills-args "<...>"`）
  - 结论：A。`--` 之后的所有 token 原样转交给 vercel skills，如 `edges skills init -- -g -y --agent claude-code`；`edges init -- -y --agent '*'` 只转交给其中的 skills 安装步骤
  - 理由（用户原话）：用 `--` 分隔，`--` 之后的内容原样转交给 vercel skills
  - 实现注意：commander 会把 `--` 之后的 token 当成 `edges init` 的 `[module...]` 操作数，因此要在 commander 解析前先在 `--` 处切开 argv；只做转交，不改变其他行为
- **合入 PR #274**：用户同意（2026-10-18）
- **CONTEXT.md**：新增术语「安装技能」（把包内 skill 装给 agent），写明 `edges skills init` 现在既建索引也安装；与 Skill / Managed Skill / Referenced Skill 保持一致

**完成标准：**
- [ ] 6 个与 edges 无关的 skill（`paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`、`horizontal-vertical-research`、`learn-repo`）已从 `extensions/skills/` 移到 `shared-extensions/skills/`，遵循该目录约定（去掉单个 skill 的 `version` / `CHANGELOG.md`，走整层 VERSION）；两处 `name` 不重复。整层 `shared-extensions/VERSION` 记为 `4.0.0`
- [ ] `extensions/cli/package.json` 的 `files` 含 skills 目录；`pnpm --filter @viruspc/edges pack` 出的 tgz 里有 `extensions/skills/` 剩下的全部 skill（每个带 `SKILL.md`），不含上面 6 个，也不含 `shared-extensions` 里的 skill
- [ ] CLI 里调用的 vercel skills 是固定的确切版本（不是 `@latest`，也不是范围），版本号在一处常量里，有测试或脚本覆盖它
- [ ] `edges skills init` 传给 vercel skills 的是包内 skills 目录的绝对路径
- [ ] 安装步骤是薄封装：实际执行的命令等于 `skills@1.7.2 add <包内 skills 目录> --skill '*'` 加上 `--` 之后的 token（原样、同顺序），edges 不再自加 `-g`、`-y`、`--agent` 等任何旗标；有测试断言实际参数
- [ ] edges 侧没有 TTY 判断、`--agent` 必填校验、版本比较、本地改动检测、skill 筛选、`-f` / `--force`，也不对用户开放 `--skill`（Q14；代码审查可核对）
- [ ] `edges skills init -- -g -y --agent claude-code` 把 `-g -y --agent claude-code` 原样传给 vercel skills；`--agent '*'`、`--all` 同理；有测试
- [ ] `edges init a b -- x`：模块仍是 `a b`，`x` 只转交给 skills 安装步骤；`edges init -- -y --agent '*'` 不把 `-y`、`--agent`、`'*'` 当成模块；argv 在 commander 解析前于 `--` 处切开；有测试
- [ ] vercel skills 的 stdin / stdout / stderr 直接继承，交互提示（含 `overwrites:` 清单与确认）原样呈现给用户
- [ ] `edges skills init` 仍建 managed / referenced 类型索引（行为同 ADR 0031），同时完成安装；重跑即再跑一次 `skills add`
- [ ] 无参 `edges init` 的默认集含 skills，`edges init --help` 的「本次会创建」里列出 skills
- [ ] vercel skills 非零退出或起不来（如 npx 不可用）时，`edges skills init` 和 `edges init` 非零退出，信封里有失败原因；edges 不另加失败条件；没有 `--no-skills` 之类的跳过开关；有测试（含「无 TTY 需要交互 → vercel 退出 1 → init 失败」）
- [ ] 测试隔离 HOME / agent 目录，跑测试不写开发机真实的 `~/.agents`、`~/.claude`
- [ ] 在干净环境里 `npm install -g @viruspc/edges` 后执行一次 `edges init`，本地 agent（至少 Claude Code 与一家读 `~/.agents/skills` 的 agent）能看到并按 skill 调用 CLI
- [ ] `extensions/cli/package.json` 的 `engines.node` 为 `>=22.20.0`（Q13，与 `skills@1.7.2` 一致）；README 等处写到的 Node 版本要求同步
- [ ] `extensions/skills/README.md` 按新分发方式更新：主路径改为 `edges skills init`，删掉或改写「外部用户走 `npx skills add VirusPC/edges/extensions/skills`」与「一律 `@latest`」两段；`shared-extensions/skills/README.md` 的分工表同步。（本次 grill 的 PR 不改 README，实现时再改）
- [ ] CLI README 的 init 段（「`edges skills init` 只写 skill 类型索引」）与 `project-memory-init` 等相关 skill 文案同步为新行为
- [ ] ADR 0036 的 Status 与 Consequences 更新为已实现；经 PR 合入 main

**进展记录：**
- 2026-10-18 grill 完成。Q1–Q11 由 peng cheng 拍板，见上方决策记录；新写 ADR 0036，ADR 0031 加修订链接，`CONTEXT.md` 增加「安装技能」。实现未开始。核对 `extensions/skills/` 现有 20 个 skill，移走 6 个后剩 14 个（grill 时说的是 15 个，以实际目录为准）。
- 2026-10-18 追加决策（peng cheng）：Q12 无 TTY 时必须用 `--agent` 显式指定（`*` / `all` / 部分 agent），未指定则报错，修订 Q5 / Q6 原先的无 TTY 默认；Q13 `engines.node` 提到 `>=22.20.0`；Q7 补充：本地版本更高、或本地改过 → 跳过并提示，`-f` / `--force` 强制覆盖。ADR 0036 同步，完成标准改为可逐条核对。用户同意合入 PR #274。卡仍在 backlog，实现未开始。
- 2026-10-18 再次修订 Q7（peng cheng）：核对 vercel skills 1.7.2 源码后决定「抄他的行为」，edges 不做版本比较、不加 `-f` / `--force`，同名 skill 由 vercel skills 列出覆盖清单并确认（无 TTY 时 `-y` 直接覆盖）；上一条里的 Q7 补充已被取代，保留为决策历史。Q12、Q13 不变。ADR 0036 Decision 6 同步，完成标准相应调整。用户同意合入 PR #274。卡仍在 backlog。
- 2026-10-18 20:53（Asia/Shanghai）定下总原则（peng cheng）：安装技能是 vercel skills 的薄封装，edges 只补 skill 源地址与 `--skill '*'`，其余按 vercel skills 默认、旗标透传，不加额外逻辑。据此修订 Q12（无 TTY 不再强制 `--agent`，改为按默认行为），并对齐 Q4–Q9 的表述；Q13 不变。ADR 0036 精简重写，完成标准相应调整。待定：stdout 上 vercel 输出与 edges JSON 信封并存（ADR 记为继承 stdio 的后果）、`edges init` 如何转交旗标、用户自带 `--skill` 的处理。卡仍在 backlog，实现未开始。
- 2026-10-18 21:00（Asia/Shanghai）追加决策（peng cheng）：Q14 `--skill` 不开放，CLI 写死 `--skill '*'`；Q15 用 `--` 分隔，之后的 token 原样转交 vercel skills，`edges init` 只转交给 skills 安装步骤，commander 解析前在 `--` 处切开 argv。上一条的两个待定（旗标转交、自带 `--skill`）已定；stdout 与 JSON 信封并存仍记为继承 stdio 的后果。完成标准相应调整。卡仍在 backlog。
- 2026-10-18 实现：6 个无关 skill 移到 `shared-extensions/skills/`。整层版本记为 `4.0.0`。`edges skills init` 与无参 `edges init` 在建类型索引后调用依赖 `skills@1.7.2`：`add <包内目录绝对路径> --skill '*'`，`--` 之后原样转交，stdio 继承。`engines.node` 为 `>=22.20.0`。分支 `cursor/edges-init-install-skills-4daa`（`1adb174a`）。版本文件记为 `4.0.0`。未在这次记录里改 tag。`gh pr create` 返回 `Resource not accessible by integration`，PR 未开，对比页：https://github.com/VirusPC/edges/compare/main...cursor/edges-init-install-skills-4daa 。CLI 测试 1051 通过；`pack` 含 14 个 skill、不含迁走的 6 个。干净环境的全局安装与真实 agent 目录未跑。卡仍在 backlog。
- 2026-10-18 评审修复（PR #276，卡仍在 backlog）：`--` 只在第一个字面量 `--` 处切开，不再自带选项表。包内 skill 目录按模块位置定一条路径：`dist/` 用包内 `skills/`，源码用 `extensions/skills`，不读陈旧的 `extensions/cli/skills/`。安装在 init 写锁释放之后。失败信封带 `created`，`errorCode` 为 `SKILLS_INSTALL_FAILED`，进程退出码仍是安装器的退出码。没选 skills 时 stderr 列出被忽略的 token。测试预加载拒绝真实 spawn。删掉 `.agents/skills/migrate-directory-nodes` 软链和 `scripts/move-edges-unrelated-skills.mts`。`project-memory-init` 文案改为 `edges init -- -g -y`，版本文件记为 `4.0.0`，未改 tag。`shared-extensions/VERSION` 记为 `4.0.0`。干净环境：`pnpm pack` 后 `npm install -g --prefix <临时前缀>`，stdin 不是 TTY。在临时项目目录里执行 `edges --scope <该目录> init -- -y --agent claude-code`，退出 0，14 个 skill 落在该项目 `.claude/skills`，6 个迁走的名字不在。同一条 `edges init -- -g -y`：本机探测到 cursor-cli 时退出 0，14 个 skill 在临时 `HOME/.agents/skills`；去掉 `CURSOR_AGENT` 后再跑，退出 0，临时 `HOME/.claude/skills` 与 `HOME/.agents/skills` 各 14 个，6 个迁走的仍不在。CLI 测试 1060 通过。
- 2026-10-18 复审修复（PR #276，卡仍在 backlog）：`--` 只在 `init` 和 `skills init` 上、于第一个字面量 `--` 处切开；其他命令保留原 argv。`skills get -- edges-note`、`notes get -- -weird/INDEX.md`、`skills list -- nope`，以及选项值本身是 `--`，都不再被切开。安装器里删掉 `runningUnderNodeTest()` / `process.execArgv.includes("--test")`，测试隔离只留预加载注入。没选 skills 的 stderr 警告改看解析后的模块集合，memory 类型选择提前返回且集合里仍有 skills 时不报警。未改 tag。Node 22.23.3 上 CLI 测试 1069 通过，tsc 通过。
- 2026-10-18 版本记为 `4.0.0`（PR #276，卡仍在 backlog）：`shared-extensions/VERSION` 与 changelog 的移入记录是 `[4.0.0] - 2026-10-18`，原先的 `[1.0.0] - 2026-09-08` 仍在。`project-memory-init` 的 frontmatter 与 changelog 顶栏是 `[4.0.0] - 2026-10-18`，概括 `edges init -- -g -y`；`[3.7.0]` 与 2026-09-01 的 `[1.0.0]` 仍在。未推、未移动、未删除 git tag。
