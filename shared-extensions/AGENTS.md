# shared-extensions

跨机器、跨 Agent 共享的个人 harness。目录约定与收录标准看 [README.md](README.md)。



<!-- project-harness-constraints:start -->
## 本层硬约束

- 本目录有项目记忆。提问或动手前用 `$project-memory-ask`；该沉淀用 `$project-memory-remember`。本轮查过不重复。
- 本层硬约束直接写在这个区块里，不要通过记忆正文链接代替本区块的硬约束。
- 接入或操作 Edges 的能力不放本目录，去 `extensions/`。
- 凭据只用环境变量占位，禁止把 token / key / cookie 写入本目录。
- 本目录 `skills/` 与 `extensions/skills` 的 skill `name` 禁止撞车。
- 本目录整层一份版本：改 `skills/` / `mcp/` / `plugins/` / `hooks/` 或发版约定后，升 `VERSION`、写 `CHANGELOG.md`、同一 commit 打 `shared-extensions@<version>`。禁止给单条扩展另开 version 或 changelog。只改 `.harness/memory/` 不升版本。
<!-- project-harness-constraints:end -->


<!-- project-harness-local:start -->
## 本层系统维护信息
- [本层 harness 材料索引](<.harness/README.md>) — 本层 harness 材料的组织清单。各材料只在这里登记。
<!-- project-harness-local:end -->
