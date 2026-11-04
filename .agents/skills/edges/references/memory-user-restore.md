本文件是总入口 skill `edges` 的模块说明，不是独立 skill。

# User Memory Restore

与 [用户记忆备份](memory-user-backup.md) 共用 Edges CLI 的归档路径与忽略规则校验。按用户提供的归档和目标执行：

```bash
edges --scope <作用域目录> memory restore --archive <归档路径> [--force]
edges --scope <作用域目录> --project <P/projects/Q> memory restore --archive <归档路径> [--force]
```

把归档中的通用 `.edges/memory/users/` 成员恢复到所选 users 子树：默认 `<scope>/.edges/memory/users/`，有 Project 时为 `P/memory/users/`。归档不携带 Project 归属，不根据其文件名推断目的地。`--repo-dir` 仍只表示 scope；`--super` / `--all` 不扩大恢复范围。

路径穿越、绝对路径、重复成员、链接/设备成员、目标父路径中的符号链接都在覆盖前拒绝。归档以流式方式在受限临时目录中验证，最终副本在目标文件系统内准备完成后才替换；替换失败时回滚，若回滚也失败，保留受保护的恢复副本并报告路径。私有临时材料与目标的忽略规则在写入前验证；索引和正文保留归档字节与文件权限，不自动 init、登记类型入口或重写索引。恢复到新目标后若材料清单或 Project INDEX 尚无 user 链接，应报告发现入口缺口；在用户明确授权初始化或刷新时，再用同一选择执行 memory init。

已有任何正文或资产（包括不符合 `user_<slug>/INDEX.md` 命名的文件）都视为占用；只有与 CLI 携带的当前空索引模板逐字节一致的 init 索引允许直接恢复；模板不可用、人工说明、未知元数据或其他编辑都按已占用处理。`--force` 会整份替换所选 users 子树，归档中没有的旧文件也删除，符号链接仅删链接本身。若用户尚未明确授权替换，说明将被替换的目标并确认；已有授权不重复询问。

支持 `.tar.gz` 和未压缩 `.tar`，不支持其他压缩格式或嵌套压缩。归档展开后的 tar 数据（含头部、填充与元数据）上限为 256 MiB，文件成员最多 10,000 个；超过限制会拒绝恢复，原有用户记忆保留。备份命令采用同样限制。进程被强制终止或断电不属于自动回滚范围；若目标缺失，保留作用域下 `.private-user-memory-*/previous`，先核对恢复副本，不要清理它。

旧 `.memory` 归档返回 `conversion-required`，不会静默写回旧路径。转换步骤：用 `@viruspc/edges@0.2.7` 在隔离的旧项目副本中恢复并完成当时的 memory 迁移，再用当前 [用户记忆备份](memory-user-backup.md) 生成归档。不要直接解压不受信任归档。恢复按给出的归档路径读取，不根据文件名判断技能。

汇报恢复的路径，不展示私有正文，不提交回注数据或归档。
