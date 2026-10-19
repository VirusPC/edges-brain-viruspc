# 自部署 Langfuse 是基础设施卡，不并进知识库 Observation 产品

看板已有 backlog「知识库 Observation 系统」：产品语义是知识库运行时的 traces / logs / dashboard（看到检索、读写、代理使用过程）。另有「自部署 Langfuse」卡，容易被收成「Observation 的实现细节」。2026-09-20 grill 确认（peng cheng）：后者只覆盖自托管 Langfuse 实例的部署、运维、鉴权与备份；不要并进 Observation 产品卡。Observation 产品可以日后*消费*这个后端，但不拥有它的运维范围。

**Status:** accepted（ADR 0015；grill 确认于 2026-09-20）

**See also:** ADR 0014（[v1 宿主 minigtr](0014-self-hosted-langfuse-on-minigtr.md)）；ADR 0016（[官方 docker compose](0016-langfuse-docker-compose.md)）；ADR 0033（[公网 HTTPS，经 Cloudflare Tunnel](0033-langfuse-public-https-via-cloudflare-tunnel.md)，取代 [ADR 0017](0017-langfuse-tailscale-only-access.md)）；ADR 0018（[密钥留 minigtr](0018-langfuse-secrets-stay-on-minigtr.md)）；ADR 0019（[备份](0019-langfuse-named-volumes-manual-backup.md)）；ADR 0020（[先 UI，再 1–2 个客户端](0020-langfuse-ui-then-few-clients.md)）；[自部署 Langfuse](../../.harness/tasks/observation/done/2026-09-20--%E8%87%AA%E9%83%A8%E7%BD%B2-Langfuse/INDEX.md)（基础设施卡，v1 验收已完成；宿主与访问面以 ADR 0014、ADR 0033 为准）；[知识库 Observation 系统](../../.harness/tasks/observation/backlog/2026-09-13--%E7%9F%A5%E8%AF%86%E5%BA%93Observation%E7%B3%BB%E7%BB%9F/INDEX.md)（产品卡，勿改其正文来写部署）

## Decision

- **「自部署 Langfuse」= 基础设施。** 范围是自托管实例的部署 / 运维 / 鉴权 / 备份，以及它是否作为 LLM/Agent 可观测后端候选。
- **「知识库 Observation 系统」= 产品。** 范围是知识库运行时 traces / logs / dashboard 的语义与接入；本身不做评测裁判（那是 Evaluation）。
- **消费关系，不是合并。** Observation 产品日后可以接入自托管 Langfuse；接入语义写在产品卡，实例怎么跑写在本卡。不要把两张卡并成一条，也不要把 compose / 密钥写进 Observation 产品正文。
- **本轮范围：** 只落地 glossary + ADR。不改两张看板卡的状态夹或产品正文。

## Considered Options

- 把自部署 Langfuse 并进「知识库 Observation 系统」：否决；后端运维与产品语义生命周期不同，合并后哪张卡都做不完。
- 本轮改 Observation 产品卡正文、塞进部署步骤：否决。
- 本轮改看板状态：否决；由任务记录员维护。
- 把仓内 `observation/` 运营笔记目录当成 Observation 产品或 Langfuse 实现：否决；那是脱敏观测落点，不是后端，也不是产品卡。

## Out of scope

- Observation 产品的 traces / dashboard 语义设计
- 在自托管 Langfuse 上接线知识库或评测
- 改两张 Task 的状态或正文
- 部署实现、密钥、compose 文件

仓内 harness 自用的可复用上报代码见 [ADR 0038](0038-observation-trace-exporter.md)。
