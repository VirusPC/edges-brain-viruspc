# Kimi Work 提问组件最多 4 选项

## 背景
测 edges-onboarding 开场场景提问时，skill 要求一次给出五个用户场景加两条流程兜底，共七个选项。实测在 Kimi Work 上失败，需要把约束记进 Agent 产品评测，避免误判为 Edges 文案问题。

## 主题
对照 Agent 客户端的提问 UI 能力，看多选项场景菜单能否原样呈现。

- 难点：客户端提问组件有硬上限时，skill 里较长的场景列表无法一次展示。

## 过程

### 时刻不详 用 raw Skill 测 onboarding 开场
按「读 main 上 edges-onboarding SKILL.md，帮我接入 edges」测提问；预期先问七个选项（1～5 为用户场景、6～7 为流程兜底，含个人大脑写明 idea/待办）。Kimi Work 侧表现异常，先怀疑 skill，后确认是提问组件最多 4 个选项，七选项超限。

### 时刻不详 归类决定
不单开 tasks 场景；个人 idea/待办并入个人大脑表述。本条问题单独记为产品评测发现，不做 onboarding 砍选项。

## 结果
- 已确认：失败来自 Kimi Work 提问组件上限 4，不是 onboarding skill。
- onboarding 文案未因该上限改短。
- 本发现记入 Agent产品评测。

## 所学
多选项开场依赖客户端提问 UI；上限小于选项数时会出现「测失败」假象。可选项包括：砍场景适配客户端、改分轮提问、或在评测里标注客户端限制并换宿主测——这次选择记录限制、不改 Edges 场景表。

## 行动指南

### 主题行动指南

#### 背景
在 Agent 产品上跑 Edges skill 提问时，要先分清 skill 与宿主 UI 约束。

#### 核心问题
提问组件选项上限低于 skill 要求的选项数时，评测结论会被污染。

#### 核心解决方案
1. 先核对宿主提问组件的选项上限与 skill 选项数。
2. 上限不足时，在产品评测里记清限制与复现方式，并换无此上限的宿主复测 skill。
3. 默认不把宿主 UI 上限倒逼成 skill 删减，除非产品策略明确要求兼容该宿主。

#### 验收标准
- [ ] 评测记录写明产品名、上限数字、与 skill 选项数的对比
- [ ] 能说明当时是否改动了 Edges 场景表及原因

### 细节与其他

#### 若在 Kimi Work 上测 edges-onboarding 开场
则：预期七个选项（五场景 + 两条流程兜底）一次问出会被组件截断或失败；应用 raw Skill 在其他宿主复测，并引用本笔记。

## 补充说明
- 原始材料：任务记录员会话（2026-11-08 前后）；VirusPC/edges PR #107（个人大脑场景补 idea/待办）；测法为读 `https://raw.githubusercontent.com/VirusPC/edges/main/packages/skills/edges-onboarding/SKILL.md`
- 归属 Project：`2026-11-01--agent-product-eval`（Agent产品评测）