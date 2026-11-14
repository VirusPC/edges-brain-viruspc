---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-11T13:04:48.855Z'
  edges-title: ai-news 周报在 Astro 博客上可视化展示
  edges-tasks-status: in_review
  edges-task-priority: none
name: visualize_ai_news_on_astro_blog
description: 在脑仓 site/ 的 Astro 站上按期浏览 ai-news 周报，新周报合入 main 后由 Pages 工作流自动发布。
---

在脑仓 `site/` 增加顶级栏目 `/ai-news/`，按期浏览全部 AI 资讯周报；不改 VirusPC/blog。

**事实背景：**
AI 资讯周报每周五由例程生成，以 `ai-news/YYYY-MM-DD-ai-news.md` 存进本仓。Arena 排行图是同目录的 SVG/PNG。目录在 `ai-news/README.md`。2026-11-11 peng cheng 提出想在网站里可视化，并确认用 Astro。开卡时把目标写成了 VirusPC/blog；那个仓是 Jekyll，已否决。
- 现状：已有 12 期，覆盖 2026-08-07 到 2026-11-05。从 2026-10-30 起换成固定章节（〇薅羊毛 → 本周关键词 → 模型进展 → 项目开源 → 国内进展 → 国际进展）。更早的期次是平铺文章清单。
- 非目标：不改周报生成流程和格式，不改 `ai-news/README.md`，不上首页、Archive 和全站 `/rss.xml`。不做卡片版式，不做搜索。不动 VirusPC/blog。
- 关联：weekly-ai-blogs-digest；Grok Bot 例程「AI 资讯周报」。

**Why：**
周报和 Astro 站在同一个仓，构建时直接读 `ai-news/` 即可，不必再同步到另一个博客仓。

**How：**
2026-11-11 已批准的决定：
1. 做在本仓 `site/`（Astro，base `/edges-brain-viruspc`）。GitHub Pages 工作流是 `.github/workflows/pages-site.yml`。
2. 新开 `/ai-news/`。导航单独一项「AI News」，放在 Projects 后面。单期页面也高亮这一项。
3. 列表每期一行：发布日期、覆盖时间窗、一句「本周关键词」。没有该章节的期次改为显示文章条数。标题和日期从文件名推出。覆盖窗口默认是发布日前 7 天，不含当天。
4. 单期沿用 ArticlePage 渲染 Markdown，并加只含章节标题的目录。Arena 图片走现有的 remark-local-assets。
5. 全部期次上站。没有「一、本周关键词」的期次标「旧版」，列表和正文都标。
6. 单独提供 `/ai-news/rss.xml`。全站 RSS 不收录周报。
7. `pages-site.yml` 的 push 与 pull_request 触发路径都加上 `ai-news/**`。

**完成标准：**
- `site` 构建成功。
- 构建产物里有 `/ai-news/` 列表、每一期一个页面、`/ai-news/rss.xml`。
- `site/scripts/verify-dist.mjs` 通过。
- 导航能进入该栏目。
- 改动以 PR 交出，合并前等人审。
