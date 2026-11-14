---
description: 个人 IT 资产的公开索引（主机、存储、电源、外设、云与自建服务、邮箱角色、网格节点）。不含地址、序列号、邮箱和密钥。
---
# IT 资产管理

本项目（目录名可记为 `it-assets`）是个人 IT 资产的公开索引：主机、存储、UPS/电源、外设、云节点、自建服务及公网入口、邮箱账户角色，以及 Tailscale 网格节点。本仓公开，这里只保留可公开的角色与拓扑结论；地址、序列号、账号、凭据等运维细节以本机台账为准，不入库。

## 怎么用

- 先看本页了解范围、脱敏原则和材料入口。
- 查某类资产或接入方式，打开下方对应笔记。
- 已有调查或待办不要在本项目复制全文，直接跟随已有笔记和任务卡。

## 脱敏原则

本仓 `VirusPC/edges-brain-viruspc` 已确认是公开仓库（GitHub visibility: public）。写入即等同公开发表。本项目明确不收录：

- 密码、token、AK、授权码、私钥、webhook URL、以及 `sdk.env` 一类密钥文件内容
- Tailscale `100.x` 地址、局域网地址、MAC、设备序列号、Grok 机器标识
- 邮箱地址、Cloudflare 账号或 Zone ID、MagicDNS 尾网域名
- 企业内网域名或办公网络标识

需要上述细节时，查阅本机台账，不要把私密原文再贴进本仓。

## 来源与时效

公开整理自本机设备台账与接口文档（台账标到 2026-10-28，并吸收 2026-11-08 的来电自启核对与 UPS 调查结论）。之后若本机台账更新，应同步修订本项目笔记，而不是再复制一份私密原文。


## 本项目材料

- [资产清单](notes/2026-11-10--资产清单/INDEX.md) — 主机、存储、UPS/电源、外设、云节点与自建服务、邮箱账户角色、Tailscale 网格节点的公开索引。
- [接入方式](notes/2026-11-10--接入方式/INDEX.md) — 网格与 SSH、本机服务、外设与云控制面、UPS 监测入口。
- [已知坑与待补缺口](notes/2026-11-10--已知坑与待补缺口/INDEX.md) — 已知限制与待补项，并链到已有笔记和任务卡。

## 已有相关笔记与任务

下面只给入口，不转载全文。

- [UPS 断电调查与只读持久监测](../../notes/2026-11-08--ups-断电调查与只读持久监测/INDEX.md)：NAS 另接独立 UGREEN US7000、APC 接线尚未现场确认、minigtr 上 `ups-observe` 只读持久日志。
- [minigtr 直连绿联 NAS 与 SMB 挂载](../../notes/2026-09-23--minigtr直连绿联NAS与SMB挂载/INDEX.md)、[直连收口](../../notes/2026-09-23--minigtr与绿联NAS直连收口/INDEX.md)、[NAS 组网与三端 SMB 挂载](../../notes/2026-09-26--NAS组网与三端SMB挂载-photos与data-shared/INDEX.md)
- [minigtr 断电恢复、UPS 选型与默认 Ubuntu 开机](../../notes/2026-09-26--minigtr断电恢复-UPS选型-默认Ubuntu开机/INDEX.md)
- [Rokid Glasses 接本地 Codex](../../notes/2026-10-25--rokid-glasses-接本地-codex/INDEX.md)
- E2B Embed 部署与公网接入：[agent-infra](../agent-infra/README.md)
- 任务卡：[现场配置 minigtr 断电恢复后自动开机](../../.edges/tasks/backlog/2026-11-08--现场配置-minigtr-断电恢复后自动开机/INDEX.md)
<!-- edges-entries-local:start -->
## 本层内容

- [notes/README.md](<notes/README.md>) — 笔记内容的组织清单。
<!-- edges-entries-local:end -->
