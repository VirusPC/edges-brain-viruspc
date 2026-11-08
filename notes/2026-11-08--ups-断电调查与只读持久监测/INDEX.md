# UPS 断电调查与只读持久监测

## 背景

一次设备恢复维护完成后，用户追问之前为什么断电，以及能否查看 UPS 记录。最初目标是只读取证，区分市电中断、UPS 电池耗尽、强制断电和系统故障。后来用户明确目标是持续记录 UPS 运行状态，发生停电后有材料归因，因此授权配置监测，但没有授权真实断电测试或新增自动关机动作。

本文记录 2026-11-08 晚间的实际调查、公开资料核验、部署与复查，并补入23:11–23:15的NAS独立UPS取证和用户对接线尚未确认的澄清。全部时间均为 Asia/Shanghai。公开版本去掉设备序列号、网络地址、机器标识、真实维护账号和私密连接信息；标准配置路径及监测服务名称保留，便于复现。本文不是给所有 APC 型号下结论，也不是保证每次停电都能定因。

用户原先以为两台异常关机电脑接在APC上，但截至本次补记尚未现场确认。已知的是APC通过USB连接Ubuntu主机；USB数据线连接不证明该电脑电源线接在这台UPS的备援输出上。NAS另有独立UPS。用户计划11月9日现场沿电源线核对，本文不提前替现场检查下结论。

## 主题

这次工作把“猜测断电原因”改成“先交叉验证历史，再建设下一次可用的证据链”：电脑启动和关机证据、UPS 软件历史、UPS 本体能力是三类不同材料；未来记录则采用现有 UPower 的只读客户端，加标准 systemd 服务与独立 journald 日志空间。

- 难点一：远程助手连接离线不等于主机离线，更不等于 UPS 离线。需要使用既有正常维护通道验证主机，而不是把某个应用的连接状态当供电状态。
- 难点二：日志突然结束只能证明记录中断；必须与正常关机序列、启动时间、其他设备的异常关机标记和 UPS 状态轨迹交叉判断。
- 难点三：型号手册提到的“power event history”不自动意味着 UPS 本体保存带时间的历史；电脑软件日志、最后一次切换原因/计数、Smart-UPS 或网络管理卡日志不能混用。
- 难点四：新增记录必须不抢占 USB、不触发输出断电或自动关机，同时要考虑 D-Bus 权限、开机自启、缓存、同步间隔和磁盘轮转。
- 难点五：两台UPS和多台设备的真实供电拓扑尚未核实。另一台UPS的输入事件能补强共同环境线索，但不能直接证明APC失效，跨设备按秒排序还受时钟同步状态影响。
- 难点六：该系列存在短暂低电量/换电池状态误报资料；需要保留原始读数，而不是把一条告警自动翻译成“电池耗尽”。

## 过程

### 21:56–22:00 先查辅助电脑，但把应用离线当成调查终点

首先列出注册设备。UPS 所连 Ubuntu 主机的 Grok 本地连接显示离线，辅助 Mac 在线。执行者先从辅助 Mac 读取启动、关机和电源信息：

- `sysctl kern.boottime` 给出的本次启动为 11-07 08:10:37。
- `last reboot shutdown` 显示前次启动为 10-23 20:32，没有对应这次的正常 shutdown 条目。
- `pmset -g log` 中 11-08 14:57:10 的 powerd 启动不是整机开机时间，不能替代内核启动时间。
- 11-07 08:10:42.234 内核明确记录 `*UNEXPECTED SHUTDOWN DETECTED*`。
- `pmset -g ups` 没有输出；顶层诊断报告目录未发现以 panic/shutdown 命名的报告。这只是不足以定位原因，不能排除其他位置的崩溃证据。

第一次跨数日的日志筛选包含不带边界的 `UPS`，意外匹配到了 `groups` 等普通单词，产生大量无关输出。约 105 秒后停止这次过宽查询，改为限定启动时段、指定 kernel/powerd 进程与明确错误文本。随后显式使用 `--timezone Asia/Shanghai`，把原先显示为 UTC 的启动日志核对到北京时间。最终关键命令如下：

```sh
/usr/bin/log show \
  --start '2026-11-07 08:10:00' --end '2026-11-07 08:15:00' \
  --timezone Asia/Shanghai --style compact \
  --predicate 'process == "kernel" AND (eventMessage CONTAINS[c] "UNEXPECTED SHUTDOWN DETECTED" OR eventMessage CONTAINS[c] "Previous shutdown cause" OR eventMessage CONTAINS[c] "shutdown data")'
```

此阶段报告 APC USB所连Ubuntu主机的 Grok 连接离线，未继续验证其他正常通道。这是不完整的调查：应用连接状态与主机存活不是同一件事。用户随后指出主机应当已在线，促使调查继续。

### 22:05–22:07 恢复正常维护通道，确认不是 UPS 离线

先从云端执行环境尝试原有目标的 SSH，连接超时。再从在线辅助 Mac 检查路由、既有 SSH 配置与局域网连通性：目标能 ping 通，SSH 端口也响应，但默认身份认证返回 `Permission denied (publickey,password)`。这说明阻碍是当前通道的认证，而不是目标断电。云端环境和该辅助 Mac 都没有可用的默认 SSH 配置。

随后尝试 `SearchTranscripts`，工具返回本子会话无历史记录；再通过 `RecallMemory` 找到过去“经 Tailscale SSH 维护”的线索。改从另一台在线 MacBook 使用其现有 Tailscale 环境和正常 SSH 通道，22:07:22 成功读取目标主机信息。不读取私钥、不复制凭证、不新增授权、不修改网络。

公开笔记不保留真实地址和账号。该步骤实际使用的是带 `BatchMode=yes`、`ConnectTimeout=8` 的 SSH 调用，并在远端读取 `hostname`、时区时间、`uptime` 和 `journalctl --list-boots --no-pager`。后续调查和部署都沿这个已经成功的通道进行。

### 22:07–22:09 读取 APC USB所连Ubuntu主机日志和真实历史文件

实际使用的核心调查命令为：

```sh
export TZ=Asia/Shanghai
journalctl --list-boots --no-pager
last -x -n 18
journalctl -b -1 -n 90 --no-pager
dpkg-query -W nut nut-client nut-server apcupsd upower
systemctl list-unit-files --no-pager
upower -e
upower -d
ls -l /var/lib/upower
journalctl -u upower --since '2026-11-06' --until '2026-11-09' --no-pager
journalctl -b -1 --since '2026-11-07 06:00' --no-pager \
  -g '(?i)(battery|ups|power.?off|shut.?down|panic|watchdog|thermal|hiddev|usb.*disconnect)'
journalctl -b 0 -k --no-pager \
  -g '(?i)(recover|unclean|corrupt|panic|watchdog|power|ups|apc|hiddev)'
```

最后还读取上一启动完整的 upower 单元日志、相关关键事件和持久崩溃存储目录，并检查 UPS 电量历史文件的全部内容，而不只相信 `has history: yes`。

观察到：

| 观察时间或事件时间 | 可证实内容 |
| --- | --- |
| 11-07 08:06:36 | APC USB所连Ubuntu主机上一启动的最后一条 journal 是普通 tailscaled 网络记录，没有正常关机序列。此时是最后保存记录时间，不是精确断电时间。 |
| 11-07 08:10:37–42 | 辅助 Mac 开机并报告上一次非正常关机。 |
| 11-08 14:37:29 | APC USB所连Ubuntu主机再次启动；journald 报告原 system.journal `corrupted or uncleanly shut down, renaming and replacing`。此时不是已证实的恢复市电时间。 |
| 11-08 14:37:34 | UPS 的 UPower 电量历史从 `98.000 charging` 开始。 |
| 11-08 14:58:18 | 电量历史为 `99.000 charging`。 |
| 11-08 15:18:49 | 电量历史为 `100.000 fully-charged`。 |
| 22:07 左右 | USB 可识别 APC Back-UPS BK650M2_CH，present=yes、100%、fully-charged、on-battery=no，估算剩余运行时间 9.9 分钟。 |

电量文件同一开始时间还有 `0.000 unknown`，这是初始化未知值，不能解释成“UPS 曾经耗尽到 0%”。历史文件只有此次启动后的这些条目；其他 rate/time-empty/time-full 文件也没有补出事发时的轨迹。当前电量和估算续航不能反推前一天电池是否耗尽。

核验结果是：只安装了 UPower 1.90.3，没有 NUT、nut-client、nut-server 或 apcupsd；相关配置与日志路径不存在。上一启动的 upower 单元日志只有 10-23 的服务启动，没有事发时的电池事件。检索没有发现事发时的低电量、转电池、正常整机关机、kernel panic 或热保护证据，持久 pstore 目录为空。检索输出中的较早 `systemd[用户进程PID] shutdown.target` 是用户管理器退出，不应当当作整机关机。

截至这一阶段，两台设备接近时段的异常终止提示共同供电中断的可能，但尚无直接UPS输入事件；不能确认市电停电、UPS耗尽或实际供电拓扑，也不能排除其他强制断电或故障。后续NAS独立UPS补出了输入异常证据，见23:11–23:15；这仍不证明APC未撑住。

### 22:39–22:41 核实 UPS 本体是否自带可读历史

用户继续追问“难道 UPS 没有自带日志吗”，因此单独查型号特定官方说明书，而不是以电脑端历史缺失代替硬件结论。

下载并用 `pdftotext -layout` 阅读官方《Back-UPS BK500M-CH / BK650M2-CH》完整说明书。第 4–5 页的 PowerChute Personal Edition software 段落确实写着：

> “Monitor and view the status of the Back-UPS, including estimated runtime, power consumption, and power event history.”

紧接着又写：

> “Available features will vary depending on the Back-UPS model and your operating system.”

这支持“PowerChute 软件提供事件历史功能”，不能单凭这句话证明历史保存在 UPS 本体。全书没有找到该型号本体日志容量、带时间事件导出或读取流程；没有写不等于从硬件上证明没有。

官方 FAQ FA159672 把 PowerChute 的 `EventLog.txt` 定位在安装电脑的 agent 目录。官方社区相关答复也明确：“Events that happened prior to the software's installation will not be available.” 后者不是此型号专属硬件规格，只能作为“事后安装软件无法补取旧事件”的辅助证据。

搜索里出现过最后十次切换/故障、网络管理卡等资料，但实际语境涉及 SMX1000、AP9630/31，属于 Smart-UPS 或管理卡能力，没有套到此 Back-UPS 上。对于本型号是否另有最后切换原因或计数，未取得确认，保持未知。

NUT 官方 USB 驱动说明另外明确提到 APC BKnnnnM2-CH 可能短时来回报告 low battery、replace battery、all ok。该说明是监测解释边界，不能倒过来认定它造成了本次设备停机。

### 22:41–22:44 由追溯转为建设未来证据，选择最小方案

用户明确目标是记录 UPS 状态并支持今后归因，于是从只读调查转为获准配置监测。部署前核验 `sudo -n true` 可用、systemd 为 255、UPower 为 active、磁盘有充足空间，且计划新增的五个配置路径均不存在。

研究了 NUT `upslog`、UPower 官方命令文档，并读取发行版安装的 `journald.conf` 和 `systemd.exec` 手册。网页版本的 systemd 手册请求超时后，使用本机已安装官方 man 文档核验 `Storage`、`SystemMaxUse`、`MaxRetentionSec`、`SyncIntervalSec` 和 `LogNamespace`，没有凭印象填参数。

原本考虑成熟 UPS 工具 NUT/apcupsd。最终为了避免增加另一个 USB 驱动、可能的内核接口接管、自动关机组件和兼容性变数，选择现成 UPower CLI 配合标准 systemd/journald。没有安装额外软件，也没有编写监控程序。代价是当前 UPower 后端未暴露输入电压与负载，明确不采集这两项。

先保存部署前 UPower 状态、服务状态，以及回滚说明，再创建独立日志空间、事件服务、定时快照和系统证据复制服务。首批服务在 22:44:09 启动，首批快照实际写入成功。

### 22:44:27–22:44:44 修正动态身份的 D-Bus 失败

最初两个只读 UPower 客户端使用 `User=nobody`，`systemd-analyze verify` 提示使用特殊 nobody 用户不安全。因此改试 `User=ups-observe` 配合 `DynamicUser=yes`。

动态身份下，客户端返回 `Cannot connect to upowerd: The connection is closed`；事件服务进入自动重试，快照失败。没有据此宣称 UPS 离线，也没有修改 D-Bus 策略或新增授权。随后改为现有普通维护用户，并保留 `NoNewPrivileges`、`ProtectSystem=strict`、`ProtectHome`、`PrivateTmp` 和 `PrivateDevices`。22:44:44 重新启动客户端后，快照成功、事件监听稳定。

日志中 22:44:27–42 的连接失败是部署调试轨迹，不是 UPS USB 掉线事件。最终事件服务 `NRestarts=3` 是调试累积，后续没有增加；系统证据服务为 0。此处只验证到“动态身份连接失败、现有身份成功”，没有进一步证明 D-Bus 拒绝的底层规则。

### 22:44:54–22:45:29 安全验证采样与轮转

验证启用状态、服务活动状态、快照退出码、日志文件、实际 UPS 状态及无新增监控监听端口。执行了专用 namespace 的安全日志轮转和同步，没有清理旧日志。轮转后的历史仍可读。

等待计时器自然运行，22:45:15 产生新一组电量、on-battery 和 uptime 记录，22:45:29 核验 `Result=success`。这证明不是只执行过一次手动快照。日志空间此时实际占用约 17MiB；这是含 journal 预分配/轮转的占用，不能按一分钟线性推算每天磁盘量。

没有重启电脑、拔 USB、模拟停电、测试放电、发送 UPS 控制命令或改变电池阈值。开机自启已经配置并核验 enabled，但没有通过真正重启验收。

### 23:07–23:09 为笔记只读复核，不再部署

用户要求记录详细过程。执行者加载笔记与仓库规范，定位个人大脑仓而不是框架仓，读取 AGENTS 和项目记忆，创建本次专用 worktree。没有找到适配的已有 UPS/设备运维主题 Project，因此按现有直属 notes 约定选择 scope 直属 Notes，不初始化 Project。

23:09:09 沿成功的维护通道读取 `systemctl cat`、journal namespace 配置、原始操作/回滚说明与当前状态。四个相关服务/计时器检查均 active；最近一次快照在 23:08:58 成功；重启计数仍为事件服务 3、系统证据服务 0，日志空间仍约 17MiB。此轮只读核对，没有新开监控或任务。

### 23:11–23:15 读取NAS独立UPS日志，补入直接输入异常证据

用户说明NAS连接了另一台独立UPS。先读取既有设备台账与维护接口说明，确认NAS为绿联DXP4800PLUS，沿在线MacBook已有正常SSH通道直接进入。没有广泛扫描、读取私钥或新建认证。初次使用普通账号读取journal时只能看到自己的消息；尝试免密sudo返回需要密码。执行者没有把权限受限解释为“没有记录”，也没有改权限，而是继续读取当前admin组本来可见的系统日志和UPS专用日志。

只读 `upsc ups0@localhost` 显示另一台UPS为UGREEN US7000，驱动为NUT `usbhid-ups`，设备名 `ups0`；NAS原有nut-driver、nut-monitor、nut-server均运行。它不是APC BK650M2_CH。当前查询为OL、输入220V、电量100%；`battery.runtime=65535`等数值可疑，不当作真实18小时续航，不据此还原过去放电情况。NAS已有监测和关机控制服务是此前配置，本轮没有启停或修改。

在 `/var/log/ups/ups_tool.log` 找到11月7日直接事件，以下仅保留原文时间及事件内容，删去厂商构建路径：

```text
2026-11-07 08:08:18.947462 [/usr/sbin/ups_tool onbatt]
2026-11-07 08:08:18.997200 ups status: OB
2026-11-07 08:11:03.965669 [/usr/sbin/ups_tool online]
```

从切电池到恢复在线输入约2分45秒。这是NAS那台UPS报告输入异常并切到电池、随后恢复的直接证据；onbatt本身不能区分完全断电与输入电压异常。日志没有该次lowbatt或NAS关机条目；`set timer standby success, seconds: 0`也不能擅自解释为NAS已经进入安全模式。伴随的厂商软件错误不改变OB/online原文，但没有进一步定位这些错误的影响。

`who -b`、`last -x`和 `/proc/stat` 的 `btime` 相互吻合，NAS启动为10-07 14:06:05，当前uptime超过32天，11月7日没有整机重启。由此可确认NAS整机供电保持运行，不是NAS也在同一时刻掉机后重启。

`/etc/localtime`和 `timedatectl` 确认为Asia/Shanghai，但当前 `NTPSynchronized=no`。不能证明事发时钟精确同步，不能将三台机器的时间按秒强行排成因果链。辅助Mac的08:10:37启动早于NAS记录08:11:03恢复约26秒，须保留时钟差、独立输入线路或UPS行为等未决解释，而不是为了贴合“同一路停电”改写事实。Ubuntu最后记录08:06:36也不是精确掉电时间。

可读syslog的轮转最早只到11-07 19:00，不覆盖上午事件；上午记录是从独立保留的ups_tool.log取得，不能因syslog缺覆盖说没有记录。root系统journal未读到，权限限制仍存在，但此次关键UPS事件已经取得。

### 23:15 用户澄清真实接线未确认，现场核对尚未完成

用户一直以为Ubuntu和辅助Mac接在APC上，但尚未确认，计划11月9日现场核对。结论因此更新为：NAS一路保持运行，其独立UPS报告约2分45秒输入异常；另两台设备有非正常关机线索；真实供电拓扑、实际插口及是否经过旁路尚未确认。不能写成“APC那一路没撑住”“APC电池耗尽”或“这两台肯定由APC备援供电”。

现场只需先沿两台电脑电源线追踪到实际插口，核对APC插口标识、适用型号手册及插排/旁路。某些UPS可能区分电池备援和仅防浪涌插口，但本型号是否有这样的区分必须看实际标识和手册，不能预设。此次不直接拔电测试、不自动开任务或提醒、不新增配置。

## 结果

- 历史调查已补强：NAS独立UGREEN US7000在11-07 08:08:18报告onbatt/OB、08:11:03报告online，约2分45秒；NAS自身自10-07以来未重启。可确认NAS的UPS记录了输入异常和恢复，不能仅凭该记录区分停电与电压异常。
- 另两台设备存在非正常关机线索，但其电源是否真正经过APC备援输出尚未确认，不能得出APC没撑住或电池耗尽的结论。当前NAS NTP未同步，跨机秒级因果顺序也未证实。
- 纠正了 Grok 连接离线等于主机/UPS 离线的错误，把调查恢复到实际可用的正常维护通道。
- UPS 本体带时间持久日志的支持情况仍未确认；不能写成“绝对没有”，也不能承诺事后补回。
- 已部署只读持久监测，事件变化、30秒快照、uptime、启动与相关系统证据进入独立日志空间；没有新增自动关机逻辑，没有修改现有 UPower 策略。
- 动态身份方案失败后退回现有普通用户；监测功能最终成功，没有回退整个部署。
- APC侧监测输入电压和负载缺失，真实断电/低电/USB断开/来电事件未人为测试。NAS取得的是已有历史，不是本轮实验。用户计划11月9日现场核对接线，此项尚未完成；本次不另开任务或提醒，也不重复已有 BIOS 现场配置待办。

## 所学

应用在线状态、主机在线状态、USB 通信状态和供电状态是不同层。应先写清哪一层失败，不能从一个客户端断连跨层推断停电。

USB通信拓扑和实际供电拓扑也不同。能读到某台UPS并不证明这台电脑的电源插在其备援输出；NAS独立UPS的OB/online记录只能首先归属于NAS那一路。未现场沿电源线确认前，不能把“别的UPS记录停电”和“电脑异常关机”拼成某台UPS失效的结论。时区正确也不等于NTP已同步。

“历史”也有层级：周期读数、软件产生的事件日志、设备有限状态和设备持久带时间日志不同。公开资料必须精确到型号；Smart-UPS/NMC 能力不能套给普通 Back-UPS。对硬件本体能力无法证实时，保留未知比笼统断言更准确。

此次选用 UPower 的收益是低侵入、无需新驱动、没有新增输出控制路径；代价是指标有限且可能缓存。NUT 能提供更丰富监测能力，但本轮不为了新增两个指标而接管 USB 或引入关机控制配置。若未来评估其他工具，应作为独立变更，先解决兼容与只读边界，而不是在这份已运行方案里偷偷增加。

1秒同步、30秒快照和状态事件订阅共同改善证据覆盖，但都不是不可丢失的电力黑匣子。零星低电量告警、孤立断日志、单次续航估计都不应直接转成确定归因。

## 行动指南

### 主题行动指南

#### 背景

需要在下一次供电异常发生后，还能找到 UPS 状态变化与电脑终止的先后关系，而不是只知道机器曾经重启。

#### 核心问题

记录源可能离线、缓存、漏报或缓冲未落盘；设备可能只提供状态，不提供可补取的历史。监控本身还不能改变被监控设备的行为。

#### 核心解决方案

1. 先确认数据线与供电线是两套关系，沿实际电源线核对设备、插口和旁路，不凭USB连接推断备援供电；未知拓扑先记未知，不直接拔电测试。
2. 先验证主机与既有维护通道，分开记录应用、网络、身份认证和 USB 故障；不要用应用断连替代主机供电判断。
3. 读取启动列表、上一启动末尾、正常关机序列及多设备时间线；把最后一条日志时间标为证据边界，不当作断电时刻。
4. 核实型号官方手册及现有日志覆盖范围；区分软件历史和硬件日志。对未知能力不下绝对结论。
5. 优先复用现成只读状态接口，使用标准服务管理和持久日志，不主动接管 USB、不发送测试或输出控制命令。更换驱动的选项本次不做，因为可能引入兼容与控制风险。
6. 同时记录变化事件、周期状态与采集心跳，再加入启动和系统异常证据；为专用日志单独设置空间、保留时间及同步频率，不更改无关全局策略。
7. 先保留回滚说明，再启用服务；用实际周期输出、退出码、日志归档可读性和服务状态验收，不用真实停电来“顺手测试”。
8. 事后先核实各机时区与同步状态，对齐事件时间与复制时间，再比较切电池、充电、电量下降、低电、设备移除、日志停止与下一次启动。证据缺环时保留多种解释。


#### 验收标准

- [x] 已核验现有 UPS 身份，监测不需要新增 USB 驱动或控制命令。
- [x] 事件监听与定时采样已启用自启，周期采样实际成功且退出码为0。
- [x] 日志在硬盘独立保存，轮转后旧记录可读，容量/时间边界已写明。
- [x] 存在启动、uptime和相关系统证据，能够区分设备时间与日志复制时间。
- [x] 已保存部署前状态、最终配置副本及可操作回滚说明。
- [x] 指标缺失、缓存、误报及缓冲丢失风险已注明，没有承诺百分百归因。
- [ ] 用户计划11月9日现场核对两台电脑的实际电源去向、插口能力及旁路，本次未完成，不默认APC故障。
- [ ] 真正重启后的自启验证、真实切电池/恢复市电/低电/USB移除验证本次未做；需要另行安排，不能冒称已验收。

### 细节与其他

#### 若要复核本次部署环境和原始证据

则在 APC USB所连Ubuntu主机现有维护会话内执行以下命令。公开版本不提供具体连接目标或凭证；不需要搜索、展示或复制私钥。

```sh
export TZ=Asia/Shanghai
hostname
date
sudo -n true
systemd --version
upower --help
upower -e
upower -d
systemctl is-active upower
journalctl --list-boots --no-pager
last -x -n 18
journalctl -b -1 -n 90 --no-pager
```

本次环境为 UPower 1.90.3、systemd 255；目标 UPS 由 `/org/freedesktop/UPower/devices/ups_hiddev0` 暴露。完整设备序列号不入公开笔记。原 UPower 历史在 `/var/lib/upower/history-*-American_Power_Conversion-Back-UPS_BK650M2_CH-<序列号>.dat`；要读全文件核对覆盖区间，不把初始化 `unknown` 当作有效0%读数。

#### 若要理解最终日志与指标机制

则以当前 `systemctl cat` 的以下完整配置为准。公开版只把实际账号替换为 `MAINTENANCE_USER`，这是占位符，不是已创建的新账号；复制部署前必须换成已验证能访问系统 D-Bus 的现有普通用户。其余参数来自23:09只读核对的最终文件。

`/etc/systemd/system/ups-observe-events.service`：

```ini
[Unit]
Description=Read-only UPower device events for UPS forensics
Wants=upower.service
After=dbus.service upower.service
[Service]
Type=simple
User=MAINTENANCE_USER
Environment=TZ=Asia/Shanghai
Environment=LC_ALL=C
ExecStart=/usr/bin/stdbuf -oL -eL /usr/bin/upower --monitor-detail
Restart=always
RestartSec=5s
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
LogNamespace=ups-observe
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
```

`stdbuf -oL -eL` 减少客户端输出因行缓冲而延迟。事件来自 UPower 的设备增加、移除、属性变化；并非新程序自行判断停电原因。`Restart=always` 会使客户端退出后重连，但不能保证发现所有静默挂死。

`/etc/systemd/system/ups-observe-snapshot.service`：

```ini
[Unit]
Description=Read-only UPS periodic state and observer heartbeat
Wants=upower.service
After=dbus.service upower.service
[Service]
Type=oneshot
User=MAINTENANCE_USER
Environment=TZ=Asia/Shanghai
Environment=LC_ALL=C
ExecStartPre=/usr/bin/uptime
ExecStart=/usr/bin/upower --dump
TimeoutStartSec=15s
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
LogNamespace=ups-observe
StandardOutput=journal
StandardError=journal
```

`/etc/systemd/system/ups-observe-snapshot.timer`：

```ini
[Unit]
Description=UPS forensic snapshot every 30 seconds
[Timer]
OnBootSec=20s
OnUnitActiveSec=30s
AccuracySec=1s
Unit=ups-observe-snapshot.service
[Install]
WantedBy=timers.target
```

每次 `upower --dump` 包含 UPS 和 DisplayDevice 汇总；不能把这两组重复电量当两台 UPS。快照采集模型/序列号、present、state、warning-level、percentage、time to empty、updated 和 daemon on-battery。输入电压与负载没有暴露，当前方案没有采集。30秒是客户端采样周期，不保证硬件读数每30秒更新；分析时一起看 `updated` 与uptime。

`/etc/systemd/system/ups-observe-system.service`：

```ini
[Unit]
Description=Copy boot power USB and shutdown evidence into dedicated UPS journal
After=systemd-journald.service
[Service]
Type=simple
User=root
Environment=TZ=Asia/Shanghai
Environment=LC_ALL=C
ExecStart=/usr/bin/journalctl --follow --boot --lines=all --output=short-iso-precise --grep=(?i)(usb|hiddev|power|panic|watchdog|thermal|reboot|shutdown|recover|unclean|corrupt) _TRANSPORT=kernel + _PID=1
Restart=always
RestartSec=5s
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
LogNamespace=ups-observe
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
```

此服务只读取默认系统 journal，并把匹配的当前启动 kernel 或 PID1 信息写入专用 namespace；不是完整系统日志备份，宽关键词也会带入部分无线功率等无关条目。它使用 root 读取原始日志，UPower 两个客户端使用普通账号。所有这些服务都设置 `PrivateDevices=yes`，客户端不直接打开物理 USB，已有 UPower 守护进程继续管理 USB。没有部署NUT端口或其他网络监听。

#### 若要复核持久化、同步和轮转

则读取 `/etc/systemd/journald@ups-observe.conf`：

```ini
[Journal]
Storage=persistent
Compress=yes
SystemMaxUse=512M
SystemMaxFileSize=16M
SystemKeepFree=1G
MaxRetentionSec=90day
MaxFileSec=1day
SyncIntervalSec=1s
RateLimitIntervalSec=30s
RateLimitBurst=10000
ForwardToSyslog=no
ForwardToKMsg=no
ForwardToConsole=no
ForwardToWall=no
```

日志在 `/var/log/journal/<machine-id>.ups-observe/`。90天是最大时间策略，不保证一定保住90天：512MiB目标和1GiB磁盘余量约束可能更早淘汰历史；活动文件可能暂时超过容量目标。16MiB单文件与每日轮转都不是立即删除全部旧记录。1秒sync缩短正常等级消息的落盘窗口，但文件系统、存储设备缓存和骤断电仍会丢末尾。高频事件还可能受限流影响；单条事件缺失不等于事情未发生。

#### 若要复现当时实际启用和验证步骤

则先检查目标文件不存在，或按自己的变更流程备份已有文件。此次五个配置文件原先均不存在，因此备份记录的是“无旧配置”，没有覆盖别人的配置。备份目录为 `/var/backups/ups-observe-20261108/`，包含 `BEFORE.txt`、`upower-before.txt`、`upower-enabled-before.txt`、`upower-active-before.txt`、最终配置、`OPERATIONS.txt` 和 `ROLLBACK.txt`。

写入上述标准配置后，当时实际执行的关键启用/验证命令为：

```sh
sudo systemd-analyze verify /etc/systemd/system/ups-observe*.service \
  /etc/systemd/system/ups-observe-snapshot.timer
sudo systemctl daemon-reload
sudo systemctl enable --now ups-observe-events.service \
  ups-observe-system.service ups-observe-snapshot.timer
sudo systemctl start ups-observe-snapshot.service
sudo journalctl --namespace=ups-observe --sync
sudo systemctl status ups-observe-events.service ups-observe-system.service \
  ups-observe-snapshot.timer --no-pager
sudo systemctl show ups-observe-snapshot.service -p Result -p ExecMainStatus
sudo systemctl list-timers ups-observe-snapshot.timer --no-pager
sudo journalctl --namespace=ups-observe --rotate
sudo journalctl --namespace=ups-observe --sync
sudo journalctl --namespace=ups-observe --disk-usage
```

身份修正后还执行 `sudo systemctl restart ups-observe-events.service` 和手动快照，然后等待timer自然采集。上面为本次已执行步骤的命令整理，不是要求现在重跑；真实远程执行使用已有 `sudo -n bash -s` 管理会话。只读核验最终配置可用 `sudo systemctl cat`，无需重启UPower。

#### 若要排查“采集报错但设备未必离线”

则分别查看事件客户端退出状态、快照结果、UPower服务与设备读数。此次DynamicUser失败的报错是 `Cannot connect to upowerd: The connection is closed`；使用现有账号后恢复，没有新增D-Bus策略。不能把这段客户端身份失败算成实际USB断连。

```sh
systemctl is-active upower ups-observe-events.service \
  ups-observe-system.service ups-observe-snapshot.timer
systemctl show ups-observe-events.service -p ActiveState -p NRestarts
systemctl show ups-observe-snapshot.service -p Result -p ExecMainStartTimestamp
upower -i /org/freedesktop/UPower/devices/ups_hiddev0
```

日志中的 `critical-action: PowerOff` 在部署之前已经存在。本次没有设置它，没有改变UPower或桌面电源管理策略，也没有启用新的自动关机动作。“本次不新增自动关机”不等于宣称整机历史上没有任何电源策略。

#### 若下次需要按时间范围归因

则先用快照与事件确定证据范围，再与系统日志对照。下面是可直接替换时间的查询模板；示例沿用本次部署时段，查看命令不触发设备动作。

```sh
export TZ=Asia/Shanghai
sudo journalctl --namespace=ups-observe \
  --since '2026-11-08 22:44:00' --until '2026-11-08 23:10:00' \
  -o short-iso-precise --no-pager
sudo journalctl --namespace=ups-observe -u ups-observe-events.service \
  --since '2026-11-08 22:44:00' -o short-iso-precise --no-pager
sudo journalctl --namespace=ups-observe -u ups-observe-snapshot.service \
  --since '2026-11-08 22:44:00' -o short-iso-precise --no-pager
sudo journalctl --namespace=ups-observe -u ups-observe-system.service \
  --since '2026-11-08 22:44:00' -o short-iso-precise --no-pager
sudo journalctl --namespace=ups-observe --list-boots --no-pager
journalctl --list-boots --no-pager
journalctl -b -1 -n 100 --no-pager
```

- 系统证据服务会在启动/重启该observer时回放当前boot已存在记录。外层journal时间是复制时刻，文本内嵌 `2026-…+08:00` 才是原始事件时刻；不能把22:44复制出的14:37启动事件当22:44刚开机。
- namespace里的boot标识属于采集主机本次启动。判断前次关机时同时读取默认系统journal，不以复制时间代替原始时间。
- 出现持续discharging/on-battery、后续电量下降和低电，再发生主机记录停止，可支持“电池供电后中断”的判断；仍需排除误报和其他关机原因。
- 单次低电/换电池信号不能证明耗尽。NUT对该系列短时误报有明确说明，本方案保留原始状态，没有自动触发动作或加入自行编造的过滤阈值。
- UPS设备移除/内核USB断开而uptime快照继续，优先调查通信链路；“所有记录都停止”仍可能是整机断电、系统故障、磁盘或采集服务异常，需要下一次启动和其他设备证据。
- 不能把电池98%开始充电、初始化0 unknown、当前9.9分钟估计值或缺少正常关机条目单独当作确切停电原因。

#### 若要复查NAS独立UPS的直接事件

则从已有正常维护会话只读查询。NAS为绿联DXP4800PLUS，独立UPS为UGREEN US7000，NUT名称为 `ups0`；这组标识不指向APC。以下是23:12–23:13调查实际执行过的关键命令整理，不含私密连接目标或账号：

```sh
export TZ=Asia/Shanghai
date
uptime
who -b
last -x -n 10
upsc ups0@localhost
systemctl list-units --all --no-pager
ls -la /var/log/ups
cat /var/log/ups/ups_tool.log
grep '2026-11-07' /var/log/ups/ups_tool.log
readlink -f /etc/localtime
timedatectl show -p Timezone -p NTPSynchronized
awk '$1=="btime" {print}' /proc/stat
TZ=Asia/Shanghai date -d @1791353165 '+%F %T %Z'
```

最初还执行了 `journalctl --list-boots --no-pager`，输出权限提示：普通账号看不到系统和其他用户消息。`sudo -n true`及root journal读取尝试返回需要密码，没有取得root权限，未通过别的方法绕过。现有admin组可直接读取 `/var/log/syslog*` 及 `/var/log/ups/ups_tool.log`。已用 `zgrep`筛过syslog和压缩轮转，并逐文件检查首末时间：最早轮转始于11-07 19:00，缺上午覆盖，但专用UPS日志仍保留08:08与08:11事件。

事件区间按NAS本机时间约2分45秒；当前NTP不同步，不能保证与另一台电脑的秒级对应关系。NAS原有NUT服务含关机控制组件，读取状态不等于本轮新启用它，不能与APC侧新部署的只读observer混为一谈。

#### 若按计划现场核对两台电脑实际接线

则先做不改变供电的目视和沿线核对，记录下列结果，待事实确认后再更新归因。用户计划11月9日进行，当前尚未完成；此清单不是新任务卡或提醒。

1. 分别从Ubuntu主机和辅助Mac的电源接口沿线追踪，确认最终插到哪台UPS、哪一个具体插口，还是实际上直连市电/插排。
2. 查看APC真实插口标识及此型号手册，确认该插口在断电时是否提供电池备援。不要预设该型号一定同时存在“电池备援”和“仅防浪涌”两类口；若标识或手册没有区分，就保持该项待核实。
3. 检查中间插排、墙插、独立开关、旁路或其他供电来源，分别画出两台电脑与NAS的实际供电路径，不把USB数据线当电源线。
4. 先拍照或记录接线事实，不直接拔市电、拔UPS、切插排或运行放电测试。本次授权只是补记笔记，不扩展到操作设备。
5. 核对后再判断哪台设备应由哪台UPS保持供电；在此之前，保留“NAS UPS输入异常、NAS保持运行、两台电脑非正常关机、供电拓扑未知”的分层事实。

#### 若需要回滚本次新增监测

则按备份中的 `ROLLBACK.txt`，只停新增observer和timer，不停UPower、不清理全局journal。本次没有实际执行完整回滚，以下为已保存的回滚步骤：

```sh
sudo systemctl disable --now ups-observe-events.service \
  ups-observe-system.service ups-observe-snapshot.timer
sudo systemctl stop ups-observe-snapshot.service
```

确认最终配置副本在备份目录后，移除仅本次新建的五个文件：三个 `.service`、一个 `.timer` 和一个 `journald@ups-observe.conf`。此步骤会移除监测配置，不应未经确认就执行。

```sh
sudo systemctl daemon-reload
sudo systemctl stop systemd-journald@ups-observe.service \
  systemd-journald@ups-observe.socket
```

保留 `/var/log/journal/<machine-id>.ups-observe/` 供取证；不要因为回滚就删历史，不改全局日志或已有UPower配置。原备份说明的glob用于表达这一目录类型，实际操作应先核对具体目录，避免误删。

## 补充说明

### 原始材料引用

- 原始会话：2026-11-08 21:56–23:15，Grok Bot 的这次UPS调查与部署会话；用户消息锚点 t1043u「因为什么断的电」、t1044u「UPS离线？」、t1045u「应该已经在线」、t1048u「确认一下」、t1049u「记录UPS运行状态并归因」、t1053u「记篇笔记，详细执行过程」、t1054u「NAS另有一台UPS」、t1057u「新增部分补笔记」；另含23:15前后关于两台电脑接线尚未确认、计划11月9日现场核对的用户澄清。这些锚点用于回到原料核查，不是公开聊天链接。
- 本机原件：APC USB所连Ubuntu主机的 `/var/backups/ups-observe-20261108/OPERATIONS.txt`、`ROLLBACK.txt`、部署前状态及最终配置副本。23:09通过只读命令再次核对。这里保留标准运维路径，但不公开主机连接地址、真实账号、完整序列号或machine-id。
- 历史原件：APC USB所连Ubuntu主机的默认system journal、UPower历史文件；辅助Mac的内核启动日志。原始终端输出可能含网络地址与个人路径，没有原样附进公开仓。
- 说明书原件：此次云端调查保存了官方PDF及 `pdftotext` 文本。公开来源和文档号如下，可重新取得，不依赖临时会话上下文。
- 相关既有工作：[个人大脑仓 PR #446](https://github.com/VirusPC/edges-brain-viruspc/pull/446) — BIOS来电自动启动的现场待办背景；并非此次UPS监控部署提交，不重复建卡。

- NAS原始材料：23:12–23:13只读SSH调查的 `/var/log/ups/ups_tool.log`，11-07 08:08:18.947462 onbatt、08:08:18.997200 OB、08:11:03.965669 online；以及 `/proc/stat` 的btime、`who -b`、`last -x`、`upsc ups0@localhost`、`timedatectl` 输出。原日志及终端记录含厂商构建路径或私密连接信息，未原样附入公开仓。NAS root journal权限受限，syslog轮转缺上午覆盖，均已如实注明，不等于没有事件记录。

### 公开参考与证据强弱

1. [BK500M-CH / BK650M2-CH 官方型号手册页面](https://www.apc.com/us/en/download/document/SPD_AHUG_990-6185_EN/)；[PDF下载](https://download.se.com/files?p_Doc_Ref=SPD_AHUG_990-6185_EN&p_enDocType=User+guide)。文档号 SPD_AHUG_990-6185_EN，2019版。已阅读全文，第4–5页明确把event history放在PowerChute软件介绍；不构成本体绝无日志的证明。
2. [Schneider FAQ FA159672](https://www.apc.com/ca/en/faqs/FA159672/) — 官方把PowerChute导出的EventLog.txt定位在agent安装目录，证明软件日志的存放位置，不证明所有设备内部实现。
3. [Schneider社区：PowerChute Serial Shutdown v1.0相关问题](https://community.se.com/t5/APC-UPS-for-Home-and-Office-Forum/PowerChute-Serial-Shutdown-v1-0-Problems-with-it/td-p/461966) — 答复原文“Events that happened prior to the software's installation will not be available.”，支持无法事后补取的软件边界；不是本型号专属硬件规格。
4. [NUT usbhid-ups 官方手册](https://networkupstools.org/docs/man/usbhid-ups.html) — 数据量随厂商与型号变化；`lbrb_log_delay_sec`段特别列出APC BKnnnnM2-CH短时状态波动。仅用于解释风险，没有为本次历史定因。
5. [UPower官方CLI手册](https://upower.freedesktop.org/docs/upower.1.html) — `--monitor-detail`在电源对象增加、移除或变化时输出完整详情；`--dump`为所有设备快照。
6. [NUT upslog官方手册](https://networkupstools.org/docs/man/upslog.html) — 部署前研究过的成熟周期记录选项，支持轮询、格式化和日志轮转，但本次没有安装或使用。
7. systemd发行版手册 `man journald.conf`、`man systemd.exec` — 已读取本机systemd 255版本，核验独立namespace、持久化、容量、保留时间、sync和权限隔离。网页抓取超时，不把未成功读取网页当作实际核验来源。

本文只记录本次已执行事实和明确边界。笔记本身通过Edges CLI只在本地创建，没有提交、推送、开PR、创建Page、生成新任务或新增监控。
