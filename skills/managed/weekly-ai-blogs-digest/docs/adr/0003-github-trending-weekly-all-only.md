---
status: accepted
---

# GitHub Trending 只采用每周总榜

GitHub Trending 只看每周总榜，不看具体语言的榜。这条属于即将进行的 skill 编排重构，不是本周概览这一步的实现范围。本周概览要等编排重构和这件事做完之后再开始。

出处：第二轮 grill，2026-11-23。这是用户新定的事项，作为编排重构的一部分记下。

## Considered Options

- 把每周总榜与 TypeScript、Python 等语言榜拆成多个发布方，分别展示。否决：用户要求只看每周总榜，不看具体语言。

## Consequences

- 编排重构时，订阅、抓取和信息源汇总都只保留每周总榜，不要再为语言榜单单独建发布方或页面板块。
- 不要把这项改动和本周概览放进同一个变更。

参考：[第二轮 plan](https://edges.viruspc.tech/artifacts/e13152af-a3d4-4a91-9eea-62329212fee7/)。
