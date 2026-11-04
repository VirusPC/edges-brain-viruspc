本文件是总入口 skill `edges` 的模块说明，不是独立 skill。

# Edges Routines

Routine 是持续保留的例行工作定义。仓库记录是接入依据，`INDEX.md` 保存日程并引用执行用的 Skill。用 `edges routines` 维护记录；平台自己的定时任务负责触发。

## 维护记录

先明确目标 scope 与可选的已有 Project，再用当前 CLI 的 `edges routines --help` 检查参数。属于 Project 的记录在以下各条命令中均加根参数 `--project <相对路径>`；路径相对 `<scope>/.edges/projects`，子项目使用 `P/projects/Q`。

```bash
edges --scope <目录> routines init
edges --scope <目录> routines create daily-review \
  --description "每日回看并整理值得保留的内容" \
  --body '# 日复盘

- platform: 目标平台
- schedule: 每天 05:00
- timezone: Asia/Shanghai
- skill: [SKILL.md](SKILL.md)

## 读取约定

每次运行前读取来源仓库默认分支最新的本记录和引用的 Skill。
需要固定版本时，在这里明确指定 branch、tag 或 commit。
读不到记录或 Skill 时停止本次并报告，不沿用旧副本。'

edges --scope <目录> routines list
edges --scope <目录> routines get daily-review
edges --scope <目录> routines update daily-review --description "更新后的说明"
edges --scope <目录> routines delete daily-review
```

- `init` 显式采用本模块；无参 `edges init` 不默认采用 routines。选定 Project 时只采用 P 的直属材料并登记到 `P/INDEX.md`，不为 P 新建 AGENTS 或 `.edges`。
- 默认写在 `<scope>/.edges/routines/<name>/INDEX.md`，选定 Project 后写在 `P/routines/<name>/INDEX.md`。名称使用稳定的小写 kebab-case，不加日期；主题归属由全局 Project 选择负责。
- 未选 Project 时，根级 `--super` 换成当前 scope 的运行时内容入口，使用 `<scope>/routines/`；选定 Project 后，以 P 的组成入口为准。`init` 不读 `--super`。`list` 递归已登记组成，`--all` 仅额外发现所选物理范围内的独立真实系统，不用于写入。`list` 支持通用 `--filter`、`--group-by`；`--exclude routines` 排除本模块。
- `get/update/delete` 可用名称或入口路径。同名不唯一时用准确的 `INDEX.md` 路径。
- `create` 和 `update` 支持 `--body`、`--metadata key=value`。CLI 维护内容与索引，不替你提交 Git。

日程正文沿用目标平台的表达方式，cron、自然语言和其他平台格式不转换成统一 schema。例子中的日程字段不是 CLI 校验契约。模板引用的 Skill 必须由你提供；创建记录不会生成执行能力。

Skill 可以同目录，也可以链接到其他目录。`INDEX.md` 是日程的唯一真源，不再保留另一份 `schedule.md`。删除 routine 会删除所属目录，包括同目录 Skill 和附件；外置 Skill 不随之删除。

## 外部平台接入

1. 用索引或 CLI 找到目标记录，读取完整 `INDEX.md` 和它引用的 Skill。确认平台具备 Skill 所需能力；读取成功不等于能够执行。
2. 明确来源仓库、入口路径与版本。未指定版本时，使用仓库默认分支最新内容；明确指定的 branch、tag 或 commit 优先。指定版本不存在时报告错误，不退回其他版本。
3. 按日程记录配置目标平台。平台的提示词只需保存来源与读取约定，执行策略继续在 Skill 中维护。维护仓库记录本身不授权配置平台。
4. 每次触发时，平台 Agent 将所选分支或 tag 解析为本次 commit，用同一版本重新读取记录和 Skill，再执行。读取失败时停止本次并报告，不凭记忆或缓存继续。

可给平台的提示词：

```text
每次触发后，从 <来源仓库> 的 <默认分支最新内容或指定 ref> 读取
<routine INDEX.md 路径> 及其引用的 Skill，再按 Skill 执行。
读不到任一必需文件时，停止本次并报告读取失败原因。
```

变更日程后，另行更新平台触发器。使用默认分支最新内容时，Skill 的修改合入后会由下一次读取采用；使用固定版本时，需要显式更新接入版本。报告分别说明仓库记录、平台配置、实际运行的验证结果，不能把有文件当作已经定时运行。
