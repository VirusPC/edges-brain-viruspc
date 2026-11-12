---
name: project_ai_news_gap_notes_and_arena_window
description: 写或回改 AI Coding 周报时打开：缺了的小节省略，原因进同名 .notes.md；Arena 用窗口结束日前最近一份榜。
metadata:
  edges-title: 周报缺项写入 notes，Arena 用窗口结束日前最近榜
  edges-type: project
  edges-origin-session-id: bc-c98ec591-0575-5d1a-912c-5b28cfd0b2ef
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-12T10:29:10+00:00'
---

AI 周报正文省略拿不到的小节，原因写在同目录的 `YYYY-MM-DD-ai-coding-news.notes.md`。Arena 图用覆盖窗口结束日仍有效的最近一份榜（`leaderboard_publish_date` ≤ 窗口结束日）；和上一期是同一份时，图注写「较上周无新榜」和发布日。

**Why:**
2026-11-12 用户批准，并要求连已发布各期一起回改：正文不写「没拉到」、密钥缺失或截断原因；图注只留榜单发布日和红圈是谁。不要用窗口之后才发布的榜当作当期。Arena 官方没有按周图片存档，图由历史榜单数据重画，或复用上一期已有图。站点 `/ai-news/` 不展示、不链接说明文件。以上是用户所述的写法，并已落到周报 skill 与 2026-08-14～2026-11-06 各期。

**How to apply:**
- 写或回改 `ai-news/` 时按 `skills/managed/weekly-ai-blogs-digest`。Arena 用 `scripts/fetch_llm_arena.py --until <窗口结束日>`，读 Hugging Face `lmarena-ai/leaderboard-dataset` 的 `full` parquet。
- 说明文件与周报同目录。`/ai-news/` 列表和正文不收录。
- 仍不要留空标题，不要拿后来的数据冒充当时，不要编造。
