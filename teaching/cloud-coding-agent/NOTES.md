# NOTES（给老师自己看的笔记）

## 用户偏好
- 用户：peng cheng，中文母语。
- 写法：平常的中文、完整的句子、不堆术语。遇到技术词，要么换成平常说法，要么当场用一句话解释。
- 保持英文的词：产品名（Vercel、Claude Code、Codex 等）以及 Agent、CLI、MCP、Sandbox、AI Gateway、PR、Keep Alive。其余统一用 reference/glossary.html 里的说法。
- 每课约 10 分钟，要在手机上能看（窄屏、图要能缩放）。
- 目的偏面试：每课都给“60 秒怎么讲”的框，并点出一个取舍或“文档与代码不一致”的点。

## 工作约定
- 只远程读仓库（gh api / raw.githubusercontent.com），不 git clone。
- 引用固定到 commit e753e1b6d28b2d64446dd5f9ef33a93909cc7a09（main，2026-02-12 09:21 UTC = 北京时间 17:21）。
- 组件：assets/style.css（统一样式，含 .flow 步骤图、.box 提示框、.cards、表格、打印样式）、assets/quiz.js（测验，选项字数必须一致，组件会在控制台提醒；选项随机打乱；本机记住上次得分）。新课先复用这些。
- 术语表里的词目前是“第 1 课引入”的状态，用户还没用测验证明掌握。按 GLOSSARY 规则，后续根据用户表现修订定义。

## 读源码时发现的值得教的点（备课素材）
- 主流程不自动开 PR，只推分支；PR 要用户点按钮（app/api/tasks/[taskId]/pr/route.ts）。README 的 “How It Works” 也只写到推分支。
- Keep Alive 关闭时 shutdownSandbox 只 pkill 进程，没调 sandbox.stop()（lib/sandbox/git.ts L75–100），注释说 SDK 没有关机方法；但 stop-sandbox 路由和 sandbox-registry 都在用 stop()。README 说“立刻关掉”。
- 日志：每条日志都“读整行 → 加一条 → 写回”（task-logger.ts L37–48），并发时可能丢；前端每 5 秒拉取。
- Claude 实际走 AI Gateway（claude.ts L257–259），README 却写 ANTHROPIC_API_KEY 给 Claude（README L243）；社区 PR #235 在修。
- executeAgentInSandbox 临时改写 process.env 里的密钥再改回（agents/index.ts L56–75、L149–158）；同一个服务器实例同时跑多个用户任务时，理论上会串。
- 第 540 行在 after() 里又调用 getServerSession()，而第 213 行注释说 after() 里拿不到 session——MCP 读取可能静默失效。（需要谨慎表述：是“看起来”）
  - 【已更正，第 6 课】Next.js 文档写明 Route Handler 里的 after() 可以调用 cookies()/headers()，所以按文档 getServerSession() 在这里能拿到 session，是第 213 行注释过于保守；“MCP 读取会静默失效”这条怀疑不成立（未实测）。
- creation.ts 注释写 “Fedora-based sandbox” 并用 dnf；现在官方文档说默认镜像是 Ubuntu。
- Claude 等待循环 `while (!isCompleted)`（claude.ts L428–430）没有自己的退出条件，只靠总超时。
- 每日次数：任务算一次，processTask 又把首条提示写进 task_messages（route.ts L401–411），rate-limit.ts 两者都计数，看起来一个新任务会算两次。
- opencode：config.ts 要求 AI_GATEWAY 或 ANTHROPIC 密钥，opencode.ts L60 却检查 OPENAI 或 ANTHROPIC。
- 仓库自己有上百个 `agent/2025-10-...` 分支——是用这个工具改它自己留下的痕迹。

## 第 2 课备课时新发现（2026-10-19）
- 锁定的 @vercel/sandbox 0.0.21 已有 stop()（dist/sandbox.js L219），git.ts L92–94 的“没有关机方法”注释站不住。
- vercel.json 给 app/api/tasks/route.ts 设 maxDuration 300（秒）；after() 受此约束 → 后台流程看起来最多 5 分钟，和“最长 5 小时”矛盾。按文档推断，未实测。
- README 表格说 Keep Alive 关闭“不能追问”，但 continue/route.ts 不看开关，重连失败就新建 + 克隆任务分支 + 塞最近 5 条对话；该新建调用没传 keepAlive。
- continue 只在 Sandbox.get 抛错时才新建，不检查返回的 status（SDK 有 stopped 状态）——可能把已停的当成重连成功。
- processTaskWithTimeout 用 Promise.race，超时只改状态，不取消 processTask；creation.ts L152 的“5 minutes”报错文案写死；route.ts L447 注释“5-minute timeout”与实际不符。
- sandbox-registry 的 killSandbox 找不到当前任务时，会删掉“第一个”登记项并返回成功，但不对它调用 stop()。
- start-sandbox 接口用 Sandbox.create 的 source: git 方式克隆（与主流程手动克隆不同），且只允许 Keep Alive 任务使用。
- 第 1 课和参考页里有 9 处坏链接（形如 #L278-Lclaude.ts），已在 2026-10-19 修成单行链接。
- 还没有 learning-records：用户尚未反馈测验结果。等用户报分或答题后再写第一条。

## 后续课程草案
- 0002 Sandbox 的生与死：已完成（2026-10-19）。
- 0003 预制环境与隔离：已完成（2026-10-19）。三层预制（镜像 / setup / 快照）、密钥只在 setup、Vercel 是 Firecracker microVM 不是 Docker。
- 0004 CLI 关进笼子：已完成（2026-10-19）。适配层（无共同接口）、六家安装与无确认参数、提示词转义、密钥换进 process.env、MCP、输出解析与续聊、脱敏、笼子=Sandbox 边界 + 网络全开 + 密钥在里面、Vercel networkPolicy 与凭证注入。
- 0005 进度怎么回到网页：已完成（2026-10-19）。SDK 拉 NDJSON 日志、三种读法、两张表两种写法、三个 setInterval、五种状态与写死的进度、停止按钮的真实效果、写库+轮询的理由与代价、业界对照（Open SWE / Cursor API / Vercel durable harness）、事件表+游标+SSE 参考方案。
- 0006 密钥与信任边界：已完成（2026-10-19，由另一位作者撰写，合并发布）。信任边界图、每类秘密的一生、process.env 串号、脱敏覆盖与缺口、认证与授权、限速、威胁 → 现状 → 推荐做法表、全课程总图与两分钟陈述。课程全部完成。

## 第 3 课备课时新发现（2026-10-19）
- SDK 0.0.21 的 CreateSandboxParams（dist/sandbox.d.ts L8–57）只有 source(git/tarball)、ports、timeout、resources、runtime(node22/python3.13)，无 image / snapshot。
- 模板用 runtime node22 → 按 Vercel KB，旧 runtime 跑 Amazon Linux 2023（dnf），所以 dnf 是对的；之前笔记里“现在默认是 Ubuntu 所以 dnf 过时”要改成“升级 SDK 不指定镜像才会失效”。
- creation.ts L274–282 装 pip 失败后的 apt-get 后路：把 '&&' 当参数、系统又没有 apt-get → 看起来永远失败（推断）。
- 浏览器功能 enableBrowser 默认 false（schema.ts L89）。
- Vercel 文档对照表把 microVM 启动写成 “Milliseconds”，容器写成 “Sub-second”，看起来是说 microVM 更快，属于营销式写法，面试别照搬。
- Drives 已于 2026-10-15 GA（任务描述里写的是 private beta，已按官方更新日志更正）。
- developers.openai.com/codex/cloud/environments 现在显示的是 “Codex Cloud (Legacy)” 页；新版在 learn.chatgpt.com/docs/environments/cloud-environments。
- 课程页的 quiz JSON 当时由本地辅助脚本生成并检查选项字数（脚本是一次性生成工具，没有放进仓库）。

## 第 4 课备课时新发现（2026-10-19）
- route.ts L550 已把本地 MCP 的 env 解析成对象；copilot L130 / cursor L207 / gemini L117 / opencode L177 又 JSON.parse 一次 → 抛错只记警告，env 丢失（推断）。Claude、Codex 用 Object.entries，正常。
- Copilot 的 extractedSessionId（L202）从不赋值；Gemini 无续聊；continue.ts L266-284 重连 Sandbox 时不带历史 → 两家续聊丢上下文（推断）。
- Codex：wire_api="chat" 2026-02 已移除（硬错误）；续聊写成 codex resume --last，非交互官方是 codex exec resume --last。
- Claude：mcp add 不带 cwd、默认 local scope，可能登记到别的项目（推断）；while(!isCompleted) L428-430 无出口，result 行被切块可能永远等（推断）；配置写 ~/.config/claude/config.json 不在文档里且明文存密钥。
- Cursor 240 秒上限（L478-493）后不等 Agent 就跑 git status；文档里命令现名 agent。Gemini --yolo 已弃用。
- 脱敏：logging.ts L14 [sk-] 字符类写错；保留首尾 4 位；task_messages 不脱敏；codex L94 打印密钥前 15 个字符。
- 提示词进双引号 sh -c，未处理双引号（主要是正确性问题）；Copilot、Cursor 用参数数组。
- `test -f ~/...` 不经 shell，波浪号不展开，永远“不存在”。
- 第 5 课可接：stream-json → task_messages → 网页轮询。

## 第 5 课备课时新发现（2026-10-19）
- SDK 0.0.21：runCommand 传 stdout 时后台 for-await command.logs()（GET /v1/sandboxes/{id}/cmd/{cmdId}/logs，application/x-ndjson）；stdout() 也是读完整个日志流。行号来自 unpkg 发行包（sandbox.js L130-157，api-client.js L164-200，command.js L109-117）。
- Claude/Cursor detached+stdout，Copilot 非 detached+stdout（都边跑边写库）；Codex/Gemini/opencode 跑完才拿输出。runStreamingCommandInSandbox 名不副实且无调用方。
- TaskLogger 每条日志 SELECT+整列 UPDATE（task-logger L37-48），并发写入者：主流程、超时提醒计时器（route L278-287）、停止接口 logger → 丢失更新（推断）；N²/2 写放大。
- Claude/Copilot 对 task_messages 不 await 的整段覆盖；Copilot 每行一次 UPDATE，注释"throttled via catch"但无节流。
- 前端：use-task 5s /api/tasks/{id}（含全部 logs）、task-chat 3s /messages、app-layout 5s /api/tasks（所有任务全部列）；均不看状态；无 SWR/SSE/WS。
- 停止：PATCH 只在 processing 时允许 → stopped → killSandbox 查实例内存；兜底分支删别人的记录、不 stop、报成功（registry L28-40）。stop-sandbox 路由却用 Sandbox.get(sandboxId)。主流程 Agent 开跑后不再查停止，跑完写 completed 覆盖 stopped（推断）；Claude 被停后 while 循环空转到函数被杀。
- 时长矛盾：after() 受路由 maxDuration 约束（Next.js 文档），vercel.json 300s；README 说 5 分钟到 5 小时、MAX_SANDBOX_DURATION 默认 300 分钟 → 超 5 分钟的任务卡 processing（推断）。continue 路由未配置 → 默认 300s。
- 状态写入全无条件，终态可被覆盖；completed 先于 progress=100 写。
- Vercel WebSocket 公测 2026-06-22（连接绑实例、到时长断）。Open SWE 2026-06-11 提交 abf354b 从"SSE + React Query 轮询"换成 LangGraph v2 事件流；Cursor Cloud Agents API 每 run SSE + Last-Event-ID + 410 stream_expired；Vercel durable harness 浏览器从会话日志推流；Codex Cloud 传输方式未找到公开说明。

## 第 6 课备课时新发现（2026-10-19）
- 信任边界：总钥匙（ENCRYPTION_KEY、JWE_SECRET、SANDBOX_VERCEL_TOKEN、GitHub client secret）只在服务器；GitHub 令牌（.git/config，repo 范围）、模型 key（命令行 + ~/.config/claude/config.json，claude.ts L152-158）、MCP secret 全进 Sandbox，出站全开。
- 平台 key 外泄（推断）：用户没存 key → 平台 AI_GATEWAY_API_KEY 进 Sandbox（user-keys L22-31，README L240-246 "fallback for all users"）；terminal 路由 sh -c 任意命令、原样返回 stdout（terminal L72-102）→ 任何登录用户可读平台 key。与 README L356 "no shared credentials" 矛盾。
- process.env 串号（推断，未实测）：index.ts L56-75 改写、L149-158 恢复；Fluid compute 多调用共享实例（2025-04-23 起新项目默认）。A 覆盖 → B 的 getUserApiKeys 把 A 的 key 当系统默认 → B 存“原值”=A → A 恢复 P → B 恢复 A，A 的 key 常驻进程，给后续无 key 任务和小模型调用（route L94-100、L651-659）用。
- Node 实测（v20.19.2）：process.env.X = undefined → 字符串 "undefined"。原值未配置时，第一个任务结束后该变量就变成非空字符串，"没 key 就报错"的检查失效。
- 脱敏（logging.ts L6-74，假数据实测）：裸 sk-ant- key、JSON 写法 {"apiKey": "…"}、DATABASE_URL 这类名字不含 KEY/TOKEN/SECRET/PASSWORD 的、值含 . / + 的（不足 8 位整条放过）全部不遮。只覆盖 tasks.logs；task_messages、terminal 返回、GET /api/connectors（解密返回）不过。
- 加密：AES-256-CBC 全站一把 ENCRYPTION_KEY，无完整性校验、无版本号；README L357 "per-user encryption" 与代码不符。会话 JWE dir+A256GCM，cookie 一年，无服务器端吊销。
- 认证细节：signout 是 GET（L7），会吊销 GitHub 令牌（L11-27）；disconnect 只删 accounts 行不吊销（L28）；connect 流程会合并账号（callback L154-186）；Claude 把 MCP oauthClientSecret 直接当 Bearer（claude.ts L131-133）。
- 授权：[taskId]/ 下 31 个 route.ts（33 个处理函数）全查归属；lsp、restart-dev、start-sandbox、stop-sandbox 不排除软删除。21 个路由用 Sandbox.get(task.sandboxId) + 平台令牌。
- 批量赋值：POST /api/tasks 把 body 展开给 insertTaskSchema（route L71-82，schema L117-147），客户端可写 sandboxId、maxDuration、prUrl、id 等。若克隆失败，L507-518 不覆盖 sandboxId → 任务指向别人机器（推断，需知道别人 sandboxId，未找到泄露途径）。
- 限速：新任务算两次（任务行 + L401-411 用户消息）→ 默认 5 只够 3 个新任务（推断）；删掉退额度（rate-limit L24、L36）；先查后插非原子；maxDuration 客户端定、schema 默认 300 无上限 → getMaxSandboxDuration 永远用不上（route L229）。
- 更正旧疑点：route L540 / index.ts L53 在 after() 里调 getServerSession。Next.js 文档说 Route Handler 的 after() 里可以用 cookies()/headers()，所以按文档能拿到 session，是 L213 注释过于保守（未实测）。
- start-sandbox L84-108 用 git 来源建机时不带 username/password（SDK 0.0.21 支持），私有仓库重启机器可能克隆失败（推断）。
- 外部对照（2026-10-19 核对）：Vercel firewall 凭据代理（"The secrets never enter the sandbox"）；GitHub App 安装令牌一小时过期、可限仓库与权限；OAuth 令牌一年不用才吊销；Codex Cloud 旧版文档 secret 只在 setup、Agent 阶段默认断网、可限 GET/HEAD/OPTIONS（未找到“代理注入凭据”的公开说明，课里没写）；Copilot 防火墙默认开、secret 以环境变量全程可见但按值遮盖、仓库范围令牌、只推 copilot/ 分支、需人工审查。

### 第 6 课留下的空白
- 并发串号、平台 key 外泄、sandboxId 链都没有实测，课里都标了推断。
- 没查前端是否把 MCP 解密值显示在页面上（只确认了接口返回）。
- 第 6 课用过两个本地辅助脚本：一个生成测验并写回页面，一个校验源码链接的行号（依赖本地缓存的源码）。它们是一次性生成工具，没有放进仓库。
