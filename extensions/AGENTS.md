# extensions



<!-- project-harness-constraints:start -->
## 本层硬约束

- 本目录有项目记忆。提问或动手前用 `$project-memory-ask`；该沉淀用 `$project-memory-remember`。本轮查过不重复。
- 本层硬约束直接写在这个区块里，不要通过记忆正文链接代替本区块的硬约束。
- 不绑定 Edges 的通用 skill / MCP 配置 / plugin / hook 不放本目录，去 `shared-extensions/`。
- 顶层 `edges` 命令能对上 harness 或领域目录时，命令名跟目录（`notes/` → `notes`，`.harness/skills` → `skills`）。硬切断，不留旧名别名。`tasks`、`memory` 已对齐则不动。不为 `evaluation` / `observation` 发明命令。
- 内容节点的 create/get/update/destroy 必须走 NodeService，不得旁路写文件（[ADR 0030](../docs/adr/0030-content-leaf-crud-via-nodeservice.md)）。
<!-- project-harness-constraints:end -->


<!-- project-harness-local:start -->
## 本层系统维护信息
- [本层 harness 材料索引](<.harness/README.md>) — 本层 harness 材料的组织清单。各材料只在这里登记。
<!-- project-harness-local:end -->

<!-- project-harness-descendants:start -->
## 下层系统维护信息
- [skills/project\-memory\-init/AGENTS.md](<skills/project-memory-init/AGENTS.md>) — project\-memory\-init 目录的项目记忆与规范入口。
<!-- project-harness-descendants:end -->
