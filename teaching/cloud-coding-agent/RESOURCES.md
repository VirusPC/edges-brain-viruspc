# 云端编程 Agent 架构 Resources

## Knowledge

### 解剖对象（一手资料）
- [Repo: vercel-labs/coding-agent-template（固定在 commit e753e1b，2026-02-12）](https://github.com/vercel-labs/coding-agent-template/tree/e753e1b6d28b2d64446dd5f9ef33a93909cc7a09)
  本课程的主角。最该精读的是 `app/api/tasks/route.ts`（processTask，L366–736）、`lib/sandbox/creation.ts`、`lib/sandbox/agents/*.ts`、`lib/sandbox/git.ts`、`lib/db/schema.ts`。Use for: 一切关于“这个产品具体怎么做”的问题。
- [Open PRs #235 / #239 / #240](https://github.com/vercel-labs/coding-agent-template/pulls)
  社区提交、尚未合并的修正：#235 说 README 让人以为 Claude 要 Anthropic 密钥，其实走 AI Gateway；#239 把 AI SDK 升到 v7 并支持 Vercel OIDC；#240 指出 README 的“最长 5 小时”已不是平台上限。Use for: 判断哪些地方已经过时。

### 平台官方文档
- [Docs: Vercel Sandbox — Concepts（Understanding Sandboxes）](https://vercel.com/docs/sandbox/concepts)
  原话 “Unlike Docker containers, each sandbox runs in its own Firecracker microVM with a dedicated kernel.”（Sandboxes vs containers 一节，2026-10-19 核实）。讲 Sandbox 是 Firecracker microVM、生命周期（创建 → 运行 → stop/超时 → 恢复）、默认可联网、持久化与快照、`Sandbox.get()` 重连。Use for: 第 2 课（Sandbox 的生与死），以及判断模板里哪些做法已落后于现在的 SDK。
- [Docs: Vercel Sandbox — Images](https://vercel.com/docs/vercel-sandbox/concepts/images)
  自定义镜像：Dockerfile → `vercel vcr build docker . repo:tag --push` → VCR → `Sandbox.create({ image })`；只支持 `linux/amd64`；不运行 ENTRYPOINT / CMD；官方镜像列表（默认 `vercel/sandbox/universal`，Ubuntu，预装编程 Agent）。Use for: 第 3 课“预制环境”。
- [KB: How to install system packages in Vercel Sandbox](https://vercel.com/kb/guide/how-to-install-system-packages-in-vercel-sandbox)
  默认镜像用 apt-get；已弃用的 `runtime`（如 node22）跑 Amazon Linux 2023，用 dnf。Use for: 解释模板为什么用 dnf、升级 SDK 为什么会让它失效。
- [Docs: Vercel Sandbox — Drives](https://vercel.com/docs/sandbox/concepts/drives) 与 [Changelog: Drives GA（2026-10-15）](https://vercel.com/changelog/vercel-drives-is-now-generally-available)
  可挂载的持久目录，适合共享依赖缓存；与快照的对比表（快照 64 GB、$0.08/GB·月）。Use for: 三层预制里的“缓存”层。
- [Docs: Vercel Sandbox JS SDK Reference](https://vercel.com/docs/sandbox/sdk-reference)
  `source` 有 git / tarball / snapshot；`runtime` 弃用改 `image`；`getOrCreate` 的 `onCreate` / `onResume`；`networkPolicy` 默认 allow-all。Use for: 和模板的 SDK 0.0.21 对照。
- [Changelog: Vercel Sandbox can now run for up to 24 hours（2026-06-16）](https://vercel.com/changelog/vercel-sandbox-can-now-run-for-up-to-24-hours)
  单次运行上限从 5 小时提到 24 小时（Pro / Enterprise）。Use for: 解释模板里 5 小时上限为什么过时。
- [Docs: Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
  统一模型入口：一个密钥调多家模型，支持 OpenAI Chat Completions / Responses、Anthropic Messages 等格式，带请求记录、预算、故障切换、BYOK、OIDC。Use for: 解释 Claude Code 为什么能把 `ANTHROPIC_BASE_URL` 指向 `ai-gateway.vercel.sh`，以及 Codex 的 `config.toml`。

- [Guide: How Vercel Sandbox duration and persistence work（Vercel 知识库）](https://vercel.com/kb/guide/vercel-sandbox-duration-and-persistence)
  一页讲清“单个会话的时长”和“跨会话的持久化”是两套独立开关，以及按 CPU 时间 + 内存 × 开机时长计费（闲着也算内存）。Use for: 第 2 课的推荐精读；回答“成本 vs 冷启动”。
- [Docs: Vercel Sandbox — Persistence](https://vercel.com/docs/sandbox/concepts/persistent-sandboxes) 与 [Snapshots](https://vercel.com/docs/sandbox/concepts/snapshots)
  默认持久化、sandbox / session 两层模型、按名字 `Sandbox.get({ name })`、快照默认 30 天过期、v1 → v2 迁移表（`sandboxId` 改为 `name`）。Use for: 对比模板用的旧 SDK。
- [Changelog: Sandbox persistence is now GA（2026-05-26）](https://vercel.com/changelog/sandbox-persistence-is-now-ga) 与 [named sandboxes（2026-03-26）](https://vercel.com/changelog/vercel-sandboxes-now-allow-unique-customizable-names)
  持久化正式版、`fork()` / `getOrCreate()` / `delete()`、有名字的 Sandbox。Use for: 讲“今天的 Sandbox 已经不一样了”。
- [Docs: Vercel Sandbox pricing and limits](https://vercel.com/docs/sandbox/pricing)
  各计划的单会话上限（Hobby 45 分钟，Pro / Enterprise 24 小时）、并发、计费项。Use for: 成本类追问。
- [Docs: Configuring Maximum Duration for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration) 与 [Next.js after() · Duration](https://nextjs.org/docs/app/api-reference/functions/after#duration)
  函数时长上限单位是秒（默认 300 秒，Pro 最高 800 秒，测试版 30 分钟）；`after()` 也只能跑到路由的时长上限。Use for: 解释模板 `vercel.json` 里 300 秒和“最长 5 小时”之间的矛盾。
- [npm: @vercel/sandbox 0.0.21 的 dist/sandbox.js](https://unpkg.com/@vercel/sandbox@0.0.21/dist/sandbox.js)
  模板锁定的 SDK 版本（pnpm-lock 解析为 0.0.21），第 219 行已有 `stop()`。Use for: 证明 git.ts 里“SDK 没有关机方法”的注释不对。

### 同类架构对照
- [Docs: OpenAI Codex Cloud（Legacy）— 环境与运行方式](https://learn.chatgpt.com/docs/environments/cloud-environment)
  官方写明的五步：开容器并检出仓库 → 跑安装脚本 → 应用联网设置（Agent 阶段默认断网）→ Agent 循环执行 → 给出 diff，可开 PR 或追问。另见 [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)：密钥只在安装阶段可用。Use for: 对照“联网”和“密钥”两条安全边界。
- [Blog: Introducing Open SWE（LangChain，2025-08-06）](https://www.langchain.com/blog/introducing-open-swe-an-open-source-asynchronous-coding-agent) 与 open-swe 仓库文档 [auth-and-security](https://github.com/langchain-ai/open-swe/blob/30d974acb2b8e2fb239f71057790ed940a69c10d/openwiki/concepts/auth-and-security.md) 与 [sandbox-lifecycle](https://github.com/langchain-ai/open-swe/blob/30d974acb2b8e2fb239f71057790ed940a69c10d/openwiki/architecture/sandbox-lifecycle.md)（固定在 commit 30d974a）
  开源的异步编程 Agent：自己用 LangGraph 写 Agent（规划、编码、检查），每个对话一台持久 Sandbox，可换 LangSmith / Daytona / Modal / E2B 等；默认（LangSmith Sandbox）通过代理注入 GitHub 凭证，Sandbox 里只拿到 GH_TOKEN=proxy-injected，真令牌不进 Sandbox。Use for: 对照“装现成 CLI vs 自己写 Agent”和“凭证放哪”。

- [Docs: Codex Cloud environments（当前版）](https://learn.chatgpt.com/docs/environments/cloud-environments)
  每个新任务从“已发布的环境”得到独立工作区；原任务接着用自己保存的文件（含未提交改动）；已保存的 VM 状态默认在最后一次开始或恢复后最多 7 天可恢复。旧版（Legacy）文档写的是容器状态缓存最多 12 小时。Use for: 对照环境生命周期。
- [Open SWE README（commit 30d974a）L50–56](https://github.com/langchain-ai/open-swe/blob/30d974acb2b8e2fb239f71057790ed940a69c10d/README.md#L50-L56)
  每个对话一台持久 Linux Sandbox，追问复用；连不上的 Sandbox 不会被悄悄替换。注意：openwiki/ 下的文档是自动生成的，但在官方仓库里并标注源文件。Use for: 对照“连不上时要不要换新”。

- [Docs: Codex Cloud environments（developers.openai.com，现跳转到 Legacy 页）](https://developers.openai.com/codex/cloud/environments)
  setup 脚本 + 可选 maintenance 脚本、容器状态最多缓存 12 小时、改脚本/环境变量/secrets 自动作废缓存、secrets 只给 setup、Agent 阶段默认断网。Use for: 第 3 课对照表。
- [Docs: Copilot cloud agent — Configure the development environment](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment) 与 [secrets and variables](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/configure-secrets-and-variables)
  `copilot-setup-steps.yml`（GitHub Actions，最长 59 分钟，可设 `snapshot`）；Agents secrets 以环境变量全程可见。Use for: 对照“密钥只给 setup”。
- [Docs: About GitHub Codespaces prebuilds](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds)
  跑到 `onCreateCommand` / `updateContentCommand`，拍容器快照；默认每次 push 重建；存储收费。Use for: “prebuild”这个词的出处。
- [Docs: Cursor cloud agents — Environment setup](https://cursor.com/docs/cloud-agent/setup)
  Dockerfile + 幂等 `install`；成功的 Build 拍磁盘状态，失败的不替换；快照会存下 `.env.local`。Use for: 对照表、“setup 要幂等”。
- [Docs: E2B sandbox templates](https://e2b.dev/docs/sandbox-template) 与 [How it works](https://docs.e2b.dev/template/how-it-works)、[Security](https://e2b.dev/security)
  模板连运行中的进程一起拍、约 80 毫秒载入；构建时“提取容器的文件系统”；“Every E2B sandbox runs in its own Firecracker microVM with its own kernel”。Use for: 对照表、OCI 镜像只是文件系统。
- [Firecracker 官网](https://firecracker-microvm.github.io/)
  KVM、jailer、只模拟 5 种设备、启动 <125 毫秒、VMM 开销 <5 MiB；为 AWS Lambda 而做；使用者名单含 E2B。Use for: microVM 的一手说明。
- [gVisor docs](https://gvisor.dev/docs/)、[Docker Engine security](https://docs.docker.com/engine/security/)、[OCI Image Spec](https://github.com/opencontainers/image-spec/blob/main/spec.md)
  gVisor 是用户态的应用内核；容器靠 namespaces 和 cgroups；OCI 镜像 = 文件系统层 + 配置。Use for: 容器 vs microVM vs gVisor。

### 第 6 课：密钥与信任边界（2026-10-19 核对）
- [Docs: Vercel Fluid compute](https://vercel.com/docs/fluid-compute)
  一个函数实例可以同时处理多次调用（2025-04-23 起新项目默认开启）。Use for: 解释 `process.env` 被并发任务串用为什么可能发生。
- [Docs: GitHub App 安装访问令牌](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
  安装令牌一小时过期，可限定仓库和权限。Use for: 对照模板用的 OAuth 用户令牌。
- [Docs: Scopes for OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
  OAuth 范围的含义，`repo` 范围能碰的东西远多于一个仓库。Use for: 令牌权限比任务大。
- [Docs: Token expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation)
  OAuth 令牌一年不用才会被自动吊销。Use for: 令牌的寿命与吊销。
- [Docs: Codex Cloud internet access](https://developers.openai.com/codex/cloud/internet-access)
  Agent 阶段默认断网，可放行域名并限制成 GET / HEAD / OPTIONS。Use for: 对照“网络默认全开”。（setup 阶段才给 secrets，见上面的 Codex Cloud environments。）
- [Docs: Copilot cloud agent — Risks and mitigations](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations)
  只推 `copilot/` 分支、需要人工审查、仓库范围令牌、防火墙默认开启。Use for: 第 6 课威胁对照表。
- [Docs: Copilot cloud agent — Customize the agent firewall](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-firewall)
  防火墙默认开、允许列表怎么加。Use for: 对照 Vercel `networkPolicy`。
- [Docs: Copilot cloud agent — Give access to resources](https://docs.github.com/en/copilot/tutorials/cloud-agent/give-access-to-resources)
  给 Agent 资源访问权限的推荐做法。Use for: 最小权限的参考答法。
- （已在上文）[Copilot secrets and variables](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/configure-secrets-and-variables)：secrets 以环境变量全程可见，但会按值在日志里遮盖。

## Wisdom (Communities)
- [GitHub Issues / PRs of vercel-labs/coding-agent-template](https://github.com/vercel-labs/coding-agent-template/issues)
  能看到真实使用者遇到的问题和维护者的回应。Use for: 验证自己的理解、找面试素材。
- [Vercel Community](https://community.vercel.com/)
  Vercel 官方社区论坛。Use for: Sandbox / AI Gateway 的使用问题。
- 用户尚未表达是否愿意加入社区；先只列出，不主动推。

## Gaps
- Cursor cloud agents 的环境文档已找到（见上），但仍没有官方架构写法（例如底层用什么隔离）。如果后面课程需要“托管式 Agent 平台”的第三个对照，需要再找。
- 第 2 课里“函数 300 秒上限会截断后台流程”是按文档推断，没有实际部署验证；如需坐实，可找社区 issue 或自己部署测试。
- （第 5 课已补）进度回传对比：Open SWE 提交 abf354b、Cursor Cloud Agents API 的 SSE、Vercel durable harness、Vercel WebSockets 公测。Codex Cloud 网页端用推流还是轮询，仍未找到公开说明。
- Copilot 的 `copilot-setup-steps.yml` 里 `snapshot` 选项的具体含义，本次读的那页没有展开，需要另找文档。
- 第 3 课里“apt-get 后路永远不会成功”是读代码推断，没有实测。
- 第 6 课：process.env 串号、平台 key 经终端接口外泄、sandboxId 批量赋值链都没有实测；前端是否把解密后的 MCP 值显示在页面上没有查。
