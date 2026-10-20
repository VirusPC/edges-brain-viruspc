# Artifacts 预览服务：挂到现有 teach ECS

Teach 站点部署经验的 sibling（对照 [`2026-09-08--Teach站点部署与大陆备案经验.md`](../2026-09-08--Teach%E7%AB%99%E7%82%B9%E9%83%A8%E7%BD%B2%E4%B8%8E%E5%A4%A7%E9%99%86%E5%A4%87%E6%A1%88%E7%BB%8F%E9%AA%8C/INDEX.md)）。产品决策仍看 [ADR 0013](https://github.com/VirusPC/edges/blob/main/docs/adr/0013-artifacts-preview-service.md)；这里只记运维落点。

## 结论

Artifacts 预览和 teaching **同机、同一次整仓 pull**。Node 进程走 `cheng-dev` 的 systemd **user** unit（8787 只绑 127.0.0.1）；公网仍走已有 :80 / :443。人机接口是 `edges artifacts server`：`install` 写盒上 env（缺 token 就建，`--force` 可轮换）并装依赖/unit 但不启动，`start`/`stop`/`restart` 只管进程，`status` 看 health+unit，`setup-nginx` 做一次性/可重入的 :80 反代。没有 `server init`（本机客户端才是顶层 `edges artifacts init`）。nginx 必须同时接住 `POST /artifacts`（无尾斜杠，CLI publish）和 `GET /artifacts/<uuid>/`，并且不能动 `/teaching/`。锁定命名：站点文件 **`/etc/nginx/conf.d/teaching.conf`**，公网前缀 **`/teaching/`**，仓库目录 `knowledge/teaching/`。`setup-nginx` / `inject_nginx_include.py` 只认 `/teaching/`，环境变量是 `TEACHING_CONF`。2026-09-21 核实生产仍是遗留 `teach.conf` + `/teach/`：先改名为 `teaching.conf` 并跑 `deploy/migrate-teaching-nginx-prefix.py`，再 `edges artifacts server setup-nginx`。不要双认旧文件名或旧前缀。已改域名：给手机的 BASE_URL 写 `https://edges.viruspc.tech`，不写 Mesh 主机名，也不写裸 IP。

## 已核实的约束（不要再发明）

- 同步：GitHub Actions SSH → `~/projects/edges` 上 `git fetch` / `reset --hard origin/main`。不要改回 path-subset rsync。`git fetch` 若偶发失败，Action 仍是主路径；后备是「能同时到 GitHub 和这台机器」的环境打一份整仓 tar，再在盒上跑 `edges artifacts server install` 然后 `restart`（`deploy/bootstrap.sh` 是这两条的薄包装）。
- nginx：站点文件是 `/etc/nginx/conf.d/teaching.conf`（`TEACHING_CONF`），必须带 `/teaching/`（80 和 443 两个 `server {}` 都要）。生产今天仍可能是遗留 `teach.conf` + `/teach/`：先 `mv` 成 `teaching.conf`，再跑 `migrate-teaching-nginx-prefix.py`，不要让脚本同时认旧名。新增 location 只覆盖精确 `/health`、精确 `POST /artifacts` 和前缀 `/artifacts/`。不要为 8787 再开安全组（安全组仍由人在控制台改）。公开入口是 CLI `setup-nginx`；需要 sudo 时它会打印确切的 `sudo bash …/setup-nginx-artifacts.sh`。不要把打印 snippet 当成主路径，也不要再发明 `nginx-snippet` 或用户面 `apply.sh`。
- 进程：user unit + `loginctl enable-linger`（`setup-nginx` 会 enable linger），否则 Actions SSH 断开后服务会随会话死掉。
- 密钥：`EDGES_ARTIFACTS_TOKEN` 只活在盒上 `~/.config/edges/artifacts-preview.env` 和本机 `~/.config/edges/artifacts.env`。仓里只有 `artifacts.env.example`。
- URL 纪律：对外用 `https://edges.viruspc.tech/...`（已改域名）；禁止再把内部 Mesh 名或裸 IP 当成公网网址（teach 笔记里已被当面纠正过）。
- Cloudflare 1010：对 `https://edges.viruspc.tech` 的 `POST /artifacts`（`edges artifacts publish`），请求缺浏览器式 `User-Agent` 时 Cloudflare 回 1010；带正常 UA 则 201。`GET` 读路径通常正常。CLI 的 `publish` / `rm` 固定发送 `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36`，不要依赖 Node/undici 默认 UA。手写 `curl` POST 必须带同样的 `-A`。

## 人要做的一次性动作

1. 盒上装好 Node ≥ 20 与 pnpm（user PATH）。
2. `edges artifacts server install`（写 env、装 unit，不启动）。本机用同一 token：`edges artifacts init --base-url https://edges.viruspc.tech --token <printed token>`。盒上已有的 `artifacts-preview.env` 不由这次改文档重写，BASE_URL 在 ECS 上手动改。
3. `edges artifacts server start`（不要和 install 合成一步）。
4. 若盒上还是遗留 `teach.conf`：`sudo mv /etc/nginx/conf.d/teach.conf /etc/nginx/conf.d/teaching.conf`，再 `sudo python3 …/deploy/migrate-teaching-nginx-prefix.py /etc/nginx/conf.d/teaching.conf`，然后 `nginx -t && systemctl reload nginx`。
5. `edges artifacts server setup-nginx`（只写 `teaching.conf` 里含 `/teaching/` 的 server）。
6. `edges artifacts server status`；盒上 `curl http://127.0.0.1:8787/health`；外网 `curl https://edges.viruspc.tech/health`；再确认 `/teaching/` 仍在。

之后每次 main 部署：现有 `deploy.yml` 在 pull 之后，若 env 文件在且 token 不是占位符，就 `install` 再 `restart`（构建/unit 没变也可以只 `restart`）；nginx 通常不用再跑。`install` 保留已有 `EDGES_ARTIFACTS_BASE_URL`。轮换 token：`install --force` → `restart` → 本机 `edges artifacts init --base-url https://edges.viruspc.tech --token <printed token> --force`。

## 交叉

- 服务与 CLI：`extensions/services/artifacts-preview/`、`edges artifacts`
- 工作流：`.github/workflows/deploy.yml`（concurrency `ecs-edges-pull`，environment `production`）
- Teaching 站点文件 `/etc/nginx/conf.d/teaching.conf`，公网前缀 `/teaching/`（本层不改教学内容）。盒上若仍是旧名旧前缀，先改名再 migrate，不要双认。
