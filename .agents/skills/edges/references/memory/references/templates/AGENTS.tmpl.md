# {title}

<!-- edges:start -->

<!-- edges-constraints:start -->
## 本层硬约束

- 本目录有项目记忆。提问或动手前用 `$edges-memory-ask`；该沉淀用 `$edges-memory-remember`。本轮查过不重复。
- 本层硬约束直接写在这个区块里，不要链到记忆正文文件。
<!-- git-root-constraint -->
- 本机在已有 checkout 上改本仓 tracked 内容之前，先核验 git 顶层与当前路径、`git worktree list`、当前分支和 status 基线：必须是当前任务自己的 worktree 和独立分支；多个 Agent 不得共用同一工作树写入；同一分支不得挂两个 worktree。技能安装、生成索引，以及其他会改 tracked 文件的操作，同样先核验。不满足则停写，先隔离开再写。Cursor 云端 Agent 等已在独立 clone/环境中的任务视为已隔离，不要求再套本机 worktree；只读查询可不建 worktree。全局安装写明目标目录，并确认没有写入本仓 checkout；全局安装不更新仓内 tracked 副本，仓内副本要换版时另开 PR，不在现有目录上覆盖。已有改动保留，不对未知改动执行 clean、reset 或 stash。
<!-- edges-constraints:end -->

<!-- edges-local:start -->
## 本层系统维护信息

下面这些是索引，不是正文。按条目说明挑要读的，再打开对应内容。

- [.edges/memory/users/README.md](.edges/memory/users/README.md) — 绑定本仓库、不宜公开的个人材料（个人偏好、凭据与密钥）。本机文件，不进 git。
- [.edges/memory/feedbacks/README.md](.edges/memory/feedbacks/README.md) — 用户的纠正、确认过的做法与必须遵守的禁止模式。
- [.edges/memory/projects/README.md](.edges/memory/projects/README.md) — 进行中的工作、关键时间点，无法从代码或 git 历史推导的决策，以及项目内的规范。兜底：对不上更具体类型时走这里。
- [.edges/memory/references/README.md](.edges/memory/references/README.md) — 需求文档、设计稿、接口文档、监控面板等外部资料。
- [.edges/skills/managed/README.md](.edges/skills/managed/README.md) — 从会话里沉淀出来的可复用流程，动手前先看本层有没有现成的。
- [.edges/skills/referenced/README.md](.edges/skills/referenced/README.md) — 本层 `.agents/skills/` 的原位技能或安装链接，只维护索引，不改正文。
<!-- edges-local:end -->

<!-- edges-descendants:start -->
## 下层系统维护信息

按任务目录加载对应 `AGENTS.md`。

{index_entries}
<!-- edges-descendants:end -->

<!-- edges:end -->
