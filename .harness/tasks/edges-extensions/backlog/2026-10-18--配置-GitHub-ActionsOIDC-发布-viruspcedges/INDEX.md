---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-18T16:26:49.873Z'
  edges-title: 配置 GitHub Actions：OIDC 发布 @viruspc/edges
  edges-tasks-status: backlog
  edges-task-priority: none
name: 配置_github_actions_oidc_发布_viruspc_edges
description: >-
  推约定 tag 后，用 GitHub Actions 和 npm Trusted Publishing（OIDC）把 @viruspc/edges 发到
  npm，发版前经过测试和 Environment 审批。本卡只锁定 grill 已定范围，保持 backlog。
---
**背景：**
全栈开发专家刚用 grill-with-docs 敲定「@viruspc/edges 用 GitHub Actions 发 npm」。CLI 0.2.0 已人工 stage；仓库目前只有 deploy.yml，需要可重复的 Actions 发版。本卡只记 grill 锁定的实现范围，不立刻开工（保持 backlog）。
- 相关现状：0.2.0 人工 stage；发版前需要 test + Environment 审批
- 非目标：不创建 GitHub Release；不改 deploy.yml；不自动打 tag；不引入 changesets；0.2.0 仍走人工 stage，本 workflow 从下一版起用
- 关联：grill 决策来自全栈开发专家；指派任务记录员落库

**目标：**
推约定 tag 后，Actions 用 pnpm + npm Trusted Publishing（OIDC）把 @viruspc/edges 发到 npm；发版前有 test + Environment 审批。

**动作：**
- 新增 `.github/workflows/publish-edges-cli.yml`：仅 `push` tags `@viruspc/edges@*`
- 两 job：`test`（无 Env，跑 `pnpm --filter @viruspc/edges test`）→ `publish`（`needs: test`，`environment: npm-publish`，审批后再 `pnpm --filter @viruspc/edges publish --no-git-checks --access public`）
- 认证：OIDC Trusted Publishing（`id-token: write`）；setup-node 按 npm 官方示例带 registry-url；provenance 保持默认开启、不加 `--provenance`
- 门禁：tag 版本硬等于 package.json version；tag commit 必须是 origin/main 祖先；版本已在 npm 上则失败
- 文档：短 ADR 0037 + 更新 extensions/cli/README（tag 名改为 `@viruspc/edges@x.y.z`，去掉 cli@）；操作备忘含 npm Trusted Publisher 登记与 GitHub Env 创建
- 同 PR：删除硬编码 `src/utils/version.ts`，CLI 从 package.json 读版本（对齐 Vite/npm/ESLint）；相关 import/测试一起改

**完成标准：**
- [ ] 新增 `.github/workflows/publish-edges-cli.yml`：仅 `push` tags `@viruspc/edges@*`
- [ ] 两 job：`test`（无 Env，跑 `pnpm --filter @viruspc/edges test`）→ `publish`（`needs: test`，`environment: npm-publish`，审批后再 publish）
- [ ] OIDC Trusted Publishing（`id-token: write`）；setup-node 带 registry-url；provenance 默认开启、不加 `--provenance`
- [ ] tag 版本硬等于 package.json version；tag commit 是 origin/main 祖先；版本已在 npm 则失败
- [ ] 不创建 GitHub Release；不改 deploy.yml；不自动打 tag；不引入 changesets
- [ ] 短 ADR 0037 + 更新 extensions/cli/README（tag 为 `@viruspc/edges@x.y.z`）；操作备忘含 Trusted Publisher 与 GitHub Env
- [ ] 删除硬编码 `src/utils/version.ts`，从 package.json 读版本；相关 import/测试同步
- [ ] 0.2.0 仍人工 stage；本 workflow 从下一版起用
