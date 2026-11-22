# site

个人站点。Astro 在构建时只读仓库根的 [`posts/`](../posts/README.md)、[`notes/`](../notes/README.md) 和 [`projects/`](../projects/README.md)，生成静态页，由 GitHub Actions 部署到 GitHub Pages。

预期地址：<https://viruspc.github.io/edges-brain-viruspc/>

这是项目页路径（`/<repo>/`），不是用户主页 `https://viruspc.github.io/`。`astro.config.mjs` 里的 `base` 默认是 `/edges-brain-viruspc`。本地预览同样带这个前缀：`http://127.0.0.1:4321/edges-brain-viruspc/`。若以后改成用户主页或换仓库名，构建前设置 `SITE_BASE=/`（或新的仓库路径）。

## 启用 GitHub Pages

仓库需要手动切一次来源，否则部署作业无法写入 Pages：

1. 打开本仓 **Settings → Pages → Build and deployment**。
2. **Source** 选 **GitHub Actions**。
3. 合并含 `.github/workflows/pages-site.yml` 的改动，或在 Actions 里手动跑 **Pages site**。

工作流在推到 `main` 且改动落在 `site/`、`posts/`、`notes/` 或 `projects/` 时构建并部署。Pull request 只构建和测试，不部署。

已有的 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 仍只更新 ECS 上的教学站检出，不构建这个站点。

## 页面

| 路径 | 内容 |
| --- | --- |
| `/` | 近期 posts、notes，以及项目列表 |
| `/posts`、`/posts/…` | 成稿列表与正文。衬线正文；Markdown 脚注 `[^1]` 在宽屏排到页边，窄屏点序号展开 |
| `/notes`、`/notes/…` | 日期笔记，与成稿同一套纸面版式。列表按年与月份分组 |
| `/projects`、`/projects/…` | 根与任意层项目共用同一套紧凑列表。Chevron 只展开一层，标题进入下一层。Markdown 有正文页；PDF 链到 GitHub |
| `/about` | 占位，作者以后在本目录改 |
| `/rss.xml` | posts 与日期笔记 |
| `/404.html` | 未找到 |

## 内容从哪来

- **Posts：** `posts/` 下的 Markdown，忽略 `README.md`（那是目录约定，不是一篇成稿）。可选 frontmatter：`title`、`date`、`description`、`draft: true`（为 true 时不发布）。没有 frontmatter 时，标题取文首标题，日期取文件名前缀 `YYYY-MM-DD`。AI 不写入 `posts/`。
- **Notes：** 只收录 `notes/<YYYY-MM-DD…>/INDEX.md`。文件夹名以真实日期开头即可，`2026-10-29--slug` 与较早的 `2026-05-01-个人效率` 都会收录。不收录未标日期的目录（如 `1. memory`）、点目录，以及直接放在 `notes/` 下、没有 `INDEX.md` 的单个文件。没有 `publish` 开关，符合条件的笔记全部发布。标题优先用 frontmatter 或文首标题，否则用文件夹 slug；日期只用文件夹前缀。列表、首页和正文页的标题如果仍以 `YYYY-MM-DD--`、`YYYY-MM-DD-` 或 `YYYY-MM-DD ` 开头，会去掉这段前缀；地址仍是文件夹名。
- **Projects：** 根 `/projects` 和任意层项目页是同一套列表。顶层项目仍是 `projects/` 的每个直属目录（不要求已写进 `projects/README.md`，避免漏掉早先已公开、尚未补登记的目录）。子项目只认 Edges 既有约定，不另造字段：目录形如 `P/projects/Q`，且 `Q/INDEX.md`（或旧名 `index.md`）出现在 `P/projects/README.md` 或 P 的 hub 的 `edges-entries-local` / `edges-entries-descendants` 里。普通正文链接、仅有 INDEX、以及 `metadata.edges-type: project` 都不算子项目；后者是记忆类型。`notes/`、`tasks/`、`memory/`（含 `memory/projects/`）保持内容目录。文档归最近的已识别项目，遇到子项目边界就停下。`notes/README.md`、`tasks/README.md`、`projects/README.md`、`memory/<类型>/README.md` 这类组织清单不进文章列表、也不计篇，但原来的地址仍在。笔记、任务、记忆自己的 INDEX 仍是内容。项目 hub 的地址不变，正文放在默认收起的「项目说明」里。没有 hub 的旧目录也会有项目页。文章地址保持 `<项目路径>/<相对路径>`。行上的日期是内容日期（文件名或最近的日期目录，含子项目里的内容）；没有这种日期才回退到该项目目录名前缀，不会写成「最近更新」，也不会用文件修改时间。首页项目行用同一套日期。列表默认收起；返回时恢复这一页展开过的项和滚动位置。
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
