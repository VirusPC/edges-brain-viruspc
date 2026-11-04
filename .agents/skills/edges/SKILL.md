---
name: edges
description: >-
  Edges 日常模块的总入口。要做这些事时加载本 skill，再打开 references 里对应的一份：
  把外部 harness 仓库挂到当前 scope（edges compose add、list、update；add 必须带 --description；不经手 git token）；
  把一条 Note 入库（有 shell 用 edges notes，没有 shell 用 new-note MCP；只写本地叶子，不要自己跑 git）；
  用 edges routines 创建、查询、更新或删除例程定义，或让外部平台 Agent 按仓库记录接入（记录日程并引用 Skill，触发和执行由平台负责）；
  对用户选定的目录初始化或刷新系统入口 AGENTS.md（仅当用户明确要求 init；标准命令是 edges init；各域 init 只初始化本模块）；
  将 .edges/memory/users 的本机私有记忆打成归档，或从归档恢复（换机、删仓；目标已占用时须明确授权 --force 整份替换）。
  检索项目记忆用 edges-memory-ask，沉淀用 edges-memory-remember，新增 Memory Type 用 edges-memory-add-type。
  第一次接入用 edges-onboarding。整理对话用 edges-conversation-to-notes 或 edges-conversation-to-tasks。
  整板 Task 按已有 Project 归类用 edges-tasks-classify。
  把会话接到 Langfuse 用 edges-langfuse-agent-tracing。
version: 0.3.0
---

# edges

人和有 shell 的 Agent 共用 `edges` CLI。本 skill 说明何时调用、命令长什么样。落盘在 CLI 的 NodeService 里。能力面是 CLI、Skill、MCP 三者并列。

## 通用形状

能对上这五个动词时，用同一套写法。`<module>` 是 `notes`、`routines`、`tasks`、`skills`、`projects` 这类领域命令。

```bash
edges --scope <目录> <module> list
edges --scope <目录> <module> get <目标>
edges --scope <目录> <module> create ...
edges --scope <目录> <module> update <目标> ...
edges --scope <目录> <module> delete <目标>
edges --scope <目录> --project <Project相对路径> <module> create ...
```

- stdout 只有 JSON。诊断在 stderr。只解析 stdout。
- 退出码：`0` 成功，`1` 运行失败，`2` 用法或校验失败。
- 先定 `--scope`（或已设置的 `EDGES_SCOPE`），再按内容归属选择已有 Project。`--project` 是相对 `<scope>/.edges/projects` 的实际目录路径，例如 `P` 或 `P/projects/Q`；它不创建 Project，也不改变 scope。不要手改节点文件，不要绕开 CLI 写内容叶子。
- 目录材料默认归入 `<scope>/.edges/`；选定 Project 后归入 `P/<module>/`，登记在 `P/INDEX.md`。创建、检索和后续读写保持同一选择，使用 CLI 返回的路径；不要把 scope 改成 `.edges` 或 P 来模拟归属。
- Notes、Projects、Tasks、Memory、Skills、Routines 的 `list --super` 换成当前 scope 的运行时 Super 入口，挂载 scope 直属材料并递归展开登记组成。选定 Project 时，以该 Project 的组成入口和材料根为准，优先于 `--super`。旧根目录材料不会自动搬迁。
- Notes、Projects、Tasks、Skills、Routines 的内容写入支持 `--super` 选择 `<scope>/<module>/`。Memory 的 remember/get/delete、类型管理和私有归档按 scope / Project 选择材料，不用 `--super` 切换位置；init 也按 scope / Project 初始化。
- `--all` 只用于读取，额外发现所选 scope 或 Project 目录下的独立真实系统；它不是开启组成递归，也不为每个系统自动加 Super。检索扩大范围后，写入仍须按结果的真实 owner scope 与 Project 定位，不携带 `--all`。Compose 的登记与更新规则另见对应 reference；Artifacts 不因 `--project` 改变上传或发布归属。
- 具体旗标以 `edges <module> --help` 为准。下面没写的旗标不要猜。
- 已经有专门命令的写入不要再套 create / update。例如 `memory create` 与 `memory update` 会失败并指向 `edges memory remember`。

对不上这五个动词的模块，整份差异在 `references/`，不要硬套。

## 先选模块

| 要做的事 | 读 |
| --- | --- |
| 挂外部 harness 仓库 | [compose.md](references/compose.md) |
| 入库一条 Note | [notes.md](references/notes.md) |
| 例程定义，或让平台按记录接入 | [routines.md](references/routines.md) |
| 初始化或刷新系统入口 | [memory-init.md](references/memory-init.md) |
| 备份本机用户记忆 | [memory-user-backup.md](references/memory-user-backup.md) |
| 恢复本机用户记忆 | [memory-user-restore.md](references/memory-user-restore.md) |

记忆协议、布局和模板在 [references/memory/](references/memory/AGENTS.md)：[`PROTOCOL.md`](references/memory/references/PROTOCOL.md)、[`LAYOUT.md`](references/memory/references/LAYOUT.md)。

## 不要用本 skill 的时候

- 动手前检索记忆：`edges-memory-ask`
- 把结论写进项目记忆：`edges-memory-remember`
- 用户明确要求新增 Memory Type：`edges-memory-add-type`
- 第一次安装、初始化一台机器或一个仓库：`edges-onboarding`
- 把对话整理成笔记或任务：`edges-conversation-to-notes`、`edges-conversation-to-tasks`
- 整板 Task 按已有 Project 归类：`edges-tasks-classify`
- 把会话接到 Langfuse：`edges-langfuse-agent-tracing`
