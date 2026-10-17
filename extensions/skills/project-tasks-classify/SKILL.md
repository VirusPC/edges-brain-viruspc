---
name: project-tasks-classify
description: 对整板 Task 按用户已设的 Task Project（标题 + 描述）做归属建议（LLM / agent 判断，不要求 embedding），经 edges tasks project review-page 审阅页等人贴回导出 JSON 后再用 CLI 落地。无 GUI 时才退回 Markdown 表。不要只用 _default、不要 embedding、不要手改路径、不要当通用 edges-tasks Skill+MCP CRUD。
version: 1.3.0
---

# classifyTasks

独立工作流 Skill，不是通用 edges-tasks Skill+MCP CRUD。能力面是 CLI + Skill + MCP 三者并列：有 shell 的宿主走 `edges` CLI；本文件是工作流入口；无 shell 宿主的 generic tasks MCP 是另卡 backlog，本 Skill **不**发明 classify MCP，也 **不**手改看板路径。

## 什么时候用

- 用户要按主题整理 Task 看板：整板分类（含已有 named project，不只 `_default`）。
- 已有 Task Project 带标题与描述，要把它们当用户已设的分类质心。
- 不要用它做单条 CRUD（那是后续 generic tasks Skill/MCP）；不要要求 embedding；不要调用不存在的 `edges tasks classify`。

先确定内容所属的作用域 `SCOPE`。一般这就是主体系统，任务写在 `<SCOPE>/.harness/tasks`。主体是仓库之外的虚拟系统一时，再加 `--super`，任务写在 `<SCOPE>/tasks`。Task Project 只是该看板的分组，不决定作用域。后续命令使用 `--scope "$SCOPE"`，只有虚拟系统一才加 `--super`。仓内维护 Edges 时显式选仓根，不要依赖执行命令时的源码目录。CLI 在 `extensions/cli`。

`tasks list` 与 `tasks project list` 顺着该主体 `AGENTS.md` 的 children 做一次 traverse。要把当前 scope 下各系统都算进来再加 `--all`（森林）。最全的一次查询是 `--scope <仓库根> --super --all`。不要另写一套 README `project-entries` 扫描，也不要把 README 链接抄进 `AGENTS.md` 来凑列表。

`edges tasks` 只改文件。这些看板变更要进受保护的 `main` 时必须开 PR，不要直接 push `main`。审阅页仍只渲染；给人可达 URL 时另跑 `edges artifacts publish`，不要把发布并进 `review-page`。

## 步骤（必须按序，第 4 步要停）

1. **读已有质心。** 在仓库根：

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts --scope "$SCOPE" tasks project list
```

已 build 时把 `tsx src/index.ts` 换成 `node dist/index.js`。解析 stdout JSON：`command` 为 `project.list`，`projects[].project|title|description` 是用户已设的质心（slug + 标题 + 描述）。若 `_default` 还没有 AGENTS.md，这条命令会 bootstrap 元数据，**不会**搬 Task 文件。

2. **读整板 Task。**

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts --scope "$SCOPE" tasks list
```

对需要正文的行再 `tasks get <stem>`。必须包含所有 project，禁止 `list --project default` 当作唯一输入。

3. **按已有质心做归属建议。** 用每个 Task 的 title/description 对照每个 project 的 title/description，由 LLM / agent 判断归入已有质心、留 `default`、或建议新 slug。不要 embedding，不要向量距离，不要在本目录写 `scripts/`。

4. **渲审阅页并等待人类贴回导出 JSON。** 主路径是 `edges tasks project review-page`（只渲染，不搬 Task、不建 project）。按序：

   1. 把建议写成 UTF-8 JSON，落到 **OS 临时文件**（不要提交，不要长期放仓库）。形状是通用 `groups` + `items`：
      - `groups`：来自 `project list`（`id` = CLI id，`default` 或 kebab；`title` / `description` 来自质心）。若第 3 步建议了尚不存在的 slug，把该候选也写进 `groups`（带 title/description），否则 `review-page` 会因 `suggested` 不在 `groups[].id` 里校验失败。
      - `items`：整板每一条。`stem` 是文件名去掉 `.md` 的 CLI 查找键（不是 title，也不等于 frontmatter `name`）；`current` = `task.project`；`suggested` = 第 3 步的选择（必须是某个 `groups[].id`）；`title` / `description` / `note` 仅展示。`doc` 可选。有则是 `name`、`description`、`metadata`、`body`（Markdown，`body` 可以是 `""`）。省略 `doc` 仍然合法。贴回来的导出行仍是 `stem`、`current`、`suggested`、`action`、`note`。
   2. 渲染（`--from` 必填；省略 `--out` 则写 OS 临时 HTML；**不要** `--open` / `--mode`，命令不会打开浏览器）：

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts --scope "$SCOPE" tasks project review-page --from /tmp/suggestions.json
```

   3. 解析 stdout JSON：`status` 为 `success`，`command` 为 `project.review-page`，读出绝对路径 `path`（另有 `groupCount` / `itemCount`）。`review-page` 仍只渲染，不要把 publish 并进这条命令。
   4. 若人需要可达 URL（手机 / 另一台机器），再发布，不要假定 localhost：

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts artifacts publish <绝对 HTML 路径>
```

      若这条预览的来源是看板 Task，再加上 `--from-type task --from-id <stem> --task-project <slug>`（`from.id` 是 task stem）。没有 Task 关联就不要带 `from` 相关 flag。不要用 `--from-name` / `--task-stem`，也不要写 `--from-type skill`。解析 stdout：`command` 为 `artifacts.publish`，把 `url` 给人。告诉人用 **系统浏览器**（Chrome / Safari / Firefox）打开该 URL。手机必须用 ECS / 公开的 `EDGES_ARTIFACTS_BASE_URL`，不能给 `localhost`。未 `edges artifacts init`、或服务没起来时，说明缺口，不要手搓上传。不要用聊天 HTML 预览当闸门——Grok Bot 预览里拖拽不可靠，见 `notes/2026-09-17--Grok-Bot-HTML预览拖拽异常.md`。本步不实现审阅结果回传 Agent 客户端。
   5. **停止。** 等人在页上拖拽改组、点「复制导出 JSON」，把导出数组贴回聊天。在此之前不要 `project create` / `update --project`。

   恢复后校验贴回的审阅导出行：每行含 `stem`、`current`、`suggested`、`action`，`note` 可缺省或为空串。`action` 为 `keep`（`suggested === current`）或 `move`。页上**没有** `create-then-move`；若 `suggested` 还不在 `project list` 里，第 5 步仍可先 `project create` 再 `update --project`。校验失败就停，不要猜。

### Fallback（无 GUI）

只有宿主无法打开 HTML 时，才改输出下面这张表然后 **停止**，等人改 `suggested` / `action` / `note`：

| stem | current | suggested | action | note |
| --- | --- | --- | --- | --- |
| 2026-09-13--demo | default | cli | move | matches CLI centroid |

`current` / `suggested` 用 CLI id（`default` 或 kebab），不用 `_default`。回退表里的 `action` 可以是 `keep` | `move` | `create-then-move`。人可以改目标、留 `default`、丢掉建议、或补新 project。

5. **经 CLI 应用（禁止手改路径）。** 人贴回导出行（或改完回退表）之后：
   - 每个还不在 `project list` 里的 `suggested`（且不是 `default`）：先问人要 title 与 description，再

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts --scope "$SCOPE" tasks project create <slug> --title "<title>" --description "<description>"
```

     不要自动批量编造 description，不要一次 create 未经人确认的一串 project。
   - 再对 `suggested !== current` 的每一行：

```bash
pnpm --filter @viruspc/edges exec tsx src/index.ts --scope "$SCOPE" tasks update <stem> --project <suggested>
```

   - `keep` 或 `suggested === current`：不写盘。

## 禁止

- 不要 `edges tasks classify`（没有这个动词）。
- 不要改 `edges-tasks-status` 或 `edges-task-priority`（不要 `status`，不要 `update --priority`）。
- 不要 `mkdir` / `mv` / 手改 Task 文件 / 手改 `AGENTS.md` / 手改根 Task Projects 节。
- 不要只用 `_default` 分类；不要 embedding；不要把 Task 升成 Memory Type。
- 不要在本 skill 下写 `scripts/`。
- 不要把 npm `bin` 说成能力面的一层。能力面是 CLI + Skill + MCP。
- 不要把审阅页当分类器，也不要靠聊天 HTML 预览当拖拽闸门。

## 能力面

- **CLI：** `edges tasks project list|get|create|update|review-page` 与 `edges tasks list` / `edges tasks update --project`；可达 URL 用 `edges artifacts publish`（`review-page` 不发布）
- **Skill：** 本文件（classifyTasks）
- **MCP：** 对等入口；本轮没有 classify MCP，也没有 generic tasks MCP，也没有 review-page MCP，也没有 artifacts MCP。缺 shell 时说明 generic tasks Skill/MCP CRUD 仍在 backlog，不要假装 MCP 已能搬 Task

Whole-board classification onto user-set centroids; wait for the human-pasted review-page export (Markdown table only if HTML cannot be opened) before apply.
