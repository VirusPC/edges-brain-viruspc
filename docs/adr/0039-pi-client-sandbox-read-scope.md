---
status: accepted
---

# pi client 用默认工具，并用 pi-sandbox 把读取收在被测副本

**Status:** accepted（2026-10-19）

检索评测的 pi client 不再传 `--tools`，使用 pi 默认工具（read、bash、edit、write）。沙箱按 pi-sandbox 的安装方式装进当次临时 `PI_CODING_AGENT_DIR`（`pi install npm:pi-sandbox`），配置只把 `filesystem.allowRead` 收成 `["."]`，其余用插件默认。越界由沙箱阻止；不挪副本、不改 prompt、不动 Codex。
