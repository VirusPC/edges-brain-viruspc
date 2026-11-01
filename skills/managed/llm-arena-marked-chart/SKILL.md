---
name: llm-arena-marked-chart
description: 当需要把 LLM Arena（或同类）排行榜画成带红圈/NEW 标注的 SVG+PNG 图时使用——例如 AI Coding 周报「整体排名」、对比本周新上榜模型。输入 Arena JSON 或显式模型名列表，输出矢量源与导出 PNG；不要用手动画圈叠在截图上。
---

# LLM Arena 标注榜单图（SVG → PNG）

## 何时用

- 周报 / REDoc 要用**图片**展示 Arena Top-N，并圈出「本周新上榜」
- 已有 `fetch_llm_arena.py` 产出的 JSON，或自备 `[{rank,model,organization,score,votes}, ...]`
- 需要可复用的 SVG 真源（不是 PNG 上再 overlay）

## 输入

1. **Arena JSON**（推荐）：`weekly-ai-blogs-digest` 的 `scripts/fetch_llm_arena.py --out /tmp/llm-arena.json`
2. **可选显式 NEW 名单**：`--highlight "Model A" --highlight "Model B"`（或逗号分隔）。一旦提供，不再用票数启发式
3. **否则自动 NEW**：在 Top-N 内取 **票数最低的 `--new-count` 个**（默认 4）作为代理——适合数据集只有单一 `leaderboard_publish_date` 的情况

## 步骤

1. 确保依赖（一次即可）。在本 skill 目录执行：

```bash
pip install -r scripts/requirements.txt
# 需要系统已有 cairo + Noto/DejaVu 字体（本机 box 通常已装 fonts-noto-cjk、fonts-dejavu）
```

2. 渲染（把日期 / 输出路径换成当次的）：

```bash
python3 scripts/render_arena_chart.py \
  --json /tmp/llm-arena.json \
  --top 15 \
  --out-svg /workspace/ai-news-demo/llm-arena-top15-YYYY-MM-DD.svg \
  --out-png /workspace/ai-news-demo/llm-arena-top15-YYYY-MM-DD-marked.png
```

显式名单示例：

```bash
python3 scripts/render_arena_chart.py --json /tmp/llm-arena.json --top 15 \
  --highlight "Gemini 4 Carbon (High),Muse Wonder (Max)" \
  --out-svg out.svg --out-png out-marked.png
```

只要 SVG、不要 PNG：加 `--no-png`。

3. 在 markdown / HTML 里引用 **`-marked.png`**（或你指定的 `--out-png`）。保留同名 `.svg` 作真源。

## 约定

- **真源是 SVG**；PNG 由 cairosvg（优先）/ rsvg-convert / inkscape 导出
- 图注默认中文脚注说明红圈含义；可用 `--footnote` / `--title` / `--subtitle` 覆盖
- 组织配色：google / anthropic / meta / openai / moonshot 等；未知组织灰色
- 字体：`Noto Sans CJK SC` → DejaVu Sans，保证中文脚注不豆腐
- 不要把整份 Arena API/parquet 字段说明塞进 skill；字段以 JSON 里实际键为准：`rank` `model` `organization` `score` `votes`

## 脚本位置

[`scripts/render_arena_chart.py`](scripts/render_arena_chart.py)
