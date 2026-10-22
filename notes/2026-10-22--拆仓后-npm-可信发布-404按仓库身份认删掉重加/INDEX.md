# 拆仓后 npm 可信发布 404：按仓库身份认，删掉重加

2026-10-21，框架仓和个人仓拆开以后第一次发 `@viruspc/edges`（0.2.4）。发布流程本身走通了，到最后上传 npm 那一步报 404。这篇记下原因和处理办法。顺带记一个侧问：新包的 weekly downloads 为什么看着很多。

## 背景

- 发版链路见 [2026-10-19 的发布笔记](../2026-10-19--edges-CLI-npm-发布从手动-stage-到-GitHub-Actions/INDEX.md)：推 annotated tag，触发框架仓的 `publish-edges-cli.yml`，在 `npm-publish` 环境审批后，用 OIDC Trusted Publishing 上传，不用 npm token。
- 2026-10-20 拆仓：原来的 `VirusPC/edges` 改名为 `VirusPC/edges-brain-viruspc`（个人仓），`VirusPC/edges` 这个名字给了新建的框架仓。0.2.3 是拆仓前从原来那个仓发出去的。
- 0.2.4 是 patch，但带了 Compose 的两项不兼容改动。按语义化版本应该升 minor，用户定了照样发 patch。

## 过程

1. 发版 PR（框架仓 #25）合入后，打 tag `@viruspc/edges@0.2.4`。CI 测试通过，审批由助手按用户授权代批。最后 `Publish` 一步返回 404（没有权限）。
2. 第一个猜测是 npm 上 Trusted Publisher 填的仓库名还是旧的。用户反问「可信发布不用改吧」。核对 0.2.3 的 provenance 发现：它就是以 `VirusPC/edges` 这个名字、同一个 workflow 文件、不带 token 发出去的。也就是说，npm 上填的仓库名、workflow、environment 和现在一模一样。
3. 真正的差别在 GitHub 内部的**仓库数字 ID**。0.2.3 来自改名前的那个仓库（现在的个人仓）。新框架仓虽然叫同一个名字，ID 却是新的。合理的推断是 npm 绑定的是第一次发布时那个仓库的身份，所以名字对上了、ID 对不上，就被拒了。npm 没有直接给出原因，这一条是推断。
4. 用户在 npmjs.com 上把那条 Trusted Publisher 删掉，用同样的值重新加了一遍。页面提示配置还没验证，要在约 48 小时内（UTC 10-23 04:10 前）实际发布一次。
5. 重跑失败的 job，再批一次，0.2.4 发上 npm，dist-tag `latest` 指向 0.2.4，带 provenance。这次发布同时完成了验证。版本号和 tag 都不用改。

## 结论

- 仓库改名，或者别的仓库占用了旧名字以后，Trusted Publisher 的配置看着没变，也可能已经失效。名字一样，不代表是同一个仓库。
- 处理办法是删掉重加（填的值不变），然后在有效期内真发一次。失败的那次 run 可以直接 `gh run rerun --failed`，不用重打 tag、不用升版本号。
- 排查顺序：先看上一个成功版本的 provenance（来自哪个仓库、哪个 workflow、有没有用 token），再比较仓库 ID（`gh api repos/<owner>/<repo> --jq .id`），不要先猜名字。

## 侧记：新包 weekly downloads 为什么看着很多

- 当时 npm 显示上周 436 次，但全部集中在首发那天（10-18），之前一个月每天都是 0。按版本拆开看，每个新版本一出来都是一百多次。
- 这是典型的机器流量：npmmirror 这类镜像站、Socket 和 Snyk 这类安全扫描、依赖分析平台和爬虫，看到新包或新版本就会自动拉一遍 tarball。npm 的统计不区分人和机器。
- 下载统计要晚一两天才出。想看真实使用情况，应该看两次发版之间那些平静日子的下载数。

## 行动指南

- 拆仓、改名或转移仓库以后第一次发版：先在 npm 上删掉 Trusted Publisher 再重加，或者预期第一次会 404，到时候再重加。
- 发版回报写清楚：npm `latest` 是多少、带没带 provenance、Trusted Publisher 有没有验证。