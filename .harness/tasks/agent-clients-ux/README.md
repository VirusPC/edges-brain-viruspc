# Agent Clients UX

客户端/插件/外设与本地 UX 实验。

<!-- project-entries-local:start -->
## 本层内容

- [评估Agent\-Plugins客户端支持](<backlog/2026-09-09--%E8%AF%84%E4%BC%B0Agent-Plugins%E5%AE%A2%E6%88%B7%E7%AB%AF%E6%94%AF%E6%8C%81/INDEX.md>) — 评估给哪些 agent 客户端提供 / 补齐 Agent Plugins 支持更合适
- [需要普通记笔记skill](<backlog/2026-09-09--%E9%9C%80%E8%A6%81%E6%99%AE%E9%80%9A%E8%AE%B0%E7%AC%94%E8%AE%B0skill/INDEX.md>) — 除 conversation\-to\-notes 外，还需要一个面向日常记事的普通笔记 skill
- [data\_view\_separation\_local\_html](<backlog/2026-09-11--%E6%95%B0%E6%8D%AE%E4%B8%8E%E8%A7%86%E5%9B%BE%E5%88%86%E7%A6%BB%E6%9C%AC%E5%9C%B0HTML/INDEX.md>) — 从复杂系统角度，可能需要数据与视图分离，并提供本地 HTML
- [local\_memory\_visualization\_ui](<backlog/2026-09-11--%E6%9C%AC%E5%9C%B0memory%E5%8F%AF%E8%A7%86%E5%8C%96%E7%95%8C%E9%9D%A2/INDEX.md>) — 提供本地 memory 可视化界面；可能在 init 时本地一并初始化
- [input\_system\_rokid\_glasses](<backlog/2026-09-11--%E8%BE%93%E5%85%A5%E7%B3%BB%E7%BB%9F%E6%8E%A5%E5%85%A5Rokid%E7%9C%BC%E9%95%9C/INDEX.md>) — 输入系统接入 Rokid 眼镜
- [count\_personal\_skill\_usage](<backlog/2026-09-13--%E7%BB%9F%E8%AE%A1%E4%B8%AA%E4%BA%BAskill%E4%BD%BF%E7%94%A8%E9%A2%91%E7%8E%87/INDEX.md>) — 统计个人 skill 使用频率并收集数据
- [review\_page\_result\_callback\_to\_agent\_client](<backlog/2026-09-19--review%E9%A1%B5%E7%BB%93%E6%9E%9C%E5%9B%9E%E4%BC%A0Agent%E5%AE%A2%E6%88%B7%E7%AB%AF/INDEX.md>) — 审阅页结果直接回传 Agent 客户端（替代/补强 Copy JSON 贴回聊天）；勿并入临时静态托管
- [electron\_edges](<backlog/2026-09-20--Electron-%E6%A1%8C%E9%9D%A2%E7%AB%AF%E4%BD%9C%E4%B8%BA-edges-%E6%93%8D%E4%BD%9C%E5%8F%B0/INDEX.md>) — 缺少统一的桌面操作台来操作 edges（看板/记忆/审阅等仍散落在聊天与临时 HTML）；用 Electron 做桌面客户端，作为 edges 的操作台。
- [artifacts\_preview\_dedicated\_repo\_pages](<backlog/2026-09-21--Artifacts-%E9%A2%84%E8%A7%88%E6%94%B9%E8%B5%B0%E4%B8%93%E7%94%A8%E4%BB%93-GitHub-Pages/INDEX.md>) — 静态 Pages Publish 已定为脚手架可选项，与 ECS/自建动态线二选一、无运行时回退；动机是低成本接入。具体实现仍 backlog，先 grill 再写 ADR 与脚手架。
- [tasks\_review\_review\_page\_writeback](<backlog/2026-09-21--Tasks-review-review-page-%E5%86%99%E5%9B%9E%E4%BB%93%E6%8E%A5%E5%8F%A3/INDEX.md>) — 本轮 /tasks/ 持久站只读于 git，人在页上改完无法写回仓库；需要通用 review\-page 写回仓接口，并一并想清拖拽是否与 classify 审阅页分模式。
- [edges\_site\_unified\_agent\_assistant](<backlog/2026-09-21--edges-%E7%AB%99%E7%82%B9%E7%BB%9F%E4%B8%80-agent-%E5%8A%A9%E6%89%8B%E6%A8%A1%E5%9D%97/INDEX.md>) — teaching、/tasks/ 等衍生站缺少统一的站内 agent 助手能力；后续要给整个 edges 站点提供可复用的 agent 助手模块。
- [edges\_derived\_sites\_unified\_auth](<backlog/2026-09-21--edges-%E8%A1%8D%E7%94%9F%E7%AB%99%E7%82%B9%E7%BB%9F%E4%B8%80%E9%89%B4%E6%9D%83/INDEX.md>) — teaching、/tasks/ 与未来同机衍生站各管各的访问控制会重复且不一致；需要一套统一鉴权，本轮持久 Tasks 站先公开只读，鉴权后做。
- [cloud\_service\_unified\_entry](<backlog/2026-09-21--%E4%BA%91%E7%AB%AF%E6%9C%8D%E5%8A%A1%E7%BB%9F%E4%B8%80%E5%85%A5%E5%8F%A3tmp-persistent-%E9%83%A8%E7%BD%B2%E7%9B%AE%E5%BD%95/INDEX.md>) — 系统绑定的云端托管现在路径心智分散；需要提供 tmp 与 persistent 两个部署目录作为统一入口——短生命周期对标 Artifacts UUID\+TTL，持久固定路径对标 teaching 与规划中的 /tasks/。
- [tasks\_review\_semantic\_search](<backlog/2026-09-23--Tasks%E5%AE%A1%E9%98%85%E9%A1%B5-tasks%E7%AB%99%E7%82%B9%E8%AF%AD%E4%B9%89%E6%A3%80%E7%B4%A2/INDEX.md>) — 字面搜索不够用；在 Tasks 审阅页（含 /tasks/）顶栏或同页入口支持按标题/正文/描述做语义检索，需另开索引与嵌入方案。
- [tasks\_review\_shell\_deploy\_branch\_gha\_preview](<backlog/2026-09-24--Tasks-%E5%AE%A1%E9%98%85%E5%A3%B3-deploy-%E5%88%86%E6%94%AF-GitHub-Actions-%E9%A2%84%E8%A7%88%E9%83%A8%E7%BD%B2/INDEX.md>) — deploy 分支 \+ GHA 预览 \+ beta 域名；合 main/ECS 前可看效果；宿主与现有 deploy 关系待 grill
- [cross\_agent\_client\_messaging](<backlog/2026-09-25--%E8%B7%A8Agent%E5%AE%A2%E6%88%B7%E7%AB%AF%E9%80%9A%E4%BF%A1%E5%B1%82/INDEX.md>) — 共享记忆与工作区不够；跨不同 Agent 客户端还要独立通信层。现用 GitHub 仓当通道会强制绑工作区且延迟高，需另开方案。
- [artifacts\_html](<backlog/2026-09-27--Artifacts-%E6%94%AF%E6%8C%81%E5%A4%9A%E7%A7%8D%E9%A2%84%E8%A7%88%E7%B1%BB%E5%9E%8B%E4%B8%8D%E6%AD%A2-HTML/INDEX.md>) — Artifacts 预览仍偏直接发布 HTML，Markdown 打开几乎是裸文本。先摸清主流 agent desktop 的 artifact 类型与预览，再按类型做成可读预览。
- [review\_page\_markdown\_preview\_panel](<cancelled/2026-09-21--review-page-%E5%8F%B3%E4%BE%A7%E5%A2%9E%E5%8A%A0-markdown-%E9%A2%84%E8%A7%88-panel/INDEX.md>) — review\-page 现在主要靠拖拽分组，缺右侧 markdown 预览；需要在右侧加 panel 预览当前选中 Task 的正文，方便边看边改归属。
- [review\_page\_filter](<cancelled/2026-09-21--review-page-%E5%A2%9E%E5%8A%A0%E6%9B%B4%E4%B8%B0%E5%AF%8C%E7%9A%84%E8%BE%85%E5%8A%A9-filter/INDEX.md>) — review\-page 现有筛选偏基础，复杂看板不好收窄；需要更丰富的辅助 filter（如状态/优先级/指派/关键词等组合），方便审阅时定位。
- [self\_hosted\_temp\_artifact\_hosting](<done/2026-09-18--%E8%87%AA%E5%BB%BA%E4%BA%91%E6%9C%8D%E5%8A%A1%E5%99%A8%E4%B8%B4%E6%97%B6%E6%89%98%E7%AE%A1artifacts/INDEX.md>) — 提供稳定的 artifacts 预览服务（短生命周期托管 \+ 真浏览器 URL）；绕开聊天内嵌 HTML 预览。
- [artifacts\_preview\_deploy\_ecs](<done/2026-09-21--Artifacts%E9%A2%84%E8%A7%88%E6%9C%8D%E5%8A%A1%E9%83%A8%E7%BD%B2%E5%88%B0ECS/INDEX.md>) — ADR\-0013 服务\+CLI 已合但 publish 只上传不部署；要把同一套 edges\-artifacts\-preview 挂到现有 teach 同机阿里云 ECS，经 nginx 对外提供 /artifacts 与 /health。
- [tasks\_review\_persistent\_site](<done/2026-09-21--Tasks-review-%E6%8C%81%E4%B9%85%E7%AB%99%E7%82%B9%E5%A7%8B%E7%BB%88%E5%8F%8D%E6%98%A0-main/INDEX.md>) — 临时 artifacts URL 会过期且每次 publish 新 UUID；需要像 teaching 一样有一个持久部署的 Tasks review/状态站，始终反映 main 上的看板。
- [review\_page\_redesign](<done/2026-09-21--review-page-%E6%94%B9%E9%80%A0%E4%B8%89%E5%88%97%E5%B8%83%E5%B1%80-%E9%A1%B6%E6%A0%8F-filter/INDEX.md>) — 现有 review\-page 不够用；改造成顶栏 filter \+ 左 project / 中看板 / 右 markdown 预览三列，中间看板参考 Linear 风格状态列；可复用开源看板组件。
- [ecs\_cloudflare\_tunnel\_teaching\_tasks\_artifacts](<done/2026-09-22--ECS-%E4%B8%8A-Cloudflare-Tunnel-%E5%AF%B9%E5%A4%96teachingtasksartifacts/INDEX.md>) — 域名直连阿里云因未备案 Beaver \+ TLS1.2\+SNI 不可用；采用 ECS \+ Cloudflare Tunnel 作为当前最简单对外方案，用域名 HTTPS 进站并保留动态服务。
- [github\_deployments\_show\_tasks\_entry](<done/2026-09-22--GitHub-Deployments-%E5%B1%95%E7%A4%BA-tasks-%E5%85%A5%E5%8F%A3/INDEX.md>) — production Deployments 原先只显示 /teaching/。PR \#113 合入后 workflow Deploy（.github/workflows/deploy.yml）成功时并行登记 site\-teaching 与 site\-tasks，入口为 https://edges.viruspc.tech/teaching/ 与 https://edges.viruspc.tech/tasks/。2026\-09\-22 确认收尾。
- [teaching\_tasks\_dns](<done/2026-09-22--teaching-%E4%B8%8E-tasks-%E7%AB%99%E7%82%B9%E6%8C%82-DNS/INDEX.md>) — DNS 已挂 edges.viruspc.tech，域名 HTTPS/Flexible 因未备案不可用；2026\-09\-22 稍后改口采用 ECS\+Tunnel，此前「放弃隧道」作废为对外策略。本卡保持 done。
- [tasks\_review\_shell\_mobile\_narrow](<done/2026-09-24--Tasks-%E5%AE%A1%E9%98%85%E5%A3%B3%E6%89%8B%E6%9C%BA-%E7%AA%84%E5%B1%8F%E9%80%82%E9%85%8D/INDEX.md>) — \#126 三列桌面可用；390×844 横向溢出。2026\-09\-24 grill 已锁窄屏纵向长滚动与双端「移到项目…」，见 ADR 0023
- [minigtr\_codex\_cli\_remote\_control](<done/2026-09-25--minigtr-%E9%AA%8C%E8%AF%81-Codex-CLI-remote-control/INDEX.md>) — 结论：minigtr Ubuntu 上 Codex CLI remote\-control 可用手机 ChatGPT 配对（codex\-cli 0.157.0；需先 device\-auth 登录）。
- [github\_artifacts\_preview](<backlog/2026-10-19--Github-Artifacts-Preview/INDEX.md>) — 用 GitHub Pages 提供常开预览 URL，替代依赖自建服务端的 Artifacts Publish；浏览器看页，Grok 里继续决策。候选含 CF Pages 直传与 Tunnel+Nginx。
<!-- project-entries-local:end -->
