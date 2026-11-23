# 客户端接入指南

接入已有大脑时，按客户端分组打开本目录对应文件。有客户端工作区概念的客户端把大脑仓库根作为客户端工作区；Grok Bot 没有绑定客户端工作区的概念，改用共享长期记忆定位大脑（见 personal.md）。设计取舍见 [ADR 0053](../../../../../docs/adr/0053-personal-brain-reused-across-agent-clients.md)。

## 怎么选分组

从会话与环境识别宿主，不要让用户先选分组菜单。对应关系：

| 优先级 | 分组 | 打开 |
| --- | --- | --- |
| 1 | personal agent（Grok Bot、Muse、Dot 等） | [personal.md](personal.md) |
| 2 | work 类简单工作区（首期参考 ChatGPT Work） | [work-space.md](work-space.md) |
| 3 | coding 项目空间（Codex、Claude Code、Cursor 等） | [coding.md](coding.md) |
| 4 | chat（需服务端接口） | [chat.md](chat.md) |
| 未知 | — | 只问一句：「你会在哪个 App 或网站里用它？」 |

共享核验：[contract.md](contract.md)。

## 未实测声明

本目录各指南描述的是接入步骤与验收方法，**不等于**已在该客户端实测通过。凡未跑通七层核验或标【待试】处，不得写成「已支持」。Claude Cowork 本轮不写。
