---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-12T10:00:00.000Z'
  edges-title: AI 资讯每期抓取数据存入 ai-news-data 仓
  edges-tasks-status: backlog
  edges-task-priority: none
name: ai_资讯每期抓取数据存入_ai_news_data_仓
description: 周报每期抓到的 RSS 和榜单数据目前只在 /tmp，跑完即丢；改为每期存入独立公开仓 VirusPC/ai-news-data。
---
**背景：**
- 2026-11-12 用户问周报的数据处理逻辑。现状：`fetch_feeds.py` 把 OPML 订阅的 RSS/Atom 清洗成精简 JSON（窗口过滤、HTML 转纯文本、正文截 1200 字、去 utm、去重、标 `thin`），写到 `/tmp/ai-coding-feeds.json`；Arena / Artificial Analysis 各出一份 JSON。模型只读这些 JSON 写周报。中间文件跑完即丢，仓库只留最终周报。
- 后果：重跑旧期时取不回当期 GitHub Trending、Arena 等快照。
- 用户决定：单独起一个公开仓专门存每期数据，并存全文。仓 [VirusPC/ai-news-data](https://github.com/VirusPC/ai-news-data) 已于 2026-11-12 创建，README 写好了目录约定（`issues/YYYY-MM-DD/` 下放 `feeds.json`、`feeds-full.json`、`llm-arena.json`、`aa-language-models.json`、`github-trending.json`、`manifest.json`）。
- 关联：skill `skills/managed/weekly-ai-blogs-digest`；Grok Bot 例程「AI 资讯周报」（每周五约 09:00）。

**目标：**
每期周报生成时，同一批抓取数据（精简版 + 全文版 + 榜单快照）自动存入 ai-news-data，可事后核对和重跑。

**动作：**
1. `fetch_feeds.py` 增加全文输出（不截断，如 `--out-full`），精简版保持不变供写周报用。
2. 周报 SKILL.md 增加一步：生成后把当期数据和 `manifest.json`（覆盖窗口、生成时间、脚本 commit、各文件条数与来源）推到 ai-news-data 的 `issues/<生成日>/`。
3. 确认例程运行环境对 ai-news-data 有推送权限；不存密钥，AA 只存公开字段。

**完成标准：**
- 跑一期后 ai-news-data 出现对应 `issues/YYYY-MM-DD/`，文件齐全，manifest 条数与周报所用数据一致。
- 周报 PR 正文附上该期数据目录链接。
- 2026-11-13 之前的旧期不补（数据未留存）。
