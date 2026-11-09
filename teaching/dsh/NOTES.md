# Notes

- 2026-11-09：用户 `/teach dsh`；确认**两个目标都要**：① 当日常编码工具用熟；② 研究插件架构，借鉴到自己基于 Pi 的 coding agent。中途喊停后又明确「继续支持做」。
- 教学偏好：中文、约 5–10 分钟一课、即时反馈自测、选项等长；区分「观察事实 / 源码结论 / 迁移建议」。
- 交付：模块化源文件 + 可离线附件的单文件 portable HTML + 课程 zip；**不用 Canvas**。
- 用户 Mac 已装 `@deepseek-ai/dsh@0.2.2-rc.1`（npm `latest`/`next` 同版本；发布 2026-11-04 09:20Z）。此前烟测：`dsh web --no-open` 可起本机 3080，带启动 token；测完已关。`dsh tui --help` 报 profile `tui` 不存在（观察事实，不等于「有可安装官方 TUI 插件」）。
- **纠正先前聊天未证实说法**：
  - 主配置不是笼统的 `~/.dsh/settings.yaml`。官方：模型页写入 `$DSH_HOME/profiles/<profile>/cordis.patch.yml`；密钥在 `$DSH_HOME/.credentials.yaml`；legacy `settings.yaml` 会被导入一次并改名为 `settings.yaml.imported`（`dsh-settings` README）。
  - 随附 profile 模板是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`（另有保留名 `desktop`）。CLI 文档里的 `tui` 是「假设已安装」的示例，不是随附模板；`official-bundles` 检索无 `tui`。
  - 默认 Harness home：显式配置 → `$DSH_HOME` → `~/.dsh`（`dsh-home-paths`）。
- 模型层：存在包 `@deepseek-ai/dsh-llm-pi-ai`，依赖 `@earendil-works/pi-ai`；与用户自有 vendored Pi 相关但**包名/边界不同**，迁移课再细拆。
- 不要动先前被取消的 20–50 评测笔记草稿（`edges-brain-wt-eval-starter-note`）。
- 后续课路线（暂定）：使用/安全与会话 → profile 装配 → Cordis 依赖与服务生命周期 → 最小插件 → 迁移到 Pi agent 的取舍。

- 2026-11-09：用户反馈「课程写详细点」。偏好更新：第 1 课先全貌再操作；缩写首次完整解释；多举例与对照；折叠进阶；约 15–20 分钟可分小节；测验选项避免过度压缩文案但仍保持等长。已扩写第 1 课并重发 artifacts。
- 操作路径需含：空目录示例、带 token URL（不示例真实令牌）、模型配置不收 key、小文件任务与自行核对、退出/再启动、前台 vs 残留服务、EADDRINUSE 连锁与 lsof/换端口（不教无差别 pkill；不要求杀历史 PID）。

- 2026-11-09：用户更正落库位置——个人大脑新建 teaching 主题，课程与笔记同放。已迁入 `teaching/dsh/`。
- 2026-11-09：再更正——同名 Edges Project `2026-11-09--dsh` 承载笔记并引用 teaching；笔记正文在 Project `notes/`，teaching 课页 Notes 只链过去。learning 上的 #453/#454 仍暂不关闭。
