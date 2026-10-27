# Tasks 审阅壳三列布局：grill 与 Playwright 嵌入调研

【背景】

目标是把 `edges tasks project review-page` / `/tasks/` 审阅壳从手写 HTML，迁到 Vite + React + Tailwind + shadcn，仍由 CLI 嵌入生成页。UI/领域与交付形态在 Coding 专家 × peng cheng 的 grill（约 2026-09-22→24）里定；架构与目录结构要对齐 microsoft/playwright HTML reporter 的「CLI + 预构建前端 + 运行时数据注入」三层，但复制与否须有主源证据，禁止用「行业常识」空口定案。

相关材料：

- 进行中任务：[2026-09-21--review-page-改造三列布局-顶栏-filter](../../.edges/tasks/agent-clients-ux/done/2026-09-21--review-page-%E6%94%B9%E9%80%A0%E4%B8%89%E5%88%97%E5%B8%83%E5%B1%80-%E9%A1%B6%E6%A0%8F-filter/INDEX.md)
- 语义检索 backlog：[2026-09-23--Tasks审阅页-tasks站点语义检索](../../.edges/tasks/agent-clients-ux/backlog/2026-09-23--Tasks%E5%AE%A1%E9%98%85%E9%A1%B5-tasks%E7%AB%99%E7%82%B9%E8%AF%AD%E4%B9%89%E6%A3%80%E7%B4%A2/INDEX.md)
- 相关 draft PR：[VirusPC/edges#124](https://github.com/VirusPC/edges/pull/124)（ADR 0022 + Task Doc JSON Schema）

【过程】

## Grill 过程（Coding 专家 × peng cheng，约 2026-09-22→24）

### 方式

- 先 grill-with-docs，再 CONTEXT/ADR，再实现 plan；实现须等确认。
- 用户要求：挨个问、说话说全；反对一次抛太多题。
- 中途：对「行业最佳」无取证的推断被纠正为瞎推理；此后三项交付形态改为主源取证后再定。

### 已定决策（Q1–Q9）

| Q | 议题 | 定案 |
| --- | --- | --- |
| Q1 | 是否同一 HTML/壳 | 同一审阅壳，继续服务 classifyTasks / proposeTypes / 本地 review-page / `/tasks/`（壳可升级为构建静态应用） |
| Q2 | 拖拽改什么 | 拖到左栏只改 project；中栏 status 列本轮只读（写回另 backlog） |
| Q3 | 点左栏 | 筛选 + 投放目标 |
| Q4 | 字段约定 | 抽出独立可复用 JSON Schema（非自创轻量 B config）；CLI/看板/日后 LLM 可共用。现有约定曾散落在 frontmatter.ts / types.ts（ParsedTaskDoc、edges-tasks-status 等） |
| Q5 | 正文从哪来 | 生成时每条 item 嵌 Schema 对齐的 `doc`；页只读页内 JSON，不读盘 |
| Q6 | JSON 契约 | 一个对象扩展（`edges.tasks.grouped/v1` 的 groups+items）；勿增平行 board schema。「如无必要勿增实体」。曾澄清：groups/items 是同一对象里两个字段，不是两套协议 |
| Q7 | 顶栏 filter | 全文搜索 + priority + assignee + status 都要；语义检索另记 backlog |
| Q8 | 中栏/壳技术 | Vite + React + Tailwind + shadcn；中栏自绘只读列；dnd-kit 仅左栏改 project；领域不绑 kanban 库 |
| Q9 | 右侧 md | react-markdown + remark-gfm 渲 `doc.body`；不预编译 HTML |

### 包装形态（grill 后半，取证后确认）

- CLI + 预构建前端 + 运行时注入；目录学 Playwright
- 产物不入库；内联单 HTML + `#edges-review-payload`；hash（或 hash+query）
- 树：`extensions/cli/review-app/` → gitignore `…/assets/review-page/` → `review-page.ts`
- 不抄：第二 core 包、默认 zip+base64、CLI 内嵌 HMR

### 硬边界（未重开）

- ADR 0012：CLI render-only；Copy JSON → Skill 落地；无 `--mode`
- ADR 0021：`/tasks/` 复用同壳；本轮不写回；鉴权后做
- 不与写回仓、统一 agent helper、站点鉴权、Artifacts→Pages 并卡

### 过程亮点

- Q4：从沿用代码约定 → 拆独立 Schema；JSON Schema vs 自创 config；选 A 因 LLM API 认这一族
- Q6：澄清为一对象两字段
- Q8：技术栈升级到 shadcn/Tailwind + 自控领域模型 + dnd-kit
- 取证纪律：先查 Playwright/Vitest/WBA 主源再定

## 调研过程（时间线）

1. grill 定 UI/领域：同一壳、左栏拖 project、中栏 status 只读、Task Doc JSON Schema、`doc` 嵌入 groups+items、顶栏四类 filter、Vite/React/shadcn、dnd-kit、react-markdown+remark-gfm。
2. 提出 CLI 嵌 React → 对齐 Playwright HTML reporter（prebuild assets）。
3. 子代理调研目录与运行时模型，提出 edges 镜像树：`extensions/cli/review-app/` → `assets/review-page/{index.html,review.js,review.css}` → `review-page.ts` 注入。
4. 开放三问：是否 commit 产物 / 单 HTML vs 三文件 / hash vs path。助手先给偏好推荐，后在「参考行业最佳范式」下又推一版——被纠正为瞎推理。
5. 取证回合（executor，只引主源）：Playwright / Vitest UI / webpack-bundle-analyzer。

## 取证事实

### Playwright

- Source：`packages/html-reporter/`（私有，非独立 npm）
- Artifacts：`playwright-core/lib/vite/htmlReport/`；根 `.gitignore` 有 `packages/*/lib/`；默认分支无该 lib 树
- Build：`utils/build/build.js` 用 vite 构建 html-reporter；固定名 report.js / report.css，`inlineDynamicImports`
- Runtime：`packages/playwright/src/reporters/html.ts` 解析产物目录；默认把 JS/CSS 内联进 report `index.html`；数据经 yazl zip → base64 → `<template id="playwrightReportBase64">`；可选 `doNotInlineAssets`
- Routing：无 react-router；自定义 `location.hash` query（`#?testId=…`）

### Vitest UI / webpack-bundle-analyzer

- 同样：dist / public / lib 不进 git
- static / singleFile 常见内联 JS + 页内元数据（`window.*` 或 gzip meta）

## 方案思考（推演，标明非空口最佳实践）

- 经典三层（peng cheng 认可）：CLI 只渲染/写文件；预构建前端进 dist 树；运行时注入 JSON。与现有 `#edges-review-payload` 同构；差别是壳变成 React 预构建产物。
- YAGNI：不另建 board schema；在 `edges.tasks.grouped/v1` 的 items 上扩展可选 `doc`。
- 刻意不抄 Playwright（有理由）：不做第二 npm「core」包；默认不做 zip+base64（payload 远小于测试报告）；不在 CLI 内嵌 Vite HMR → 用 `dev:review-app` + mock JSON；一个 SPA 覆盖 classify / review-page / `/tasks/`，不第二套静态树。
- 取证后 peng cheng 确认三项（「好的」）：
  1. 产物不进 git；build / CI / deploy 生成
  2. 内联单 HTML + `#edges-review-payload`
  3. hash（或 hash+query）导航
- 推荐目录：

```
extensions/cli/review-app/          # source
extensions/cli/src/tasks/project/
  assets/review-page/                # artifacts (gitignore)
  review-page.ts                     # inject
```

- 曾标「先不定」、后由人确认的边界：clone-without-build、严格 CSP、固定 `/tasks/` 下是否用 path 路由更合适——当前选择跟随 Playwright 证据链；未采纳 path。

【所学】

- 「Industry best」无主源核对 = 瞎推理；peng cheng 拒收。
- 镜像成熟项目时：先学目录与三层心智模型，再逐项取证决定抄/不抄（zip、是否 commit 产物、路由）。
- ADR 可先记原则；路径名与三项交付细节须取证确认后再冻结。
- grill 要挨个问、说全；一次抛太多题会打断定案节奏。
- Q4/Q6 的关键是契约形态：独立 JSON Schema + 同一对象上扩展 groups/items，而不是平行协议或自创 B config。

【行动指南】

- **若**实现 review-page / `/tasks/` 壳升级：  
  **则**按 Q1–Q9 与取证后三项交付执行；源码放 `extensions/cli/review-app/`，产物进 gitignore 的 `assets/review-page/`，由 `review-page.ts` 注入 `#edges-review-payload`；导航用 hash（或 hash+query）。

- **若**要扩 JSON 契约：  
  **则**扩展 `edges.tasks.grouped/v1`（items 可选 `doc`），勿新增平行 board schema；Schema 独立可复用，对齐 PR #124 / ADR 0022。

- **若**再谈「行业最佳」或是否抄 Playwright 某细节：  
  **则**先读主源（Playwright / Vitest UI / WBA 等）再定案；无证据的偏好推荐不当成结论。

- **若**想加写回、鉴权、path 路由、第二静态树或 CLI 内嵌 HMR：  
  **则**本轮不重开；写回另 backlog；开发用 `dev:review-app` + mock JSON。

- **若**要做语义检索：  
  **则**走 backlog [2026-09-23--Tasks审阅页-tasks站点语义检索](../../.edges/tasks/agent-clients-ux/backlog/2026-09-23--Tasks%E5%AE%A1%E9%98%85%E9%A1%B5-tasks%E7%AB%99%E7%82%B9%E8%AF%AD%E4%B9%89%E6%A3%80%E7%B4%A2/INDEX.md)，不塞进本轮顶栏四类 filter。

【补充说明】

- 本笔记记录 grill + 取证全过程本身；实现 plan 须另等确认后再动手。
- 交叉：in_progress 三列布局任务、语义检索 backlog、[PR #124](https://github.com/VirusPC/edges/pull/124)。
- 硬边界对照：ADR 0012（render-only）、ADR 0021（`/tasks/` 同壳、本轮不写回）。
