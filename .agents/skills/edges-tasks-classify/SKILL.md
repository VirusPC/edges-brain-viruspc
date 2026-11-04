---
name: edges-tasks-classify
description: 按真实 Project 的主题与正文整理 Task 归属，覆盖根板和已有 Project；用 edges tasks review-page 交人审阅，收到导出 JSON 后以 tasks update --to-project/--to-default 落地。只在同一 owner scope 内移动，不手改目录，不改状态或优先级。
version: 0.2.0
---

# 按 Project 整理任务

先确定 `SCOPE` 和用户要求整理的范围。没有 Project 的任务在 `<SCOPE>/.edges/tasks/<状态>/<stem>/INDEX.md`；Project 中的任务在 `<P>/tasks/<状态>/<stem>/INDEX.md`。Project 是各模块共用的主题容器，Tasks 没有单独的 Project 模型或 `_default` 目录。

全局 `--project <路径>` 选择已有 Project，路径相对 `<SCOPE>/.edges/projects`，子项目使用 `P/projects/Q` 的实际路径。它选择来源，移动目的地另用 `--to-project` 或 `--to-default`。普通查询递归进入已登记组成；`--all` 额外发现选定物理范围内的独立系统。不要另写目录扫描，也不要把 README 链接抄进 AGENTS。

CLI 只修改文件，不执行 Git。看板变更进入受保护的 main 必须开 PR。没有 shell 时说明缺少可用执行入口，不虚构 classify MCP 或手改路径。

## 先读再建议

1. 用 `edges --scope "$SCOPE" projects list` 取得真实 Project，必要时 `projects get <path>` 读取主题正文。用户已限定 P 时，先读 P 的 INDEX，再给子 Project 的 list/get 加根参数 `--project <P路径>`；不要扩大到兄弟主题。项目身份取目录相对 `.edges/projects` 的实际路径，不用标题或自造短名。
2. 用 `edges --scope "$SCOPE" tasks list` 取得范围内任务；已选 P 时带相同 `--project <P路径>`，未选 Project 的虚拟根板加 `--super`；仅在用户需要独立系统一起参与时再加 `--all`。不要只整理未归属的任务。每行保留 `path`、`stem`、`source.scope`、`source.purpose` 和可选 `project`；不存在 `project` 表示根材料板。读取正文时选择原 owner scope 与 Project，或在该板内使用返回的完整任务路径。不能仅凭同名 stem 猜任务。
3. 用任务标题、描述与必要正文对照各 Project 主题，建议归入已有 Project或保留未归属。无需 embedding。独立 AGENTS scope 不因主题相似而合并；目的地只能是同一 owner scope 下的 Project 或根材料板。新 Project 的主题、标题与正文需要先给人确认，创建后才使用返回路径。

## 审阅后应用

1. 将建议写入本工作区规定的临时目录。审阅输入为 `{groups, items}`：
   - `groups[]` 有 `id`、`title`、`description`、`source:{scope,purpose}` 与可选 `project`。`project` 是实际相对路径；根材料板省略它。`id` 用 `JSON.stringify([source.scope,source.purpose,project ?? null])`。
   - `items[]` 有 `stem`、`id`、`source`、可选 `project`、`current`、`suggested`。`id` 用 `JSON.stringify([source.scope,source.purpose,project ?? null,stem])`。`current` 和 `suggested` 引用 `groups[].id`；当前组必须与任务真实归属一致。`title`、`description`、`note` 用于展示；可选 `doc` 为 `{name,description,metadata,body}`，body 是 Markdown。
2. 运行 `edges tasks review-page --from <建议JSON路径> --out <HTML路径>`。结果 `command` 为 `review-page`，返回 `path`、`groupCount`、`itemCount`。这一步只渲染，不移动任务。
3. 需要可达 URL 时使用 `edges artifacts publish <HTML绝对路径>`，直接采用无来源发布模式。将返回 URL 给人，使用系统浏览器审阅；不假定 localhost 可跨设备访问。
4. **停止并等待人贴回导出 JSON。** 导出行包含 `stem`、`source`、`destination`、`current`、`suggested`、`action`、`note`。有来源信息时，`current/suggested` 是 Project 相对路径或 `null`（根材料板），`destination` 是目标 owner scope/purpose。状态与优先级不在导出中。无 GUI 才改用包含同等身份信息的 Markdown 表并等待确认。
5. 对每行重新读取原任务和真实 Project，核对来源仍与审阅快照一致，`action` 与目标变化一致；冲突、歧义或目标消失时停止该行，不猜测。`keep` 不写盘。批量落地先生成可重复执行的脚本并预览冲突，所有内容移动仍交 CLI。
6. 在行对应的 owner scope 下操作。来源在 P 时加全局 `--project "$P"`；来源为虚拟根板才加 `--super`。移动到 Q：

   ```sh
   edges --scope "$OWNER_SCOPE" --project "$P" tasks update "$STEM" --to-project "$Q"
   ```

   返回该 scope 的根材料板：

   ```sh
   edges --scope "$OWNER_SCOPE" --project "$P" tasks update "$STEM" --to-default
   ```

   未归属来源省略 `--project`。两个目的地参数互斥。CLI 保留状态、优先级、stem、资源和日志；同 stem 目标冲突必须处理后再执行，不能覆盖或擅自重命名。
7. 重查列表、任务及日志路径，报告实际变更。需要进入 main 时开 PR。

不要改任务状态或优先级；不要手动 mkdir/mv、改 Task 元数据或索引；不要调用已删除的 `tasks project`，也不要发明 `tasks classify`。审阅页只收集人的选择，不承担自动分类或自动写回。
