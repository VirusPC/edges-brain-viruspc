---
name: linux-nas-direct-link
description: 当要把消费级 NAS（尤其绿联 UGOS）用网线直连到 Linux 主机时使用：共享上网/NAT、专用用户 SMB 挂载、Tailscale（含 tailscale0 缺 IPv4）、SSH 防锁与管理页访问。
metadata:
  edges-origin-session-id: bc-8796781f-0048-561b-9c64-2abacb4fef9c
  edges-agent-client: grok-bot
  edges-username: minigtr设备助手
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-23T06:53:25+00:00"
---

# Linux 主机 ↔ NAS 直连（SMB + Tailscale）

把消费级 NAS 用一根网线接到 Linux 主机、挂载共享目录、并恢复 Tailscale 的可复用流程。按绿联 UGOS 经验整理，同类设备可按同一顺序做。

公开笔记与本 skill 正文里，主机名、`100.x`、口令、凭证文件内容一律用占位符；具体现值以对应复盘笔记为准，且口令不入库。

参考复盘（过程细节，非本 skill 正文）：`knowledge/notes/` 下同日「minigtr 直连绿联 NAS」长笔记。

## 何时用

- NAS 网线直连 Linux 主机，该口没有路由器 DHCP
- 要在主机上挂载共享（如 `/mnt/nas/...`）
- 搬迁后要用 Tailscale 做远程管理 / SSH
- Tailscale 显示 Connected，但对端连不上它报出的 `100.x`
- 用户说「按绿联 / NAS 直连那套来」

## 硬规则

1. **不要**让个人 NAS 上企业 WPA2-Enterprise / 802.1X Wi‑Fi。优先直连 + 主机 NAT、家用局域网，或 Tailscale。
2. **不要**用 NAS 管理员账号做日常 SMB 挂载。用专用低权限用户。
3. **不要**把口令写进仓库、fstab 明文或公开笔记。凭证只放主机本地文件（`chmod 600`）。
4. **不要**在 SSH 连续失败后继续盲打。UGOS 一类会锁来源 IP；先停手，在管理页解封。
5. **不要**改分区 / EFI，除非用户明确授权并双重核对盘符。
6. NAS 已开 SMB、客户端含 Linux + 偶尔 Mac 时，**优先 SMB**。只有明确只要 Linux 且愿意维护 uid/gid 时再开 NFS。

## 阶段 0 — 盘点（先问清或查清）

公开笔记里脱敏后记录：

| 项 | 形状示例 |
| --- | --- |
| 主机网口 | 如 `eno1` |
| NAS 型号 / 系统 | 如绿联 DXP… / UGOS |
| 直连网段 | 主机 `10.42.0.1/24`，NAS `10.42.0.x` |
| 要挂的共享 | 只记名字 |
| 挂载用户 | 非管理员 |
| 既有 Tailscale 身份 | 主机名；重连旧身份还是新节点 |

## 阶段 1 — 链路与地址

1. 确认物理链路（carrier up）。
2. 对端无 DHCP：在该网口开 NetworkManager **shared**（主机当简易 DHCP/NAT），或两端静态地址。
3. 发现 NAS；在挂载前确认局域网 IP 上管理 HTTPS、SSH、SMB 端口可达。
4. 若 Tailscale 或更新需要出网，确认 NAS 经主机 NAT 能上网。

## 阶段 2 — 从其他机器打开管理页

1. Tailscale 上线后优先走 MagicDNS 或 `100.x` 的管理 HTTPS（UGOS 常见 `:9443`）。
2. 临时兜底：在 Linux 主机上做 TCP 转发（如 socat）到 NAS 管理 HTTPS。证书主机名告警属预期。不要以为「输过 SSH 密码」就等于隧道已建立——先看本机端口是否在听。
3. Tailscale 可用后，建议关掉厂商「公网远程」；厂商远程与 Tailscale 是两套暴露面。

## 阶段 3 — 主机上 SMB 挂载

1. 用专用用户列共享。认证失败先查 NAS 的 SMB 用户/权限，不要先怪 `mount.cifs`。
2. 凭证只放主机（如 `/etc/<nas>-smb.cred`，mode 600）。
3. 固定挂载前缀（如 `/mnt/nas/<share>`）。
4. `fstab` 使用 `_netdev,nofail`，并尽量加 `x-systemd.automount`，避免拔线堵启动。
5. 对一个共享做写探测；确认 automount 正常。

## 阶段 4 — NAS 上的 Tailscale（UGOS 形态）

1. **应用中心没有 Tailscale 包是正常的。** 先看 `tailscaled` 是否已在跑。
2. `Needs login` 表示安装往往没问题：授权后**接回原身份**，不要轻易当新设备重注册。
3. UGOS 上若 DNS / `resolv.conf` 打架，优先 `--accept-dns=false`。
4. NAS 共享目录里的 Docker compose 只是 **SSH 全挂时的备选**，不是稳态路径。
5. 对端用 MagicDNS FQDN 或 `100.x`。短名（如 `nas`）可能撞公司 DNS。

### 坑：Connected，但 `tailscale0` 没有 IPv4

现象：

- 客户端报 Connected、报出 `100.x`、`TUN=true`
- `ip addr show tailscale0` 只有链路本地 IPv6，没有 `100.x`
- Tailscale 自带 ping 可能通；对端对 `100.x:22` / 管理 HTTPS 超时
- 局域网 IP 同端口仍通；`sshd` 在 `0.0.0.0` 监听

通常**不是**原因：应用中心缺包、授权失败、把**局域网 IP** 配到 `tailscale0`。

恢复：

1. 在 NAS 上：`ip -4 addr show tailscale0`
2. 若缺少 Tailscale IPv4：`ip addr add <tailscale-ipv4>/32 dev tailscale0`（用客户端报出的那条，不是局域网地址）
3. 用 systemd oneshot（`After=tailscaled.service`）在缺失时补回。单元与脚本全文、口令不要进公开仓。
4. 根因未证死前，笔记里写「未证死」即可（更像设备网络管理干扰或进程状态与协议栈不一致）。

## 阶段 5 — SSH

1. 日常优先专用用户，少用管理员。
2. 连续认证失败后：**立刻停手**，在管理页解封来源 IP（常见是直连网关侧），再试**一次**干净登录。
3. 需要时可跳板：`ssh -J user@linux-host user@nas-lan-ip`。
4. 管理页管理员、SSH 用户、SMB 用户是三套权限面。

## 阶段 6 — 收口清单

- [ ] 直连 + shared/静态地址已记录
- [ ] SMB：专用用户 + 凭证文件 + automount
- [ ] Tailscale 已接回；对端能打 MagicDNS / `100.x`
- [ ] 若 UGOS：`tailscale0` 上有 IPv4（或 oneshot 已启用）
- [ ] 厂商公网远程已关（或明确接受保留）
- [ ] 仓库与公开笔记无口令
- [ ] 可选：由 Linux 主机用 Tailscale 宣告直连子网路由

## 记笔记时

需要落盘时用复盘四栏 / 对话笔记规范；走 edges 入库路径；口令不入库；短「收口」笔记只跳转到一篇长笔记，避免各写一份。

## 不在范围内

- 让 NAS 上企业 802.1X
- `tailscaled` 已在跑时还去应用中心重装
- 为清口令去 force-push 改历史（另案处理）
