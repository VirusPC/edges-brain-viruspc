# Work 选择 Full access 后仍无法拉取代码

2026-11-14，macOS ChatGPT 客户端。

新建 Work 会话时选了 Full access，开聊后找不到切换权限的入口。拉取代码仍报错：

```text
cannot open '.git/FETCH_HEAD': Operation not permitted
```

普通文件可以修改，但 Git 操作受限；创建 worktree 时也因无法写入 Git 元数据失败。界面选择与实际权限不一致，原因尚未确认。
