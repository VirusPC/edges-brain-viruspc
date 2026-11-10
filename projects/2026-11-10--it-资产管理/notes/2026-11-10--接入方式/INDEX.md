---
description: 各类资产的接入与运维入口：网格与 SSH、本机服务、外设与云控制面、UPS 监测。不写具体地址和密钥。
---
# 接入方式

对应本机接口文档的公开版：说明怎么接入各类资产，不写具体地址、账号口令和密钥。

## 网格与远程登录

- **Tailscale**：在云主机上用 CLI 查看节点在线状态。不要为了清单去自动拉起笔记本客户端。SSH 走已有维护通道和既有配置，不读取私钥、不复制凭证、不新增授权。
- **Mac mini**：可本机执行，也可作为 SSH 主机；用户名与登录方式见本机台账。需在 macOS 隐私设置里为助手打开辅助功能、屏幕录制、完全磁盘访问，以及必要的自动化权限。
- **MacBook Pro**：可经批准后做本机 Shell / 读文件，以及与云端执行环境互拷文件。机器标识见本机台账。
- **minigtr（Ubuntu）**：常开家用网关与本机执行节点。维护账号见本机台账。有线网卡承担 NAS 直连；SMB 挂载点在本机约定目录，凭据文件只在主机上。
- **NAS**：SSH 与 SMB 使用同一类日常账户，Web 管理界面的用户名不一定与 SSH 相同，两者不要混用。管理界面走网格上的加密端口。短名可能被企业 DNS 抢解析，具体应使用的主机名或地址见本机台账。反复 SSH 失败会触发锁账户，解锁后不要连续重试。
- **阿里云 ECS**：经 Tailscale SSH；该执行环境上的阿里云 CLI 可能尚未完成 API 登录配置。典型操作为实例查询、开关机和网格 SSH，不在此保存 AccessKey。

## 本机服务怎么用

- **Ollama（4070ts）**：随 Windows 登录自启，对本机及网格提供 API。地址与端口见本机台账。
- **edges-rag（minigtr）**：venv 部署，不是 Docker。用户级 systemd 管理 API 与 UI 代理，并已设置 linger。公网 UI 经 Cloudflare Tunnel 反代到本机 UI 端口。索引根指向工作区里的框架仓检出，嵌入与对话走 4070ts 上的 Ollama。API 使用 Bearer，令牌只在主机上的环境文件里，不粘贴到本仓。运维用用户级 systemd 状态查询。
- **E2B Embed（minigtr）**：Docker Compose 自托管沙箱，systemd 开机自启，并与同机 Langfuse 错开端口。本机 API / Dashboard / sandbox 代理各有端口；公网三个域名见资产清单。SDK 环境变量从容器或主机上的权限收紧文件读取，不要把 API key 写入笔记。部署细节见 `projects/agent-infra/` 已有文档。
- **Langfuse**：与 E2B 共址于 minigtr，保留原常用端口；公网经同一类 Tunnel 暴露。

## 外设与云控制面

- **Plaud NotePro**：走云端 MCP（不是本机蓝牙控制）。可用操作为查看当前用户、列出与读取录音、笔记和转写。
- **Rokid Glasses**：本机没有直连控制面。手机侧用灵珠 / AIUI Studio；Mac mini 上的 Codex 网关是配套服务，不是眼镜本体。不要把网关 AK 或 webhook URL 写入笔记。
- **Cloudflare**：`cloudflared` 用于隧道和 DNS 操作。API 操作前需要先完成登录；证书在操作者本机约定目录，不把证书或账号 ID 写入本仓。
- **邮箱**：Gmail 经已授权的连接器读收据；QQ 邮箱经本机邮件 CLI，授权码只放环境变量。

## UPS 监测入口

- APC：在 minigtr 上用 UPower 只读查询；不要为了看状态去抢占 USB，也不要在未授权时安装会执行关机动作的 UPS 守护进程。
- NAS 侧 US7000：用 NAS 上已有的 NUT 只读查询。本轮调查没有启停或改动这些服务。
- 持续记录看 `ups-observe` 的独立 journal 命名空间，用法见 UPS 调查笔记。
