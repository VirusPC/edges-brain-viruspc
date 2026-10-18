# Project Memory runtime

可执行入口为 `edges memory`，实现位于 Edges CLI 的 TypeScript service。Skill 保留工作流与内容规范；不再通过同级 Skill 路径查找 Python 脚本。

- `init`：标准命令是 `edges init`，只编排公共系统入口和各模块自己的 init。无参时写出 `AGENTS.md`、feedback / project / reference、skills 的 managed / referenced，以及 `.harness/notes/README.md` 与 `.harness/projects/README.md`，并安装包内 skill；不建 user、tasks，也不读 `--super`。`edges memory init` 只采用 memory 类型，未选择时 `selectionRequired` 且不写盘，不创建 notes、projects、skills、tasks 的文件。`edges skills init` 采用 skill 类型并安装包内 skill；`--` 之后的 token 原样转交安装器。agent 调用含 skills 的 init 时带上 `-- -g -y`，避免没有 TTY、又没探测到 agent 时安装器退出 1。`edges tasks init` 只建任务看板。类型入口写 `.harness/<module>/<plural>/README.md`（`project-entries-*`），memory 与 skills 都一样；不在类型目录上创建 `AGENTS.md`。空的同目录类型桩删掉。不在作用域根自动创建内容面组织清单 `README.md`；重复调用只刷新本模块已采用的类型，包含 skills 时会再安装一次。层系统入口仍是 `AGENTS.md`。
- `remember`：写入条目并刷新其类型索引和层入口。
- `add-type`：登记自定义格式与权限；不会隐式初始化作用域。
- `doctor`：诊断作用域和索引，只有 `--apply` 写修复。
- `migrate`：显式将旧 .memory 转为 .harness，保留冲突检测与恢复日志。
- `backup` / `restore`：归档与恢复私有用户记忆，恢复覆盖仍需明确授权。

使用 `edges --scope <目录> memory <命令> --help` 查看契约。模板真源位于本 Skill 的 references/templates；CLI 构建产物自带模板，安装后的命令不依赖相邻 Skill 目录。源码环境与构建后环境共用同一套模板内容。

运行时测试位于 `extensions/cli/test/memory/`，覆盖真实临时目录上的选择式初始化、写入与索引、来源权限、私有规则、检查修复和迁移归档。不使用真实用户记忆作为测试数据。
