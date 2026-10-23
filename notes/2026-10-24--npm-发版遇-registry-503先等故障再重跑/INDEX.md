# npm 发版遇 registry 503：先等故障再重跑

> Trusted Publisher 已修好之后，发版仍可能因 npm 临时故障失败；和拆仓后的 404 不是同一类问题。

## 背景

框架仓要发 `@viruspc/edges@0.2.5`（含 ADR 0045 子仓可写、ADR 0046 叶子登记到内容面 README）。用户说「发」，并授权助手代批 `npm-publish` 环境。目标是发上 npm，再把各台机器的全局 CLI 升到 0.2.5。

## 主题

记录一次「配置已对、流水线也过了测试，但上传 npm 仍失败」的发版过程：难点是区分 Trusted Publisher / 身份问题与 registry 临时故障，以及故障期间要不要立刻重跑。

- 难点一：Publish 步骤长时间卡在上传，一时分不清是挂起、审批没过，还是 registry 本身在抖。
- 难点二：npm 返回 503 或 status 页显示 publishing 部分故障时，重跑与干等怎么选；失败的 run 才能 `gh run rerun --failed`。
- 难点三：包日志里已显示 `+ @viruspc/edges@0.2.5`，但 `npm view` 仍是旧版或 404，需要再等 registry 传播。

## 过程

### 10:00 开启发版

用户说「发」。助手开框架仓升版本 PR [#28](https://github.com/VirusPC/edges/pull/28)，合入后打 annotated tag `@viruspc/edges@0.2.5`，触发 `publish-edges-cli.yml`。

### 10:18 代批部署环境

流水线卡在 `npm-publish` 环境审批。用户说「你来批吧」「然后各个机器都升上去」。助手代批，并让 IT 资产管理先只盘点各机 CLI 安装方式、不要先升。

### 10:44 首次上传失败（503）

测试 job 通过，provenance 也签了，上传时 npm 返回 `503 Service Unavailable`。npm status 页当时有 Package publishing 部分故障。助手判断是临时故障，不是 Trusted Publisher 配错（那一类会表现为 404 / 无权限，见既有笔记）。

### 10:47–18:21 是否立刻重跑

Grok Bot 侧 automation 问用户要不要重跑失败的 run。用户回「先等等」。在 npm 故障未解除时不重跑，避免无意义排队和再次撞审批。

### 11:07–11:35 重跑后上架

故障缓解后重跑失败 job；Publish 一度长时间 in progress。约 11:35 日志出现 `+ @viruspc/edges@0.2.5`，并提示包正在处理、可能要几分钟才可查。随后 `npm view` 才看到 0.2.5。

### 11:48 起各机升级

在线机（含本机默认 registry 是内网镜像、尚未同步新版本的机器）升到 0.2.5；镜像未同步时临时加官方 registry 安装。离线机交设备助手稍后升。发版轮询 routine 在确认上架后删除。

## 结果

- `@viruspc/edges@0.2.5` 已在 npm；框架仓 #28 已合，tag 已推。
- 多台在线机全局 CLI 升到 0.2.5；部分离线机延后。
- 没有改 Trusted Publisher，也没有改版本号或重打 tag。

## 所学

- **503 / registry 故障 ≠ Trusted Publisher 身份问题。** 后者常见是 404、无权限，处理是删掉重加绑定；前者看 npm status，等恢复后对失败 run 做 `gh run rerun --failed`。
- **用户说「先等等」时不要替用户重跑不可逆的发布。** 发布到 npm 无法撤回；故障未确认结束就重跑只会多撞一次审批。
- **日志里的 `+ package@version` 早于 `npm view` 可读。** 上架后还要留传播窗口；升级机器前以 `npm view … version`（必要时 `--prefer-online`）为准。
- **本机默认 registry 若是镜像且尚未同步，** 安装时临时指定官方 registry，不要误判「npm 上没有这个版本」。具体镜像名不入库。

可选项与不做原因：当时也可以改 Trusted Publisher 或升 0.2.6 重发——不做，因为 provenance 与仓库身份已经对上，失败形态是 503 不是 404；也可以在故障中反复 rerun——用户明确「先等等」，且失败 run 才能 rerun。

## 行动指南

### 主题行动指南

#### 背景

发版流水线测试与签名都过了，但上传 npm 仍可能因 registry 临时故障失败。

#### 核心问题

如何判断是配置问题还是 npm 故障，以及故障期间何时重跑、何时升级机器。

#### 核心解决方案

1. 先看失败形态与 npm status：503 / publishing degraded → 当临时故障；404 / 无权限 → 走 Trusted Publisher 排查（另见拆仓后 404 笔记）。
2. 故障未解除时不重跑、不升版本号、不重打 tag；用户未授权不代跑不可逆发布。
3. 故障解除后对**已失败**的 publish run 执行 `gh run rerun <id> -R <repo> --failed`，必要时再批一次 `npm-publish` 环境。
4. 以 `npm view <pkg> version` 确认上架后再升各机；镜像滞后时临时用官方 registry。

#### 验收标准

- [ ] npm `latest`（或目标 dist-tag）指向本次版本，且能 `npm view <pkg>@<ver>`。
- [ ] 未在故障窗口误改 Trusted Publisher 或无故升版。
- [ ] 各目标机 `edges --version` 与约定版本一致（离线机有明确后续）。

### 细节与其他

#### 若 Publish 长时间 in progress 且 status 页显示故障

则：继续观察，不要并行开第二次发版 PR；等 run 失败或成功后再决定 rerun。

#### 若本机 `npm view` 仍是旧版但 Actions 日志已显示 `+ package@ver`

则：再等数分钟并用 `--prefer-online` 查；仍没有再查 run 是否真的成功。

#### 若默认 registry 是内网镜像且查不到新版本

则：安装命令临时加官方 registry；不要把镜像延迟写成「发布失败」。

## 补充说明

- 原始材料：全栈开发专家、Grok Bot、IT资产管理、设备助手对话落盘 `/workspace/daily-scan/2026-10-24/`（窗口含 2026-10-22 发版当日）；框架仓 PR [#28](https://github.com/VirusPC/edges/pull/28)、Actions run `39709618610`。
- 相关笔记：[拆仓后 npm 可信发布 404](../2026-10-22--拆仓后-npm-可信发布-404按仓库身份认删掉重加/INDEX.md) — 身份/绑定类失败；本篇是 registry 临时故障类。
- 相关发版总览：[edges CLI npm 发布从手动 stage 到 GitHub Actions](../2026-10-19--edges-CLI-npm-发布从手动-stage-到-GitHub-Actions/INDEX.md)。