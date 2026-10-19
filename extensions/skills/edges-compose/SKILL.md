---
name: edges-compose
description: 把外部 harness 仓库挂到当前 scope 时使用。教 AI 用 edges compose register、clone、list，以及可选的 pull、push、unregister。register 必须带 --description，写清这个仓存什么、什么时候该写进去，供后续 AI 判断。不经手 git token。
version: 0.1.0
---

# edges compose

本 skill 是 beta（`0.1.0`）。人和有 shell 的 Agent 用 [`edges` CLI](../../cli/README.md) 的 `edges compose` 把外部 harness 仓库登记进当前 scope 的 Compose 区块。这里只说明何时调用、命令怎么写。落盘在 CLI 里，不要手改 `AGENTS.md` 的组合区块。

## 什么时候用

- 用户要把另一个 harness 仓库挂到当前工作目录，让 Agent 开场就能看到它的入口。
- 用户要 clone、列出、更新、推送或取消一条已经登记的组合仓库。
- 不要用它写笔记、建任务或改项目记忆。那些走各自的 skill。

## 硬规则

1. **`compose register` 必须带 `--description`。** 不传，或只传空白，命令以校验错误退出（退出码 2，`errorCode` 为 `VALIDATION_ERROR`），不会写入 Compose 区块。说明要写清两件事：这个仓存什么，以及什么情况下该往它写。后续 AI 靠这段文字决定该不该写进去，不要写成空话。
2. **命令以 CLI 为准。** 用 `--scope`（或已设置的 `EDGES_SCOPE`）、`--name`、`--remote`、`--path`、`--description`。没有列在下面的旗标不要猜。`--path` 可选；不传时检出目录是 `~/.edges/composed/<name>`。
3. **不经手 token。** 不要让用户把 token、密码、cookie、私钥贴进对话。`clone`、`pull`、`push` 需要 git 鉴权时，让用户在自己的终端完成（例如 `gh auth login`），不要代跑带凭证的命令，也不要读取或复述凭证。
4. **只在用户要求时 push。** `push` 会在检出目录执行该仓库自己的 `git push`。用户没要求发布时不要 push。

## 常见流程

先登记，再 clone，然后 list 确认：

```bash
edges --scope <目录> compose register \
  --name brain \
  --remote https://github.com/example/brain.git \
  --description "个人大脑：只在记跨项目判断时写入"
edges --scope <目录> compose clone --name brain
edges --scope <目录> compose list
```

检出要放在指定目录时加上 `--path`：

```bash
edges --scope <目录> compose register \
  --name brain \
  --path ../brain \
  --remote https://github.com/example/brain.git \
  --description "个人大脑：只在记跨项目判断时写入"
```

可选：

```bash
edges --scope <目录> compose pull --name brain
edges --scope <目录> compose push --name brain
edges --scope <目录> compose unregister --name brain
```

`unregister` 只从 Compose 区块去掉这一条，不删除已经 clone 的目录。`clone` / `pull` / `push` 的 `--name` 只处理一条；不传则处理全部已登记条目。`clone` 发现目录已经是同一 origin 的检出时保持不动。

stdout 只有 JSON。失败时读 `reason`。退出码 `2` 是用法或校验错误。
