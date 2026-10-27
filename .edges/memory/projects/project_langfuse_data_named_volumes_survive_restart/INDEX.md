---
name: project_langfuse_data_named_volumes_survive_restart
description: >-
  自建 Langfuse 数据在宿主 Docker named volume；正常停容器或关机不丢；compose down -v、删 volume
  或擦系统盘会丢；查数优先走 Langfuse API 而非直连库。
metadata:
  edges-title: Langfuse 数据在 named volume，停机不丢；down -v / 擦盘才会丢
  edges-type: project
  edges-origin-session-id: sand-subagent-ca3a13d0-3c30-425f-b74a-bf5642a577c0
  edges-agent-client: cursor
  edges-username: Grok Bot
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-26T05:24:19+08:00'
---

## What
自建 Langfuse（minigtr 上 Docker Compose）的持久数据在宿主 **Docker named volume**，不在容器可写层。正常 `docker stop` / 关机 / 重启 **不会丢**数据。会丢的是：`docker compose down -v`、手动删这些 volume、或重装/擦系统盘。截至 2026-10-25 对话确认时，**没有**定期备份到盘外。

业务查数优先走 **Langfuse 网页 / Public API / SDK**（`LANGFUSE_HOST` + 项目 API Key），不要默认直连底层 Postgres / ClickHouse；企业场景通常也不开放 DB 端口。本机评测与 Dataset 读写同样走 HTTP API，不直连库。

## Why
2026-10-25 IT资产管理：用户担心「Docker 停机或服务器停机数据就丢」。查宿主 compose 与 volume 后得出上述落盘与丢失条件；随后又确认企业侧应走 Langfuse 访问面而非底层 SQL。

## How to apply
- 运维重启、停容器、升镜像：先确认用的是 named volume 且 **不要**带 `-v` 删卷。
- 需要分析/报表：优先 Langfuse UI、Public API、SDK；直连 DB 仅本机排障且不把密码/连接串写入公开仓。
- 若要盘外备份或异地副本：另开任务卡写清目标与完成标准；本条不假设已有备份。
- 公开文字不写 DB 密码、不写未公开内网 IP；compose 路径与 volume 名可留在私密运维笔记。
