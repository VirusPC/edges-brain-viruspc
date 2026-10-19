---
name: project-memory-migrate
description: 将明确指定作用域的旧 Project Memory .memory 一次性迁到 .harness/memory 和 .harness/skills；保留私有内容、技能资产、来源权限与稀疏子作用域。用于旧项目升级或 Git 升级后遗留的本机用户记忆，不迁业务目录。
version: 2.1.0
---

# Project Memory Migrate

新版 Project Memory 只读写 `.harness`；旧格式解析只在 CLI 的显式迁移服务中。本 Skill 调用 `edges memory migrate`，复用 CLI 的新布局校验器。布局契约见 [LAYOUT](../project-memory-init/references/LAYOUT.md)。

明确目标作用域后直接运行；仓库要求 worktree 时先遵守仓规。`--recursive` 包含其下实际记忆层，不创建普通目录的作用域，不跨 Git 仓库或 submodule，不沿外部安装目录链接写入。

```bash
edges memory migrate --target-dir <作用域> [--root-dir <记忆根>] [--recursive] [--dry-run]
```

不加 `--dry-run` 时，一次调用完成全范围预检、忽略规则、复制、校验和旧真源清理。`--dry-run` 只返回路径映射与诊断。`skills` → `skills/managed`、`agent_skills` → `skills/referenced`；自定义类型默认保留在 `memory/<原目录>`，显式 `module: memory|skills` 按原值保留，模块归属不由 `format` 决定。自定义类型保留身份、格式、未知元数据和显式 writable/gitignore 权限，缺失、占用官方路径或冲突时停止，不猜权限。

早期平铺布局也走这一条命令：`.memory/FEEDBACK.md`、`PROJECT.md`、`REFERENCE.md`、`USER.md` 是类型索引，根上的 `project_` / `feedback_` / `reference_` / `user_<slug>.md` 按前缀归入 `.harness/memory/<plural>/README.md` 和 `<type>_<slug>/INDEX.md`。条目里用相对路径引用的附件目录（例如 `*-evidence/`）跟那一条目一起迁。对不上这些规则的路径写入 `diagnostics`（`unclassified-legacy-path`），`--dry-run` 也会列出；正式迁移把它们挪到 `.project-memory-migration/unclassified/`，不因为其中一个文件停掉已经能归类的条目。符号链接、权限冲突和官方路径冲突仍然整次停止。这种平铺层的 `AGENTS.md` 会把旧 `project-memory` 标记改写成 `project-harness`，并去掉 `project-memory-auto`。还没安装本 skill 时直接跑上面的 CLI；`edges init` 遇到旧层会提示先执行 `edges memory migrate --dry-run`。

- JSON 返回 `ok`、`status`、`complete`、`pathMap` 和 `diagnostics`，不包含正文。冲突中止时核对指出的源/目标，不能强制覆盖来消除问题。
- 来源缺失/不可读时保留 referenced 索引与采用关系，返回 `migrated-incomplete` 和 `complete: false`；恢复来源后用 doctor 检查/刷新。迁移重跑仍报告未恢复的来源。官方索引因 Git 忽略而缺失时仅按实际本地文件重建索引并明确诊断，不推断丢失正文。
- 已有合法新公共布局时，仅接受不冲突的旧私有残留；不会重置公共文件。不同的现有用户索引也是冲突，不猜合并。历史其他用途的 `.harness` 不接管。
- 私有目录在首次复制前保留旧目录及其祖先的权限限制；已有目标更严格时不放宽。恢复校验包含源与目标目录权限，后续 chmod 同编辑一样中止恢复。旧版未记录目录权限的未完成通用日志无法安全自动恢复，需先人工核对日志与两侧目录；已完成日志的重复执行不受影响。
- 忽略后的 `.project-memory-migration/` 保存恢复日志与原始字节，目录权限 0700、日志 0600。它属于本地私有恢复材料，不提交、不展示内容。中断后以相同参数重跑；源或目标后来有编辑时停止，保留两边供人判断。验证前不删除旧正文。
- 迁移带嵌套记忆层的本地 Skill 时使用 `--recursive`，子层随所属目录搬迁。所有 owned 相对链接按原始位置解析后重定位；只修复明确指向本次已迁本地内容的安装链接，原位技能正文保持字节不变。

本 Skill 不运行全局安装，不迁 Edges 的 tasks/teaching/evaluation 等业务目录，也不代替 user-memory-backup/restore 做归档恢复。完成时报告实际状态及未闭环诊断，不能把 `complete: false` 称为完整验证通过。

### 旧版未完成日志的恢复

本次升级前的通用日志没有 `sourceDirectoryModes`，目录项也没有 `originalTargetMode` / `targetMode`；包括旧的 flat index 日志（目录映射可为空）。若仍有待执行操作，返回 `journal-directory-permissions-missing`，不会根据当前 chmod 静默补造历史权限。`phase: done` 的日志不再重放：重跑重新只读规划当前树，因此已完成迁移不受此限制。Edges 实例迁移使用独立日志，仍按其自身已记录的恢复契约处理。

1. 保留原日志、旧源和新目标，先做仅本机保存且限制访问权限的完整副本。不要删除日志或直接重跑成新任务，也不要覆盖目标；旧源可能已部分退役。
2. 在副本上逐项核对日志里的 `before`、`after`、`originalTarget` 与当前两侧文件（含缺失项、字节、模式与链接），单独保留迁移后的编辑。目录权限须由可信的迁移前备份或所有者明确确认，不能从现存源或目标反推；缺少依据时继续保留现场并请求所有者裁决。
3. 如有可信完整备份，在另一个受保护的空目录恢复经核对的迁移前作用域及权限，用新版 `--dry-run` 审阅映射，再在该恢复副本运行迁移、验证索引与内容。人工比较成功结果和原现场，逐项决定后续合入，保留所有较新编辑；这不会授权覆盖原目标或声称原现场已恢复完成。
