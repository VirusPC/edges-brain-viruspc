# 准备汇合校验

进入清洗之前先跑准备校验。通过才算本阶段完成，才把目录交给清洗：

```bash
python3 scripts/prepare/check/validate.py issues/<生成日>
```

在本 skill 目录执行。脚本按 [数据存储](../../SKILL.md#数据存储) 和 `schemas/raw/` 检查：必需文件要么存在且符合 schema，要么在 `raw/gaps.json` 里有一条带 `path` 和 `reason` 的缺口。空文件不算数。

三路都落盘，或在 `raw/gaps.json` 写明拿不到的原因之后，本阶段才完成。空文件不能充数。GitHub 项目榜必须在 `raw/projects/`，模型榜必须在 `raw/models/`，不能混放。

`raw/stage.json` 的 name 是 `raw`。skill 名是 `weekly-ai-blogs-digest`，`version` 用写出这份目录时的 Skill 版本。入口路径是 `skills/managed/weekly-ai-blogs-digest/references/prepare/prepare.md`。

同一期再跑准备时，覆盖 `raw/` 里对应文件。Git 保留旧提交。`cleaned/` 和 `summary/` 里引用了这次变化的条目随之失效，按依赖重做；没被引用的分支不动。

根目录有文件，不等于 `raw/` 已经汇合完成。
