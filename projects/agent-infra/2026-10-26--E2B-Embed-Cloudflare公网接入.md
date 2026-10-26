# 2026-10-26--E2B-Embed-Cloudflare公网接入

> 自托管 E2B Embed 如何用已有 Cloudflare Tunnel 给外网 SDK / Dashboard 用。

## 背景

minigtr-ubuntu 上 E2B Embed 已部署并通过本机 smoke，但只有本机与 Tailscale 能访问。要把外面的人（或其它未入网设备）接进来，需要公网 HTTPS 入口。

## 主题

给已部署的 E2B Embed 补公网接入，并想清楚长期用 Tunnel 还是本机 nginx。

- 难点一：Embed 对外是三个口（API / Dashboard / sandbox 代理），不是一个域名能包完。
- 难点二：官方 Dashboard 的 `PUBLIC_SANDBOX_URL` 默认拼成 `http://主机:3002`，经 Tunnel 的 HTTPS 独立域名时必须改掉。
- 难点三：凭证与内部口不能随公开笔记外泄。

## 过程

### 14:25 用法与「外面怎么接」

说明本机 SDK 用法后，收敛到外部接入：当时未做 Tunnel，外人接不了。

### 14:27–14:28 入口选型

确认 minigtr 已有 `cloudflared`（token 远程配置），没有 nginx。从长期维护角度选 Cloudflare Tunnel：已有栈、不开公网端口、证书与 `*.viruspc.tech` 一套；nginx 更适合机内路由，单独扛公网还要叠证书与防火墙。

### 14:28–14:31 为何三个入口

Embed 拆成 API、Dashboard、client-proxy；Cloud 把后两者藏进 `*.e2b.app`，自托管要各开一个公网 hostname。

### 14:31–14:39 落地 Tunnel

在 Cloudflare 账号里改 `minigtr` 隧道 ingress（保留 langfuse / lf-experiment），新增：

- `e2b.viruspc.tech` → `http://127.0.0.1:3100`
- `e2b-dash.viruspc.tech` → `http://127.0.0.1:3001`
- `e2b-sandbox.viruspc.tech` → `http://127.0.0.1:3002`

并为三域名建 CNAME 到该隧道。公网探测：API `/health` 与 Dashboard 为 200；sandbox 裸访问无路由头返回预期错误。

改 `~/services/e2b-embed/compose.yaml`：`PUBLIC_SANDBOX_URL=https://e2b-sandbox.viruspc.tech`，`DASHBOARD_COOKIE_SECURE=true`，强制重建 dashboard 后环境变量生效。台账 `inventory.md` / `interfaces.md` 已登记公网 URL。

## 结果

- 公网三入口可用；Dashboard 沙箱地址已指到 HTTPS 代理域名。
- 外部 SDK：HTTPS API + sandbox URL + 本机 `sdk.env` 的 team API key（key 不进公开笔记）。
- 未做：Access 门禁、固定暴露策略评审、把本段合并进部署记录前的 PR（由本笔记入库一并处理）。

## 所学

- 自托管 Embed 的「外面接入」= 三 hostname + 一把 team key，不是只开 API。
- 已有远程配置 Tunnel 时，改 ingress + DNS 即可，不必再起本机 nginx。
- Dashboard 经 HTTPS 时，务必改 `PUBLIC_SANDBOX_URL`（及 cookie Secure），不能只设 `E2B_DASHBOARD_HOST` 再拼 `:3002`。

相关可选项：本机 nginx 反代再 Tunnel 单入口——当时未做，因为三服务本就分口，多一层维护；单独 nginx 公网——证书与端口成本更高，且机器上已有 Tunnel。

## 行动指南

### 主题行动指南

#### 背景
单机自托管沙箱栈要对公网或外机提供 SDK / 控制台。

#### 核心问题
如何用现成 Tunnel 暴露多端口服务，且控制台里的沙箱链接可点。

#### 核心解决方案
1. 用已有 Tunnel 为 API、Dashboard、sandbox 代理各挂一个 HTTPS 域名（相关可选项：单域名 path 分流——Embed 未按 path 拆，不做）。
2. DNS CNAME 指到该隧道；只暴露这三个口，内部控制面端口不进 ingress。
3. 改 Dashboard 的公开沙箱 URL 为 HTTPS 代理域名，并按需打开 Secure cookie，再重建 Dashboard。
4. 把公网 URL 写入台账；API key 只留在主机 `sdk.env` / `ready` 输出。

#### 验收标准
- 公网 API health 与 Dashboard 返回成功
- Dashboard 环境中的公开沙箱 URL 为 HTTPS 代理域名
- 台账能查到三域名与取 key 方式，且无明文 key

### 细节与其他

#### 若要给外人 SDK
则：`E2B_API_URL=https://e2b.viruspc.tech`，`E2B_SANDBOX_URL=https://e2b-sandbox.viruspc.tech`，key 从部署机 `docker compose exec ready cat /run/e2b/sdk.env` 取后私下发给对方。

#### 若要开 Dashboard
则：打开 `https://e2b-dash.viruspc.tech`，粘贴同一把 team API key。

#### 若以后加门禁
则：可在 Cloudflare Access 挡 Dashboard；API 仍靠 key。当时未比较其它方案之外的 WAF 细则。

## 补充说明

- 原始材料：助手「IT资产管理」会话 2026-10-26（约 14:25–14:39 Asia/Shanghai）；同目录部署记录 `2026-10-26--E2B-Embed-minigtr部署.md`、调研 `2026-10-26--E2B-Embed自部署调研.md`；本机台账 `/workspace/devices/inventory.md` 与 `interfaces.md`；隧道名 `minigtr`（Cloudflare Zero Trust）。
- 域名：`e2b.viruspc.tech` / `e2b-dash.viruspc.tech` / `e2b-sandbox.viruspc.tech`。
- 部署目录（主机）：`~/services/e2b-embed/`；compose 相对上游有端口重映射与本次 PUBLIC_SANDBOX 补丁。
