---
name: project_tasks_persistent_board_site
description: 任务分层与全仓视图、局部维护板默认及通用延迟查询的边界和取舍；持久看板部署与 UI 既有决定。
metadata:
  edges-title: 持久 tasks 看板：分层存放、全仓汇总
  edges-type: project
  edges-origin-session-id: ed32d8b9-d356-4eb9-8822-6ad2ddc36d1c
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-10-18T05:55:15+00:00'
---

`/tasks/` 是与 teaching 同机的持久看板入口，始终反映 main：`edges tasks list --group-by project` 产出松耦合 `edges.tasks.grouped/v1`，薄映射后喂现有 `review-page`；CI 扩展 `deploy.yml`，不新开 status station。已落地（2026-09-21 实现轮）。ADR 0022 起仍是这一份壳：不窄于 Tailwind `md` 时为三栏，grouped item 可带可选 Task Doc（`doc`），不写回 git。2026-09-23 实现轮已把 `doc` 带进审阅页，并在生成 `/tasks/` 前构建审阅壳。用户所述，grill 确认于 2026-09-23；接线已验证。2026-09-24 ADR 0023：同一壳在窄于 `md` 时改为纵向长滚动，双端「移到项目…」只改页内 JSON；`/tasks/` 不另做一壳。

**Why:**
临时 Artifacts UUID+TTL 不能当固定入口。另渲状态板会再造产品。把分组 JSON 绑死在 review-page，或再开一套看板顶层 schema，会让 list 无法给别的消费者用。鉴权、写回、语义检索、tmp/persistent 统一入口已拆 backlog。窄屏若为 `/tasks/` 再做一页，会把 ADR 0021 的「同一壳」拆开。

**How to apply:**
- 改 glossary、部署链或看板入口时按 ADR 0021 / 0022 / 0023 与 CONTEXT 术语 `/tasks/` 持久看板站 / 分组列表 schema（edges.tasks.grouped） / 审阅壳 / Task Doc / Artifacts 预览服务。
- 生成前先 `pnpm install --frozen-lockfile --filter @viruspc/edges... --filter tasks-review-app...`、`pnpm --filter tasks-review-app run build`（审阅壳 gitignore，必须在盒上现编）与 `pnpm --filter @viruspc/edges run build:schemas`（`extensions/cli/dist/schemas/` gitignore；审阅页校验任务 doc 时读取，运行时不现生成），再 `pnpm --filter @viruspc/edges exec -- tsx scripts/generate-tasks-site.ts --scope "$PWD" --out "$PWD/tasks/_site/index.html"`（默认相对路径 `tasks/_site/index.html`，gitignored）。`deploy.yml` 在 `reset --hard origin/main` 之后始终这么做；失败则整次 SSH 失败。不要把 generate 绑在 artifacts env 上。
- nginx：一次性 `sudo bash extensions/cli/deploy/setup-nginx-tasks.sh`，snippet 是 `extensions/cli/deploy/nginx-tasks.conf`（装到 `/etc/nginx/snippets/edges-tasks.conf`）。Action 不跑 setup-nginx。只认 `teaching.conf` + `/teaching/`。
- review-page 仍只渲染（ADR 0012）。不要为 `/tasks/` 另做一壳。grouped item 的可选 `doc` 经薄映射进入审阅页；页只读页内 JSON。
- 顶栏字面筛选与不窄于 `md` 的三栏交互按 ADR 0022。窄于 `md` 的纵向长滚动与「移到项目…」按 ADR 0023。语义检索、写回、鉴权仍是各自 backlog。
- 不要把 publish 或 `/tasks/` 托管并进 review-page。不要用 `edges artifacts publish` 当长期入口（ADR 0013 硬边界）。
- 不要新开 workflow；`list --group-by project` 的 schema 不要命名成 review-page 专属，也不要另开看板顶层 schema。
- 不做鉴权、git 写回、`--mode`、按 project 拆 URL、tmp+persistent 统一入口。不要改看板状态。


## 全仓总览与分层存放

用户明确要求：任务可以分属不同作用域，但不能影响查看整个仓库的 tasks。

**Why:** 文件归属服务局部维护，用户的全局视图需要覆盖全部作用域；根领域板不能代表全仓任务，维护板和子作用域也不能被漏掉。

**How to apply:** 持久看板从仓库根汇总每个可发现作用域的 domain 与 maintenance 板，保留来源身份并区分同名任务。新增或迁移子层任务板时核对汇总数量及来源，保留一个全仓入口；普通局部 list 不冒充全仓结果。网站仍跟随 main，未合并分支的验证不等于线上已部署。


## 局部默认与全仓查询边界（2026-10-06 用户确认）

用户决定：普通 Task 命令默认当前作用域的维护板；分层存放仍须保留 CLI 与持久看板一致的全仓视图，全仓显式涵盖所有维护层级。

**Why:** 局部维护需要稳定归属，全仓总览不能遗漏任务或模块自身的维护工作。自动物理扫描会掩盖未登记入口；另建 Task 遍历会使它与其他节点的发现规则分叉。

**How to apply:** 2026-10-07：用户命令不再按用途分板。Skill 选 `--scope`；不传 `--super` 写 AgentsNode 指向的 `<scope>/.harness/tasks`，`--super` 写该超节点 harness 下的 `tasks/`。list 的 `--all` 从当前 `--scope` 走森林；最全是 `--scope <仓库根> --super --all`。`generate-tasks-site.ts` 不带 `--purpose`，始终汇总该根下的全部板。两者共享已登记节点树查询，并保留从目录推出的 scope/purpose/project/stem 来源身份，缺入口应诊断和显式迁移，不回退扫描。普通查询不跨节点自身 harness；全仓显式开启下层组成与独立维护关系，递归包含所有维护层级。网站部署/UI 的既有决定继续适用。

## 通用延迟查询的取舍（2026-10-06 用户确认）

采用原生 AsyncIterable 的显式延迟链，保留统一节点语义，不引入流处理库或任意遍历剪枝回调。

**Why:** 同一原语要支持 Task 与非 Task 属性和 metadata；把 filter 不匹配误作剪枝会漏掉匹配的孩子。调用方需要清楚知道何时执行、何时消耗完整范围，不能让隐式缓存掩盖后续变化。

**How to apply:** filter/map/find/groupBy/toArray/mapValues/values/thru 只构建计算，value() 才执行；重复 value() 重跑，不自动缓存。groupBy 给普通对象且继续链式；find 可接 thru，执行中提前结束并关闭上游，但上游物化边界仍先完整消费。类型条件尽早排除无关叶子加载，保留必要导航；任意 predicate 不自动剪枝，不公开 enter/shouldEnter。query 仅入口快照，目录移动/删除前 get 获取资源快照；兼容 list 保留完整资源快照，避免破坏原生命周期合同。
