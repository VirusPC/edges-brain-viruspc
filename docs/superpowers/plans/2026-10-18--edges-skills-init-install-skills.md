# edges init 安装包内 skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm install -g @viruspc/edges` 之后，一次 `edges init` 或 `edges skills init` 既建 skill 类型索引，又用固定版本的 vercel skills 把包内 Edges skill 装给本机 agent。

**Architecture:** 安装步骤是 `skills@1.7.2` 的薄封装。edges 只补两样：包内 skills 目录的绝对路径，以及写死的 `--skill '*'`。`--` 之后的 token 原样接在后面。不判断 TTY，不自加 `-g` / `-y` / `--agent`，不比较版本，不筛选 skill，不重定向 stdio。`edges init` 在 commander 解析前于 `--` 处切开 argv，切开的后半只交给 skills 安装步骤。6 个与 Edges 无关的 skill 移到 `shared-extensions/skills/`，不进 npm 包。

**Tech Stack:** TypeScript、Node `>=22.20.0`、`node:test`、tsx、Commander、pnpm。新增运行时依赖 `skills@1.7.2`（确切版本，无 `^` / `~`）。

**Spec:** `.harness/tasks/edges-extensions/backlog/2026-10-18--安装-edges-后自动装好-skills/INDEX.md`（总原则、Q1–Q15、完成标准）；`docs/adr/0036-edges-init-installs-bundled-skills.md`；ADR 0031 的 Amended by 仍有效。

## Global Constraints

- 总原则：安装技能是 vercel skills 的薄封装。edges 不加 TTY 判断、`--agent` 必填、版本比较、本地改动检测、skill 筛选、`-f` / `--force`，也不对用户开放 `--skill`。
- 固定版本常量只有一处：`VERCEL_SKILLS_VERSION = "1.7.2"`。`extensions/cli/package.json` 的 `dependencies.skills` 必须是同一个确切版本。
- 实际参数：`add <包内 skills 目录绝对路径> --skill '*' ` 再接 `--` 之后的 token，顺序不变。进程是 `node` 加上该依赖包自己的 bin（不走 `npx`，避免测试和离线安装打到网络）。起不来（解析不到 bin、spawn 报错）视同安装失败。
- stdio 为 `inherit`。edges 不改写 vercel skills 的 stdout / stderr。
- vercel skills 非零退出时，进程退出码就是它的退出码；信封 `{ status: "failed", errorCode: "SKILLS_INSTALL_FAILED", reason }` 带上原因。没有 `--no-skills`。
- `engines.node` 为 `>=22.20.0`。
- 公开仓库：不写入凭据、个人信息、未公开 IP。不改 `posts/`。
- 提交信息 `type: subject`，trailer `Co-authored-by: 全栈开发专家 <grok-bot@users.noreply.github.com>`。
- 直接调用 `services/init/service.ts` 的 `initSkills`（类型索引）的既有测试不安装 skill。安装只发生在 `initScope` 且请求的模块含 `skills` 时（`edges init` 默认集、`edges init skills`、`edges skills init`）。
- 测试套件用 preload 把 spawn 换成成功的空操作，避免写开发机 `~/.agents`、`~/.claude`，也不访问网络。断言参数的测试换上自己的假 spawn，结束时恢复 preload。

## 完成标准对照

| 完成标准 | 任务 |
| --- | --- |
| 6 个 skill 移到 `shared-extensions/skills/`，去掉 `version` / `CHANGELOG.md`，`name` 不重复 | Task 1 |
| `files` 含 skills；pack 出的 tgz 含剩下的 skill、不含那 6 个、不含 shared-extensions | Task 2 |
| 确切版本、一处常量、测试覆盖 | Task 3 |
| 传给 vercel skills 的是包内 skills 目录绝对路径 | Task 3 |
| 薄封装：参数等于 `add <dir> --skill '*'` 加 `--` 后的 token；不自加旗标 | Task 3、Task 4 |
| 无 TTY 判断、无 `--agent` 必填、无版本比较、无 `--skill` 选项、无 `-f` | Task 3、Task 4 |
| `edges skills init -- -g -y --agent claude-code` 原样转发；`'*'` 与 `--all` 同理 | Task 3、Task 4 |
| `edges init a b -- x` 模块仍是 a b；`edges init -- -y --agent '*'` 不当成模块 | Task 3、Task 4 |
| stdin / stdout / stderr 继承 | Task 3 |
| 仍建 managed / referenced；重跑再跑一次 `skills add` | Task 4 |
| 无参 `edges init` 默认集含 skills；`--help` 的创建段列出 skills | Task 4 |
| 非零退出或起不来则 init 失败；无 `--no-skills`；含「vercel 退出 1 → init 失败」 | Task 4 |
| 测试不写真实 `~/.agents`、`~/.claude` | Task 3 preload |
| 干净环境全局安装后 agent 能调用 | 不在本计划自动执行。无 TTY 的 `edges init` 按 vercel 默认会退出 1；本环境不写真实 agent 目录、测试不打网络。PR 里这一条保持未勾 |
| `engines.node` `>=22.20.0`，README 同步 | Task 2、Task 5 |
| `extensions/skills/README.md` 与 `shared-extensions/skills/README.md` | Task 5 |
| CLI README 与 `project-memory-init` 文案 | Task 5 |
| ADR 0036 Status / Consequences 改为已实现 | Task 5。合入 main 由 PR 完成，本计划不合并 |

## 文件结构

- Create: `scripts/move-edges-unrelated-skills.mts` — 可预览、可重复的搬家脚本。
- Create: `extensions/cli/src/services/skills/install-bundled.ts` — 版本常量、目录解析、参数拼装、spawn。
- Create: `extensions/cli/src/services/skills/split-skills-install-args.ts` — 在 `--` 处切开 argv。
- Create: `extensions/cli/scripts/copy-bundled-skills.ts` — 把 `extensions/skills` 里带 `SKILL.md` 的目录拷进包。
- Create: `extensions/cli/test/skills/install-bundled.test.ts`
- Create: `extensions/cli/test/skills/split-skills-install-args.test.ts`
- Create: `extensions/cli/test/register-skills-install-mock.ts` — 测试 preload。
- Modify: `extensions/cli/src/services/init/service.ts`、`modules.ts`、`commands/init.ts`、`commands/skills/init.ts`、`context.ts`、`program.ts`
- Modify: `extensions/cli/package.json`、根 `package.json` 的脚本（若搬家脚本要登记）、`.gitignore`
- Modify: 文档与 `project-memory-init` 正文；任务卡只追加进展记录。

调用链：

```text
edges init / edges skills init
        │  program.run 在 commander 之前切开 `--`
        ▼
   init service（先建类型索引）
        │  模块含 skills
        ▼
   installBundledSkills(forwarded)
        │  node <skills@1.7.2 bin> add <abs> --skill '*' …forwarded
        ▼
   stdio inherit，退出码原样返回
```

---

### Task 1: 把 6 个无关 skill 移到 shared-extensions

**Files:**

- Create: `scripts/move-edges-unrelated-skills.mts`
- Modify: `shared-extensions/VERSION`、`shared-extensions/CHANGELOG.md`
- Modify: `.agents/skills` 里指向这 6 个目录的软链（跑 `pnpm skills:link`）
- Test: 脚本 `--self-test`；搬家后两棵目录的 `name` 不相交

**Interfaces:**

- Produces: 这 6 个目录只存在于 `shared-extensions/skills/<name>/`，各有 `SKILL.md`，无 `version` 字段，无 `CHANGELOG.md`。
  - `paper-10-questions`
  - `summarize-ai-article`
  - `summarize-ai-article-ultra`
  - `weekly-ai-blogs-digest`
  - `horizontal-vertical-research`
  - `learn-repo`

**行为：**

- 默认预览；`--apply` 才写。两边都已在目标且源已不存在时，计划为空，退出 0。源和目标同时存在则退出非零，不覆盖。
- 移动整个目录，再删 `CHANGELOG.md`，并从 `SKILL.md` frontmatter 去掉 `version` 行。`name` 与目录名保持一致。
- `shared-extensions` 版本记为 `4.0.0`。changelog 把移入的 skill 记在 `[4.0.0]` 的 Added。本计划不打 tag。
- 不改这 6 个 skill 的正文步骤。历史笔记、复盘里的旧路径不回写。

- [ ] **Step 1:** 写脚本，对仓库预览，确认 6 条移动、无名字冲突。
- [ ] **Step 2:** `--apply`。`pnpm skills:link` 去掉 `.agents/skills` 上已失效的软链。
- [ ] **Step 3:** 再预览，计划为空。不在这一步打 tag。

### Task 2: 把剩下的 skill 打进 `@viruspc/edges`

**Files:**

- Create: `extensions/cli/scripts/copy-bundled-skills.ts`
- Modify: `extensions/cli/package.json`（`files`、`engines`、`build`、`dependencies.skills`）
- Modify: `.gitignore`（`extensions/cli/skills/`）
- Test: `extensions/cli/test/skills/bundled-skills-package.test.ts`

**Interfaces:**

- Produces:
  - `copyBundledSkills(sourceDir, destDir)`：清空 dest 后，只拷贝直接子目录里含 `SKILL.md` 的 skill。不拷 README、`.harness`、`AGENTS.md`。
  - `package.json` `files` 含 `"skills"` 与 `"dist"`。
  - `engines.node` 为 `">=22.20.0"`。
  - `dependencies.skills` 为 `"1.7.2"`。

- [ ] **Step 1:** 写失败测试：拷贝结果含 `extensions/skills` 现有的每一个 skill 目录且各有 `SKILL.md`；不含 Task 1 的 6 个名字；`package.json` 的 `files` / `engines` / `dependencies.skills` 符合上面的接口。
- [ ] **Step 2:** 跑该测试，确认因拷贝函数或字段缺失而失败。
- [ ] **Step 3:** 实现拷贝，把它加进 `build`（`prepack` 已调用 `build`）。`pnpm --filter @viruspc/edges add skills@1.7.2`（确切版本）。
- [ ] **Step 4:** 跑测试。再执行一次 `pnpm --filter @viruspc/edges pack --pack-destination <tmpdir>`，列出 tgz，确认包内 `package/skills/<name>/SKILL.md` 覆盖剩下的 skill，且没有那 6 个名字，也没有 `shared-extensions`。

### Task 3: 薄封装与 `--` 切开

**Files:**

- Create: `extensions/cli/src/services/skills/install-bundled.ts`
- Create: `extensions/cli/src/services/skills/split-skills-install-args.ts`
- Create: `extensions/cli/test/skills/install-bundled.test.ts`
- Create: `extensions/cli/test/skills/split-skills-install-args.test.ts`
- Create: `extensions/cli/test/register-skills-install-mock.ts`
- Modify: `extensions/cli/package.json` 的 `test` 脚本，加上该 preload
- Modify: `extensions/cli/src/program.ts`、`context.ts`

**Interfaces:**

- Produces:
  - `export const VERCEL_SKILLS_VERSION = "1.7.2"`
  - `splitSkillsInstallArgs(argv: readonly string[]) → { argv: string[]; skillsInstallArgs: string[] }`
  - `resolveBundledSkillsDir() → string`（绝对路径。包根下 `skills/` 里已有 `SKILL.md` 时用它，否则用包根的 `../skills`，即仓库里的 `extensions/skills`）
  - `skillsAddArgs(skillsDir: string, forwarded: readonly string[]) → string[]` 等于 `["add", skillsDir, "--skill", "*", ...forwarded]`
  - `installBundledSkills(forwarded: readonly string[]) → Promise<void>`
  - `setBundledSkillsSpawnForTests(spawn | undefined)`：测试替换 spawn。`undefined` 恢复真实 spawn。
  - `SkillsInstallError`：`exitCode: number`，`message` 含原因。
  - `CliContext.skillsInstallArgs: readonly string[]`。`run()` 先切开再 `parseAsync`。

**切开规则（只服务 init，不改变其他命令）：**

- argv 里没有 `--`：原样返回，`skillsInstallArgs` 为空。
- 有 `--`，且 `--` 之前的位置参数是 `init`，或 `skills` 后接 `init`：`--` 之前交给 commander，之后原样作为 `skillsInstallArgs`。
- 跳过的取值选项：`--scope`、`--target-dir`、`--root-dir`、`--description`、`--memory-types`、`--skill-types`（只跳过紧随的一个 token；多值选项的其余值不影响「是不是 init」这个判断）。
- 其他命令保留 `--` 及其后的 token，不切开。

**spawn：**

```ts
spawn(process.execPath, [skillsBin, ...skillsAddArgs(dir, forwarded)], { stdio: "inherit" })
```

`skillsBin` 用 `createRequire(import.meta.url).resolve("skills/package.json")` 再读 `bin.skills`。解析失败或 `error` 事件：抛 `SkillsInstallError`，`exitCode` 为 1，message 说明 `skills@1.7.2` 起不来。子进程退出码非 0：抛 `SkillsInstallError`，`exitCode` 为该退出码。退出码 0：返回。

- [ ] **Step 1:** 写失败测试。
  - `splitSkillsInstallArgs(["init", "a", "b", "--", "x"])` → argv `["init","a","b"]`，转发 `["x"]`。
  - `splitSkillsInstallArgs(["init", "--", "-y", "--agent", "*"])` → argv `["init"]`，转发 `["-y","--agent","*"]`。
  - `splitSkillsInstallArgs(["--scope", "/tmp", "skills", "init", "--", "-g", "-y", "--agent", "claude-code"])` 转发那 4 个 token，argv 不含它们。
  - `splitSkillsInstallArgs(["skills", "list", "--", "nope"])` 不切开。
  - `skillsAddArgs("/abs/skills", ["-g", "-y", "--agent", "claude-code"])` 深度等于 `["add","/abs/skills","--skill","*","-g","-y","--agent","claude-code"]`。
  - `skillsAddArgs("/abs/skills", ["--all"])` 与 `["--agent","*"]` 只是把这些 token 接在 `*` 后面，不改写。
  - 假 spawn 收到 `stdio: "inherit"`，命令是 `process.execPath`，参数以解析出的 bin 开头，其后等于 `skillsAddArgs`。
  - `dependencies.skills === VERCEL_SKILLS_VERSION`，且不含 `^` 或 `~`。已安装的 `skills` 包 `version` 等于该常量。
  - 假 spawn 返回 1 时抛出的 `exitCode` 为 1。假 spawn 抛 `ENOENT` 时 `exitCode` 为 1，message 提到起不来。
  - `resolveBundledSkillsDir()` 是绝对路径，目录里有 `SKILL.md`，且没有 Task 1 的 6 个名字。
- [ ] **Step 2:** 跑新测试，确认失败原因是函数不存在，而不是断言写错。
- [ ] **Step 3:** 实现上述函数。`run()` 写入 `ctx.skillsInstallArgs`。preload 把 spawn 设为 `async () => 0`，并导出 `restoreBundledSkillsSpawnForTests()` 供单个测试恢复成 preload 的空操作。
- [ ] **Step 4:** 新测试通过。确认 preload 下不会执行真实 bin。

### Task 4: 接到 init

**Files:**

- Modify: `extensions/cli/src/services/init/modules.ts`（`DEFAULT_INIT_MODULES` 变为 `["memory", "skills", "notes", "projects"]`）
- Modify: `extensions/cli/src/services/init/service.ts`
- Modify: `extensions/cli/src/commands/init.ts`
- Modify: `extensions/cli/src/commands/skills/init.ts`
- Modify: `extensions/cli/src/services/skills/service.ts`（`initSkills` 把 `skillsInstallArgs` 传给 `initScope`）
- Test: `extensions/cli/test/commands/init-service.test.ts` 与 `extensions/cli/test/skills/install-bundled.test.ts` 里的 `run()` 用例

**Interfaces:**

- Consumes: Task 3 的 `installBundledSkills`、`SkillsInstallError`、`ctx.skillsInstallArgs`。
- Produces: `InitScopeOptions.skillsInstallArgs?: readonly string[]`。

**行为：**

- `initScope` 在模块循环成功结束、且 `requested` 含 `"skills"` 时调用一次 `installBundledSkills(options.skillsInstallArgs ?? [])`。`edges init notes` 不调用。
- 类型索引仍先写。安装失败不回滚已写的索引，但命令非零退出。
- `services/init/service.ts` 的 `initSkills` 仍只跑 `runTypeInit`，不安装。
- 帮助文本：`CREATED WHEN NO MODULE IS GIVEN` 段列出 skill 类型索引；`NOT CREATED HERE` 不再把 skills 算作不创建。两处帮助都写明 `--` 之后原样转交，并给出 `edges skills init -- -g -y --agent claude-code` 与 `edges init -- -y --agent '*'`。
- `edges skills init` 不声明 `--skill`、`-f`、`--force`、`--no-skills`、`--agent`。这些词作为 edges 自己的选项时由 commander 拒绝。
- 命令层捕获 `SkillsInstallError`：退出码用 `error.exitCode`，信封 reason 用 `error.message`。

- [ ] **Step 1:** 写失败测试（preload 换成记录调用的假 spawn）：
  - 无参 `edges init` 的 `modules` 为 `["memory","skills","notes","projects"]`，并写 `.harness/skills/managed/README.md` 与 `referenced`。
  - `edges init --help` 的创建段含 `skills`，`NOT CREATED HERE` 段不含 “skills init adopts”。
  - `edges skills init -- -g -y --agent claude-code` 的 spawn 参数等于 `skillsAddArgs(resolveBundledSkillsDir(), ["-g","-y","--agent","claude-code"])`。
  - `edges init a b -- x`：未知模块仍失败，且不把 `x` 当成模块名（断言失败原因是未知模块 `a` / `b`，reason 不含把 `x` 当成模块）。改为 `edges init notes projects -- x`：`modules` 是 `["notes","projects"]`，不调用安装（notes/projects 不含 skills）。再测 `edges init memory skills -- x`：`modules` 为 `["memory","skills"]`，转发只有 `["x"]`。
  - `edges init -- -y --agent *`：`modules` 是默认集，转发 `["-y","--agent","*"]`，模块列表不含 `-y`。
  - 假 spawn 返回 1：`edges skills init` 与 `edges init` 的 `exitCode` 为 1，stdout JSON `status` 为 `failed`，`reason` 非空。
  - 假 spawn 抛起不来的错误：同样非零，reason 含起不来。
  - `edges skills init --no-skills`、`edges init --no-skills`、`edges skills init --skill foo`、`edges skills init -f` 都非零，且不调用 spawn。
  - 同一 scope 连续两次 `edges skills init`：两次都 spawn（重跑即再跑一次）。managed / referenced 仍在。
- [ ] **Step 2:** 跑测试，确认新断言失败、旧的「默认集不含 skills」断言也失败。
- [ ] **Step 3:** 实现接线与帮助文本。更新 `init-service.test.ts` 里默认集与「不创建 skill 索引」的旧断言。
- [ ] **Step 4:** CLI 相关测试通过。

### Task 5: 文档、术语、ADR、任务卡

**Files:**

- Modify: `extensions/cli/README.md`、`README.md`、`extensions/README.md`、`extensions/skills/README.md`、`shared-extensions/skills/README.md`、`CONTEXT.md`、`docs/adr/0036-edges-init-installs-bundled-skills.md`、`CHANGELOG.md`（边界变化的一条）
- Modify: `extensions/skills/project-memory-init/SKILL.md`、`references/LAYOUT.md`、`references/runtime.md`、`CHANGELOG.md`（版本记为 `4.0.0`，行为变化）
- Modify: 任务卡进展记录。不移动卡片目录。
- Modify: `teaching/link-external-repo/NOTES.md` 里 `extensions/skills/learn-repo` 的路径。

**文案要点：**

- 外部用户主路径是 `edges skills init`。旗标写在 `--` 后面，例如 `edges skills init -- -g -y --agent claude-code`。不再写「外部用户走 `npx skills add VirusPC/edges/extensions/skills`」和「一律 `@latest`」作为安装主路径。作者本机 `pnpm skills:link` 保留。
- Node 要求写成 22.20.0 及以上（根 README 快速开始、CLI README）。
- `安装技能` 术语补上薄封装、`--skill '*'`、`--` 转交。
- ADR 0036 的 Status 改为已实现；Consequences 改为实现后的事实（包内 `skills/`、依赖 `skills@1.7.2`、stdio 继承、无 TTY 时由 vercel skills 自己退出）。
- `project-memory-init`：无参 `edges init` 现在包含 skills（类型索引 + 安装技能）。`edges skills init` 不只建索引。不建的仍是 user、tasks、evaluation、observation。版本记为 `4.0.0`。本计划不打 tag。
- 任务卡追加一条进展：实现了什么、PR 链接。完成标准的勾选留在 PR 正文，不在卡上改成已完成状态目录。

- [ ] **Step 1:** 改文档与 skill 正文。
- [ ] **Step 2:** `pnpm --filter @viruspc/edges test`，以及该包的 `tsc -p tsconfig.json --noEmit`。根上有 lint 脚本则跑；CLI 包本身没有 eslint 脚本时在 PR 里说明跑了什么。
- [ ] **Step 3:** 提交并推送。PR 正文链接任务卡与 ADR 0036，用 checkbox 列出完成标准，并放调用链 mermaid。

## Spec 自检

- 总原则与 Q14、Q15 覆盖 Task 3、Task 4。Q1–Q4、Q8、Q10、Q11、Q13 覆盖 Task 1、Task 2、Task 5。Q9 的失败传播覆盖 Task 3、Task 4。
- 被总原则作废的旧文（无 TTY 必须 `--agent`、edges 自己传 `-y`、版本比较、`-f`）不实现。
- 占位符：无 TBD。干净环境里让真实 agent 看到 skill 这一条明确不做，避免在无 TTY 下发明默认旗标。
