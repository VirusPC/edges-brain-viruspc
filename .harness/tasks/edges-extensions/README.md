# Edges Extensions

个人仓主要留拆仓相关的卡（含 Compose 改造）。其余 CLI、脚手架、发布与鉴权卡在框架仓 [VirusPC/edges 的 edges-extensions 看板](https://github.com/VirusPC/edges/tree/main/.harness/tasks/edges-extensions)。

<!-- project-entries-local:start -->
## 本层内容

- [把个人大脑从\_viruspc\_edges\_系统仓拆出去](<done/2026-10-20--%E6%8A%8A%E4%B8%AA%E4%BA%BA%E5%A4%A7%E8%84%91%E4%BB%8E-VirusPCedges-%E7%B3%BB%E7%BB%9F%E4%BB%93%E6%8B%86%E5%87%BA%E5%8E%BB/INDEX.md>) — 现在系统实现和个人知识混在同一个公开仓里。拆开以后，edges 只放系统本身，个人大脑走独立仓，再用 Compose 挂回来。
- [把 edges\-private 改名为 edges\-brain\-viruspc\-private](<done/2026-10-20--%E6%8A%8A-edges-private-%E6%94%B9%E5%90%8D%E4%B8%BA-edges-brain-viruspc-private/INDEX.md>) — 公开拆仓后命名已对齐；私仓仍叫 edges\-private，改为 edges\-brain\-viruspc\-private，并改完 Compose 与文档引用。
- [Compose 底层改用 git submodule，装到 \`.harness/compose/\<name\>\`](<backlog/2026-10-20--Compose-%E5%BA%95%E5%B1%82%E6%94%B9%E7%94%A8-git-submodule%E8%A3%85%E5%88%B0-harnesscomposename/INDEX.md>) — 现在 compose 把本机绝对路径写进 AGENTS.md，换机器就不能用；改为底层用 git submodule 装到仓内 `.harness/compose/<name>`，AGENTS.md 只写相对路径，默认只展开一层。
- [把 edges\-brain\-viruspc\-private 改造成 Edges 结构](<todo/2026-10-20--%E6%8A%8A-edges-brain-viruspc-private-%E6%94%B9%E9%80%A0%E6%88%90-Edges-%E7%BB%93%E6%9E%84/INDEX.md>) — 私密仓改名后内部仍是旧 Obsidian vault，套上 .harness/ 结构，保住 vault 可用，并与公开大脑 edges\-brain\-viruspc 配对。
<!-- project-entries-local:end -->
