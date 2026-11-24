---
status: accepted
---

# AI 资讯 routine 改为自动合并并部署，部署成功才算结束

AI 资讯这条发布管线改为自动合并并部署。一次运行结束，是指站点部署成功，并且 `latest.json` 已经指向新上线的期。只打开 PR，或者只合并了数据仓而站点还没部署，都不算结束。

这是对现有 routine 的替换决定。`.edges/routines/weekly-ai-blogs-digest/INDEX.md` 现在仍写着：结果是一个打开的数据 PR，写在 [VirusPC/ai-news-data](https://github.com/VirusPC/ai-news-data) 的 `issues/<生成日>/`，不合并。生成时刻仍是周五 09:00（Asia/Shanghai）。本决定改的是生成之后要合并并部署，不改这个时刻，也不改订阅端在 [0005](0005-subscribe-reads-published-latest-json.md) 里的查询节奏。

这样做是为了让 `latest.json` 和上线时间可预测，订阅端才能按已上线的期来查、来推。

出处：第一轮 grill，2026-11-25。用户原话：「ai资讯routine 应该改成自动合并部署，部署成功才是结束」。

## Considered Options

- 维持现状：周五只打开数据仓 PR，不合并，也不部署站点。否决：上线时间因此不固定；订阅端无法靠已上线的 `latest.json` 在可预期的时间看到新期。
- 合并数据仓即视为结束，站点部署另说。否决：站点构建读的是数据仓的 main，但数据仓合并不会触发本仓 Pages 工作流。数据已在仓库里、页面还是旧的，`latest.json` 不会指向新期。
- 把这条例外扩大成所有 PR 都可以由 Agent 自行合并。否决：见下条边界。

## Consequences

- 范围只包括 AI 资讯周报这条发布管线：数据仓 PR，以及由它带起来的站点部署。不撤销「合 PR 须经用户审，Agent 不自行 merge」（`.edges/memory/projects/project_pr_merge_needs_user_review`）。其他 PR 仍须用户当轮明确点名才合并。
- 完成标准：站点部署成功，且 `latest.json` 已指向新上线的期。只开 PR，或只合并数据仓但站点未部署，都不算结束。
- 现状仍是只开数据 PR、不合并。本仓 `.github/workflows/pages-site.yml` 在本仓 main 的相关路径有推送时构建站点，构建时读取 ai-news-data 的 main。数据仓单独合并不会部署站点。本篇说明这段现状将被替换，不改 routine 入口的运行指令，不改 CI，也不实现自动合并。
- 实现留待 html-plan 确认之后。技能版本、SKILL.md 和数据契约都不在本决定里改动。

参考：[第一轮 grill](https://edges.viruspc.tech/artifacts/d22d1d69-212d-46e8-a5b0-84cb33f456a2/)。
