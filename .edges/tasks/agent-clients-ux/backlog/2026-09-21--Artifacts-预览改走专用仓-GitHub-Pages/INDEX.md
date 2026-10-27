---
name: artifacts_preview_dedicated_repo_pages
description: 静态 Pages Publish 已定为脚手架可选项，与 ECS/自建动态线二选一、无运行时回退；动机是低成本接入。具体实现仍 backlog，先 grill 再写 ADR 与脚手架。
metadata:
  edges-type: task
  edges-title: Artifacts 预览改走专用仓 + GitHub Pages
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-24T17:25:56.865Z"
---

结论（idea）：静态 Pages Publish 已定为脚手架可选项，与 ECS/自建动态线在 init 时二选一（无运行时回退），用来提供低成本、低运维的静态发布。具体实现仍 backlog：先 grill，再把 2026-09-25 拍板写进 ADR 和脚手架，本卡不出栈、不指派。

**事实背景:**

已有落点（仓库里已经这样跑）：

- Artifacts 预览是 HTTP + TTL，不是静态站。ADR-0013（`docs/adr/0013-artifacts-preview-service.md`）：上传 → 难猜 UUID URL → 到期删除。写（`publish` / `rm`）要共享 token；读不鉴权，靠 UUID + TTL。默认 24h，服务端到期清理。v1 只托管静态文件，不做服务端表单存储。进程在本机和已有阿里云 ECS 上都能跑；手机审阅走 ECS 可达 URL，不假定 localhost。命令面是 `edges artifacts`（客户端 `init` 写 `~/.config/edges/artifacts.env` 里的 `EDGES_ARTIFACTS_TOKEN` 与 `EDGES_ARTIFACTS_BASE_URL`）。ECS 与 teaching 同机：nginx 反代 `/artifacts/` 与 `/health`，不动 `/teaching/`。见 `extensions/services/artifacts-preview/README.md`。
- 同机还有两份跟 main 的静态入口，生命周期和 Artifacts 不同。`/teaching/` 是教学站。`/tasks/` 是持久看板站（ADR-0021）：固定路径、无 TTL、部署链在 pull 之后生成 HTML，不是每次 `publish` 一个新 UUID，也不是按请求现算。
- 已改域名：公网入口改为 `https://edges.viruspc.tech`。下文裸 IP 是 2026-09-22 当轮记录，不是当前 BASE_URL。公网入口当时仍是裸 IP，不是域名。done 卡「teaching 与 tasks 站点挂 DNS」（`knowledge/tasks/agent-clients-ux/done/2026-09-22--teaching-与-tasks-站点挂-DNS.md`，结论 2026-09-22）：`edges.viruspc.tech` 已挂到同一台 ECS，但域名 HTTPS 不能当对外入口。Full/strict 时外网 TLS 1.2 + 域名 SNI 在阿里云入口被掐（525）；改 Flexible 后，回源 HTTP 带 `Host=edges.viruspc.tech`（以及 `teach.viruspc.tech`）会撞阿里云 Beaver「未备案 / Non-compliance ICP Filing」（403）。裸 IP、或不带这些 Host，nginx 仍 200。用户口头放弃用域名 HTTPS、Flexible 或隧道绕过。对外入口维持 `http://182.92.131.89/teaching/` 与 `http://182.92.131.89/tasks/`。DNS 记录留着，不作为入口。备案或以后 Tunnel 再议。

2026-09-21 已经讨论过、但没有拍板的心智（本卡当时因此进 backlog）：

- 教学站和 `/tasks/` 这种「跟 main 的静态结果」适合 GitHub Pages。现有 Artifacts HTTP+TTL 被当成可以换成「专用仓库 + push 触发 Actions → Pages」的对象来考虑。
- publish 心智：本地 publish = 推到 Artifacts 专用仓 → GitHub Actions → GitHub Pages 出读链接。
- 顺带用 git/仓本身做历史：版本和过往预览留在提交里，不只 TTL 即焚。

用户 2026-09-22 把这条从「可考虑」推进到「先写清代价，先不出栈」：

- 当天曾考虑出栈：用 Pages 做零服务器接入（有 GitHub 账号即可，不必自备或常开 ECS），并借默认 `github.io` 绕开上面这条自有域 HTTPS/备案死路。
- 随后暂停。没有出栈，没有改状态，没有指派。
- 再往后把取舍说死：用 Pages 不是把现在的 HTTP 服务换个托管地。整段改成「构建时算好再推」的静态站，就是放弃或弱化动态服务端能力。用户要求把这段详细写在本卡上。本轮只写卡。

**取舍（2026-09-22）:**

下面是用户当天讲明的分析，记在事实层供以后 grill 对照。不是已接受的 ADR，也不是本卡的实现范围。

若整段改成专用仓 + GitHub Pages，放弃或弱化的动态服务端能力：

- 服务端鉴权上传与共享 token 闭环。现在写接口是 `edges artifacts init` 配好的 `EDGES_ARTIFACTS_TOKEN`：`POST /artifacts`、`DELETE /artifacts/:id` 要 Bearer，浏览器打开 URL 不要登录。Pages 没有这个进程。谁能发布，变成谁能 git push 或触发 Actions；没有「拿着 token 把一页丢上去、不把整个仓的写权限交出去」这条闭环。token 轮换（`server install --force`）也一并没有。
- TTL 到期自动清理。现在到期由服务端删文件，链接自然失效。Pages 上的文件会留在站点上，直到另定保留期和 GC（例如定期删旧路径再 push，或用 Actions 清对象）。git 历史里的 blob 也不会因为 TTL 到点而消失。要「过一段时间打不开」，必须另做策略，不能沿用 ADR-0013 的到期删除。
- 真正的动态 HTTP API、按请求生成、服务端会话 / cookie。请求打到 `github.io` 时，没有本仓库的 Node 进程去鉴权、按这次请求拼页面、或记会话。ADR-0013 的 v1 已经不做服务端表单存储；换成 Pages 之后，连「以后加一个按请求的接口」这条路也没有，除非另挂一个动态宿主。
- 页内直接写回仓库而不经 git push / Actions。人在静态页上拖拽，Pages 自己不会改仓。写回仍要另做（已有 backlog「Tasks review / review-page 写回仓接口」，`knowledge/tasks/agent-clients-ux/backlog/2026-09-21--Tasks-review-review-page-写回仓接口.md`；ADR-0021 本轮明确不写回 git）。Pages 没有把这张卡做掉。
- 常驻进程能力：websocket、即时协作、服务端推送。没有一直跑着的进程，就没有这些。构建完的 HTML/JS 只能在浏览器里自己跑。
- 依赖本机或 ECS 常开服务的运维模型。现在是盒上 systemd user unit、nginx :80 反代、token 只活在盒上 `artifacts-preview.env` 和本机 `artifacts.env`，公网不暴露 8787。换成 Pages 之后，运维变成 Actions 分钟与配额、以及公开 Pages 的可见性（知道链接的人可以打开；私有仓的 Pages 可见范围另说，但不是现在这套 token + UUID + TTL）。进程挂了会 502 的模型没有了，换成的是 Actions 失败则站点不更新、以及站点内容默认公开可抓。

仍可保留、靠「构建时算好再推」的：

- 静态 HTML/CSS/JS 预览链接。默认 `*.github.io`，或 Pages 自定义域。自定义域若仍走 `viruspc.tech` 或指回大陆源站，备案问题还在（见上面 DNS 卡：`edges.viruspc.tech` 的 HTTPS/Flexible 已放弃）。默认 `github.io` 不走自有域，可以避开这条备案墙。这是 Pages 相对「给 ECS 绑自己的域名」的差别，不是相对裸 IP HTTP 的功能超集。
- git 历史即版本。过往预览留在提交里，可以查，不只 TTL 即焚。这是相对现 Artifacts 的增量，本身不是动态能力。
- CI 在 push 或 schedule 时 regenerate。和现在 `/tasks/` 跟 main 同一类：内容在构建或部署时算好再发布，不是按请求生成。教学站、看板站这种「一份跟主分支的静态结果」走得通。
- 任意用户零自有服务器接入。有 GitHub 账号即可推仓、看 Pages，不必装 ECS、不必持有 `EDGES_ARTIFACTS_TOKEN`、不必等 `viruspc.tech` 备案。这是当天想出栈的原因。

分层建议（用户讨论方向，非已拍板）：

- 静态预览，以及跟 main 的站（teaching、`/tasks/` 这种构建或 pull 之后就是一份静态 HTML）→ Pages 合适。
- 需要服务端逻辑的 Artifacts（token 上传、TTL 清理、按请求、会话、常驻推送）→ 保留 ECS / 自建，或另议 Tunnel。不要用 Pages 假装成动态服务。
- 因此不是「Pages 替换全部 Artifacts 服务」的默认结论。以后 grill 要拆哪些流量走 Pages、哪些留动态，而不是把本卡读成整段迁移已经说定。

相关但不要并进本卡：`agent-clients-ux` done「自建云服务器临时托管 artifacts」与「Artifacts预览服务部署到ECS」（临时托管已经在 ECS 上）；done「Tasks review 持久站点（始终反映 main）」与 done「teaching 与 tasks 站点挂 DNS」（持久静态站与域名结论，本卡只引用）；backlog「云端服务统一入口（tmp + persistent 部署目录）」、backlog「edges 衍生站点统一鉴权」、backlog「Tasks review / review-page 写回仓接口」、backlog「review-page 改造（三列布局 + 顶栏 filter）」。已取消的 review-page「右侧 markdown 预览 panel」和「更丰富的辅助 filter」也不并回来。

**拍板（2026-09-25）:**

用户 2026-09-25 与任务记录员讨论「GitHub 仓 + Actions 免费 Runner + Pages 做静态 Publish Artifacts」后拍板。上面 2026-09-22 的取舍仍留着，供 grill 对照。下面是当天定下来的设计，作为以后 ADR 的输入；本卡仍 backlog，脚手架还没做。

1. **与 ECS 的关系是脚手架二选一，不是运行时双写或回退。** 后续封装脚手架时让用户选 Pages 静态线，或 ECS/自建动态线；把两条线的优劣想清楚即可。动机：服务器资源与运维门槛高，希望有一种接入简单、成本低的方式。没有「Pages 失败再回退 ECS」的运行时逻辑。

   优劣（供 grill）：

   - **Pages 线优点：** 零自备服务器；依赖仓库权限即可发布；默认 `github.io` 可避开自有域备案；Actions 免费 Runner + cron 可做清单 TTL；接入成本低。
   - **Pages 线代价：** 非秒级出链（push 后等 Actions）；无共享 token 上传闭环；cron TTL 有调度延迟；仓长期不活跃时 schedule 可能暂停（已知缺陷，见第 6 条）；force 清历史有协作成本。
   - **ECS/动态线优点：** 即时 URL、token 上传、服务端真 TTL、可演进 API/会话。
   - **ECS/动态线代价：** 常驻进程与机器资源、运维与可达性门槛更高。

2. **触发是 push 触发 Actions。** 不以 `workflow_dispatch` 传包为主路径。

3. **仓可见性由用户自选。** 脚手架默认私有。

4. **脚手架 init 二选一，无运行时回退。** 与第 1 条是同一件事：选择发生在 init，运行时不双写、不回退。

5. **并发串行。** 用 Actions concurrency group，避免抢 Pages 源分支。

6. **已知缺陷，记录即可。** 仓库长期无 push 时，GitHub 可能暂停 `schedule`。TTL 清理会暂时不跑，直到再有活动或手动触发。

7. **历史与到期 GC 提供用户选择。**
   - **默认：** 从父 commit force update（force-push 重写可达历史），避免已到期 artifacts 仍出现在 commit 历史里可检出。
   - **可选：** 普通删除提交。链接 404，但 blob 仍留在 git 历史。
   - 与串行并发一起用。force 路径要在文档里写清「仅 Pages 源分支 / 需串行」。

权限模型：写权限等于仓库权限，能 push 即可 publish。读仍是 Pages 链接可见性，随仓公开或私有。

TTL 实现方向：manifest + `on.schedule` cron 清站点树；默认配合上面的历史 force update 选项。

**Why:**
零服务器、低成本接入是动机：服务器资源与运维门槛高，希望有一种依赖仓库权限即可发布、默认 `github.io` 可避开自有域备案的静态线。2026-09-25 已拍板，这条线与 ECS/自建动态线是脚手架 init 二选一，不是运行时双写，也不是 Pages 失败再回退 ECS。拍板是 ADR 的输入；实现仍 backlog，避免把「方向已定」读成「脚手架已经出栈」。

**How to apply:**
- 保持 backlog，不指派。本提交不出栈，不把状态改成 todo / in_progress。
- 事实背景里的 **拍板（2026-09-25）** 是写 ADR 的输入，不是已经落地的脚手架。恢复讨论时先 grill-with-docs，过关再写 ADR，再做脚手架。
- grill 与 ADR 沿用上面已定的输入。仍不要在 Pages 线里假装有共享 token 上传、服务端真 TTL，或 Pages 失败再回退 ECS。
- force 路径要在文档里写清仅 Pages 源分支，且与串行并发一起用。
- 自定义域不要默认当成备案解法。避开自有域的是默认 `github.io`。脚手架落地之前，现网对外入口仍是 DNS 卡上的裸 IP。
