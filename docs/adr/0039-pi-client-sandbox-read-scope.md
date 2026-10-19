---
status: accepted
---

# pi client 用默认工具，并用 pi-sandbox 把读取收在被测副本

**Status:** accepted（2026-10-19）

检索评测的 pi client 使用 pi 默认工具，并用 `pi install npm:pi-sandbox` 把沙箱装进当次临时 `PI_CODING_AGENT_DIR`。`denyRead` 为 `["/"]`，`allowRead` 是副本（`.`）加上仍存在的系统目录，`allowWrite` 为 `[]`，并把运行时仍会挂回的 `/tmp/agents`、`~/.npm/_logs`、`~/.claude/debug` 写入 `denyWrite`；越界和写入由沙箱阻止，不挪副本、不改 prompt、不动 Codex。
