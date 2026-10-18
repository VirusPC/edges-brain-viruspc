---
status: accepted
---

# edges init / skills init 顺带把 skills 装给 agent

2026-10-18 `@viruspc/edges@0.1.0` 首次发布到 npm（PR #264），包里只有 `dist`。验证安装时确认：只装 CLI，本地 agent 不知道何时、如何调用它；真正让 agent 用起来的是 `extensions/skills/` 下的 skill。同日 grill（peng cheng 拍板）确认：Edges 自有 skill 打进 npm 包、与 CLI 同版本发布；`edges skills init` 在建 skill 类型索引的同时，用 vercel-labs/skills 把包内 skill 装给本机 agent；根 `edges init` 的默认模块集因此加入 skills。

这条决定难以撤回：它会写用户级的 agent 目录（如 `~/.agents/skills`、`~/.claude/skills`），一旦用户机器上装了，就要考虑升级、覆盖与本地改动。也有真实取舍：打进包还是安装时从 GitHub 拉；在 init 里装还是另开命令；用 vercel skills 还是 GitHub `gh skill`。故单开 ADR。

**Amends ADR 0031**：0031 写「不给模块时……不建 user、skills、tasks……」与「`edges skills init` 只采用 skill 类型」。本 ADR 起，无参 `edges init` 的默认集包含 skills；`edges skills init` 除建类型索引外还安装包内 skill。0031 其余决定（编排方式、init service 唯一入口、各模块只建自己的材料、`--super` 不读等）不变。

**Status:** accepted（ADR 0036；grill 确认于 2026-10-18 Asia/Shanghai；同日修订 Decision 5、6，新增 Decision 9（任务卡 Q12、Q13、Q7 补充）；实现待做，见任务卡「安装 edges 后自动装好 skills」）

**See also:** ADR 0031（`edges init` 标准命令）、ADR 0004（能力面 CLI + Skill + MCP）；`extensions/skills/README.md`（分发现状）；[Agent Skills 规范](https://agentskills.io/specification)

## Decision

1. **skill 打进 npm 包，与 CLI 版本锁定**：`extensions/cli/package.json` 的 `files` 加入 skills 目录，构建时把 Edges 自有 skill 拷进包。CLI 与它附带的 skill 总是同一次发布，不存在「CLI 新、skill 旧」的组合。安装时不从 GitHub 拉。
2. **只打 Edges 相关的 skill**：与 edges CLI 无关的 6 个 skill（`paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`、`horizontal-vertical-research`、`learn-repo`）都不调用 edges CLI，移到 `shared-extensions/skills/`，不进 npm 包。其余 skill 全部打包、全部安装，不提供筛选。
3. **安装器用 vercel-labs/skills**：调用 `npx skills add <包内 skills 目录的绝对路径>`（例如 `<全局 node_modules>/@viruspc/edges/skills`）。理由：使用最广，支持 40+ agent，支持本地路径源，装 edges 的用户本来就有 Node / npx。skill 格式遵循 [Agent Skills 规范](https://agentskills.io/specification)。
4. **固定 vercel skills 版本**：CLI 里写死一个测过的确切版本（如 `skills@1.7.2`），不用 `@latest`。升级安装器版本随 CLI 发版、重新验证。
5. **交互与非交互**：有 TTY 且未给 `--agent` 时，让 vercel skills 自己交互询问装给哪些 agent、装到全局还是项目。edges 提供 `--agent` 旗标，透传给 vercel skills 的 `--agent`，支持三种写法：`*`、`all`（等同 `*`）、或列出部分 agent；给了 `--agent` 时非交互、装到全局。没有 TTY（CI、agent 调用）时**必须**显式给 `--agent`；未给则报错、非零退出，提示可用的写法，不替用户选默认值。
   - 修订记录（2026-10-18）：原文为「没有 TTY 时非交互、装到全局，并由 vercel skills 自动探测本机 agent」（grill 时用户原话是 `-g -y --all`）。用户改为无 TTY 时必须显式指定：「没有终端时用户需要调用cli时指定吧；* 或 all 或指定部分 都支持。」注意 `skills@1.7.2` 的 `--all` 等于 `--skill '*' --agent '*' -y`，装给全部 agent，并不自动探测。
6. **同名 skill 的处理**：每个 skill 有自己的 semver。目标位置已有同名 skill 时，按 skill 逐个判断，类似 npm：
   - 本地版本更低且未改过 → 覆盖为包内版本；
   - 版本相同且未改过 → 跳过；
   - 本地版本更高 → 跳过并警告；
   - 本地被改过（不论版本高低）→ 跳过并警告，绝不静默覆盖；
   - `-f` / `--force`：以上所有跳过的情况都强制覆盖为包内版本。警告里给出 skill 名、路径和 `--force` 提示。
   - 修订记录（2026-10-18）：原文只覆盖「更低 → 覆盖、相同 → 跳过、相同但改过 → 跳过并警告」。补充本地更高、本地低但改过两种情况与 `--force`。
7. **不新开命令，装在 `edges skills init` 里**：`edges skills init` 既建 skill 类型索引（managed / referenced，行为同 ADR 0031），也把包内 skill 装给 agent；重跑即刷新。根 `edges init` 的默认模块集从 memory、notes、projects 扩为再加 skills。CLI 升级后，用户重跑 `edges skills init`（或 `edges init`）刷新 skill。不叫 `edges skills install`（用户否决该名）。
8. **安装是必做步骤**：安装失败时 `edges skills init` / `edges init` 整体失败、非零退出，不提供 `--no-skills` 之类的跳过开关。理由：没有 skill，agent 就用不上 CLI，静默成功只会让问题后移。无 TTY 未给 `--agent` 也算失败。
9. **Node 版本要求对齐**：`@viruspc/edges` 的 `engines.node` 从 `>=22` 提到 `>=22.20.0`，与 `skills@1.7.2` 的要求一致（2026-10-18 用户确认）。

## Considered Options

- **安装时从 GitHub 拉 skill（`npx skills add VirusPC/edges/extensions/skills`）：** 否决。CLI 与 skill 版本可能错开；离线或 GitHub 不可达时装不上。打进包后两者同版本。
- **另开命令（`edges skills install`）或只在文档里让用户自己跑 `npx skills`：** 否决。agent 不装 skill 就用不上 CLI，安装应属于 init；用户也否决了 `install` 这个名字。重跑 `edges skills init` 即刷新。
- **GitHub `gh skill`：** 未选。官方方案，2026-04 起 public preview（[changelog](https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/)），要求 gh ≥ 2.90；edges 用户不一定装了较新的 gh，而 npx 随 Node 必有。
- **APM / PSPM / paks 等：** 未选。各自有注册表，用户量小。
- **vercel skills 用 `@latest`：** 否决。本仓吃过老包静默丢文件的亏（见 `extensions/skills/README.md`），且上游行为会变；固定版本才能保证测过的行为。
- **提供 `--no-skills` 跳过开关：** 否决。见 Decision 8。
- **可筛选安装哪几个 skill：** 否决。先把无关 skill 移出包，剩下的全装，保持简单。
- **无 TTY 时默认 `-g -y --skill '*'` 自动探测，或默认 `--all` 装给全部 agent：** 否决（2026-10-18 修订）。无终端时由调用方用 `--agent` 显式指定，避免装到不想要的 agent。
- **本地版本更高或本地改过时直接覆盖，或不提供强制开关：** 否决。默认保护本地，`-f` / `--force` 留给用户明确要求覆盖的情况，与 npm 习惯一致。
- **保持 `engines.node` 为 `>=22`、在 init 前检查：** 否决。直接在 `engines` 声明真实要求。

## Consequences

- 待实现：`package.json` `files` 加 skills；构建拷贝 skill；`services/skills` 增加安装步骤（调用固定版本的 vercel skills、TTY 判断、`--agent` 透传与无 TTY 缺 `--agent` 时报错、版本比较与本地改动检测、`-f` / `--force`）；`engines.node` 改为 `>=22.20.0`；init 模块表默认集加 skills；6 个无关 skill 移到 `shared-extensions/skills/`。细项与验收见任务卡。
- `extensions/skills/README.md` 里「所有 `npx skills` 命令都写成 `npx skills@latest`」与「外部用户走 `npx skills add VirusPC/edges/extensions/skills`」两段，实现后要改为以 `edges skills init` 为主路径；作者本机的 `pnpm skills:link` 不受影响。本 ADR 不先改 README。
- `edges init` 会写用户级 agent 目录，测试需隔离 HOME，避免污染开发机。
- 与 vercel skills 的耦合点：其 `--all` / `-y` / `--agent` 语义、node 引擎要求（`skills@1.7.2` 要求 node ≥ 22.20.0，`@viruspc/edges` 跟随声明 `>=22.20.0`，见 Decision 9）。升级固定版本时一并复核。
- 术语见 `CONTEXT.md`「安装技能」。
