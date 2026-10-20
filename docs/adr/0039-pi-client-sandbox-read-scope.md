---
status: accepted
---

# pi client 用默认工具，并用 pi-sandbox 把读取收在被测副本

**Status:** accepted（2026-10-19）

检索评测的 pi client 使用默认工具，用 `pi install npm:pi-sandbox@0.7.1` 装进当次临时目录，并把 `denyRead` 写成根下真实目录（跳过符号链接与 proc/dev/sys）、`allowRead` 写成副本和那些目录里仍要的系统路径、`allowWrite` 写成 `[]`。prompt 之前用同一配置在沙箱里跑 `true`，失败则本次记失败；越界由沙箱阻止，不挪副本、不改 prompt、不动 Codex。
