# 发布收尾

整页校验通过之后才做。这一步不写读者内容，也不改 `raw/`、`cleaned/`、`summary/`。三阶段不写站点，也不另开周报 markdown。

一次运行结束，是指下面每一步都通过：相关 PR 已 squash 合并，站点部署成功，线上 [latest.json](https://viruspc.github.io/edges-brain-viruspc/ai-news/latest.json) 的 id 和 url 指向这一期，该期页面返回 200。只开 PR，或只合并了数据仓而站点还没部署，都不算结束。

任一步失败就停下，报告停在哪一步、PR 或部署链接、以及失败原因。不要换一种合并方式、再 dispatch 一次、或改核验地址来绕过。等 CI 或这一次部署跑完，是该步本身。

生成时刻仍是周五 09:00（Asia/Shanghai）。不改 `.github/workflows/pages-site.yml` 的触发条件。这条例外只覆盖这条发布管线。其他 PR 仍要用户当轮点名才合并。

## 契约

- 输入：整页校验已经通过的本期；这次运行在数据仓库为 `issues/<生成日>/` 打开的 PR；这次运行若在本仓为这一期打开了内容 PR，也算输入。
- 输出：不写新文件。通过则线上 `latest.json` 指向这一期，且该期页面返回 200。
- 生成命令：无。
- 校验器：`scripts/publish/verify_latest.py`。
- JSON Schema：无。

## 顺序

1. 整页校验没通过就停，不合并。
2. 相关数据仓 PR 必须有，并且就是这次运行为 `issues/<生成日>/` 打开的那些。没有就停。本期内容 PR 只在这次运行确实在本仓打开了才纳入，不要为了合并再新开一个。不要把这次运行之外的 PR 算进来。
3. 等这些 PR 的 CI 全绿。有失败就不能合并。
4. CI 绿后先 squash 合并数据仓 PR，再 squash 合并本期内容 PR。数据仓 main 上要先有这一期，后面的站点构建才会读到它。
5. 合并之后，确认有一次本仓 `pages-site.yml` 是在数据仓 main 已经包含这一期之后开始的。数据仓合并不会触发它。本仓 push 只有改动落在该工作流的路径过滤里才会触发。没有这样一次运行，就对 main 做一次 workflow_dispatch。
6. 等这一次部署成功。失败就停。
7. 在本 skill 目录核验线上指针：

```bash
python3 scripts/publish/verify_latest.py \
  --issue <生成日> \
  --latest https://viruspc.github.io/edges-brain-viruspc/ai-news/latest.json
```

退出码 0 才算这一期发布完成。脚本只读已经部署的站点，不用数据仓里的 JSON 代替。
