# 大模型结构化输出支持度

> 选型时先分清「合法 JSON」和「按 JSON Schema 硬约束」，再看各厂是按模型还是按 API 端点放开能力。

## 背景

需要对比国内外知名大模型厂商旗舰模型对结构化输出的支持，并弄清 DeepSeek Chat / Responses、MiniMax M3、智谱 GLM 等常见说法是否成立，便于 agent 与后端对接选型。

## 主题

这场在核对：各厂旗舰在公开 API 上，结构化输出做到哪一层；以及「不支持」究竟是模型不行、端点不行，还是只缺严格 schema。

- 难点一：`json_object` 与 `json_schema` 常被混称「结构化输出」，能力差一档。
- 难点二：同一模型在不同 API 表面能力不同（典型是 DeepSeek Chat vs Responses）。
- 难点三：约束解码看似「加个编译器」，实际上要和 thinking、流式、多模态、工具交错一起接，厂商会按型号切开。

## 过程

### 19:02 发起调研

对照官方文档梳理 OpenAI、Anthropic、Gemini、xAI、通义、Kimi、豆包、DeepSeek、智谱等；用三层划分：① JSON Mode；② JSON Schema / Structured Outputs；③ Tool 参数严格遵循 schema。

### 19:08–19:12 收敛结论并补厂商

国际四大家普遍到 L2 + L3。国内：Kimi、通义选定型号、豆包（beta）、阶跃有 L2；智谱、星火偏 L1；MiniMax 的 `json_schema` 主要挂在 `MiniMax-Text-01`。用户确认：按严格 schema 看，DeepSeek（Chat）与 GLM 可视为不支持真正结构化输出。

### 19:14–19:15 DeepSeek 端点澄清

确认 Chat Completions 与 Responses 共用模型 id（如 `deepseek-flash`、`deepseek-v4-pro`），差别在接口：Chat 仅 `json_object`；Responses 的 `text.format` 才有 `json_schema`。

### 19:15–19:21 MiniMax 国内开放平台

用户确认为国内 `platform.minimaxi.com`。国内 OpenAI 兼容 `/v1/chat/completions` 对 M3 / M3.1-Flash 未文档化 `response_format.json_schema`；国际文档写明 `response_format` 仅 `MiniMax-Text-01`。M3 有 tools，不是严格最终回复 schema。与 DeepSeek「换端点」不同，MiniMax 是按模型放开。

### 19:21–19:35 追问设计与概念

讨论为何不是「统一加约束解码」：文法要和推理路径、流式、thinking、多模态、工具交错绑定，成本与兼容坑大。澄清：M3 / GLM 公开面主要是 Chat；`json_object` 只保证合法 JSON；与 `json_schema` 不同。

## 结果

- 已形成可对比的分层结论与选型口径。
- 用户侧关键判断对齐：GLM 无官方 `json_schema`；DeepSeek Chat 无、Responses 有；MiniMax M3 无官方严格 schema，Text-01 才有。
- 笔记待入库（本文件）。

## 所学

- **JSON Mode（`json_object`）**：保证输出是合法 JSON 对象，可解析；不保证字段、类型、必填、enum。
- **JSON Schema / Structured Outputs**：按传入 schema 约束（常配 `strict`）；才是「合同级」结构化。
- **Tool 严格参数**：约束的是工具调用 arguments，不是最终对用户的文本回复；可作伪结构化，仍需校验。
- **能力挂在哪**：DeepSeek 是同一模型、不同端点能力不同；MiniMax 是不同模型能力不同（M3 vs Text-01），不是换 Chat/Responses 就能开 schema。
- **为何不一刀切接约束解码**：不单是文法编译，还要覆盖全特性路径与服务端成本；厂商常先在旧模型或子集上开放。
- **可选项与不做**：强契约优先 OpenAI / Claude / Gemini / Grok 的 strict；国内要 L2 优先 Kimi、通义带 schema 的型号、阶跃、DeepSeek Responses；豆包标 beta 需降级。不做：把 `json_object` 或裸 tool 参数当硬保证。

## 行动指南

### 主题行动指南

#### 背景

要在多厂商 LLM 上做抽取、表单、agent 工具调用，需要可预期的机器可读输出。

#### 核心问题

如何判断某厂「有没有结构化输出」，以及选哪条 API 路径才真有字段级保证。

#### 核心解决方案

1. 先定要的档位：只要合法 JSON → `json_object`；要字段合同 → `json_schema`（或同等约束解码）；要调系统 → tool/function，并查是否 `strict`。
2. 查官方文档时同时看「模型清单」和「端点」（Chat vs Responses 等），不要只看营销「支持 JSON」。
3. 对仅有 L1 或未声明 strict 的路径：Pydantic/Zod 校验 + 失败重试/修复；可选强制 `tool_choice` 当伪结构。
4. Schema 保持短、少嵌套、少巨型 enum；字段名优先英文，中文放 `description`。

相关可选项：全程只靠 prompt 要 JSON——便宜但不稳，故不做为生产默认。只换 SDK 不换端点——对 DeepSeek 无效，故要明确走 Responses。

#### 验收标准

- 能说清目标厂商属于 L1 / L2 / L3 哪一档，并指出依据的 API 参数名。
- DeepSeek：能区分 Chat 与 Responses 对 `json_schema` 的差异。
- MiniMax：能说明 M3 与 Text-01 在 `response_format` 上的文档差异。
- 上线路径有客户端校验或与 L2/L3 官方能力对齐。

### 细节与其他

#### 若走 DeepSeek 且必须 schema

则：用 Responses（`text.format.type=json_schema`），模型仍可用 `deepseek-flash` / `deepseek-v4-pro`；不要在 Chat 上硬塞 `json_schema`（会 400）。

#### 若用 MiniMax 国内开放平台的 M3

则：按无严格结构化设计（tools + 自校验）；不要假设换端点可得 `json_schema`。需要官方 schema 时查是否改用 `MiniMax-Text-01`（以当时文档为准）。

#### 若用智谱 GLM

则：按 `json_object` + prompt schema + 客户端校验；或用 tools；不要假设有 OpenAI 级 `strict` json_schema。

#### 若强契约 agent（工具参数必须合法）

则：优先 OpenAI / Anthropic / xAI（及文档写明约束解码的路径）；国内 L1 厂商不要省略校验层。

## 补充说明

### 对比表

层级：① JSON Mode（合法 JSON，不保字段）② JSON Schema / Structured Outputs ③ Tool 参数严格遵循 schema。

| 厂商 | 旗舰 / 模型（文档示例） | 层级 | API 关键词 | 一句话 |
|------|------------------------|------|------------|--------|
| OpenAI | GPT-4o 及后续旗舰 | ①②③ | `json_schema` + `strict`；tools `strict` | Agent/抽取首选 |
| Anthropic | Claude Opus/Sonnet 4.5 系 | ②③ | `output_config.format`=`json_schema`；`tools[].strict` | 强 schema + 严工具 |
| Google Gemini | Gemini 3.x（如 3.8） | ①②（③ 与工具组合有 Preview） | `response_format` + `schema` | 抽取/分类强；部分约束需客户端再验 |
| xAI Grok | Grok 4.x | ①②③ | `json_schema`；tool 隐式 strict | 文档称支持特性下保证匹配 |
| 月之暗面 Kimi | Kimi K3 / K3.1-Pro | ①② | `json_object` / `json_schema` | 国内 schema 文档较齐 |
| 阿里通义 Qwen | Qwen3.7/3.8 选定型号 | ①② | `json_object`（多数）；`json_schema`（选定） | 普通型号多半只有 json_object |
| 字节豆包 / 方舟 | Doubao Seed 等 | ①②（beta） | `json_schema` + `strict` | 功能完整但标 beta |
| DeepSeek | deepseek-flash / v4-pro | Chat：①；Responses：①② | Chat：`json_object`；Responses：`text.format`=`json_schema` | 同一模型，端点能力不同 |
| 智谱 GLM | GLM-5.x | ① | 仅 `json_object` | 字段靠 prompt + 自校验 |
| MiniMax | M3 / M3.1-Flash；schema：Text-01 | 旗舰无 L2；L2 挂 Text-01 | `response_format` 仅 Text-01；M3 有 tools | 按模型放开，不是换端点 |
| 阶跃星辰 | step-5 系 | ①② | `json_object` / `json_schema`+`strict` | 文档区分两种模式 |
| 讯飞星火 | Ultra / Max | ① | `json_object`；Function Call | 无公开 json_schema 响应类型 |

- 原始材料：Grok Bot「通用-辅助」会话，约 2026-10-25 19:02–19:35（Asia/Shanghai）；用户确认 MiniMax 为国内开放平台。
- 能力随文档变更，选型前应再打开对厂商页核对。
- 参考链接：
  - [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — L2/L3 参考实现
  - [Claude Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — `output_config` / tool strict
  - [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) — schema + 流式
  - [xAI Structured Outputs](https://docs.x.ai/developers/model-capabilities/text/structured-outputs) — json_schema 与 tool 隐式 strict
  - [DeepSeek JSON Output](https://api-docs.deepseek.com/guides/json_mode/) — Chat 侧 json_object
  - [DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/) — `text.format` 含 json_schema
  - [智谱结构化输出](https://docs.bigmodel.cn/cn/guide/capabilities/struct-output) — 仅 json_object
  - [Kimi response_format](https://platform.kimi.com/docs/guide/response_format) — json_object / json_schema
  - [通义 Qwen structured output](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output) — 选定型号 json_schema
  - [MiniMax 国内 Chat Completions](https://platform.minimaxi.com/docs/api-reference/text-chat-openai) — M3 参数面
  - [MiniMax 国际 Text API](https://platform.minimax.io/docs/api-reference/text-post) — response_format 仅 Text-01
