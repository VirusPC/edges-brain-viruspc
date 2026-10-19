<!-- project-memory-type:start -->
name: feedback
module: memory
writable: true
gitignore: false
format: ordinary
<!-- project-memory-type:end -->

# FEEDBACK — 纠正与约束

> 记：用户给出的纠正、明确确认过的做法，以及必须始终生效的禁止模式和它的原因。
> 不记：读代码就能看出来的写法，以及 `AGENTS.md` 已经写过的规则。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。
> 本文件只是索引，条目区块由脚本重算，正文写在 `feedbacks/feedback_<slug>/index.md` 里。

<!-- project-entries-local:start -->
## 本层内容

- [CLI 项目放 extensions/cli，不放仓库根](feedback_cli_under_extensions/INDEX.md) — 新增或移动面向 agent 的 CLI 时：放 extensions/cli，禁止仓库根 clis/。
- [Codex 唤起 skill 用 $ 不是 /](feedback_codex_invoke_skill_with_dollar/INDEX.md) — 在 Codex 里触发某个 skill 时用 $skill-name；/ 是斜杠命令。/skills 只列清单。不要把认不到 skill 当成没装上。
- [禁止动词的 help 测例锚定命令行](feedback_help_forbid_verb_line_anchor/INDEX.md) — 写 edges tasks --help 测例、禁止某个动词出现时：用 ^\\s+verb\\b 锚定命令列表行，不要用 /\\bverb\\b/，以免 after-help 的 “There is no X command” 被当成命令。
- [接口层方案进 .memory，不进 docs](feedback_interface_plans_in_memory/INDEX.md) — 写 extensions 层调研或技术方案时：进 .memory（reference/project），禁止放 extensions/docs 或 knowledge/projects，否则 ask 检索不到。
- [不要加 edges-note shim 或根目录默认 ingest](feedback_no_edges_note_shim/INDEX.md) — 改 edges-cli 的 bin、默认命令或兼容入口时：只保留 edges；禁止 edges-note 第二 bin / shim；根目录无子命令不得跑 note ingest。
- [Restore --force 整份替换，不合并](feedback_restore_force_replaces/INDEX.md) — 改 user-memory-restore 时：--force 先丢掉 users 与 USER.md 再解压（symlink 只删链接）；成员过滤不依赖 filter=data，拒绝非普通文件。
- [审阅壳竖线只拖宽度](feedback_review_shell_dividers_resize_width/INDEX.md) — 改审阅壳三栏分隔线或拖放时打开：两条竖线只调整左右栏宽度，不搬任务、不改状态。项目拖放仍只在左栏。2026-09-24 peng cheng 澄清。
- [审阅壳筛选靠右、紧挨导出](feedback_review_shell_filters_before_export/INDEX.md) — 改审阅壳顶栏筛选或复制导出 JSON 的位置时打开：全文和优先级、负责人、状态整组靠右，紧挨在导出按钮前面。系统名不在这一栏。
- [改 skill 后必须升级 version、写 changelog、打 tag](feedback_skill_bump_version/INDEX.md) — 更新 extensions/skills 下任何一个 skill 后，升 SKILL.md version，写 CHANGELOG.md，并打 skill/\<name\>@\<version\> tag。
- [目录 stem 保留 Unicode，名字校验仍要 ASCII](<feedback_node_stem_unicode_not_ascii_names/INDEX.md>) — 改笔记、项目目录名或任务名 slug 时打开：目录 stem 保留汉字；skill、memory、task project 的名字校验仍要求小写 ASCII，不要一起放宽。
- [CLI 多子命令一文件一个动词](<feedback_cli_subcommand_files/INDEX.md>) — 新增或修改 extensions/cli 的多子命令时：父文件只注册，每个子命令一个文件，commands 层只解析参数并调 Service。
- [move 不改写软链接登记](<feedback_move_leaves_symlink_registrations/INDEX.md>) — 改 NodeService.move 或父级登记匹配时：软链接登记是指向别处的链接，不是节点本身；只迁移非软链接的那条登记，不改写、不删除、不重定向；断链是预期，交给诊断，不要在 move 里修。
- [新增文件不造新概念，名字一眼看懂](<feedback_new_files_no_new_concepts/INDEX.md>) — 在 extensions/cli 新增文件、目录或改名时打开：不引入抽象新词（如 classify.ts），文件名要一眼看出职责、符合语义；能并进已有文件就不另起。简单命名不等于降低分层质量。
- [CLI 遇到缺失的必需文件就报错，不自动补](<feedback_cli_fail_on_missing_required_files/INDEX.md>) — 改 extensions/cli 里读写节点或项目的命令时打开：约定必需的文件缺失时报错并写明路径，不自动生成文件掩盖数据问题；只有显式 create 才新建。
<!-- project-entries-local:end -->
