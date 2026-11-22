---
name: feedback_ai_news_migration_updates_skill_data_and_site
description: 改 AI 资讯 skill 或迁数据时打开：不留旧格式兼容层，要兼容就改数据；一次迁移同时让 skill、数仓和站点渲染用上最新版。
metadata:
  edges-title: AI 资讯一次迁移同时更新 skill、数仓和站点
  edges-type: feedback
  edges-origin-session-id: bc-1e1ad750-d128-5f1b-94b9-89d5d2dad854
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-11-22T21:22:25+00:00'
---

改 AI 资讯时只保留一份现行数据契约。不为旧格式留兼容读取。旧期次还要能用，就直接把数据改成现行格式。一次迁移同时把 skill、数仓数据和网站渲染切到这一版，三处都是最新版，这次迁移才算完成。

**Why:**
2026-11-22 用户要求这条 skill 保持清爽，不做过多向后兼容；要兼容就改数据本身。同日把一次迁移的目标定为：数据处理 skill、数仓数据、网站渲染全部使用最新版。三阶段、`raw/` `cleaned/` `summary/`、版本号和关键词映射已经写在 skill 与 `feedback_ai_news_three_stages`。本条只补「不留旧格式分支，一次迁完三处」。这是用户所述的约定。

**How to apply:**
改 `weekly-ai-blogs-digest` 的对外契约时，按该 skill 已写的 semver 升版本，改数据仓库里已有期次的文件，并让站点按最新 `summary/` 渲染。不要在 skill 或站点里并列保留旧目录或旧字段的读取分支。
