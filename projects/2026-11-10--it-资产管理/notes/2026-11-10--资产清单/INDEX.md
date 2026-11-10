---
description: 主机、存储、UPS/电源、外设、云节点与自建服务、邮箱账户角色、Tailscale 网格节点的公开索引。不含地址、序列号、邮箱和密钥。
---
# 资产清单

整理自本机设备台账（标到 2026-10-28，并吸收 2026-11-08 核对结论）。不收录地址、序列号、邮箱和密钥；这些见本机台账。

## 主机

- **MacBook Pro**（M4 Pro / 24GB，macOS）：日常移动工作机。Tailscale 上常见为接入客户端，另有同机的另一节点名。本机序列号与 Grok 机器标识见本机台账，不入库。
- **Mac mini**（Apple M4）：桌面常驻机，承担 Claude / Cursor / OpenClaw 及本机执行、偶发 SSH 跳板。来电自动开机已打开（`pmset` AC `autorestart=1`，2026-11-08 核对）；这不等于磁盘解锁或图形界面自动登录。当时系统版本低于 Apple 新版「始终保持连接」界面要求的版本，未做升级。
- **minigtr**（机械师 Mini GTR）：Ubuntu / Windows 双系统，按一台主机计。Ubuntu 是日常维护面和常开家用节点；Windows 侧在 Linux 启动时离线是正常现象。硬件为 Ryzen 7 255 / Radeon 780M，使用开源 amdgpu，不要安装 NVIDIA 专有驱动。有线网卡专用于直连 NAS。来电自动开机无法经操作系统接口远程读取或修改，取值未知，见现场 BIOS 任务卡。
- **4070ts**（Windows 11，另有 Ubuntu 双系统）：GPU 主机，运行 Ollama（及 ChatGPT / Grok Bot 自启项）。曾有过未接 UPS 而掉电的记录；当前是否接在 APC 备援输出上，尚未现场确认。
- **绿联 NAS**（DXP4800PLUS，UGOS）：经 minigtr 有线直连；出口 NAT 走 minigtr，不要把 NAS 接到企业无线网。远程管理只走 Tailscale，厂商公网远程宜关闭（是否已彻底关闭仍待确认）。精确 UGOS 版本与磁盘布局待补。
- **云主机 `grok-bot`**：云端执行环境，也是查看 Tailscale 网格状态的首选观察点。
- **阿里云 ECS `aliyun-ecs`**：教学站、任务看板与 artifacts 预览的公网入口所在节点。SSH 经 Tailscale，维护账号见本机台账。
- **iPhone**：个人手机，在网格中有对应节点。

## 存储

- NAS 与 minigtr 之间是独立直连网段；直连在 Tailscale 路径异常时仍可从 minigtr 访问。
- minigtr 以 SMB 客户端挂载 NAS 上的数据、项目、Docker 与个人目录。凭据只存放在主机上的凭据文件，本项目只记录「有这么一份文件」，不记录内容。
- 非这条直连之外的局域网设备尚未列全。

## UPS / 电源

- **APC Back-UPS BK650M2_CH**：USB 接到 minigtr。minigtr 上可以看到 UPower 设备；当时未安装 NUT / apcupsd。USB 数据线连着，并不证明该电脑或其他主机的电源线接在这台 UPS 的备援输出上。接线确认仍待现场沿电源线核对。
- **UGREEN US7000**：NAS 另接的独立 UPS，NAS 上已有 NUT 监测（设备名等见 UPS 调查笔记）。这台不是 APC。其部分电池续航读数可疑，不能当成真实续航。此项已记在 UPS 笔记中，本机台账正文尚未并入。
- minigtr 上已部署只读持久监测服务 `ups-observe`（事件、定时快照、独立 journal 命名空间）。授权范围是持续记录，不含真实断电测试，也不含新增自动关机。细节见 UPS 调查笔记，不在此复制配置全文。

## 外设

- **Plaud NotePro**：随身录音笔，经已连接的 Plaud MCP 使用。型号已经用户确认；硬件序列号仍为推断、未再核实，已连邮箱里也未见订单收据。
- **Rokid Glasses**：AR 眼镜，配套灵珠 / 乐奇开放平台。具体型号、SKU、序列号与购入信息待补。相关本机服务在 Mac mini 上（Codex 灵珠网关），公网入口多为临时隧道，重启会变。网关密钥与 webhook 不入库。运维过程见已有笔记。
- 其他个人音频外设若需入库，等本机台账补记后再同步。

## 云节点与自建服务、公网入口

多数字就服务跑在 minigtr 上，经 Cloudflare Tunnel 对外。已公开、可写进本仓的入口包括：

| 服务 | 大致位置 | 公网入口（`viruspc.tech`） |
| --- | --- | --- |
| Langfuse | minigtr | `langfuse` |
| E2B Embed（API / Dashboard / sandbox 代理） | minigtr，端口已与 Langfuse 错开 | `e2b`、`e2b-dash`、`e2b-sandbox` |
| edges-rag（框架知识问答） | minigtr | `edges-rag` |
| 教学站、任务看板、artifacts 预览 | 阿里云 ECS | `edges`（路径 `/teaching/`、`/tasks/`、`/artifacts/`） |

历史上还见过 Mac mini、NAS、阿里云 ECS、minigtr 等 Cloudflare Tunnel。DNS 由 Cloudflare 管理；账号、Zone ID 与证书细节见本机台账，不入库。教学站等公网入口走隧道，不为备案原因改用裸 IP 作为对外 Host。旧的 ECS 裸 IP 入口已退役，新发布不得再打印该地址。

Ollama 跑在 4070ts 上，供 edges-rag 等服务调用；模型清单以本机台账当时记录为准（嵌入与对话模型），不在此展开端口与地址。阿里云 CLI 在部分执行环境尚未完成登录配置，ECS 日常维护走网格 SSH。

## 邮箱账户

只记角色，不写邮箱地址。

- **Gmail 主账户**（Grok Bot 连接器账户名 `default`）：订阅收据主收件箱。
- **Gmail viruspc 账户**（连接器账户名 `viruspc`）：Grok / xAI 以及与 Apple 相关的收据。
- **QQ 邮箱**：本机用邮件 CLI 走 IMAP/SMTP；授权码只放环境变量，不把明文授权码或密码写入任何笔记。

订阅交叉参考（仅作上下文）：ChatGPT / Claude 走 Apple ID 购买；Cursor 包含在 SuperGrok Heavy 中，不是单独付费订阅。Apple 订阅页尚无正式连接器。

## Tailscale 网格节点

节点列表优先从云主机 `grok-bot` 查看（`tailscale status`）。Linux 节点通常只有 `tailscaled` 与 CLI，往往没有桌面应用图标。本项目只列角色，不写 `100.x`、局域网地址或 MagicDNS 尾网域名。

| 节点角色 | 说明 |
| --- | --- |
| `grok-bot` | 云端执行环境，观察网格的首选点 |
| `aliyun-ecs` | 阿里云 ECS |
| iPhone 节点 | 个人手机 |
| Mac mini 节点 | 桌面常驻机 |
| MacBook Pro 的两个节点名 | 同一台笔记本的不同接入名 |
| `minigtr` | Mini GTR 的 Ubuntu 侧，常开家用节点 |
| `minigtr-win` | 同一台的 Windows 侧，Linux 启动时常常离线 |
| `nas` | 绿联 NAS |
| `4070ts-win11` | GPU 主机的 Windows 侧 |

短主机名在企业 DNS 环境下可能被解析到无关目标，访问 NAS 管理面或 SSH 时不要只用短名，改用本机台账中的网格全名或地址。管理控制台用 Tailscale 官方后台，不在此保存登录凭据。
