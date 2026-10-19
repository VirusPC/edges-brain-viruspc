# 2026-10-12 周复盘 · 用户评论

正文 `INDEX.md` 保持 10-19 核对时的样子，不再改。之后的评论和进度都记在这里。

## 2026-10-19

- 有些事今天已经做了。核对 `main` 后：[#289](https://github.com/VirusPC/edges/pull/289) 09:32、[#287](https://github.com/VirusPC/edges/pull/287)（1.5.0）09:33、[#288](https://github.com/VirusPC/edges/pull/288) 09:36 合入，修复在发版之前进了 main。「下次做什么」第 1 条只剩改正上期复盘里那句。发包也改成推 tag 由 GitHub Actions 发布（[#281](https://github.com/VirusPC/edges/pull/281)、ADR 0037），0.2.0 不用再补批准，「发包只 stage、人工批准」那条已经过时。
- html-plan：[#292](https://github.com/VirusPC/edges/pull/292) 已经把 `html-plan` skill 收进 `shared-extensions/skills/`。每一轮 grill 都用它这条，我写进了 memory，不改 `grill-with-docs`。
- doctor 报不出断掉的软链接：不用管了，不开卡，以后复盘也不再追。
- #174（CLI 和根 `.harness` 补齐 notes、edges、projects、archive）：不用马上做，可以放在 backlog。
- PR 上加 frozen install 检查：要做。在 PR 上跑和 Deploy 同样的 `pnpm install --frozen-lockfile`，lockfile 和依赖配置对不上时合入前就变红。
