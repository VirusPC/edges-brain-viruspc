# 源码核验摘记（2026-11-09，Asia/Shanghai）

- 标签：`dsh-v0.2.2-rc.1`；npm `@deepseek-ai/dsh@0.2.2-rc.1`。
- 未 checkout 仓库；经 GitHub connector / npm README / 文档路径读取。
- 随附 profile：web, headless, sdk, sdk-minimal, acp；desktop 保留；tui 仅为 CLI 示例假设。
- Home：`resolveDshHome` → `~/.dsh`；配置面：`cordis.patch.yml` + `.credentials.yaml`；legacy settings.yaml 导入改名。
- `packages/llm/llm-pi-ai` 依赖 `@earendil-works/pi-ai`。
- 文档站点 WebFetch 超时；以仓内 `docs/*.zh.md` 为准。

## 2026-11-09 详细课扩写补充核验
- headless：一次性任务为主，但支持 `--json` / `--session-id` 续跑；不写「完全不能会话控制」。
- sdk vs sdk-minimal：后者独立树、排除 dsh-base 与多项产品能力（sdk-minimal README @ tag）。
- web `--port`：web-app README 示例；`--port 0` 以本机 help 观察为准写入课程。
- 发布：`edges artifacts publish` 无原地更新旧 id 的选项；新 id `b4b1b5c0-d12e-475f-a2d6-97435ac70107`。
