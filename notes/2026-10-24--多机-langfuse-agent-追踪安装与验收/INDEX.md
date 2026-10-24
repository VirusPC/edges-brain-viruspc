# 多机 Langfuse Agent 追踪安装与验收

> 把本机各编码 Agent 的会话接到自建 Langfuse，并按设备标签验收。

## 背景

要把 Codex、Cursor、Claude Code、OpenCode 等编码 Agent 的 session / turn 接到自建 Langfuse（项目 Edges），在多台在线设备上按统一约定打设备标签，装好后跑冒烟并在 Langfuse 里确认有数据。过程中顺带澄清了 minigtr 双系统命名与是否继续用 Win11 侧，以及「助手可代点 Codex hook 信任、中间不要用进度问卷打断」的工作习惯。

## 主题

这场是在多台真实机器上，按 `langfuse-agent-tracing` 流程完成安装、修 blocker、冒烟验收，直到已有设备上的已有 Agent 能上报。

- 难点一：Codex 的 Stop hook 必须由 Codex 自家交互界面信任，不能手写 `hooks.state` 的 hash 绕过；无人值守的 `codex exec` 在未信任时往往不上报。
- 难点二：自建 Langfuse v4 开了 events-only 后，旧版 `/api/public/traces` 会 404，验收要改用 `/api/public/v2/observations`；该接口响应里又没有 tags 字段，按设备筛要靠网页或 environment / 时间对齐。
- 难点三：各 Agent 登录态与工具链版本不一致（Claude 未登录、MacBook Codex 过旧、OpenCode Console key 过期、公司 npm 源 502、PATH 上的 `agent` 不是 Cursor CLI），冒烟会大面积「跑不成」或「跑成了但没数据」。
- 难点四：minigtr 是 Win11 / Ubuntu 双系统，两侧不能同时在线；是否还要给离线的 Win11 侧补装，需要产品决策而不是技术死等。

## 过程

### 傍晚 改名与命名约定

把 Tailscale 节点 `mini-gtr-ubuntu` 改成 `minigtr-ubuntu`（须在本机执行 `tailscale set --hostname`；用户纠正：离线机也可在管理后台改名）。Win 侧一度想改成 `minigtr-win`，最终决定保持 `minigtr-win11`，`4070ts-win11` 同样保持。设备标签约定为 `device:<Tailscale MagicDNS 短名>`。

### 安装波次 在线机装 tracing

按 skill 读官方文档后，在在线机合并配置（先备份再合并，不覆盖其它插件）：

- MacBook Pro：Cursor / Codex / Claude / OpenCode，标签 `device:macbookpro-w`；OpenCode 用 `environment=macbookpro-w`（无 tags 口）。曾把 OpenCode 配置键从旧的 `plugin` 改成 `plugins`。
- Mac mini：同上四件，标签 `device:macmini` / OpenCode `environment=macmini`。Cursor 的 npm 包名在 registry 404，改为从 GitHub 克隆并 `npm link`。
- minigtr Ubuntu：仅 Codex，标签 `device:minigtr-ubuntu`。
- 4070ts Win11：仅 Codex，标签 `device:4070ts-win11`。

密钥与 base URL 指向 `https://langfuse.viruspc.tech`，项目 Edges。未伪造任何 Codex `hooks.state` 条目。

### 用户说明 minigtr 双系统

用户明确：minigtr 的 Win11 与 Ubuntu 不能共存（双系统），以后大概率不用 Win11。因此 `minigtr-win11` 不再列入补装待办，离线属正常。

### 约 20:15 冒烟与首查 Langfuse

用户要求「都跑一下，再去 Langfuse 看有没有数据」。命令行对各 Agent 发一句短 prompt 后查询：

- 当时只有 Mac mini 的 OpenCode 打进 1 条 `opencode.turn`。
- MacBook：Claude / Cursor CLI 未登录；Codex CLI 过旧且默认模型与 ChatGPT 账号不匹配；OpenCode Console API key 过期。
- Mac mini / 4070ts / minigtr：Codex 能跑通回复，但因 Stop hook 未信任，没有上传痕迹。
- 确认自建实例 events-only：旧 traces API 404，改用 v2 observations。

### 约 20:23 目标改为修到全绿；授权代点信任

用户设目标：已有设备上已有 Agent 都要能上报。对 Codex hook 说「你给我点击信任就行」。并要求：这类进行中的事不要用问卷打断问进度，重要节点记下来，做完或真正卡在登录时再报。

### 自动修复与验证（MacBook 等）

- MacBook Codex 经 Homebrew 从约 0.144 升到 0.164，原默认模型在升级后可跑；确认 hooks 与 tracing 插件仍在，并已能上报。
- MacBook OpenCode：公司 npm registry 502，改为用官方 npmjs 装到本机 OpenCode 目录下的 `node_modules`，并写目录级 `.npmrc`，不改动全局工作源；此后能上报（`environment=macbookpro-w`）。
- 核对 Mac mini、minigtr 的 Codex：此时 hooks 已信任且观测已出现。
- Cursor：MacBook 真 CLI 在 `~/.local/bin/agent`（PATH 上的 `agent` 可能是其它工具），此前 hook 曾成功导出；Mac mini 仅有桌面版，无 CLI。

### 约 20:45 4070ts 用 TUI 完成信任并验证

在用户授权下，用伪终端驱动 Windows 上 Codex 交互界面：进入 `/hooks`，对 Stop 项「Uploading Codex trace to Langfuse」按信任键完成信任，**未**手写 hash、**未**用仅临时绕过的危险开关做持久化。冒烟后 Langfuse 出现 `Codex Turn`（约 20:45）。桌面版 Codex 可执行文件在部分场景需加 `--no-daemon` 才能正常冒烟。

## 结果

已做成：

- Codex 上报：`macbookpro-w`、`macmini`、`minigtr-ubuntu`、`4070ts-win11` 均已验证有观测。
- OpenCode 上报：MacBook、Mac mini 已验证。
- Cursor：配置与 hook 已就绪；MacBook 侧曾有成功导出记录；Mac mini 需在桌面版里实际用一次 Agent 才完成验收。
- 台账与习惯：minigtr Win11 侧不再补装；中间进度不打断用户。

还剩：

- 两台 Mac 的 Claude Code 仍未登录，需本机 `claude` 后 `/login`，再重启会话并冒烟。
- Cursor 桌面版：建议 Reload Window 后正常用一次 Agent，完成该路径验收。
- MacBook OpenCode 的 Console key 仍过期；当前可用其它已配置提供方路径上报，续 key 为可选项。

无回退；配置均有按日备份后缀。

## 所学

- Codex 可观测性的硬边界是「信任记录必须由 Codex 自己写入」。可选项包括：等人手点、用伪终端代点（需明确授权）、或临时危险开关（不落盘、不适合当验收）。最终采用：未信任前不伪造；用户授权后用 TUI 代点。
- 设备维度应进 tags（可筛）；没有 tags 口的插件（如 OpenCode）临时用 environment 承载短设备名，且不加 `device:` 前缀。可选项「全塞进 metadata」在旧版 Langfuse 上筛选弱，不做主筛维度。
- 验收 API 必须匹配实例模式：events-only 下旧 traces 列表不可用；v2 observations 又能对上时间与 trace 名，但缺 tags 字段时，不能假装「已用 API 按 tag 过滤成功」，网页筛选仍有价值。
- 双系统主机不要把「另一侧 OS 上线」当成安装前置；产品上决定弃用的一侧直接移出范围。
- 修链路时不要用进度问卷消耗用户注意力；阻塞在真实账号登录时再开口。

## 行动指南

### 主题行动指南

#### 背景

需要在多台开发机上，把多种编码 Agent 的会话接到同一自建 Langfuse 项目，并按设备区分数据。

#### 核心问题

如何在不破坏各 Agent 已有配置的前提下装好官方可观测插件、打上可筛选的设备维度，并证明数据真的进了实例——同时处理 hook 信任、登录态与版本差异。

#### 核心解决方案

1. 先读各 Agent 官方集成文档，再准备同一对项目密钥与自建 base URL；改任何配置前先备份，只合并不覆盖。
2. 按 Agent 安装官方插件；设备筛选项写入 tags（写成 `device:<短名>`）。没有 tags 口时，把短名写入 environment（不加 `device:` 前缀）。可选项：自造上报脚本——不做，优先官方插件以免双份 trace 与字段漂移。
3. Codex：开启 hooks 与 tracing 插件后，必须在新开的交互会话里信任 Stop hook；禁止手写信任 hash。若负责人授权代操作，可用伪终端驱动官方 TUI 完成信任，仍不要伪造文件。可选项：只跑非交互 exec 宣布完成——不做，因未信任时常无上传。
4. Cursor：hooks 里的 node 用绝对路径；装完 Reload Window。注意 PATH 上的同名命令是否真是 Cursor CLI。
5. Claude Code：先登录再验证；已开会话要重启才加载插件；设备 tag 走环境变量约定。
6. OpenCode：确认配置键为现行 `plugins`；私有 npm 源失败时，可在 OpenCode 配置目录用官方 registry 装插件，避免改全局工作源。
7. 验收：触发真实一轮对话或文档推荐的测试方式；对 events-only 实例用 v2 observations（或网页）确认，并核对设备 tag / environment。可选项：只看本地 hook 日志——不够，必须以实例侧数据为准。

#### 验收标准

- 目标范围内每台在线设备、每种已安装 Agent，在 Langfuse 中至少出现一条与本次冒烟时间对齐的观测或会话。
- Codex 各机 `hooks.state` 中存在由 Codex 写入的 tracing Stop 信任记录（非手写伪造）。
- 带 tags 的 Agent 在网页可按 `device:<短名>` 筛到；OpenCode 等可按约定 environment 对齐。
- 配置改动均有备份；密钥未进入公开笔记或聊天明文。
- 明确排除的设备（如弃用的双系统另一侧）不出现在未完成清单里。

### 细节与其他

#### 若设备短名从哪来

则：优先 Tailscale MagicDNS 短名；取不到再退回系统主机名；不用序列号。本场实际短名：`macbookpro-w`、`macmini`、`minigtr-ubuntu`、`4070ts-win11`。

#### 若自建实例是 v4 且旧 traces API 404

则：改查 `/api/public/v2/observations`；接受响应可能无 tags，改用时间、trace 名、environment 对齐，并保留网页按 tag 人工核对。

#### 若 Windows 上 Desktop Codex 冒烟异常

则：尝试加 `--no-daemon`；信任仍走交互 `/hooks`。可用 winpty 等伪终端驱动 TUI（需用户授权代点时）。

#### 若 MacBook 上 `agent` 命令行为不对

则：先 `which agent`；本场真 Cursor CLI 在用户目录下的 `~/.local/bin/agent`，PATH 上可能是其它工具。

#### 若公司 npm registry 导致 OpenCode 插件装失败

则：在 OpenCode 配置目录使用指向官方 npmjs 的目录级 `.npmrc` 安装插件，不要轻易改全局 `~/.npmrc` 以免影响工作包。

#### 若对象是双系统同一物理机

则：只给当前在线且仍使用的那一侧装；另一侧若产品上弃用，直接移出范围，不要挂成长期待办。

#### 若 Claude 报 Not logged in

则：本机交互运行 `claude`，执行 `/login`，重启会话后再冒烟；未登录时 SessionEnd hook 取消不代表 tracing 配错。

## 补充说明

- 原始材料：IT资产管理 助手会话（2026-10-24，约改名至 20:45 验收）；skill `langfuse-agent-tracing`；Langfuse 官方 integrations（Codex / Cursor / Claude Code / OpenCode）；实例 `https://langfuse.viruspc.tech`（项目 Edges）。
- 相关：盒子上密钥目录仅作运行时引用，不入库；各机配置备份后缀形如 `.bak-langfuse-YYYYMMDD`。
- 遗留（未开任务卡）：两台 Mac 的 Claude `/login`；Cursor 桌面版 Reload 后实跑一次；可选续 MacBook OpenCode Console key。