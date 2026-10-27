# Compose 子仓可写

2026-10-21，框架仓 [VirusPC/edges](https://github.com/VirusPC/edges) 合入 [PR #26](https://github.com/VirusPC/edges/pull/26)（[ADR 0045](https://github.com/VirusPC/edges/blob/main/docs/adr/0045-compose-checkout-writable.md)）。被组合仓库装在 `.edges/compose/<name>`，底层是 git submodule。以前这些检出被当成只读，edges 自己的写命令进不去。

## 现在可以怎么用

1. **框架已去掉被组合仓库的只读特例。** 已检出的子模块工作区就是普通 git 工作区。`notes`、`memory`、`tasks` 等写命令直接改里面的文件。不另加可写标记、独立 worktree、同步命令或权限层。CLI 只改文件；提交和推送用原生 git。
2. **空检出冲突交给 `git submodule update`。** 目录还没检出时，不再为写入单独报错。冲突由 `git submodule update` 自己表现。要先把条目检出，用 `edges compose update`。
3. **Compose 不递归。** 不展开被组合仓库自己的 `.edges/compose/`。路径仍是 `.edges/compose/<name>`；条目用了相对 `--path` 时，就是那个检出目录。

公开 npm 上的 `@viruspc/edges@0.2.4` 还在这次改动之前。要用已经去掉只读特例的命令，用框架仓 `main` 的 `packages/cli`。