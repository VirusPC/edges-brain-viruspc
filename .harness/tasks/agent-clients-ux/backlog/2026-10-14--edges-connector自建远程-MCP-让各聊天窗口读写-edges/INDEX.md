---
metadata:
  edges-type: task
  edges-task-project: agent-clients-ux
  edges-updated-at: '2026-10-14T13:10:00.000Z'
  edges-title: edges connector：自建远程 MCP 让各聊天窗口读写 edges
  edges-tasks-status: backlog
  edges-task-priority: none
name: edges-connector远程MCP
description: 自建远程 MCP 服务，让各聊天窗口和编程 Agent 以最低成本查询并写入 edges
---
**背景：**
2026-10-14 下午，用户发现 edges 仓库 `extensions/` 下的 skill（如 conversation-to-notes）在 ChatGPT 聊天窗口里不能直接使用。讨论下来，原因是聊天窗口不会自动发现 SKILL.md，更没有持久工作区、CLI 和 GitHub 写权限，代码沙箱临时且通常离线，所以入库这一步跑不了。助手先给了几种做法：skill 降级模式（只输出 Markdown 和目标路径，由有工作区的 Agent 入库）、自定义 GPT + GitHub Action、内置 GitHub connector，以及自建 MCP 服务。用户随后明确「不计开发成本，只求每个聊天窗口里的使用成本最低」，于是方案收敛到自建远程 MCP 服务，也就是类似 Notion 托管 MCP 的「edges connector」，只是存储换成 git 仓库，多一层 CLI + PR。之后的调研发现各客户端对写入的支持差异很大，用户一度质疑做 MCP 的意义，最后的结论是：核心价值是「处处可查」，「处处可写」是附加收益。
- 为什么需要 connector：ChatGPT 网页聊天模式、YouMind 这类聊天或知识窗口没有持久化的工作区，也没有本地文件系统、git 和 shell。因此，edges 的 skill 即使被加载，也跑不了依赖 CLI 的步骤（比如 `edges notes create`），更没法入库或开 PR。所以写入能力必须放到服务端：窗口只调用远程 MCP 工具，工作区、git 和 PR 都由服务端负责。即使某些窗口或沙箱能临时拉取仓库来操作，edges 仓库也有几个 G，每次临时 clone 都会极大拖慢任务完成效率，所以需要在服务端常驻一份仓库，每个任务用 worktree 增量地开工作目录。
- 现状（2026-10-14 调研）：Claude 网页/桌面支持自定义 connector，全部套餐可用，免费版限 1 个，写操作需审批。ChatGPT 仅网页端、需开发者模式，Pro 只读，可写的完整 MCP 仅限 Business/Enterprise/Edu，所以个人套餐按只读考虑。Gemini 应用有地区、年龄、语言等限制，写操作逐次确认；Gemini CLI 无套餐限制。编程 Agent（Claude Code、Codex、Cursor、ZCode、Kimi Code）支持 MCP。豆包工作可以按 URL 添加插件。
- 预期收益：任何窗口都能查询 edges，不必凭空回答；支持写入的窗口一句话就能保存笔记或任务；规则集中在服务端，改一处处处生效；以后新增客户端零成本接入。
- 非目标：不保证所有客户端都能写入（受各平台套餐限制）；不在本卡内修改 skill 的降级模式（另行处理）。
- 关联：笔记 `notes/2026-10-14--skill跨聊天窗口使用与edges-connector/INDEX.md`（PR https://github.com/VirusPC/edges/pull/243 ）；笔记 `notes/2026-10-14--connector服务端agent用codex接入与沙箱/INDEX.md`（PR https://github.com/VirusPC/edges/pull/247 ）；Codex 文档 https://developers.openai.com/codex/noninteractive 和 https://developers.openai.com/codex/sdk ；原始对话为 2026-10-14 约 16:05–16:17（Asia/Shanghai）用户与 Grok Bot 的会话。
- 补充（2026-10-14 晚）：服务端需要一个能加载 skill 的 agent 来整理内容并开 PR。讨论后决定不从零开始，而是在现有的 `extensions/mcp-servers/new-note` 上扩展，服务端 agent 用 minigtr 上本地运行的 Codex。详见笔记 PR https://github.com/VirusPC/edges/pull/247 。
- 现有基础：`new-note` 已经提供 `new_note(title, body)` 工具，它用子进程调用 `edges notes create`；还注册了 conversation-to-notes prompt；支持 stdio 和 Streamable HTTP（端点 `/new-note`）两种传输，HTTP 下可选用 `EDGES_AUTH_TOKEN` 做 Bearer 认证。它缺少 git/PR、OAuth 和部署这几块。另外 `.env.example` 里残留了 `EDGES_MODE` 和 `GITHUB_TOKEN`，需要清理。
- 负责人建议：先 grill-with-docs 细化，再交全栈开发专家实现。

**目标：**
建成并部署一个自建的远程 MCP 服务「edges connector」，让 Claude、ChatGPT（开发者模式）、Gemini、各类编程 Agent 和豆包工作都能以最低的单窗口操作成本查询 edges，并在支持写入的客户端里直接写入笔记和任务。

**动作：**
- 不新建 ADR，相关决策记录在本卡和上述笔记里。
- 在 `extensions/mcp-servers/new-note` 的基础上扩展，复用它现有的 `new_note` 工具、conversation-to-notes prompt 和两种传输；先清理 `.env.example` 里残留的 `EDGES_MODE` 和 `GITHUB_TOKEN`。
- 对外提供意图级工具：capture、search、read、status。capture 的输入默认是原文摘录，也可以传分享链接或要点。服务端 agent 加载 skill 整理内容，然后开 PR，由人审阅后合入。这个分工可以对照 Notion：它既有薄的 CRUD 工具，也有服务端 agent。
- 服务端 agent 在 minigtr 上本地运行 Codex，通过 Codex SDK 或 `codex exec` 调用。
  - 不选 GitHub Actions 加 `openai/codex-action`：每次冷启动要几十秒到一两分钟，从聊天窗口触发也不自然。它留作以后量大或需要更强隔离时的备选。
  - 不选 `codex cloud exec`：它是实验功能，不支持 API key，能否开 PR 也没有核实。Codex 云端本身没有公开 API。
  - Codex 默认只发现 `.agents/skills`，而 edges 的 skill 在 `extensions/skills`，所以要在 prompt 里写明 skill 路径，或者在仓库里加链接。
- 隔离与环境：服务端常驻一份本地仓库，平时只做 fetch。每个任务从最新的 main 用 `git worktree` 新开工作目录，任务结束后删除。仓库有几个 G，必要时用 sparse checkout 只检出内容目录。Codex 使用 `--sandbox workspace-write`，外面再套一个每任务一次性的 Docker 容器，容器只挂载该 worktree，网络只放行模型 API。
- 安全：agent 只允许写内容目录（如 `notes/`）。推送使用只限 edges 仓库、只能开 PR 的窄权限 token，不碰 main。capture 收到的原文一律当作不可信内容处理，防止提示注入。
- 接入与部署：接入层使用 OAuth 2.1 + PKCE，以便 ChatGPT 和 Claude 的自定义 connector 接入。服务部署在 minigtr，通过 Cloudflare Tunnel 对外暴露。公开仓库里不写 IP、token 或内网地址。
- 不支持自定义 connector 的窗口，退回到把分享链接交给 Grok Bot 入库；ChatGPT 个人套餐按只读接入。

**完成标准：**
- [ ] `.env.example` 已清理，不再包含 `EDGES_MODE` 和 `GITHUB_TOKEN`。
- [ ] 服务经 Cloudflare Tunnel 可公网访问，未通过 OAuth 2.1 + PKCE 认证的请求被拒绝。
- [ ] 一次 capture 能在一分钟内产出一个 PR，而且这个 PR 只修改内容目录。
- [ ] 任务结束后，不残留 worktree，也不残留容器。
- [ ] agent 无法推送 main，也无法访问模型 API 以外的网络。
- [ ] 用构造的注入内容做 capture，不能让 agent 越权。
- [ ] Claude 和 ChatGPT（开发者模式）都能连上这个 connector；至少一个编程 Agent 能通过 search 查到已有笔记。
- [ ] 修改服务端的一处规则后，无需改客户端配置，各客户端行为即同步变化。
- [ ] 公开仓库中没有出现 IP、token 或内网地址。
