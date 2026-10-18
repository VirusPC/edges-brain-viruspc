# Persistent `/tasks/` board (ops)

Public URL: [https://edges.viruspc.tech/tasks/](https://edges.viruspc.tech/tasks/) and [https://edges.viruspc.tech/teaching/](https://edges.viruspc.tech/teaching/) (Cloudflare Tunnel to the same Aliyun ECS nginx). Decision: [ADR 0021](../../../docs/adr/0021-persistent-tasks-board-site.md).

This is generated HTML only. It is not Artifacts (`publish` / UUID / TTL) and not a new status-station product. `edges tasks project review-page` still only renders.

## Generate (every deploy)

After `git fetch` / `reset --hard origin/main`, the existing `.github/workflows/deploy.yml` job always runs. Two gitignored build outputs must exist before generate: the Vite review shell under `extensions/cli/src/commands/tasks/project/assets/review-page/`, and the schema artifacts under `extensions/cli/dist/schemas/`. `generate-tasks-site.ts` validates each task `doc` with that schema. It does not generate the schema itself.

```bash
pnpm install --frozen-lockfile --filter @viruspc/edges... --filter tasks-review-app...
pnpm --filter tasks-review-app run build
pnpm --filter @viruspc/edges run build:schemas
pnpm --filter @viruspc/edges exec -- tsx scripts/generate-tasks-site.ts \
  --scope "$PWD" --out "$PWD/tasks/_site/index.html"
```

From a checkout with PATH already set (same as the Action):

```bash
pnpm --filter tasks-review-app run build
pnpm --filter @viruspc/edges run build:schemas
pnpm --filter @viruspc/edges exec -- tsx scripts/generate-tasks-site.ts \
  --scope "$PWD" --out "$PWD/tasks/_site/index.html"
```

If dependencies are missing, `pnpm install --frozen-lockfile --filter @viruspc/edges... --filter tasks-review-app...`, then `pnpm --filter tasks-review-app run build` and `pnpm --filter @viruspc/edges run build:schemas`. The Vite files and `dist/schemas/` are gitignored and are not in the git checkout. Output HTML is gitignored (`tasks/_site/`). A failed generate fails the Action; nginx keeps serving the last good `index.html` until the next success. `edges artifacts server install` / `restart` do not read these schema files. `deploy/bootstrap.sh` only wraps those two server commands.

`--scope "$PWD"` gathers the root and actual descendant scopes, including domain and maintenance tasks. Public `/tasks/` remains one aggregated board.

The Action does **not** re-run nginx setup. After generation it runs `sudo -n /usr/local/sbin/edges-migrate-site-layout`. That command is a root-owned copy, not a script in this repo: teaching locations serve `<repo>/teaching/`, and the installed tasks snippet serves `<repo>/tasks/_site/`. It keeps unrelated roots, backs up both configs, validates with `nginx -t`, restores on failure, and reloads only when changed. This runs regardless of the artifacts token/env file.

Do not grant the deploy account sudo on a repository path. Anyone who can push `main` could change that file before the next deploy. Install the fixed command once, as root, from the checkout:

```bash
sudo bash extensions/services/artifacts-preview/deploy/install-site-layout.sh
```

The account is `SUDO_USER`, or pass that account as the only argument. The installer copies the migrator to `/usr/local/sbin/edges-migrate-site-layout` and its helpers to `/usr/local/lib/edges/site-layout/` (`root:root`, directories and executables `0755`, the Python helper `0644`), writes `/etc/sudoers.d/edges-site-layout` (`0440`) so that account may run only that absolute path with no arguments, checks the fragment with `visudo -cf` before replacing the file, then runs the migration once. Run the installer again to upgrade the copies. If the installed bytes differ from the checkout, Deploy prints a `::warning::` and still runs the installed command. If the command is missing or `sudo -n` cannot run it, Deploy fails and prints the installer command. Fresh hosts still need the one-time nginx setup below.

## One-time nginx (sudo)

Requires `/etc/nginx/conf.d/teaching.conf` with `/teaching/` already in a `server { }` block. Leftover `teach.conf` / `/teach/` must be migrated first (`extensions/services/artifacts-preview/deploy/migrate-teaching-nginx-prefix.py`), then:

```bash
sudo bash /home/cheng-dev/projects/edges/extensions/cli/deploy/setup-nginx-tasks.sh
```

That installs `/etc/nginx/snippets/edges-tasks.conf` (`/tasks/` → `<repo>/tasks/_site/`) and includes it only in `teaching.conf` servers that contain `/teaching/`. Do not add `/tasks/` to the artifacts snippet. Do not dual-recognize `/teach/`.

## Checks

These curls hit the public Cloudflare entry.

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://edges.viruspc.tech/teaching/
curl -fsS -o /dev/null -w '%{http_code}\n' https://edges.viruspc.tech/tasks/
curl -fsS https://edges.viruspc.tech/health
```

`/teaching/` is still the teach site. `/tasks/` is the generated board. `/health` is still artifacts JSON `{"ok":true}`.

## PATH on ECS

Generate uses the just-pulled tree via `pnpm --filter @viruspc/edges exec -- tsx`. The deploy job hoists `~/.local/share/pnpm`, `~/.local/bin`, `/usr/local/bin`, and optional nvm so this does not depend on the artifacts env file.
