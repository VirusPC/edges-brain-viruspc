---
name: langfuse-memory-ask-audit
description: >-
  从自建 Langfuse 抽取 edges-memory-ask 相关 traces 的真实工具执行链，汇总启发式模式，并可写入/更新一个观测用
  Dataset。
---
# Langfuse Memory-Ask 执行审计

把线上「加载了 `edges-memory-ask`」的 traces 收成可复查的执行链快照，对照 PROTOCOL / `edges-memory-ask` 预期（工作范围 → 祖先 AGENTS 链 → 类型 README → 按 description 选正文；可选 `edges memory list`；无向量 RETRIEVER）。

## 前置

- 已配置 `LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`、`LANGFUSE_BASE_URL`（或 `LANGFUSE_HOST`）指向目标实例。
- 用 `npx langfuse-cli`（或等价 Public API）读写 observations / datasets / dataset-items。
- 先读当前实例的 CLI `--help` / schema，不要死记参数名。

## 步骤

1. **定窗口与项目**  
   默认近 14 天；dataset 名建议 `edges-memory-ask-execution-YYYY-MM`。说明这是观测集，不是带标准答案的评测集，除非用户另定。

2. **找种子观测**  
   `observations list`，按 name=`skill:edges-memory-ask`（必要时再扫 tags 含 `skill:edges-memory-ask`）分页取全。按 `traceId` 去重，记下每条的 `sourceObservationId`、environment、tags、startTime。

3. **拉整条 turn**  
   对每个 `traceId`：`observations list --trace-id …`，字段至少含 `core,basic,io,metadata,trace_context`。按 `startTime` 排序。

4. **标「疑似 Memory 相关」步骤（启发式，必须写进 metadata）**  
   命中任一即标：
   - 工具名以 `skill:edges-memory` 开头；
   - input/output 文本含 `AGENTS.md`、`.edges/memory`、`memory list` / `memory get`、类型 README 路径（如 `feedbacks/README`、`projects/README`）等。  
   **禁止**把启发式结果说成 Langfuse 原生 span 类型或官方「Memory 步骤」。在产物里写清规则与局限（漏检/误伤）。

5. **汇总模式标签**（可并存）  
   - `read_agents_md`：读写了任一 `AGENTS.md`  
   - `nested_agents_md`：路径深度表明是 scope 根以下的子目录 `AGENTS.md`（实现里定义并写明判定）  
   - `touched_edges_memory_path`：碰到 `.edges/memory`  
   - `grep_over_memory`：对 memory 相关路径做 Grep/rg  
   - `used_edges_memory_list_cli`：出现 `edges … memory list`（或等价）  
   - `skill_loaded_only_no_clear_memory_io`：只有 skill 加载、无上述 IO 证据  
   另计：同 turn 是否已有子路径工作痕迹（`packages/`、`src/`、`.edges/` 等），用于回答「没读子 AGENTS 是否因为没改子目录」。

6. **落盘抽取稿**  
   写本地 JSON（如 `extracted.json`）：每条含 `sourceTraceId`、environment、tags、tool_sequence / tool_counts、pattern_notes、memory_related_steps（含 brief input/output）、all_steps_compact、启发式说明。

7. **（可选）写入 Dataset**  
   仅在用户要「存数据集」时：
   - `datasets create`（同名则更新描述/metadata 或跳过创建）  
   - 每条 `dataset-items create`，`id` 稳定如 `memory-ask-<traceId前缀>`，`sourceTraceId` / `sourceObservationId` 填上  
   - **input**：trace 指针（traceId、environment、sessionId、tags、rootName、startTime）  
   - **expectedOutput**：默认空，等人标；不要把启发式摘要冒充标准答案  
   - **metadata**：pattern_notes、工具序列、memory_related_steps、判定规则版本、抽取时间  

8. **向用户报告**  
   用中文给：样本数、主要模式计数、与协议预期的差距（例如几乎不用 `memory list`、无 RETRIEVER、子目录 AGENTS 是否与子路径工作匹配），并给出 dataset 链接或本地 JSON 路径。说明摘要是自建启发式。

## 不要做的事

- 不要假装存在 Langfuse `RETRIEVER` / 官方 Memory 检索 span（除非观测里真有）。  
- 不要在未批准时批量改 expectedOutput 或当评测金标用。  
- 不要把 Grok Bot 平台 memory、edges 文件记忆、Langfuse 数据集三者混称。
