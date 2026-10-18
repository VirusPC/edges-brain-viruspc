# 2026-10-19--edges-CLI-npm-发布：从手动-stage-到-GitHub-Actions

> `@viruspc/edges` 从本机/box 上的 `npm stage` 发版，切换到 tag 触发的 GitHub Actions OIDC Trusted Publishing。材料合并了「全栈开发专家」与「Grok Bot」两侧在 2026-10-18～19（Asia/Shanghai）的对话与实现。

## 背景

目标有两层：

1. **第一次真正把 CLI 发到公共 npm**，让人可以用 `npm i -g @viruspc/edges` 装到机器上跑，而不是只在 monorepo 里 `pnpm` 调。
2. **把发版从「有人登录 box + 贴 token + 等人 2FA」变成「推 tag → CI 测 → 人在 GitHub Environment 点一下 → OIDC 发」**，尽量不要长效 NPM_TOKEN。

2026-10-18 先用手动 stage 发出 **0.1.0**（PR #264 合入后发布）。同日稍后拍板 GitHub Actions；**0.2.0**（版本 bump PR #278）用来验证新流水线。两套路径会抢同一 semver，所以 0.2.0 的手动 stage 最终被 reject，改走 Actions。Actions 首发时 0.2.0 仍被 npm 记为「曾 staged」，直发报 E409，最终以 **0.2.1**（PR #284）成功上 npm。

## 主题

弄清两条发版路径怎么用、何时切换，以及 Actions 首发要过哪些门；并把「包准备」（#264）和「怎么推上 registry」分开记，因为后者又分 stage 与 OIDC。

- 难点一：**版本号互斥**——同一 `x.y.z` 只能成功进 registry 一次。手动 stage 若先 approve，Actions 会在「已存在」守卫上失败，Trusted Publisher 也验证不成。
- 难点二：**工具链版本**——手动 stage 要 Node ≥ 22.14、npm ≥ 11.15；OIDC Trusted Publishing 要 npm ≥ 11.5.1。GitHub 上 Node 22.20 自带 npm **10.9.3**，不够；`pnpm publish` 上传仍走 PATH 上的 `npm`。
- 难点三：**annotated tag 在 CI 里会「剥皮」**——`actions/checkout` 常把 annotated tag 落成指向 commit 的本地引用，`git cat-file -t` 变成 `commit`，误杀真 annotated tag。
- 难点四：**monorepo 只能经 pnpm 打进 registry 形态**——裸 `npm pack`/`npm publish` 会留下 `workspace:`；`assert-pnpm-publish.mjs` 必须以 `npm_execpath` 为准。
- 难点五：**stage-only token 不能直发**——直接 `npm publish` 会 404；手动路径必须 `pnpm pack` → `npm stage publish <tgz>`，再等人在 npmjs.com 用 2FA 批准。
- 难点六：**「发了 npm」≠「GitHub 主页有 Packages」**——侧栏只认 GitHub Packages；npmjs 包要靠 README 徽章露出。
- 难点七：**只发 CLI dist 不够**——0.1.0 不含 `extensions/skills/`，装完 CLI agent 仍缺 skills（另开 ADR 0036 / 任务卡）。
- 难点八：**Environment 名必须字节级一致**——workflow 写 `npm-publish`、GitHub 里若误建成 `npm-publush`，GitHub 会**自动新建一个无门禁的空 Environment**，publish 不卡审批直接跑；人以为「我没批」，其实门没挂上。
- 难点九：**reject 掉的 stage 仍占住该 semver**——`Cannot publish over previously staged version "0.2.0"`（E409）。OIDC 与 provenance 都可能已成功，仍须 **bump 版本**（本例改发 0.2.1）。
- 难点十：**GitHub 手机 App 审批入口不在运行页**——运行页只有 Cancel；待审批在 **Inbox 通知**（需开启 “Requests to approve a deployment”）。浏览器桌面站运行页才有黄色 Review deployments。

## 过程

### 拍板：包名、首发版本、合入与发布解耦

- 包名：`@viruspc/edges`（scope 对应用户 npm 账号/组织 `viruspc`；当时已确认账号存在，名下有别的包，`@viruspc/edges` 未被占用）。
- 首发版本：`0.1.0`。
- 审阅页（tasks-review 构建产物）打进 CLI 安装包；`tasks-review-app` 本身不作为独立 npm 包发布。
- **合入 PR ≠ 授权 publish**：#264 合进 main 后，再单独授权真实发 registry。

### PR #264：把仓里的 CLI「准备成可发布的包」

改动大致包括：包名/版本、`publishConfig.access: public`、`files`/`bin`、prepack 构建、`assert-pnpm-publish.mjs` 守卫、文档等。合入前与同日大量 CLI 重构 PR（#262、#265、#267、#268、#269…）多次冲突，策略是：**平时不跟着每次 main 解冲突，说要合时再一次性 merge main + 重跑打包冒烟**。

#### CodeRabbit 与守卫脚本

最初守卫容易只信 `npm_config_user_agent`。问题在于该变量会被子进程继承：在 pnpm 跑的脚本里再调 `npm pack`/`npm publish`，user agent 仍可能显示 pnpm，守卫误放行，tarball 里就可能残留 `workspace:*`（例如 `tasks-review-app`）。

修好的规则（要点）：

- 以 **`npm_execpath` 的 basename** 判断真正是谁在跑。
- 若可执行文件是 npm（含路径里带 `pnpm` 目录但实际是 `npm-cli.js` 的情况），而 user agent 以 `pnpm/` 开头 → **prepack 直接 exit 1**，并提示改用 `pnpm --filter @viruspc/edges pack|publish`。
- 负例测试：环境里塞 `npm_config_user_agent=pnpm/…` 再 `npm pack --dry-run`，必须在构建前失败。

#### 0.1.0 打包冒烟清单（合入前反复跑过）

在干净临时前缀安装 `viruspc-edges-0.1.0.tgz` 后检查：

| 检查项 | 期望 |
| --- | --- |
| manifest name/version | `@viruspc/edges@0.1.0` |
| `private` | 不存在 |
| `publishConfig.access` | `public` |
| 依赖里 | 无 `workspace:`，无 `tasks-review-app` |
| `edges --help` | 命令树正常（含后来合入的 `compose` 等） |
| `edges init` | `"status":"success"`，能建 `.harness/memory` 等 |
| `edges memory remember` | `"ok": true`，写出记忆叶子 |
| 用 npm 打包（伪造 pnpm UA） | prepack 拒绝，exit ≠ 0 |

包体量级（0.1.0）：约 **623 个文件 / 591 kB**（以当时冒烟为准）。

### 手动 stage 发出 0.1.0（Grok Bot，box）

环境：共享 box（Linux），不是用户笔记本。token 存在 bot 的 secret，变量名 **`NPM_TOKEN`**（stage-only）。

#### 推荐命令序列（复述当时做法）

1. 确认 `extensions/cli/package.json` 的 `version` 已是要发的号，且已在 main。
2. 确保 Node ≥ 22.14、npm ≥ 11.15（box 默认常是 Node 20；当时下 Node 22.14 到 `/tmp/node22`，npm 升到 **11.21.1**，`PATH=/tmp/node22/bin:$PATH`）。
3. 在仓库根或包上下文：`pnpm --filter @viruspc/edges pack`（或进入 `extensions/cli` 再 `pnpm pack`）。pnpm 会改写 workspace 协议并跑 prepack/构建。
4. 写临时 npmrc（发完即删），例如只含：
   `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`
5. `npm stage publish <打出来的.tgz> --access public --userconfig <临时npmrc>`
6. 记下返回的 **stage id**。
7. 打开 npmjs.com → 包 → **Staged Packages**：先等约 **5～15 分钟** 的 **Validating** 自动扫描；结束后由 **包 owner 用 2FA 点 Approve**（或 `npm stage approve <id> --otp`）。助手不能代批。
8. 在**不会被删掉的目录**冒烟：`npm i -g @viruspc/edges@0.1.0`，再 `edges --help`、`edges init`。

#### 手动路径特有坑

- **不要**对仓内源码直接 `npm publish`/`npm pack`：守卫会拦；即便绕过，workspace 协议也会坏包。
- stage-only token **直发 404**，所以正式「人批 2FA」的路径就是 stage，不是 `pnpm publish` 到 latest（后者留给后来的 OIDC）。
- **`0.0.0-stage`**：npm 第一次 stage 时自动建的公开占位版本，不是产品版本，不必当正式发版管理。
- 临时 npmrc 用完删除，避免 token 落盘残留。

发布成功后：任务卡「edges CLI 发布成 package」标 done（PR #273）；并开出「安装 edges 后自动装好 skills」后续卡。

### 侧记：GitHub 主页为什么看不到 npm 包

GitHub 个人页 / 仓库侧栏 **Packages** 只列出发布到 **GitHub Packages**（`npm.pkg.github.com`）的包。发到 **npmjs.com** 的 `@viruspc/edges` 不会自动出现。可选：README 加 npm 版本徽章（推荐）；或再双发 GitHub Packages（每次发两处，一般不值得）。

### grill → Actions 设计（全栈开发专家）

对「推 tag 用 GitHub Actions 发 npm」做 grill-with-docs，结论进 **ADR 0037** + CLI README「发布到 npm」小节。锁定项：

| 项 | 决定 |
| --- | --- |
| 触发 | 仅 push tag，模式 `@viruspc/edges@*` |
| tag 形态 | **annotated**（`git tag -a`）；轻量 tag 失败 |
| job | `test`（无 Environment）→ `publish`（`needs: test` + `environment: npm-publish`） |
| 鉴权 | OIDC Trusted Publishing；`id-token: write` 只给 publish；`setup-node` 带 `registry-url: https://registry.npmjs.org`；无 NPM_TOKEN |
| provenance | 不显式传 flag，用 Actions 默认 |
| 版本守卫 | tag 上的版本 == `extensions/cli/package.json` 的 version（不再做三路校验） |
| 祖先守卫 | tag 提交须是 `origin/main` 祖先；`fetch-depth: 0`；**不要**再 `git fetch origin main --depth=1`（会截浅误拦） |
| 已发布守卫 | `npm view`；仅 **E404** 视为未发布，其它错误失败 |
| 发布命令 | `pnpm --filter @viruspc/edges publish --no-git-checks --access public` |
| Node | `22.20`；publish 前 `npm install -g npm@^11.5.1` |
| pnpm | `pnpm/action-setup` 钉 major **10**（根 package.json 无 `packageManager` 字段时必须给版本；lockfile 9.0 兼容） |
| 版本源码 | 删除 `src/utils/version.ts`；`program`/`notes`/`projects` 用 `createRequire` 读 package.json |
| 不选 | 自动打 tag、changesets、建 GitHub Release、改 `deploy.yml`、长效 NPM_TOKEN |

任务卡落在 `edges-extensions`（原 `edges-cli-platform` 已更名），经 PR #280 等入库；状态变更走任务记录员惯例。

### PR #281 / #282：流水线落地与首次失败修复

#281 合入 main（合并提交 `14ff6d1f`）：新增 `.github/workflows/publish-edges-cli.yml`、ADR 0037、README、删 version.ts。合入前自审 + CodeRabbit 对齐上述守卫与 npm 升级步骤。

**0.2.0 第一次推 tag**（指向 #281 合并提交）→ run [39148971966](https://github.com/VirusPC/edges/actions/runs/39148971966)：`Assert tag is annotated` 失败。GitHub API 上该 tag object type 已是 `tag`（annotated），失败原因是 checkout 剥皮。

#282 修复：断言前增加

`git fetch --force origin "refs/tags/${GITHUB_REF_NAME}:refs/tags/${GITHUB_REF_NAME}"`

合入（`5daf11bc`）后：**删除远程同名 tag → 在新 main 上重打 annotated → 再 push**（因 0.2.0 尚未进 npm，允许挪 tag；若已发布则只能升版本号）。

新 run [39149375556](https://github.com/VirusPC/edges/actions/runs/39149375556)：test 通过后 publish 进入 Environment 审批 / 执行。

### 一次性人工配置（合 #281 后、推首发 tag 前）

**GitHub**

1. Settings → Environments → New：`npm-publish`（文件名级精确匹配）。
2. Required reviewers：包维护者（peng cheng）。

**npmjs.com → `@viruspc/edges` → Trusted publishing**

| 字段 | 值 |
| --- | --- |
| Organization or user | `VirusPC` |
| Repository | `edges` |
| Workflow filename | `publish-edges-cli.yml`（只要文件名，不要 `/.github/workflows/`） |
| Environment | `npm-publish` |
| Allowed actions | 勾 **`npm publish`**（直接发；不要只勾 stage——流水线不是 `npm stage publish`） |
| Publishing access | 建议 **Require two-factor authentication and disallow tokens** |

登记后约 **两天内** 要有一次成功 publish，否则 Trusted Publisher 配置过期需重登。

### 0.2.0：与手动 stage 的交叉

在 Actions 就绪前，全栈侧曾按 Grok Bot 教的流程 stage 过 0.2.0（stage id `7128c509-376a-40d3-b23e-0ca2a0c799f3`）。为验证 OIDC，用户 **reject** 该 stage 后再推 tag。若当时 approve，registry 已有 0.2.0，workflow 会故意失败——但即便 reject，后面仍会撞上「曾 staged」的 E409（见下）。

### 首发踩坑时间线（0.2.0 → 0.2.1，Asia/Shanghai 约 2026-10-19 01:00～02:10）

1. **Environment 拼写错误**：某次配置写成 `npm-publush`。run 不出现 Waiting，助手误报「你已批」；用户说「我没有审批呀」。纠正为精确名 `npm-publish` 并设 Required reviewers 后，才真正卡门。
2. **Trusted Publisher 未对齐时的 E404**：publish 日志对 registry 的 PUT 报 E404（与「包不存在」不同语境）。核对 npm 页字段：仓库 `VirusPC/edges`、workflow 文件名 `publish-edges-cli.yml`、Environment `npm-publish`、Allowed actions 含 **npm publish**（及可选 npm stage publish）。用户截图显示 Pending validation（约须在 Oct 20 2026 5:36 PM UTC / 上海次日凌晨前完成一次成功 publish）。
3. **OIDC 已通仍 E409**：重跑后 provenance 已签名并写入透明日志（例：`https://search.sigstore.dev/?logIndex=3314541766`），最终 `409 Conflict - Cannot publish over previously staged version "0.2.0"`。reject 不能腾出版本号。
4. **改发 0.2.1**：PR [#284](https://github.com/VirusPC/edges/pull/284) bump `package.json`、CHANGELOG 注明跳过 0.2.0、README 示例、任务卡进度日志（状态未改）。合入 `0e7cceb5` 后打 annotated tag `@viruspc/edges@0.2.1` 并推送。
5. **审批入口**：用户在手机 App 运行页找不到 Review。查证：[GitHub Mobile 自 2021-04 支持部署审批](https://github.blog/changelog/2021-04-01-reviewing-deployments-on-github-mobile/)，入口在 **Inbox 通知**，不在运行页步骤列表。也可用浏览器打开 run 页，或 `gh api .../pending_deployments` 批准（仅在用户明确要求时代批）。
6. **0.2.1 成功**：run [39151340074](https://github.com/VirusPC/edges/actions/runs/39151340074) test + publish 均 success；日志 `+ @viruspc/edges@0.2.1`，并提示 *Your package is being processed and may take a few minutes*。约一两分钟后 `npm view` 的 `latest` 变为 `0.2.1`。

## 结果

| 项 | 状态（整理时） |
| --- | --- |
| 0.1.0 | 已在 npm（手动 stage + 人批）；任务卡 done |
| 0.2.0 | **未**进 npm：曾 staged 后 reject，Actions 直发 E409；版本号作废 |
| 0.2.1 | 已在 npm（Actions OIDC，run 39151340074）；`dist-tags.latest` = `0.2.1` |
| 默认发版路径 | Actions + OIDC（ADR 0037） |
| 应急路径 | 手动 `pnpm pack` + `npm stage publish` + 2FA |
| #281 / #282 / #280 / #278 / #264 / #284 | 已合 main |
| 本笔记 | PR #283（补完首发踩坑后合入） |
| skills 随安装 | 另案（ADR 0036），不在本笔记展开实现细节 |

## 所学

- **「发版」拆成两段**：仓内准备成合法 npm 包（#264）≠ 推上 registry（stage 或 OIDC）。
- **两种 registry 门禁都偏「新 npm」**：stage 与 Trusted Publishing 都不能拿 Node 自带老 npm 凑合。
- **pnpm 是打包权威，npm 是上传/OIDC 客户端**：prepack 守卫防 npm 打包；OIDC 又要求升级 npm 再让 pnpm 去调它。
- **Environment 挂在 job 开头**：要先测后人批，必须两 job。
- **annotated tag 本地绿、CI 红**：先 force-fetch tag 对象再断言。
- **semver 是全局锁**：stage 与 Actions、两次 tag，都不要抢同一号。
- **`0.0.0-stage` 噪音**：当占位，不当产品版本。
- **可见性**：用户问「GitHub 主页怎么没 package」时先解释 Packages 源，再决定徽章还是双发。
- **产品缺口**：CLI 上 npm ≠ skills 开箱可用。
- **拼错 Environment = 假「已批」**：名字不一致时 GitHub 静默建空环境，门禁失效；以 run 是否出现 Waiting / `pending_deployments` 为准，不要靠「我点过没」。
- **reject ≠ 释放版本号**：曾 staged 的 `x.y.z` 不能再 `npm publish` 同号；唯一干净出路是 bump。
- **OIDC 成功 ≠ 包已可装**：日志里 provenance / `+ pkg@version` 之后，registry 可能还要处理一两分钟再 `npm view` 可见。
- **手机审批在 Inbox**：运行页没有 Approve；别让用户在步骤列表里空找。

## 行动指南

### 主题行动指南

#### 背景

要把 `@viruspc/edges` 可持续、可审计地发到公共 npm，并减少 box 上的长效 token。

#### 核心问题

在「必须有人点头」的前提下，用哪条流水线把 **已在 main 上的确定版本** 变成 registry 上的不可变版本。

#### 核心解决方案（默认：Actions）

1. 只改 `extensions/cli/package.json` 的 `version` + `CHANGELOG.md`（及必要说明）；不要再写死 `version.ts`。
2. PR 合进 `main`（保护分支，禁止直推）。
3. 在发版提交上打 annotated tag 并推送：
   `git tag -a '@viruspc/edges@x.y.z' -m 'Release @viruspc/edges@x.y.z'`
   `git push origin 'refs/tags/@viruspc/edges@x.y.z'`
4. 打开 Actions：`Publish @viruspc/edges` → 等 test 绿 → publish 变 Waiting → **审批 `npm-publish`**：桌面浏览器在 run 页点 Review deployments；手机 App 去 **Inbox** 里的部署审批通知（运行页通常只有 Cancel）。
5. 验收：`npm view @viruspc/edges version`；干净环境 `npm i -g @viruspc/edges@x.y.z` 后跑 `--help` / `init`（按版本能力加测）。

相关可选项：继续纯手动 stage——适合抢救或 Trusted Publisher 挂掉时；长期默认成本高（token、Node 升级、2FA 扫描等待）。双发 GitHub Packages——侧栏好看，维护翻倍，通常不做。

#### 验收标准

- 轻量 tag 在 test 失败；annotated + 版本一致 + main 祖先才继续。
- test 红则 publish 不跑；绿则卡在 Environment 直到人批。
- 批准后包出现在 npmjs，workflow 日志无 NPM_TOKEN。
- `npm pack` 在 CLI 目录仍被守卫拒绝；`pnpm pack` 成功且 manifest 无 `workspace:`。
- README / ADR 0037 与 workflow 一致。

### 细节与其他

#### 若 Environment 配完仍不出现 Waiting

则：立刻核对 workflow 里的 `environment:` 字符串与 Settings → Environments 的**显示名**是否完全一致（含拼写）。不一致时 GitHub 会建一个无 Required reviewers 的同名/错名环境，publish 直接跑。用 `gh api repos/VirusPC/edges/actions/runs/<id>/pending_deployments` 看是否真有待批项。

#### 若 publish 报 E409 previously staged version

则：该版本号已废，**bump package.json**（如 0.2.0 → 0.2.1），合 PR，打新 annotated tag；不要指望 reject stage 或挪旧 tag 复活同号。CHANGELOG 写明跳过原因。

#### 若手机 App 运行页找不到审批

则：去 Inbox 找部署审批通知；或开桌面站点的 run URL。助手仅在用户明确说「你来批」时用 `gh api .../pending_deployments` 代批。

#### 若走手动 stage（应急）

则：升 Node/npm → `pnpm pack` → 临时 npmrc + `NPM_TOKEN` → `npm stage publish <tgz> --access public` → 等 Validating → owner 2FA approve → 全局安装冒烟。已有未处理 stage 且改走 Actions：先 **reject**。不要对已在 registry 的版本再 stage。

#### 若第一次配 Trusted Publisher / Environment

则：按上文表格一字不差填写；Allowed actions 勾 **npm publish**；Publishing access 建议禁 token。两天内推 tag 完成首发。

#### 若 annotated 检查再误杀

则：确认 `git fetch --force` 仍在断言前；用  
`gh api repos/VirusPC/edges/git/ref/tags/<urlencode>`  
看 object type 是否为 `tag`。不要为过检查而接受 lightweight。

#### 若 publish 报 ENEEDAUTH / OIDC 失败

则：查 runner `npm -v` ≥ 11.5.1；Trusted Publisher 的 workflow 文件名、environment、仓库大小写；是否 GitHub-hosted runner。仍失败时备选（需另决策）：`pnpm pack` 后对 tgz `npm publish --access public`（prepack 仍由 pnpm 执行）。网上有「pnpm 10.33 + npm 11 仍失败」与「同样配置成功」两种报告，以当场日志为准。

#### 若要重打尚未上 npm 的 tag

则：删远程 tag，在含修复的 commit 上重打 annotated 再推。已上 npm：**禁止**同名挪 tag 冒充重发，应 bump version。

#### 若改 assert-pnpm-publish

则：锁 `npm_execpath`；保留「npm 可执行 + pnpm UA」负例；不要重新信任单独的 user agent。

#### 若用户问 GitHub 为何不显示包

则：解释 Packages 源；优先 README 徽章；双发 GitHub Packages 列为可选且说明双倍发版成本。

#### 若发完发现缺 skills

则：不要指望单靠 npm 包里的 dist；跟 ADR 0036 / `edges init`（或当时文档写明的入口）装 bundled skills。

## 对照表

| | 手动 stage（0.1.0 实证） | Actions OIDC（0.2.1 起默认；0.2.0 作废） |
| --- | --- | --- |
| 谁构建 | 本机/box 上 pnpm | Actions `test`/`publish` job |
| 谁上传 | `npm stage publish` | `pnpm publish` → npm（OIDC） |
| 人闸门 | npmjs 2FA approve | GitHub Environment `npm-publish` |
| 密钥 | `NPM_TOKEN`（stage-only） | 无长效 token |
| Node/npm | ≥22.14 / ≥11.15 | Node 22.20 + 升 npm ≥11.5.1 |
| 触发 | 人手跑命令 | push annotated tag |
| 适合 | 抢救、首次摸路 | 日常发版 |

## 补充说明

- **原始材料**：助手「全栈开发专家」「Grok Bot」会话（约 2026-10-18～19，Asia/Shanghai）；PR [#264](https://github.com/VirusPC/edges/pull/264)、[#273](https://github.com/VirusPC/edges/pull/273)、[#278](https://github.com/VirusPC/edges/pull/278)、[#280](https://github.com/VirusPC/edges/pull/280)、[#281](https://github.com/VirusPC/edges/pull/281)、[#282](https://github.com/VirusPC/edges/pull/282)、[#283](https://github.com/VirusPC/edges/pull/283)（本笔记）、[#284](https://github.com/VirusPC/edges/pull/284)（bump 0.2.1）；ADR [0037](../../docs/adr/0037-npm-publish-via-github-actions.md)、[0036](../../docs/adr/0036-edges-init-installs-bundled-skills.md)；workflow `.github/workflows/publish-edges-cli.yml`；守卫 `extensions/cli/scripts/assert-pnpm-publish.mjs`；Actions runs [39148971966](https://github.com/VirusPC/edges/actions/runs/39148971966)（annotated 剥皮失败）、[39149375556](https://github.com/VirusPC/edges/actions/runs/39149375556)（OIDC 通后 E409）、[39151340074](https://github.com/VirusPC/edges/actions/runs/39151340074)（0.2.1 成功）。
- **标识**：包 `@viruspc/edges`；tag `@viruspc/edges@*`；Environment `npm-publish`（勿拼成 `npm-publush`）；workflow 文件名 `publish-edges-cli.yml`。
- **官方文档**：[Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/)；[Reviewing deployments on GitHub Mobile](https://github.blog/changelog/2021-04-01-reviewing-deployments-on-github-mobile/)
- **本笔记 PR**：[#283](https://github.com/VirusPC/edges/pull/283)
