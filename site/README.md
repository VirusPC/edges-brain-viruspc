# site

个人站点。Astro 在构建时只读仓库根的 [`posts/`](../posts/README.md) 和 [`notes/`](../notes/README.md)，生成静态页，由 GitHub Actions 部署到 GitHub Pages。

预期地址：<https://viruspc.github.io/edges-brain-viruspc/>

这是项目页路径（`/<repo>/`），不是用户主页 `https://viruspc.github.io/`。`astro.config.mjs` 里的 `base` 默认是 `/edges-brain-viruspc`。本地预览同样带这个前缀：`http://127.0.0.1:4321/edges-brain-viruspc/`。若以后改成用户主页或换仓库名，构建前设置 `SITE_BASE=/`（或新的仓库路径）。

## 启用 GitHub Pages

仓库需要手动切一次来源，否则部署作业无法写入 Pages：

1. 打开本仓 **Settings → Pages → Build and deployment**。
2. **Source** 选 **GitHub Actions**。
3. 合并含 `.github/workflows/pages-site.yml` 的改动，或在 Actions 里手动跑 **Pages site**。

工作流在推到 `main` 且改动落在 `site/`、`posts/` 或 `notes/` 时构建并部署。Pull request 只构建和测试，不部署。

已有的 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 仍只更新 ECS 上的教学站检出，不构建这个站点。

## 页面

| 路径 | 内容 |
| --- | --- |
| `/` | 近期 posts 与 notes |
| `/posts`、`/posts/…` | 成稿列表与正文。衬线正文；Markdown 脚注 `[^1]` 在宽屏排到页边，窄屏点序号展开 |
| `/notes`、`/notes/…` | 日期笔记。奶油底、等宽、左窄栏 |
| `/archive` | 成稿按年归档 |
| `/about` | 占位，作者以后在本目录改 |
| `/rss.xml` | posts 与日期笔记 |
| `/404.html` | 未找到 |

## 内容从哪来

- **Posts：** `posts/` 下的 Markdown，忽略 `README.md`（那是目录约定，不是一篇成稿）。可选 frontmatter：`title`、`date`、`description`、`draft: true`（为 true 时不发布）。没有 frontmatter 时，标题取文首标题，日期取文件名前缀 `YYYY-MM-DD`。AI 不写入 `posts/`。
- **Notes：** 只收录 `notes/<YYYY-MM-DD…>/INDEX.md`。文件夹名以真实日期开头即可，`2026-10-29--slug` 与较早的 `2026-05-01-个人效率` 都会收录。不收录未标日期的目录（如 `1. memory`）、点目录，以及直接放在 `notes/` 下、没有 `INDEX.md` 的单个文件。没有 `publish` 开关，符合条件的笔记全部发布。标题优先用 frontmatter 或文首标题，否则用文件夹 slug；日期只用文件夹前缀。
- **不发布** `edges/`。

笔记里的本地图片会按文件相对路径解析（含 Obsidian `![[...]]`，能在笔记目录或仓库根找到文件时）。找不到的本地图改成替代文字，不让整站构建失败。

## 命令

```bash
cd site
npm ci
npm test
npm run build
npm run dev
```

页边注样张在 `fixtures/sample-post.md`，默认不进入站点。要连同真实笔记一起构建并核对脚注：

```bash
SITE_INCLUDE_FIXTURE=1 npm run build
```
