---
status: accepted
---

# pi client 用默认工具，并用 pi-sandbox 把读取收在被测副本

**Status:** accepted（2026-10-19）

检索评测的 pi client 使用 pi 默认工具，并用 `pi install npm:pi-sandbox` 把沙箱装进当次临时 `PI_CODING_AGENT_DIR`。读取配置保留插件默认 `denyRead`（`/home`、`/Users`）和 `allowRead: ["."]`，再把副本所在 edges 仓库根的绝对路径加入 `denyRead`；越界由沙箱阻止，不挪副本、不改 prompt、不动 Codex。
