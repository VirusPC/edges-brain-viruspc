---
metadata:
  edges-type: task
  edges-task-project: edges-extensions
  edges-updated-at: '2026-10-19T09:42:24.981Z'
  edges-title: artifacts 预览服务随 npm 包发布，不再绑定作者服务器
  edges-tasks-status: backlog
  edges-task-priority: none
name: artifacts_preview_server_bundled_in_npm
description: >-
  `@viruspc/edges` 现在只打包了 `dist` 和 `skills`，没有 artifacts 服务端，部署脚本和示例又都是照作者那台 ECS
  写的。把服务本体打进包里，让任何人装好 CLI 就能自己起一个预览服务。
---
**背景：**
2026-10-19 peng cheng 问 `edges artifacts publish` 是不是绑死了自己的服务器。查下来，客户端没有写死：地址和 token 都从 `EDGES_ARTIFACTS_BASE_URL`、`EDGES_ARTIFACTS_TOKEN` 读，可以来自环境变量或 `~/.config/edges/artifacts.env`，`init --base-url` 不填时默认是 `http://127.0.0.1:8787`。问题出在服务端，它只适合作者自己的环境。讨论后的结论是服务本体应该打进 npm 包，部署方式不跟着打包。
- 服务端源码在 `extensions/services/artifacts-preview/`，但 npm 包的 `files` 只有 `dist` 和 `skills`，从 npm 安装的用户拿不到。
- `edges artifacts server install` 要在仓库源码里用 pnpm 构建，用 systemd user unit 托管进程；`setup-nginx` 会把配置写进作者 ECS 上的 `/etc/nginx/conf.d/teaching.conf`，别的机器上没有这个文件。
- help 文案、`artifacts.env.example` 和部署脚本的示例里写的都是作者的域名 `edges.viruspc.tech`。
- 非目标：不改 publish、delete 的协议；不替用户配域名或 HTTPS。
- 关联：同项目 backlog「部署能力封装进 edges CLI，支持任意 scope 部署」；tasks-review-app 随包打进 `dist` 的做法（ADR 0022）。

**目标：**
只装了 `@viruspc/edges` 的人，不用 clone 仓库，也能在自己机器上起 artifacts 预览服务，并把 publish 指向它；包里和文档里不再出现作者的服务器地址。

**动作：**
- 参照 tasks-review-app，构建时把 artifacts-preview 编译好放进 `dist`，`edges artifacts server start` 直接从包里启动服务。
- systemd 和 nginx 反代改成可选，或者只写进文档，不再默认写入 `teaching.conf`。
- 示例里的 `edges.viruspc.tech` 换成占位符。

（完成标准待 grill-with-docs 补。）
