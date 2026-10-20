---
metadata:
  edges-type: task
  edges-task-project: evaluation
  edges-updated-at: '2026-10-20T02:17:43.201Z'
  edges-title: retrieval eval 的 pi client 会跑出被测仓库副本
  edges-tasks-status: done
  edges-task-priority: none
name: retrieval_eval_的_pi_client_会跑出被测仓库副本
description: pi client 没有沙箱，检索时会跑出被测副本，到外层仓库里去搜，样本因此被污染。要让没有沙箱的 client 也只在被测副本里检索。
---
**背景：**
PR #294 给 retrieval eval 加了 pi-coding-agent client（MiniMax-M3），pi 没有沙箱。2026-10-19 13:11（UTC+8）冒烟时，模型第一步就 `cd` 出了被测副本 `.harness/evaluation/.cache/retrieval/<repo>/<ref>`，到外层 edges 工作目录里去搜，得分 0，样本被污染（只读了外面的文件，没写坏东西）。上一轮冒烟碰巧没跑出去，得分 1.0。Codex 有沙箱，没遇到这个问题。用户决定 #294 保持现状，这个问题单独开卡。
- 涉及文件：`.harness/evaluation/retrieval_eval/run.py`、`config.py`
- 关联：PR #294

**目标：**
pi 以及以后没有沙箱的 client 只能在被测副本里检索，得分反映的是被测提交本身。

**动作（候选，待定）：**
1. 把被测副本挪到任何 git 仓库之外的临时或缓存目录，路径可配置。这是根治办法。
2. 在提示词里限定只在当前目录检索。
3. 可选：去掉 pi 的 bash。这样 pi 和 Codex 的工具就不对等了，而且用绝对路径照样能读到外面。
4. 可选：记录工具调用有没有用到当前目录之外的路径，把越界的样本标出来。
5. 后续：给 pi 补一个沙箱插件，让它和 Codex 一样在受限环境里跑。

**完成标准：**
- [x] pi 冒烟里不再出现越界路径
- [x] 越界由沙箱阻止（用户 2026-10-19 拍板；不再另做检测或标记）
- [x] Codex 的结果不受影响
- [x] 有对应测试

**进度日志：**

- 2026-10-19 grill：R1 被 R2 取代。最终决策是 pi 用默认工具表，加上 pi-sandbox 的通用形态，只把读取范围收成被测副本（`filesystem.allowRead` 为 `["."]`）。不挪副本、不改 prompt、不动 Codex。越界检测这条完成标准改为「由沙箱阻止越界」。
- 2026-10-19 实现：`clients.json` 去掉 pi 的 `tools`；运行前在临时 `PI_CODING_AGENT_DIR` 执行 `pi install npm:pi-sandbox --no-approve` 并写入上述 `sandbox.json`。不传 `-ne`，包才会加载。缺 `rg` / `bwrap` / `socat`（macOS 为 `sandbox-exec`）或安装失败时，样本记失败，不降级为无沙箱。本机没有 `MINIMAX_API_KEY`，没有打真实 MiniMax。用本地桩走了生产 `run_client`：副本放在 `/home` 下时，副本外文件的 read 被拒绝，bash `cat` 报不存在，文件内容没有出现在会话里；副本内文件可以读到。插件默认 `denyRead` 只盖住 `/home` 和 `/Users`，副本若在这两棵目录之外，bash 仍可能读到外面，这次没有改第二处配置。
- 2026-10-19 补配置：用户拍板把副本所在 edges 仓库根（`.harness/evaluation/.cache` 的外层，运行时绝对路径）写入 `filesystem.denyRead`，同时保留插件默认 `/home`、`/Users` 和 `allowRead: ["."]`。本地桩把副本放在 `/workspace`（不在 `/home` 下）：`read` 与 `bash cat` 仓库根 `README.md` 均被拒，正文没有进会话；副本内文件可读；`ls` 与 `rg` 退出码为 0。
- 2026-10-19 独立验证（Linux，pi 1.3.0，pi-sandbox 0.7.1）：`allowWrite` 仍是插件默认 `[".", "/tmp"]`，pi 能改副本且改动留在宿主机；bash 能改写临时目录里的 `sandbox.json` 为 `allowRead: ["/"]`，之后 read 能读到仓库根和 `/home`；bash 还能读黑名单外的 `/etc`、`/tmp` 和仓库里副本外的文件。
- 2026-10-19 修复：`denyRead` 改为 `["/"]`，`allowRead` 为 `"."` 加上本机存在的 `/usr`、`/bin`、`/lib`、`/lib64`（macOS 还有存在的 `/System`），`allowWrite` 为 `[]`。运行时仍会挂回 `/tmp/agents`、`~/.npm/_logs`、`~/.claude/debug`，这三项写入 `denyWrite`。bubblewrap 0.9.0 上 `denyRead "/"` 加子路径 `allowRead` 生效。本地桩经生产 `run_client`：仓库根、同级目录、`/home` 探针、`/etc/hostname`、宿主机 `/tmp`、副本外文件的 read 与 bash cat 都被拒；副本内 read、`ls`、`rg` 正常；write、edit、bash 写副本被拒且文件未变；写 `/tmp/agents` 为只读错误且宿主机无新文件；改 `sandbox.json` 后宿主机原文件未变，再次 read 仓库根仍被拒。缺 `bwrap` 时不启动 pi。bash 仍能列出 `~/.npm/_logs`（denyWrite 只把它变成只读）。往其它 `/tmp` 路径写会落在空 tmpfs 上，退出码可能是 0，宿主机没有该文件。任务仍留在 in_progress。
- 2026-10-19 独立验证（merged-/usr，bubblewrap 0.13.1）：`denyRead: ["/"]` 被插件展开时跟随符号链接，对 `/bin` 做 `--tmpfs`，bwrap 报 `Can't mount on symlink destination /bin`，每条 bash 退出码 1，pi 进程仍可能是 0。只从 `allowRead` 去掉符号链接目录仍会失败。改为由 Python 把 `/` 展开成根下真实目录（跳过符号链接和 proc/dev/sys）写入 `denyRead`；`allowRead` 留 `.` 与非符号链接的系统目录（本机为 `.` 和 `/usr`）。`pi-sandbox` 固定为 `0.7.1`。prompt 前用同一读写列表在沙箱里跑 `true`，失败则本次 `parse_error` 为 `pi sandbox bash check failed: ...`，不启动 pi。本地桩经生产 `run_client`、PATH 上的 bwrap 为 0.13.1：`ls` / `rg` / `git` / `python3` 正常；副本外 read 与 bash cat 被拒；`/proc/1/root` 为 Permission denied；写副本为 Read-only 且文件未变；写 `/tmp` 与改 `sandbox.json` 不落宿主机，之后 read 仓库根仍被拒。bash 仍能看到 `MINIMAX_CN_API_KEY`，也仍能列出 `~/.npm/_logs`。任务仍留在 in_progress。
- 2026-10-20 实现已合 #297（squash `655e5323`）。
