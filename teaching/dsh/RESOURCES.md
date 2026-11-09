# DeepSeek Harness（dsh）Resources

核验基准版本：`@deepseek-ai/dsh@0.2.2-rc.1`（Git 标签 `dsh-v0.2.2-rc.1`；npm 发布约 2026-11-04 09:20Z）。下列链接以该标签可读源码与官方文档为准。

## Knowledge

- [GitHub: deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness/)
  官方仓。Use for: 根 README、架构、安全说明、包级 README。
- [README.zh.md @ dsh-v0.2.2-rc.1](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/README.zh.md)
  中文入口：开发者预览、一切皆插件、Cordis、如何 `npx`/`dsh web`。Use for: 第 1 课运行路径。
- [文档站点](https://deepseek-harness.github.io/deepseek-harness/)
  官方 VitePress 文档（与仓内 `docs/` 同源生成）。Use for: 用户指南总览；站点抓取可能超时，可回退到仓内 `docs/`。
- [docs/architecture.zh.md @ dsh-v0.2.2-rc.1](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/architecture.zh.md)
  Profile / 组合包 / Cordis / agent loop / seam。Use for: 架构课与第 1 课边界图。
- [docs/user/guide/index.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/user/guide/index.zh.md)
  Web UI：设模型、选工作区、跑任务。Use for: 第 1 课实操清单。
- [docs/user/guide/providers.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/user/guide/providers.zh.md)
  模型页写入 `cordis.patch.yml`；密钥在 `.credentials.yaml`。Use for: 纠正 settings.yaml 误解。
- [docs/user/guide/public-deployments.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/user/guide/public-deployments.zh.md)
  启动 token / 会话 cookie / loopback。Use for: 安全启动说明。
- [apps/cli/README.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/apps/cli/README.zh.md)
  入口模式、随附 profile、`tui` 仅为示例假设。Use for: profile ≠ 模型。
- [packages/boot/app-boot/README.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/boot/app-boot/README.zh.md)
  Profile 加载、patch 层序、HMR。Use for: 装配课。
- [packages/util/home-paths/README.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/util/home-paths/README.zh.md)
  `resolveDshHome()`：显式路径 → `$DSH_HOME` → `~/.dsh`。Use for: 路径事实。
- [packages/settings/settings/README.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/settings/settings/README.zh.md)
  Settings 表单写 profile Cordis patch；legacy `settings.yaml` 一次性导入。Use for: 配置路径纠正。
- [packages/llm/llm-pi-ai/README.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/llm/llm-pi-ai/README.zh.md) + [package.json](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/llm/llm-pi-ai/package.json)
  `@deepseek-ai/dsh-llm-pi-ai` 依赖 `@earendil-works/pi-ai`。Use for: 与自有 Pi agent 对照（勿等同包名）。
- [SAFETY.zh.md](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/SAFETY.zh.md)
  开发者预览、沙箱不保证隔离。Use for: 安全课与第 1 课警告。
- [npm: @deepseek-ai/dsh](https://www.npmjs.com/package/@deepseek-ai/dsh)
  安装与 CLI README 镜像。Use for: 版本与入口表交叉核验。
- [arXiv: A Programming Paradigm for Spatiotemporal Composability](https://arxiv.org/abs/2608.25512)
  Cordis 设计论文（README 引用）。Use for: Cordis 课背景。

## Wisdom (Communities)

- [GitHub Discussions · deepseek-harness](https://github.com/deepseek-ai/deepseek-harness/discussions)
  官方反馈与 bug。Use for: 实机异常、插件发现。
- GitHub topic [`dsh-plugin`](https://github.com/topics/dsh-plugin)
  第三方插件发现约定（README 提及）。

## Gaps

- 文档站点偶发超时：以 GitHub `docs/*.zh.md` @ 标签为准。
- 未在本教学机安装/运行 dsh；用户 Mac 上的启动 token 烟测为会话观察，课程中标注为「观察事实」。
- 是否存在官方可安装 TUI 插件包：截至本课源码检索（`official-bundles` 无 `tui`；CLI 写「assuming installed」）**未证实有随附 TUI**；后续若发现插件市场条目再补 RESOURCES。
