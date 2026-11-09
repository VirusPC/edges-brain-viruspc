# ACP（Agent Client Protocol）调研：dsh 接入、客户端生态与评测框架为何不以它为主接入层

> 信息截至 **2026-11-09（Asia/Shanghai）**。以公开文档与官方列表为主；**部分客户端 ↔ 智能体组合配置未实测**（例如 Zed + `dsh --profile acp`）。动手前再对一次各项目文档。

## 背景

在学 DeepSeek Harness（`dsh`）与自研 Pi 系 coding agent 时，需要弄清：什么是 ACP、`dsh` 怎么当 ACP 智能体、有哪些客户端、Codex / Claude Code / Cursor / Grok Bot 各自站在哪一侧，以及 Harbor / Inspect AI 这类评测框架为什么通常**不以 ACP 作为主接入层**。

## 主题

把 ACP 的方向（客户端 vs 智能体）、`dsh acp` 的约束、常见生态与评测取舍整理成可复查笔记，并落到对自研 agent 的启示。

## 过程

对话里对照官方 ACP 站点客户端列表、`dsh` 的 `acp` profile、Codex / Claude 的 ACP 适配器、Cursor CLI 的隐藏 `agent acp`、以及 Harbor / Inspect 的 agent 接入文档做静态核对；未在本机对 Zed / JetBrains 等做端到端联调。

## 结果

- 本笔记入库 learning Project。
- 仍开放：Zed（及其他客户端）接 `dsh --profile acp` 的实测；Cursor 编辑器是否出现官方「作为 ACP 客户端」入口；Multica 若后续公开 ACP 支持需再核。

## 所学

### ACP 是什么、方向怎么分

- **ACP = Agent Client Protocol**：类比 LSP 的定位——编辑器 / 终端等**客户端**与**智能体进程**之间的协议。
- 传输常见形态：子进程 + **stdio**，**换行分隔的 JSON-RPC**。
- 典型拓扑：客户端 `spawn` 智能体子进程，经 stdin/stdout 会话。

必须分清两个方向（名字都带 ACP，角色相反）：

| 角色 | 含义 | 例子 |
| --- | --- | --- |
| **ACP 智能体** | **能被** ACP 客户端调用（被 spawn） | `dsh --profile acp`、`cursor agent acp`、经适配器的 Codex / Claude |
| **ACP 客户端** | **能调用**别的 ACP 智能体（去 spawn） | Zed、JetBrains 原生、部分 Neovim/Emacs/VS Code 扩展、Martty 等 |

「能被 ACP 客户端调用」**≠**「能调用别的 ACP 智能体」。多数 coding CLI 先做的是前者。

### dsh 作为 ACP 智能体

- `dsh acp` **≡** `dsh --profile acp`。
- 能力面：只有**标准 ACP v1**，**没有** DSH 专用 UI 扩展。
- 生命周期：由客户端按需拉起；**不要**手动常驻一个 acp 进程当「服务器」。
- 认证：ACP 层 `authMethods` 为空；模型 key 走 `DEEPSEEK_API_KEY` 或 **acp profile** 凭据（`$DSH_HOME/profiles/acp/.credentials.yaml` 一类路径）。
- 默认模型路径：常见为 `deepseek-official` / `deepseek-v4-flash`（以当前 profile 为准）。
- **stdout 专用于协议**；日志不要打到同一条 stdout。
- 客户端需提供**绝对路径**的 `cwd`。
- 改了 profile YAML 之后通常要**重连**（再 spawn）才生效。
- 已知限制（文档侧）：**单 workspace**；无 `session/load`、fork、elicitation 等更重会话能力（相对更完整的实现）。

**Zed 配置示例**（Zed 官方 custom agent 格式 + `dsh` 启动参数的组合；**未实测**）：

```json
{
  "agent_servers": {
    "DeepSeek Harness": {
      "type": "custom",
      "command": "/opt/homebrew/bin/dsh",
      "args": ["--profile", "acp"],
      "env": {}
    }
  }
}
```

`command` 请改成你机器上真实的 `dsh` 绝对路径；密钥仍建议用环境或 profile 凭据，而不是写进仓库。

### Codex / Claude Code / Grok Bot

- **Codex**：本身**没有**内建 ACP 模式；靠 [`@agentclientprotocol/codex-acp`](https://www.npmjs.com/package/@agentclientprotocol/codex-acp) 一类适配器**变成 ACP 智能体**。它不是 ACP 客户端。
- **Claude Code**：同理，常见路径是 `claude-agent-acp` 等适配器，角色仍是「被调用的智能体」，不是客户端。
- **Grok Bot**：也**没有** ACP 客户端入口；要驱动 `dsh` 只能走 shell / SDK（本机子进程）等现有通道。

### Cursor

- CLI 侧有原生隐藏命令：`agent acp`（作为 **ACP 智能体**被拉起）。
- 认证形态常见为 `cursor_login`。
- 能力相对完整：支持 agent / plan / ask 等模式、`session/load`、以及 `cursor/*` 扩展方法。
- 用途：被 Zed / JetBrains / avante.nvim 等**客户端**调用。
- **未查到** Cursor **编辑器本身**作为 ACP 客户端的官方入口（即：官方主产品 UI 去 spawn 任意 ACP 智能体）。若只看到 CLI `agent acp`，应按「智能体端」理解。

### 常见 ACP 客户端（生态速览）

官方客户端列表：[Agent Client Protocol — Clients](https://agentclientprotocol.com/get-started/clients)。截至本笔记整理时，常见条目包括：

| 类别 | 例子 | 备注 |
| --- | --- | --- |
| 编辑器原生 | Zed、JetBrains | 官方列表中的一等客户端 |
| 编辑器扩展 / 社区 | Neovim（CodeCompanion、avante.nvim、agentic.nvim）、Emacs `agent-shell`、VS Code 扩展 | 成熟度不一 |
| 终端 | Martty、acpx、Toad | Martty **明确写支持 DeepSeek Harness** |
| 桌面 | AionUi（自称 Cowork）、Vibex、Perch | Vibex / Perch 在列表侧写明支持 DeepSeek Harness |
| 其它 | 飞书 Lark ACP、OpenACP | 按列表与各自文档再核 |

易混项：

- **Multica**：未查到支持 ACP 的可靠依据；不要默认它能当客户端或智能体。
- **Hermes**：是 **ACP 智能体**（如 `hermes acp`）；`hermes.nvim` 是另一回事，不要当成同一产品的客户端声明。
- **Claude Cowork**：**不是** ACP 客户端（名字容易和 AionUi 自称 Cowork 搅在一起）。

### 评测框架为什么不以 ACP 为主接入层

#### Harbor

- 已支持 `--agent acp:<id>`（文档：[Harbor — ACP agents](https://docs.harborframework.com/agents/acp)）。
- **主路线**仍是 `BaseInstalledAgent` **逐家适配**各 CLI / 运行时。
- ACP 路径的智能体**不会自动拿到凭据**，通常要显式 `--agent-env` 等注入。

#### Inspect AI

- **主路线**是 [`sandbox_agent_bridge`](https://inspect.aisi.org.uk/agent-bridge.html)：**模型 API 代理**进沙箱，评测侧控模型、限额、记调用。
- 多轮 / 可打断场景才更多用 `inspect_swe` 里的 `interactive_claude_code` / `interactive_codex_cli`（走 ACP）一类路径。

#### 原因归纳（为何 ACP 不是默认主层）

1. **评测要控模型**（换模型、限 token、记录每次调用）——模型代理比「黑盒 ACP 子进程」好控。
2. **轨迹 / 恢复 / 原生配置**依赖各家格式；只接到 ACP 会话层往往不够。
3. **认证与安装不统一**；社区适配器成熟度参差，容易**污染**评测可比性。
4. 因此：ACP 适合「能接到编辑器 / 终端客户端」的**可选互操作层**；基准主路径仍偏向官方 CLI 适配或模型桥。

### 对自研 Pi agent 的启示

1. 先做好：**运行时 / 工具 / 会话**、**模型代理（可替换、可计量）**、**轨迹导出**。
2. **ACP 作为可选的编辑器接入层**（实现「能被 Zed 等调用」），不要一上来就把评测、编排、多 agent 总线都绑死在 ACP 上。
3. 若同时要给编辑器用、又要进 Harbor / Inspect：预期是 **两套或两层适配**（ACP profile + 评测用的 installed agent / bridge），而不是只维护 ACP。

## 决策记录

- 自研 agent：ACP = 可选客户端互操作；评测与日常自动化优先模型可控的接口（SDK / CLI / bridge）。
- 接 `dsh`：日常编程宿主用 SDK / web；只有目标客户端是 ACP 客户端时才用 `--profile acp`。
- 本文含未实测配置（尤其 Zed JSON）；实测后应补丁本笔记或另开短记。

## 参考

- [ACP 官方 Clients 列表](https://agentclientprotocol.com/get-started/clients)
- [Harbor ACP agents](https://docs.harborframework.com/agents/acp)
- [Inspect AI — Agent Bridge](https://inspect.aisi.org.uk/agent-bridge.html)
- 同仓学习笔记：`2026-11-09--dsh-sdk-怎么用`（SDK 子进程 / stdio JSON-RPC，与 ACP profile 不同入口）