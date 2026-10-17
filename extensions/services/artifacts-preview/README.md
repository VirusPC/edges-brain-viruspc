# edges-artifacts-preview

Short-lived static **Artifacts 预览服务** (ADR 0013): upload → public URL → TTL delete.

<a id="use-case-matrix"></a>

## 用例 × 能力

这个包是 HTTP 进程；日常操作走 [`edges artifacts`](../../cli/README.md#artifacts)。能做的事：把短生命周期静态页变成真浏览器（含手机）可开的 URL，到期删；以及在本机或 ECS 式宿主上把服务装起来、重启、轮换 token。能力面仍是 CLI + Skill + MCP；本轮没有 artifacts MCP。Skill 路径：渲染 → `publish` → 给人 URL。`review-page` 仍只渲染，不 publish。固定入口看 main 整板**不是**本服务：那是无 TTL 的 `/tasks/` 持久看板站（[ADR 0021](../../../docs/adr/0021-persistent-tasks-board-site.md)），不要用 UUID `publish` 当长期入口。

| 用例 | 达成什么 | CLI | HTTP | review-page / Skill / Action |
| --- | --- | --- | --- | --- |
| 手机 / 浏览器打开 Agent 审阅 HTML | 本地渲染页变成可达 UUID URL | `edges artifacts publish`（客户端已 `init`；`EDGES_ARTIFACTS_BASE_URL` 示例 `https://edges.viruspc.tech`） | `POST /artifacts`；人打开 `GET /artifacts/:id/`。对该主机的 POST，缺浏览器式 User-Agent 时 Cloudflare 回 1010，带上则为 201；GET 通常正常 | `edges tasks project review-page` **只渲染**；Skill：render → publish → 给 URL |
| 固定入口看 main 整板 | 不是本服务（无 TTL 的 `/tasks/` 持久看板站） | — | — | 见 [ADR 0021](../../../docs/adr/0021-persistent-tasks-board-site.md)；不要 `publish` UUID 当长期入口 |
| 首次托管服务（本机或 ECS 式） | 写出 env / unit，拉起进程，必要时对外反代 | `server install` → `start` →（经 nginx 对外时）`setup-nginx` → `status`；客户端 `artifacts init` | `GET /health` | 无 Action |
| 日常发布 / 删除短生命周期页 | 上传一页或提前删掉 | 一次 `init` → `publish` / `rm` | `POST /artifacts` / `DELETE /artifacts/:id` | 无 |
| 仓库部署 pull 之后 | 盒上已有 server env 时跟上新代码并重启 | `server install` 再 `restart`（env 不存在则跳过） | 重启后 `GET /health` | Action：[`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml)；不要从 Action 再跑 `setup-nginx` |
| 轮换 token | 换共享 token，服务与客户端都跟上 | `server install --force` → `restart` → 客户端 `init --force` | 写接口换新 Bearer | 无 |

This package is the HTTP process. The thin command surface is `edges artifacts` in [`../../cli`](../../cli/). `edges tasks project review-page` stays render-only; Skill orchestration is render → `edges artifacts publish` → give the human the URL. Capability Surface is CLI + Skill + MCP; this round has no artifacts MCP.

Phone review needs a **reachable** `EDGES_ARTIFACTS_BASE_URL` (ECS / public host). Localhost only works on the same machine.

## Run locally

```bash
# 1. Create ~/.config/edges/artifacts.env (local token + base URL)
pnpm --filter @viruspc/edges exec tsx src/index.ts artifacts init

# 2. Start this service with the printed token
EDGES_ARTIFACTS_TOKEN=… \
EDGES_ARTIFACTS_BASE_URL=http://127.0.0.1:8787 \
pnpm --filter edges-artifacts-preview dev

# 3. Publish a file or directory; stdout JSON includes url
pnpm --filter @viruspc/edges exec tsx src/index.ts artifacts publish /tmp/review.html
pnpm --filter @viruspc/edges exec tsx src/index.ts artifacts rm <id-or-url>
```

After `pnpm --filter edges-artifacts-preview build`, `start` runs `node dist/index.js`. Root scripts: `pnpm dev:artifacts` / `pnpm start:artifacts`.

## ECS / reachable URL (Aliyun, same box as teach)

Same Node process as local. Phone review uses `https://edges.viruspc.tech`. Do not put `:8787` or a bare IP in printed URLs; nginx on :80 reverse-proxies `/health` and `/artifacts/` to loopback, and Cloudflare fronts that origin. Leave `/teaching/` as it is. This ECS must serve the site at **`/teaching/`** from **`/etc/nginx/conf.d/teaching.conf`**.

`edges artifacts publish` only uploads to whatever `EDGES_ARTIFACTS_BASE_URL` points at. It does not deploy the service.

The host process CLI is `edges artifacts server`:

```
edges artifacts server install [--force]
edges artifacts server start | stop | restart
edges artifacts server status
edges artifacts server setup-nginx
```

There is no `server init` (client `edges artifacts init` is the laptop command). `install` ensures `~/.config/edges/artifacts-preview.env` (creates a token if missing; `--force` may rotate), runs pnpm install/build, and installs + enables the user unit. It does **not** start. Never combine install and start. Token stays on the server (and in your local CLI config). Never commit `EDGES_ARTIFACTS_TOKEN`. Thin scripts under [`deploy/`](deploy/) are called by the CLI; do not treat them as the public surface.

### First time on the ECS

1. **Node ≥ 22 + pnpm** on `cheng-dev` PATH (user systemd cannot sudo-install them). `corepack enable` then `corepack prepare pnpm@latest --activate` is enough if Node is already there.
2. **Install (config + unit, no process):**

   ```bash
   edges artifacts server install
   ```

   Share the printed token with the laptop client. Do not open a public 8787 security-group port.

3. **Start, then expose :80, then check:**

   ```bash
   edges artifacts server start
   edges artifacts server setup-nginx
   edges artifacts server status
   ```

   `setup-nginx` installs `deploy/nginx-artifacts.conf` into `/etc/nginx/snippets/` and `include`s it inside `/etc/nginx/conf.d/teaching.conf`. **teaching.conf must contain `/teaching/`** — the injector matches that prefix only. `TEACHING_CONF` defaults to that path. Do not dual-support leftover filenames or prefixes.

   On the live ECS today the site file is still leftover `teach.conf` with `/teach/`. Fix path (one time, not a second current name):

   1. Rename/replace to `teaching.conf` with `/teaching/` locations and redirects:

      ```bash
      sudo mv /etc/nginx/conf.d/teach.conf /etc/nginx/conf.d/teaching.conf
      sudo python3 /home/cheng-dev/projects/edges/extensions/services/artifacts-preview/deploy/migrate-teaching-nginx-prefix.py /etc/nginx/conf.d/teaching.conf
      sudo nginx -t && sudo systemctl reload nginx
      ```

   2. Then `edges artifacts server setup-nginx` injects `include /etc/nginx/snippets/edges-artifacts.conf;` into those `/teaching/` server blocks.

   Location reference: [`deploy/teaching-locations.conf`](deploy/teaching-locations.conf). `setup-nginx` also `loginctl enable-linger` so the user unit survives deploy SSH logout. If sudo is needed, the CLI prints the exact `sudo bash …/setup-nginx-artifacts.sh` command. There is no user-facing `apply.sh`.

### Confirm

On the ECS:

```bash
curl -fsS http://127.0.0.1:8787/health
```

From a phone or any outside machine (no extra port):

```bash
curl -fsS https://edges.viruspc.tech/health
curl -fsS -o /dev/null -w '%{http_code}\n' https://edges.viruspc.tech/teaching/
```

`/health` must be JSON `{"ok":true}`. `/teaching/` must still be the teach site.

### Cloudflare 1010 on `POST /artifacts`

Public base URL: `https://edges.viruspc.tech`.

`POST /artifacts` (what `edges artifacts publish` does) returns **1010** when the request has no browser-like `User-Agent`. Node/undici’s default is `node`; a bare `curl` identifier is the same class of miss. The same POST with a normal browser User-Agent returns **201**. `GET /health` and `GET /artifacts/:id/` usually succeed without that header.

`publish` and `rm` always send this stable User-Agent. They do not use the runtime default:

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
```

Write-path smoke (uses the shared token; do not paste the token into the repo). The `User-Agent` below is required; without it this curl is a 1010, not a 201:

```bash
# on a machine that has the token; expect 201 then a GET 200
curl -fsS -X POST https://edges.viruspc.tech/artifacts \
  -H "authorization: Bearer $EDGES_ARTIFACTS_TOKEN" \
  -H "content-type: application/json" \
  -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
  -d '{"files":[{"path":"index.html","content":"<html>ok</html>"}]}'
```

`edges artifacts publish` is the same `POST /artifacts` (no trailing slash) and already sets that User-Agent. If the POST 301s to `/artifacts/`, `deploy/nginx-artifacts.conf` is wrong.

### Laptop / local CLI (publish client)

Use the **same token** as the server env file:

```bash
edges artifacts init --base-url https://edges.viruspc.tech --token <token from server install>

edges artifacts publish /tmp/review.html
```

Phone opens the printed `https://edges.viruspc.tech/artifacts/<uuid>/` in a system browser, not localhost.

### After each main pull

GitHub Actions [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml) already SSH-pulls the full repo (`git fetch` / `reset --hard origin/main`, concurrency `ecs-edges-pull`). **Only when** `~/.config/edges/artifacts-preview.env` exists, it runs `edges artifacts server install` then `edges artifacts server restart` (skipped until the one-time token file is in place, so teach deploys stay green). After the env exists, a failure fails the job so the restart is visible; the tree is already at `origin/main`. After task-site generation, the Action runs `sudo -n /usr/local/sbin/edges-migrate-site-layout` even without the artifacts env. That entry is installed once by root with `sudo bash extensions/services/artifacts-preview/deploy/install-site-layout.sh`. It is not a repository script: sudo is limited to that absolute path with no arguments, so a push to `main` cannot change what root executes. The command migrates teaching roots to `<repo>/teaching/` and the installed tasks alias to `<repo>/tasks/_site/`, keeping public URLs and unrelated roots. It backs up both configs, validates with `nginx -t`, restores on failure, and reloads only when changed. Paths are fixed (`/etc/nginx/conf.d/teaching.conf` and `/etc/nginx/snippets/edges-tasks.conf`). A checksum mismatch prints `::warning::` and still runs the installed command; a missing command or a password prompt fails the job and prints the installer command. Do not re-run `setup-nginx` from the Action.

If the unit files did not change, `restart` alone is enough; `install` then `restart` is the conservative path the Action uses.

If `git fetch` from the ECS is flaky: keep the Action as primary (it already works for teach). Fallback is a full-repo tar over SSH from a machine that can reach both GitHub and the box, then the same CLI verbs (or `deploy/bootstrap.sh`, a thin wrapper of `install` then `restart`) — do not rsync a path subset.

Rotate the token: `edges artifacts server install --force`, then `edges artifacts server restart`, then client `edges artifacts init --base-url https://edges.viruspc.tech --token <printed token> --force`.

Server env (see [`deploy/artifacts.env.example`](deploy/artifacts.env.example)):

```
EDGES_ARTIFACTS_TOKEN=<shared token from install>
EDGES_ARTIFACTS_BASE_URL=https://edges.viruspc.tech
EDGES_ARTIFACTS_HOST=127.0.0.1
EDGES_ARTIFACTS_PORT=8787
EDGES_ARTIFACTS_DATA_DIR=/home/cheng-dev/.local/share/edges-artifacts
```

`EDGES_ARTIFACTS_BASE_URL` is what `publish` prints (no trailing slash). If a phone must open the page, this cannot be `http://127.0.0.1` or `localhost`. `install` keeps an existing value; change the file on the box by hand. This repo does not rewrite the running env.

## HTTP

| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/health` | no |
| `POST` | `/artifacts` | Bearer token |
| `GET` | `/artifacts/:id/` and `/artifacts/:id/:relpath` | no (UUID path + TTL) |
| `DELETE` | `/artifacts/:id` | Bearer token |

Default TTL is 24h (`ttlSeconds` on POST, or `edges artifacts publish --ttl 2h`). `from` is optional. When present, v1 only allows `{ type: "task", id, project }` (`id` is the edges task stem; both required). Persist only `id`, `entry`, `expiresAt`, and optional `from` in `meta.json`; echo `from` on 201 only when set. CLI: `--from-type task --from-id <stem> --task-project <slug>` (all three together, or omit `from`). No `--from-name`, `--task-stem`, or default `cli`/`edges-cli`. Server sweeps expired artifacts about every 60s and also on GET. Writes stay under a disk temp dir (`0700` / files `0600`); relative paths cannot traverse or follow symlinks out (every path component is `lstat`’d). On ECS set `EDGES_ARTIFACTS_DATA_DIR` to a user-owned directory (default in the env example: `~/.local/share/edges-artifacts`), not a world-writable `/tmp`.

## Tests

```bash
pnpm --filter edges-artifacts-preview test
```
