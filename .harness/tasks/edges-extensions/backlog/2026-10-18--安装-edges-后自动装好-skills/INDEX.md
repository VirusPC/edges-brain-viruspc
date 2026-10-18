---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-18T12:50:00.000Z'
  edges-title: 安装 edges 后自动装好 skills
  edges-tasks-status: backlog
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
2026-10-18 grill-with-docs，由 peng cheng 逐题拍板；同日追加 Q12、Q13 与 Q7 补充。长期决定见 [ADR 0036](../../../../../docs/adr/0036-edges-init-installs-bundled-skills.md)，术语见 `CONTEXT.md`「安装技能」。

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
- **Q5 / Q6 装到哪、怎么问**
  - 选项：A 写死目录；B 自己实现 agent 探测；C 交给 vercel skills
  - 结论：C。把包内 skills 目录的绝对路径（如 `node_modules/@viruspc/edges/skills`）交给 vercel skills。有 TTY 时让它交互询问装给哪些 agent、全局还是项目；无 TTY（CI / agent 调用）时非交互，按用户原话是 `-g -y --all`，靠它的自动探测；允许透传 `--agent`
  - 理由：各 agent 目录差异由安装器维护，edges 不重造
  - 实现注意（2026-10-18 核对 `skills@1.7.2` 源码）：`--all` 等于 `--skill '*' --agent '*' -y`，会装给**全部**支持的 agent，不走自动探测。要「自动探测本机 agent」应传 `-g -y --skill '*'` 且不带 `--agent`（探测到 0 个时它才回退为全部 agent）。另外它探测到自己在 agent 里运行时，只装给那一个 agent。实现时按「自动探测」这一意图选旗标，需要时再找用户确认
  - **已修订（2026-10-18，见 Q12）**：上面「无 TTY 时 `-g -y --all`、靠自动探测」一句作废。无 TTY 时不再替用户选默认 agent，改为必须显式指定；有 TTY 时交给 vercel skills 交互不变
- **Q7 已有同名 skill**
  - 选项：A 按各 skill 的 semver 比较；B 一律覆盖；C 一律跳过
  - 结论：A。已装版本更低 → 覆盖；版本相同 → 跳过；版本相同但本地改过 → 跳过并警告，绝不静默覆盖
  - 理由：每个 skill 各有 semver；保护用户的本地改动
  - **补充（2026-10-18）**：
    - 问题：本地已装版本比包内高，或本地版本低但被改过，怎么办？要不要能强制覆盖？
    - 选项：A 覆盖；B 不装并提示，另给强制开关；C 不装也不给开关
    - 结论：B。完整规则（按每个 skill 判断）：
      - 本地版本更低且未改过 → 覆盖
      - 版本相同且未改过 → 跳过（不提示）
      - 本地版本更高 → 跳过并警告
      - 本地改过（不论版本高低）→ 跳过并警告
      - `-f` / `--force`：以上所有跳过的情况都强制覆盖为包内版本
    - 理由（用户原话）：本地已装版本比包内高、或本地版本低但被改过 → 都不安装，打印提示；用户可用 `-f`/`--force` 强制覆盖，类似 npm 行为
- **Q8 命令形状与升级后刷新**
  - 选项：新开 `edges skills install`；并进 `edges skills init`
  - 结论：不新开命令。`edges skills init` 既建 skill 类型索引（managed / referenced），也把包内 skill 装给 agent；重跑即刷新。CLI 升级后重跑 `edges skills init`（或 `edges init`）
  - 理由：用户否决 `edges skills install` 这个名字；init 本来就是可重复的
- **Q9 能否跳过**
  - 选项：可用 `--no-skills` 跳过；必做
  - 结论：必做。安装失败则 `edges skills init` / `edges init` 失败；不提供 `--no-skills`
  - 理由：没有 skill，CLI 对 agent 没用；静默成功只会把问题推后
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
- **Q13 Node engines**
  - 问题：`skills@1.7.2` 要求 node ≥ 22.20.0，`@viruspc/edges` 声明 `>=22`，怎么对齐？
  - 选项：A 把 `engines.node` 提到 `>=22.20.0`；B 保持 `>=22`，init 前检查并报错
  - 结论：A。`extensions/cli/package.json` 的 `engines.node` 改为 `>=22.20.0`
  - 理由（用户原话）：提到 `>=22.20.0`（vercel skills@1.7.2 要求）。
- **合入 PR #274**：用户同意（2026-10-18）
- **CONTEXT.md**：新增术语「安装技能」（把包内 skill 装给 agent），写明 `edges skills init` 现在既建索引也安装；与 Skill / Managed Skill / Referenced Skill 保持一致

**完成标准：**
- [ ] 6 个与 edges 无关的 skill（`paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`、`horizontal-vertical-research`、`learn-repo`）已从 `extensions/skills/` 移到 `shared-extensions/skills/`，遵循该目录约定（去掉单个 skill 的 `version` / `CHANGELOG.md`，走整层 VERSION）；两处 `name` 不重复
- [ ] `extensions/cli/package.json` 的 `files` 含 skills 目录；`pnpm --filter @viruspc/edges pack` 出的 tgz 里有 `extensions/skills/` 剩下的全部 skill（每个带 `SKILL.md`），不含上面 6 个，也不含 `shared-extensions` 里的 skill
- [ ] CLI 里调用的 vercel skills 是固定的确切版本（不是 `@latest`，也不是范围），版本号在一处常量里，有测试或脚本覆盖它
- [ ] `edges skills init` 传给 vercel skills 的是包内 skills 目录的绝对路径
- [ ] 有 TTY 且未给 `--agent` 时，`edges skills init` 让 vercel skills 交互选择 agent 与全局 / 项目
- [ ] `--agent` 透传给 vercel skills 的 `--agent`：`--agent '*'`、`--agent all`（等同 `*`）、`--agent <a> <b>`（部分 agent）三种写法都有测试；给了 `--agent` 时非交互（`-y`）、装到全局
- [ ] 无 TTY 且未给 `--agent` 时，`edges skills init` 与 `edges init` 非零退出、不写 agent 目录，信封与 stderr 提示用 `--agent '*'` 或列出 agent；不静默按自动探测或全部 agent 安装；有测试
- [ ] 同名 skill（Q7）：本地版本更低且未改过 → 覆盖；版本相同且未改过 → 跳过；本地版本更高 → 跳过并警告；本地改过（不论版本）→ 跳过并警告；警告含 skill 名、路径与「可用 `-f` / `--force` 强制覆盖」；每种情况都有测试
- [ ] `-f` / `--force` 在上述所有跳过情况下强制覆盖为包内版本，有测试；`edges init` 也接受并转交该旗标
- [ ] `edges skills init` 仍建 managed / referenced 类型索引（行为同 ADR 0031），同时完成安装；重复运行幂等，只刷新需要刷新的 skill
- [ ] 无参 `edges init` 的默认集含 skills，`edges init --help` 的「本次会创建」里列出 skills
- [ ] 安装失败（如 npx 不可用、vercel skills 非零退出）时 `edges skills init` 和 `edges init` 非零退出，信封里有失败原因；没有 `--no-skills` 之类的跳过开关
- [ ] 测试隔离 HOME / agent 目录，跑测试不写开发机真实的 `~/.agents`、`~/.claude`
- [ ] 在干净环境里 `npm install -g @viruspc/edges` 后执行一次 `edges init`，本地 agent（至少 Claude Code 与一家读 `~/.agents/skills` 的 agent）能看到并按 skill 调用 CLI
- [ ] `extensions/cli/package.json` 的 `engines.node` 为 `>=22.20.0`（Q13，与 `skills@1.7.2` 一致）；README 等处写到的 Node 版本要求同步
- [ ] `extensions/skills/README.md` 按新分发方式更新：主路径改为 `edges skills init`，删掉或改写「外部用户走 `npx skills add VirusPC/edges/extensions/skills`」与「一律 `@latest`」两段；`shared-extensions/skills/README.md` 的分工表同步。（本次 grill 的 PR 不改 README，实现时再改）
- [ ] CLI README 的 init 段（「`edges skills init` 只写 skill 类型索引」）与 `project-memory-init` 等相关 skill 文案同步为新行为
- [ ] ADR 0036 的 Status 与 Consequences 更新为已实现；经 PR 合入 main

**进展记录：**
- 2026-10-18 grill 完成。Q1–Q11 由 peng cheng 拍板，见上方决策记录；新写 ADR 0036，ADR 0031 加修订链接，`CONTEXT.md` 增加「安装技能」。实现未开始。核对 `extensions/skills/` 现有 20 个 skill，移走 6 个后剩 14 个（grill 时说的是 15 个，以实际目录为准）。
- 2026-10-18 追加决策（peng cheng）：Q12 无 TTY 时必须用 `--agent` 显式指定（`*` / `all` / 部分 agent），未指定则报错，修订 Q5 / Q6 原先的无 TTY 默认；Q13 `engines.node` 提到 `>=22.20.0`；Q7 补充：本地版本更高、或本地改过 → 跳过并提示，`-f` / `--force` 强制覆盖。ADR 0036 同步，完成标准改为可逐条核对。用户同意合入 PR #274。卡仍在 backlog，实现未开始。
