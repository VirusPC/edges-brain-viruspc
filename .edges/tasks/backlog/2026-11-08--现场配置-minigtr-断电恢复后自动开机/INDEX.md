---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-08T07:08:40.302Z'
  edges-title: 现场配置 minigtr 断电恢复后自动开机
  edges-tasks-status: backlog
  edges-task-priority: none
name: 现场配置_minigtr_断电恢复后自动开机
description: 断电后来电仍停机会让 minigtr 远程不可用。在维护窗口把来电自动开机设好，并在安全窗口验证；未测则标明待验证。
---
**背景：**
用户在排查断电重启后设备远程不可用时，要求 minigtr 和 Mac mini 来电自动开机，避免供电恢复后机器仍停着、远程进不去。对话里先核对 Mac mini：`pmset` 的 `autorestart` 已是 1，来电自动开机已经打开，因此不为 Mac mini 另开卡。minigtr 没有受支持的操作系统接口可以远程读取或修改这项设置，当前取值未知，所以改成现场进 BIOS 配置，并单独记这一张待办。
- 现状：机械师 Mini GTR，SKU E3LS。AMI BIOS 版本 `HPTP3_F8_10_IEC0006_BI0006_Machenike_54W`，日期 2025-10-20。`fwupd` 不支持 firmware settings。当前来电开机的取值未知。
- 预期：运行中意外断电并恢复供电后，机器自己开机，远程不再因停机不可用。
- 非目标：现在不拔电、不关机、不重启；桌面自动登录不在范围；不为 Mac mini 另开卡；BIOS 具体菜单未知，不套用其他厂商的 GTR 教程。
- 关联：Mac mini 已确认 `pmset autorestart=1`。先前笔记 `notes/2026-09-26--minigtr断电恢复-UPS选型-默认Ubuntu开机` 记的是复电后进入 Ubuntu 与恢复流程，本卡只处理来电自动开机。

**目标：**
minigtr 在运行中意外断电、恢复供电后自动开机。

**动作：**
- 在允许中断服务的维护窗口，接上显示器和键盘。
- 按 Del 进入 BIOS Setup。
- 现场核实 AC Back、Restore on AC Power Loss 一类选项，设为 Power On 或 Always On，并保存。具体菜单位置以这台机器的 Setup 为准，不套用其他厂商的 GTR 教程。

**完成标准：**
- [ ] 对应的来电开机选项已经开启并保存。
- [ ] 在安全的维护窗口完成断电恢复验证。尚未实测时，在本卡标明「已配置，待验证」，不把未测写成验证通过。
