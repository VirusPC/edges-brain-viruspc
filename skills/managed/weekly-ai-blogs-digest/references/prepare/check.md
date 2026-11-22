# 准备汇合校验

三路都落盘，或在 `raw/gaps.json` 写明拿不到的原因之后，本阶段才完成。空文件不能充数。GitHub 项目榜必须在 `raw/projects/`，模型榜必须在 `raw/models/`，不能混放。

`raw/stage.json` 的 name 是 `raw`。规则 commit 用写出这份目录时的 40 位提交，入口路径是 `skills/managed/weekly-ai-blogs-digest/references/prepare/prepare.md`。

同一期再跑准备时，覆盖 `raw/` 里对应文件。Git 保留旧提交。`cleaned/` 和 `summary/` 里引用了这次变化的条目随之失效，按依赖重做；没被引用的分支不动。

现行脚本仍把结果写在期次根目录。根目录有文件，不等于 `raw/` 已经汇合完成。
