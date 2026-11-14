# Work 无法通过命令打开 Finder 目录

2026-11-14，macOS ChatGPT 客户端，Work 模式。

让助手用 Finder 打开工作区内一个已有目录，两次命令均失败：

- `open "<工作区目录>"`：`No application knows how to open URL`，错误码 `-10661`（`kLSExecutableIncorrectFormat: No compatible executable was found`）。
- `open -a Finder "<工作区目录>"`：`Unable to find application named 'Finder'`。

结果：无法完成打开目录这一操作，只能让用户在 Finder 用 ⌘⇧G 手动跳转。

以上仅证明当前会话的 Shell 调用失败；未验证其他桌面控制通道，不能据此认定系统没有 Finder 或 Work 完全不支持打开应用。具体原因未确认。
