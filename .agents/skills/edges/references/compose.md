本文件是总入口 skill `edges` 的模块说明，不是独立 skill。

# edges compose

本 skill 是 beta（`0.3.0`）。人和有 shell 的 Agent 用 [`edges` CLI](../../../cli/README.md) 的 `edges compose` 把外部 harness 仓库登记进当前 scope 的 `.edges/compose/README.md`。这里只说明何时调用、命令怎么写。登记走 CLI，不要自己跑 `git submodule add` 再手写区块。

底层是 git submodule：被组合的仓库默认装在当前仓库里的 `.edges/compose/<name>`。区块里的链接相对于 `.edges/compose/`，缺省是 `<name>/README.md`。换一台机器 clone 主仓库后跑一次 `edges compose update` 就能用。

需要按主题归属时，add、list、update 都带根参数 `--project <相对路径>`；路径相对 `<scope>/.edges/projects`，例如 `P/projects/Q`。选定 P 后索引是 `P/compose/README.md`，默认检出位置是 `P/compose/<name>`，登记回 `P/INDEX.md`；scope 与所属 Git 仓库保持不变。下面未带 Project 的示例使用默认 scope 材料位置。Compose 不把 `--super` 或 `--all` 当作登记表选择或递归更新开关。

日常三个命令，名字跟 git submodule 对应。`compose doctor` 不是日常命令，只把还写在 `AGENTS.md` 上的旧区块迁过来（默认预览，`--apply` 才写）。

| 命令 | 做什么 |
| --- | --- |
| `compose add` | `git submodule add <remote> <path>`，再在 `.edges/compose/README.md` 写一行；文件或材料索引链接缺失时一并建出来 |
| `compose list` | 列出已登记的条目，以及每条在本机是否已检出（`initialized`） |
| `compose update` | 每条跑 `git submodule update --init -- <path>`，从不带 `--recursive`；加 `--remote` 时跟到远端最新 |

没有 `register`、`unregister`、`clone`、`pull`、`push`、`sync`，也没有别名。

## 什么时候用

- 用户要把另一个 harness 仓库挂到当前工作目录，让 Agent 开场就能看到它的入口。
- 用户要初始化、列出或更新已经登记的组合仓库（例如新机器上刚 clone 完主仓库）。
- 不要用它写笔记（见 [notes.md](notes.md)）、建任务，或改项目记忆（检索用 `edges-memory-ask`，沉淀用 `edges-memory-remember`）。

## 硬规则

1. **`compose add` 必须带 `--description`。** 不传，或只传空白，命令以校验错误退出（退出码 2，`errorCode` 为 `VALIDATION_ERROR`），不会写入 Compose 区块。说明要写清两件事：这个仓存什么，以及什么情况下该往它写。后续 AI 靠这段文字决定该不该写进去，不要写成空话。
2. **命令以 CLI 为准。** 用 `--scope`（或已设置的 `EDGES_SCOPE`）、可选的根级 `--project`，以及 `--name`、`--remote`、`--path`、`--description`。要跳过某个模块用根级 `--exclude`（例如 `--exclude compose`），不要再传 `--with-composed`。`--path` 可选；不传时检出目录在所选 Compose 索引旁的 `<name>/`。传 `--path` 时只能写相对路径，即使选择 Project，也仍相对于原 scope；绝对路径和 `~` 开头的路径会被拒绝（校验错误），不写区块。写进 README 的链接是该检出的 `README.md`，相对于所选 `compose/`。
3. **add 会改主仓库的 git 索引。** 带 `--remote` 且 scope 在 git 仓库里时，`add` 先执行 `git submodule add <remote> <path>`，再写 `.edges/compose/README.md`。`.gitmodules` 和子模块目录会进主仓库的暂存区，要和这份 README 一起提交。同一路径已经是同一 URL 的子模块时只登记，不再 add；URL 不同则报错，不写区块。同名再 `add` 会替换原来那一行。不带 `--remote` 时只登记一个本地目录，不碰 git。
4. **不经手 token。** 不要让用户把 token、密码、cookie、私钥贴进对话。`add`、`update` 需要 git 鉴权时，让用户在自己的终端完成（例如 `gh auth login`），不要代跑带凭证的命令，也不要读取或复述凭证。
5. **推送用原生 git，且只在用户要求时做。** CLI 不提供 push。用户要发布被组合仓库里的改动时，在子模块目录里用普通 git：子模块默认是 detached HEAD，先 `git -C .edges/compose/<name> switch <分支>`，在分支上提交，再 `git -C .edges/compose/<name> push`。用户没要求发布时不要 push。
6. **不递归。** list、update 只处理当前所选 Compose 索引自己登记的条目。被组合仓库自己的 Compose 条目不会被初始化，也不会被展开。两个仓库互相登记也只展开一层。不要手动跑 `git submodule update --recursive`。内容查询默认会展开登记可达的 Compose；不想看时用 `--exclude compose`。

被组合的仓库可以直接写，提交和推送用原生 git。

## 常见流程

先 add，再 list 确认：

```bash
edges --scope <目录> compose add \
  --name brain \
  --remote https://github.com/example/brain.git \
  --description "个人大脑：只在记跨项目判断时写入"
edges --scope <目录> compose list
```

要放在别的仓内目录时加上相对的 `--path`：

```bash
edges --scope <目录> compose add \
  --name brain \
  --path vendor/brain \
  --remote https://github.com/example/brain.git \
  --description "个人大脑：只在记跨项目判断时写入"
```

新机器上 clone 完主仓库，或想跟到远端最新：

```bash
edges --scope <目录> compose update                 # 初始化还没检出的条目，已检出的不动
edges --scope <目录> compose update --remote        # 跟到每个子模块远端最新
edges --scope <目录> compose update --remote --name brain
```

`update --remote` 是 `git submodule update --init --remote -- <path>`；子模块已经在分支上时再加 `--merge`，合进该分支，不切回 detached HEAD。`--name` 只处理一条；不传则处理全部已登记条目。

`update` 逐条处理。某一条失败时，它在 `entries` 里是 `action: "failed"`，原因在 `error`，stderr 有一行 `warning: compose update failed for <名字>: ...`；其余条目照常执行。成功的条目是 `initialized`（原来没检出，现在有了）、`present`（已检出，没动）或 `updated`（`--remote` 跟到了远端）。至少一条成功时退出码是 0，所以要看 `entries` 里有没有 `failed`，再把失败的条目和原因告诉用户。全部请求的条目都失败（含 `--name` 那一条失败）时非零退出。

## 去掉一条

没有 `unregister`。要去掉一条时：

1. 在所选 `compose/README.md` 的 Compose 区块（`<!-- edges-compose:start -->` 与 `:end -->` 之间）删掉那一行。
2. 用户也想删掉子模块时，让用户自己跑 `git submodule deinit -f <path>` 和 `git rm <path>`，再提交。这一步会删目录，先问用户。

## 提示与旧条目

- 子模块目录不存在或是空的（新 clone 的主仓库还没初始化）时，`compose list` 和会读到该条目的命令在 stderr 打 `warning: compose entry <名字> is not checked out at <href>; run edges compose update --name <名字>`。看到它就跑 `edges compose update`。`--exclude compose` 时不打这行。
- 旧条目（指向 `~/...` 或绝对路径，例如以前默认的 `~/.edges/composed/<name>`）照样能读。`update` 对它们用普通 git：目录不存在时 `git clone`，加 `--remote` 时 `git pull`。读取和 `update` 会在 stderr 打迁移提示：不带 `--path` 用同一个名字重新 `compose add --remote ...`，就会把旧行换成 `<name>/README.md`。迁移前先问用户，旧目录由用户自己决定是否删除。
- 区块还在 `AGENTS.md` 上时，先问用户，再跑 `edges compose doctor` 看会改什么，确认后加 `--apply`。这不是日常命令；它只迁移 scope 的旧登记，不接受 `--project`。
- 条目在主仓库外（例如 `--path ../notes`），或 scope 不在 git 仓库里时，`add --remote` 跳过 `git submodule add` 并打 warning，之后按旧条目的方式处理。

stdout 只有 JSON。失败时读 `reason`。退出码 `2` 是用法或校验错误。
