<!-- project-memory-type:start -->
name: project
module: memory
writable: true
gitignore: false
format: ordinary
<!-- project-memory-type:end -->

# PROJECT — 项目上下文

> 记：进行中的工作、关键时间点，以及无法从代码或 git 历史推导出来的决策及其原因，还有项目内的规范。
> 不记：架构、目录结构、文件路径、调试过程——这些直接读代码更准。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。相对日期换成绝对日期。
> 本文件只是索引，条目区块由脚本重算，正文写在 `projects/project_<slug>/index.md` 里。

<!-- project-entries-local:start -->
## 本层内容

- [shared-extensions 整层一份版本，不按条目发版](project_bundle_versioning/INDEX.md) — 改本目录的 skill / mcp / plugin / hook 或发版约定时：升 VERSION、写本层 CHANGELOG、打 shared-extensions@x.y.z。不要给单条扩展独立 semver，也不要把明细抄进根 changelog。只改 .memory 不升版本。
<!-- project-entries-local:end -->
