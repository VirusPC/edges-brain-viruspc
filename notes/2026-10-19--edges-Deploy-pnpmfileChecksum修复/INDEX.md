# 2026-10-19--edges Deploy pnpmfileChecksum 修复

> Deploy 从合入 npm 打包所需的 `.pnpmfile.cjs` 起连续失败；根因是 ECS 上 Corepack 默认落到 pnpm 9，而锁文件校验是 pnpm 10 算的。钉住根 `packageManager` 后 Deploy 恢复绿色。

## 背景

用户发现 VirusPC/edges 仓库的 GitHub Actions Deploy 连续失败，让 Coding Agent 专家查原因并修复，修好后再整理成笔记并直接合入。

## 主题

这场是在排查并修复 edges 推 main 后的 Deploy 工作流，让 ECS 上的 `pnpm install --frozen-lockfile` 能再次通过。

- 难点一：失败日志看起来像锁文件坏了，真正错位的是 ECS 上 Corepack 选用的 pnpm 主版本，和生成锁文件、发布 npm 包时用的版本不是同一条线。
- 难点二：若把锁文件改成 pnpm 9 的校验，会反过来弄坏已经在用 pnpm 10 的 Publish 工作流，不能用「改锁文件」当作默认修法。

## 过程

### 约 01:50（Asia/Shanghai）— 查清失败点

用户问为何 Deploy failing。查 Actions：main 上 Deploy 从 10 月 18 日下午起多次失败，卡在「Pull edges on ECS」。SSH 能上机、`git fetch` / `reset --hard origin/main` 成功，随后 `pnpm install --frozen-lockfile --filter @viruspc/edges... --filter tasks-review-app...` 报 `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`（`pnpmfileChecksum` 对不上）。同日更早的失败日志是同一错误。旁支信号：Corepack 提示根 `package.json` 没有 `packageManager`，将自动钉上 `pnpm@9.15.9`；服务器 checkout 里还有未跟踪旧目录 `extensions/clis/`、`extensions/cli/src/tasks/`（不是本次直接原因）。

对照仓库：根 `.pnpmfile.cjs` 与锁文件中的 `pnpmfileChecksum` 来自当日合入的 [#264](https://github.com/VirusPC/edges/pull/264)（为发布 `@viruspc/edges` 准备打包钩子）。当时向用户说明：疑似锁文件校验与安装环境不一致，并提出钉 `packageManager`、用对齐版本刷新锁文件，或在 ECS 对齐 pnpm 版本后再重跑。

### 约 01:52–01:59 — 云端修好并开 PR

用户说「修复」。派云端 Agent 在 `VirusPC/edges` 上修。结论比初判更准：锁文件上的 sha256 校验与 pnpm 10 + 当前 `.pnpmfile.cjs` 一致；Publish 工作流也用 `pnpm/action-setup` 的 pnpm 10（解析到 10.34.7）。ECS 因缺少 `packageManager`，Corepack 落到 9.15.9，9.x 对 pnpmfile 的校验算法不同，于是 frozen install 失败。Agent **没有**改锁文件或删 `.pnpmfile.cjs`，只在根 `package.json` 增加 `packageManager: pnpm@10.34.7`（含 Corepack 所需 sha512）。本地在模拟 Corepack 默认 9.15.9 且 `COREPACK_ENABLE_AUTO_PIN=1` 时，钉住后仍走 10.34.7，两条 frozen 安装退出 0；同一过滤安装在 9.15.9 上仍报 mismatch。开出草稿 [#285](https://github.com/VirusPC/edges/pull/285)。

向用户说明风险：合入后 ECS 首次可能需经 Corepack 下载 pnpm 10.34.7；若 npm 网络不顺，可在服务器执行 `corepack prepare pnpm@10.34.7 --activate`。

### 约 02:03–02:05 — 合入并验证 Deploy

用户说合并。将 #285 标为可审阅并以 squash 合入 main（`f32db9e`）。随后 Deploy [run 39152452466](https://github.com/VirusPC/edges/actions/runs/39152452466) 跑通：`Pull edges on ECS`、site-teaching、site-tasks 均成功。

### 约 02:08 — 要求记笔记并直接合并

用户说「记录 note」，随即补充「然后直接合并」。按 conversation-to-notes 整理本篇，经 edges-publish 用云端 Agent 写入 `notes/` 并合入 main。

## 结果

- Deploy 根因已定位：ECS Corepack 默认 pnpm 9 vs 锁文件 / Publish 的 pnpm 10 `pnpmfileChecksum`。
- [#285](https://github.com/VirusPC/edges/pull/285) 已合：根 `packageManager` 固定为 `pnpm@10.34.7`；锁文件与 `.pnpmfile.cjs` 未改。
- 合入后 Deploy 已绿色。
- 本笔记正在入库 `notes/2026-10-19--edges-Deploy-pnpmfileChecksum修复/INDEX.md`。

未闭环：服务器上未跟踪的旧目录 `extensions/clis/`、`extensions/cli/src/tasks/` 仍在，未在本轮清理。

## 所学

- 看到 `pnpmfileChecksum` / frozen mismatch，不要默认「锁文件坏了」；先对齐「谁生成的校验」和「谁在装」。pnpm 9 与 10 对 pnpmfile 的校验编码不同，同一文件会得到不同 checksum。
- 仓库根若不定 `packageManager`，Corepack 可能在部署机上改写 `package.json` 并落成另一主版本，本地与 CI 绿、远端 Deploy 红，属于典型漂移。
- 为 npm 打包加的 `.pnpmfile.cjs` 会把校验写进锁文件；修部署时优先钉工具链版本，避免为迁就错误 pnpm 去重写锁文件而拆坏 Publish。

## 行动指南

### 主题行动指南

#### 背景

monorepo 用 pnpm 锁文件 + 可选 `.pnpmfile.cjs`，CI / 远端主机用 Corepack 或系统 pnpm 安装；一端未钉版本时，frozen install 可能因 `pnpmfileChecksum` 失败。

#### 核心问题

部署机上的 pnpm 主版本与生成锁文件（及依赖同一锁文件的其他工作流）不一致，导致 `--frozen-lockfile` 拒绝安装。

#### 核心解决方案

1. 从失败日志确认是否为 `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` / `pnpmfileChecksum`，并记下 Corepack 是否自动钉版本。
2. 对照锁文件校验算法所对应的 pnpm 主版本，以及 Publish / 其他安装工作流声明的版本；不要先假定锁文件过期。
3. 在仓库根 `package.json` 写入与正确主版本一致的 `packageManager`（含 integrity），让 Corepack 在 CI 与远端都激活同一 pnpm。
4. 用该版本本地跑与工作流相同的 `pnpm install --frozen-lockfile`（含 filter）；通过后再合入并观察 Deploy。
5. 保留为打包所需的 `.pnpmfile.cjs`；除非确认钩子本身错误，否则不要为修 Deploy 删除它。

可选项与为何不做：把锁文件改成部署机当前旧 pnpm 的校验——不选，因为会拆坏已用新 pnpm 的 Publish；在 Deploy 脚本里改用 `--no-frozen-lockfile`——不选，会掩盖漂移、削弱可复现安装；只在服务器手改 pnpm 而不改仓库——不选，下一次干净环境或新机器仍会复发。

#### 验收标准

- [ ] 根 `package.json` 有明确的 `packageManager`，与锁文件 / Publish 所用 pnpm 主版本一致
- [ ] 该 pnpm 下 `pnpm install --frozen-lockfile`（及 Deploy 使用的 filter）退出 0
- [ ] 合入 main 后 Deploy 的 ECS pull / install 步骤成功
- [ ] `.pnpmfile.cjs` 仍在，npm 打包相关工作流未被故意破坏

### 细节与其他

#### 若 ECS 首次合入后仍卡在下载 pnpm

则在服务器上执行一次 `corepack prepare pnpm@10.34.7 --activate`（版本号以仓库 `packageManager` 为准），再重跑 Deploy。仓库拉代码若走代理，不等于 npm registry 也通。

#### 若日志里仍出现 Corepack 自动改写 package.json

则检查远端是否仍在用未含 `packageManager` 的旧 commit，或环境变量是否强制了另一套 Corepack 行为；先 `git rev-parse HEAD` 对齐 origin/main。

#### 若服务器 checkout 有大量未跟踪旧路径

则与 checksum 问题分开处理：Deploy 脚本已 `reset --hard`，未跟踪目录一般不挡 install；清理前确认不是本地未提交工作。

## 补充说明

### 原始材料引用

- 对话：Coding Agent 专家，约 2026-10-19 01:50–02:08 Asia/Shanghai（用户问 Deploy failing → 修复 → 合并 → 记笔记并直接合并）
- 引入 pnpmfile 的合入：[#264](https://github.com/VirusPC/edges/pull/264)
- 修复 PR：[#285](https://github.com/VirusPC/edges/pull/285)，squash `f32db9e`
- 验证 Deploy：[actions run 39152452466](https://github.com/VirusPC/edges/actions/runs/39152452466)
- 云端修复 Agent：https://cursor.com/agents/bc-8ae3a622-3021-5a5d-a0d4-f058ae9c906e
- 失败样例（修复前）：https://github.com/VirusPC/edges/actions/runs/39151221832

### 相关路径

- 根 `.pnpmfile.cjs`、`package.json` 的 `packageManager`、`pnpm-lock.yaml` 中的 `pnpmfileChecksum`
- Deploy 工作流步骤名：`Pull edges on ECS`
