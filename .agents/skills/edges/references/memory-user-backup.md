本文件是总入口 skill `edges` 的模块说明，不是独立 skill。

# User Memory Backup

用户记忆不在 Git 历史中，换机或删除克隆前可用此归档带走。按明确的 scope 与可选 Project 选择一份 users 子树；默认归档落在原 scope，不必为已明确或默认位置再次询问。

```bash
edges --scope <作用域目录> memory backup [--output-dir <归档目录>]
edges --scope <作用域目录> --project <P/projects/Q> memory backup [--output-dir <归档目录>]
```

命令打包所选材料根 `memory/users/` 的普通文件，包括索引与资产，保留字节和文件权限。默认是 `<scope>/.edges/memory/users/`；选择 Project 后是 `P/memory/users/`。只备份这一份，不递归汇总其他 Project 或独立系统。`--repo-dir` 是 scope 的原有替代参数，不要拿 Project 路径代入；`--super` / `--all` 不改变归档范围。

归档内成员统一使用 `.edges/memory/users/` 前缀，不包含来源 Project 的归属；交付时同时记录来源 scope / Project，恢复时明确选择目标。归档权限为 0600，写入前建立所选 users 路径及归档的忽略规则；默认名称为 `edges-memory-user-backup-<UTC时间戳>.tar.gz`。已有同名归档拒绝覆盖，遇到符号链接、硬链接或没有可打包的文件也停止。展开后的 tar 数据（包括头部、填充与元数据）上限为 256 MiB，文件成员最多 10,000 个，与恢复限制一致；超限时不保留不完整归档。

只支持官方 user 类型，不打包其他私有自定义类型。出现 `conversion-required` 时，先在隔离的旧项目用 `@viruspc/edges@0.2.7` 转换，再备份。报告 JSON 的 archive 路径，不展示私有正文，不提交归档或用户记忆。恢复见 [用户记忆恢复](memory-user-restore.md)。备份和恢复都从 `$edges` 进入，一起看。
