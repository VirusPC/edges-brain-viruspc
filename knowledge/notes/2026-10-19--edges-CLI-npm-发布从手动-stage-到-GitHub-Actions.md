# 2026-10-19--edges-CLI-npm-发布：从手动-stage-到-GitHub-Actions

> `@viruspc/edges` 从本机 `npm stage` 发版，切换到 tag 触发的 GitHub Actions OIDC Trusted Publishing；并记下首发踩坑。材料合并了「全栈开发专家」与「Grok Bot」两侧对话。

## 背景

要把 CLI 包 `@viruspc/edges` 发到 npm，并且之后发版不要再依赖本机登录和手动 token。2026-10-18 先走通手动 stage 发出 0.1.0，再把正式流程落成 GitHub Actions；0.2.0 用作新流程的首发验证。

## 主题

弄清两条发版路径怎么用、何时切换，以及 Actions 首发要过哪些门。

- 难点一：同一版本号只能发一次——手动 stage 的 0.2.0 若先 approve，Actions 就会因「版本已存在」失败，Trusted Publisher 也验证不成。
- 难点二：OIDC 发版对工具链敏感——Node 22.20 自带 npm 10.9.3，Trusted Publishing 要求 npm ≥ 11.5.1；`pnpm publish` 实际上交给 PATH 上的 `npm` 上传。手动 stage 也要求更高：npm ≥ 11.15、Node ≥ 22.14。
- 难点三：annotated tag 检查在 Actions 里会误判——`actions/checkout` 会把 annotated tag「剥」成指向 commit 的本地引用，若不先 `git fetch --force` 拉回 tag 对象，检查会失败。
- 难点四：monorepo 只能经 pnpm 打包——裸 `npm pack`/`npm publish` 会把 `workspace:` 打进包；`assert-pnpm-publish.mjs` 必须看 `npm_execpath`，不能只信可被继承的 `npm_config_user_agent`。
- 难点五：stage-only token 不能直接 `npm publish`（会 404），手动路径只能 `pnpm pack` → `npm stage publish <tgz>`，再等人在 npmjs.com 用 2FA 批准。

## 过程

### 2026-10-18：准备包与 0.1.0（Grok Bot / PR #264）

拍板包名 `@viruspc/edges`、首发 `0.1.0`、审阅页打进 CLI 包；实现走 PR #264。合入前经历多次与 main 冲突（#262/#265/#267/#268/#269 等同日重构），最后合并 main 并重跑打包冒烟。CodeRabbit 指出 `assert-pnpm-publish.mjs` 的漏洞：只信 `npm_config_user_agent` 时，子进程里跑的 npm 仍可能带上 pnpm 的 user agent 而漏过守卫；改为以 `npm_execpath` 的 basename 为准，npm 可执行文件 + pnpm user agent 的组合在 prepack 直接失败。

冒烟（临时 prefix 全局安装 tgz）：manifest 为 `@viruspc/edges@0.1.0`、无 `private`、`publishConfig.access` 为 `public`、无 `workspace:`、无 `tasks-review-app` 依赖；`edges --help` / `init` / `memory remember`（以及后来的 `compose`）正常。`npm pack --dry-run` 在伪造 pnpm user agent 时仍被拦下。

npm 上确认 `viruspc` 账号存在且能发 `@viruspc` scope。真正发布与合入分开授权。

### 2026-10-18：手动 stage 发出 0.1.0（Grok Bot）

在 box 上（非用户本机）执行：

1. 版本取自 `extensions/cli/package.json`（当时 0.1.0）。
2. 在包目录 `pnpm pack`：pnpm 会改写 `workspace:`，并跑 prepack/构建。
3. `npm stage publish <tgz> --access public`，临时 userconfig（例如 `/tmp/npmrc-edges`）只写 `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`，发完删除。环境变量名 **`NPM_TOKEN`**（stage-only；直接 publish 会 404）。
4. 工具链：box 默认常是 Node 20，需 Node ≥ 22.14、npm ≥ 11.15（当时升到 11.21.1，例如 PATH 指向 `/tmp/node22`）。
5. stage 成功后拿到 stage id；npmjs.com 上约 5～15 分钟 **Validating** 自动扫描；扫描结束后必须由包 owner（peng cheng）在 Staged Packages 用 **2FA approve**（或 `npm stage approve <id> --otp`）。助手不能代批。
6. 发完从干净目录 `npm i -g @viruspc/edges@0.1.0`，跑 `edges --help`、`edges init`。

补充事实：`0.0.0-stage` 不是有意发的版本，是 npm 第一次 stage 时自动建的公开占位，可忽略。0.1.0 包体约 623 文件 / 591 kB。任务卡「edges CLI 发布成 package」随后标 done（PR #273）。

副作用观察：npm 包当时只带 dist，**不含** `extensions/skills/`，装完 CLI 后 agent 仍缺 skills——由此开出「安装 edges 后自动装好 skills」卡（后经 grill，ADR 0036）。另：GitHub 主页 / 仓库侧栏的 Packages **只显示 GitHub Packages**，发在 npmjs.com 的包不会自动出现；常见做法是 README 加 npm 徽章，而不是再双发一份到 `npm.pkg.github.com`。

### grill 与 Actions 设计锁定（全栈开发专家）

对「用 GitHub Actions 发 `@viruspc/edges`」做 grill-with-docs，结论写入 ADR 0037 与 CLI README：

- 只认推送 **annotated** tag `@viruspc/edges@x.y.z`。
- 两个 job：`test` 不挂 Environment；`publish` 依赖 test，挂 Environment `npm-publish`（Required reviewers）。
- OIDC Trusted Publishing：`id-token: write` 仅 publish；`setup-node` 带 `registry-url`；不传 NPM_TOKEN；provenance 用默认。
- 守卫：tag 版本 = package.json；tag 提交是 `origin/main` 祖先；npm 已有同版本则失败。
- 命令：`pnpm --filter @viruspc/edges publish --no-git-checks --access public`。
- 删硬编码 `version.ts`，运行时读 `package.json`。

未选：自动打 tag、changesets、GitHub Release、长效 NPM_TOKEN、三路版本校验。

### 实现与合入

PR #281：workflow + ADR 0037 + README + 删 version.ts。审阅修补：

1. **阻断**：publish 前 `npm install -g npm@^11.5.1`（OIDC 需要；与手动 stage 的「高版本 npm」同一类问题）。
2. **中等**：删掉祖先检查里的 `git fetch origin main --depth=1`（会截浅误拦）。
3. **低**：`npm view` 仅 E404 视为未发布，其它错误失败。
4. CodeRabbit：拒绝 lightweight tag——补 annotated 断言。

#281 合入（`14ff6d1f`）。任务卡 PR #280 后合。

### 一次性人工配置

- npmjs.com → Trusted Publisher：仓库 `VirusPC/edges`，workflow 文件名 **仅** `publish-edges-cli.yml`，environment `npm-publish`；**Allowed actions 勾 `npm publish`**；Publishing access 建议「Require 2FA and disallow tokens」。
- GitHub Environments → `npm-publish` + Required reviewers。

Trusted Publisher 登记后约两天内需有一次成功发布，否则过期。

### 0.2.0 首发与踩坑

版本升到 0.2.0 经 PR #278 合入。曾用手动 stage 准备同版本（stage id `7128c509-376a-40d3-b23e-0ca2a0c799f3`）；为验证 Actions，**reject** 该 stage 后推 annotated tag。

第一次 run（39148971966）在 annotated 断言失败——远程确是 annotated，checkout 剥 tag。PR #282 在断言前 `git fetch --force` 拉回 tag 对象；合入后（`5daf11bc`）删并重打同名 tag。新 run 39149375556；test 过后 publish 需 Actions 上 Approve Environment。

## 结果

- **默认路径**：升 `extensions/cli/package.json` → CHANGELOG → PR 合 main → annotated tag `@viruspc/edges@<ver>` → Actions test → 批准 `npm-publish` → OIDC `pnpm publish`。
- **应急/对照路径**：本机（或 box）`pnpm pack` → `npm stage publish` → 人 2FA approve（需 `NPM_TOKEN` + 足够新的 Node/npm）。与 Actions 争同一 semver 时必须先 reject stage。
- 文档：ADR 0037、CLI README、`.github/workflows/publish-edges-cli.yml`；守卫脚本 `assert-pnpm-publish.mjs`。
- 截至整理：#264/#278/#281/#282/#280 等已合；0.1.0 已在 npm；0.2.0 Actions 首发以当时 run / `npm view` 为准。

## 所学

- Trusted Publishing 与手动 stage 都依赖「够新的 npm CLI」，只装 Node 不够。
- Environment 卡在 job 开头 → 必须拆 test / publish。
- annotated tag：本机与 CI 表现不一致，断言前强制 fetch tag 对象。
- 版本号互斥：stage approve 与 Actions 不能抢同一号。
- pnpm 守卫要认可执行文件，不认可继承的 user agent。
- `0.0.0-stage` 是 npm 占位，不是产品版本。
- 发到 npmjs ≠ GitHub Packages 侧栏可见。
- 只发 CLI dist 不够：skills 要另设计安装路径（ADR 0036）。

## 行动指南

### 主题行动指南

#### 背景

公开包要从 CI 发版，减少本机长效凭证。

#### 核心问题

如何在人工闸门下，用 OIDC（或应急 stage）把通过测试的 main 提交发到 npm。

#### 核心解决方案

1. 只升 `extensions/cli/package.json` 的 `version` + CHANGELOG；运行时读 package.json。
2. PR 合进 `main`。
3. annotated tag：`git tag -a '@viruspc/edges@x.y.z' -m '…'` 并 push。
4. 等 `publish-edges-cli.yml`：test → Approve `npm-publish` → 升 npm ≥ 11.5.1 → `pnpm publish`。
5. 验收：`npm view @viruspc/edges version`；Trusted Publisher 仍有效。

相关可选项：只用手动 stage——适合抢救，不适合默认；NPM_TOKEN 直发——与「disallow tokens」冲突且有长效密钥；双发 GitHub Packages——维护成本高，一般 README 徽章即可。

#### 验收标准

- 符合格式的 annotated tag 触发 workflow；轻量 tag 失败。
- test 失败则不 publish；成功后等人批 Environment。
- 批准后包在 npm，无 NPM_TOKEN。
- README / ADR 与 workflow 一致；`npm pack` 仍被守卫拒绝。

### 细节与其他

#### 若走手动 stage（应急）

则：Node ≥ 22.14、npm ≥ 11.15 → `pnpm pack` → `npm stage publish <tgz> --access public`（临时 npmrc + `NPM_TOKEN`）→ 等 Validating → owner 2FA approve → 干净目录全局安装冒烟。已 stage 未处理且要改走 Actions：先 **reject**。

#### 若第一次配 Trusted Publisher

则：`VirusPC` / `edges` / `publish-edges-cli.yml` / env `npm-publish`；Allowed actions 勾 **npm publish**。约两天内成功发一次。

#### 若 annotated 检查误杀

则：确认有 `git fetch --force …refs/tags/${GITHUB_REF_NAME}…`；用 API 看 object type 是否为 `tag`。

#### 若 publish 报 ENEEDAUTH

则：查 `npm -v`、Trusted Publisher 字段是否一字不差、是否 hosted runner。备选（另决策）：`pnpm pack` 后再 `npm publish <tgz>`。

#### 若要重打尚未上 npm 的 tag

则：可删远程 tag，在含修复的 main 上重打。已上 npm 则升版本号，禁止挪同名 tag 冒充重发。

#### 若改 assert-pnpm-publish

则：以 `npm_execpath` 为准；覆盖「可执行文件是 npm、user agent 却写 pnpm」的负例。

## 补充说明

- 原始材料：助手「全栈开发专家」「Grok Bot」会话（约 2026-10-18～19，Asia/Shanghai）；PR [#264](https://github.com/VirusPC/edges/pull/264)、[#278](https://github.com/VirusPC/edges/pull/278)、[#281](https://github.com/VirusPC/edges/pull/281)、[#282](https://github.com/VirusPC/edges/pull/282)、[#280](https://github.com/VirusPC/edges/pull/280)、[#273](https://github.com/VirusPC/edges/pull/273)；ADR [0037](../../docs/adr/0037-npm-publish-via-github-actions.md)、[0036](../../docs/adr/0036-edges-init-installs-bundled-skills.md)；workflow `publish-edges-cli.yml`；Actions `39148971966` / `39149375556`。
- 包：`@viruspc/edges`；tag：`@viruspc/edges@*`；Environment：`npm-publish`。
- 官方：[Trusted publishing](https://docs.npmjs.com/trusted-publishers/)
