# DeepSeek Harness（dsh）SDK 怎么用

> 核实基准：官方 tag [`dsh-v0.2.2-rc.1`](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.2-rc.1)。**静态核对官方文档，未实跑模型调用。** 安装包版本与接口可能随 RC 变化，动手前再对一次 README。

## 背景

对话里在学 `dsh`（DeepSeek Harness）作日常 coding 工具，并准备借它的插件架构做自研 Pi 系 coding agent。问到「SDK 咋用」和「要不要指定服务器地址」后，需要把可复用的调用方式落成笔记。

## 主题

弄清 `@deepseek-ai/dsh-sdk-client` 如何驱动本机 `dsh`：通信方式、安装钉版本、最小示例、密钥与 cwd、sdk / sdk-minimal 差异、审批与 Python 对照。

## 过程

### 15:51 问 SDK 示例

按 tag `dsh-v0.2.2-rc.1` 官方中文 README（client、sdk-minimal、Python 指南）静态整理用法；未在本机对模型实跑。

### 15:5x 确认要不要服务器地址

SDK **不连**已在跑的 HTTP 服务，也不必先开 `dsh web`。客户端懒启动本机 `dsh --profile sdk`（或 `sdk-minimal`）子进程，经 **stdio JSON-RPC** 通信。需要 `dsh` 在 PATH 上；stdout 专用于 JSON-RPC。

## 结果

- 本笔记入库 learning Project，供以后写宿主程序或对照自研 agent 时查阅。
- 仍开放：`cwd` 是否为 TS 构造参数；自建 / 代理模型端点在 `cordis.patch.yml` 里的具体写法。

## 所学

### 原理（不用指定服务器地址）

- 包：`@deepseek-ai/dsh-sdk-client`（Python 侧是 `deepseek-harness-sdk`）。
- 行为：懒启动 `dsh --profile sdk` 或 `sdk-minimal`，父子进程走 stdio JSON-RPC。
- **不需要**填服务器 URL，**不需要**先跑 `dsh web`。
- 前提：本机能找到 `dsh`（全局安装后在 PATH 即可）。
- 注意：子进程 **stdout 专用于 JSON-RPC**，不要往同一条 stdout 打普通日志。

### 安装（必须钉版本）

npm 上 `latest` 标签仍可能指向很旧的 `0.0.1-rc.1`，不要裸装。与 tag `dsh-v0.2.2-rc.1` 对齐时建议：

```bash
npm i @deepseek-ai/dsh-sdk-client@0.2.2-rc.1 \
  @deepseek-ai/dsh-llm@0.2.2-rc.1 \
  @deepseek-ai/dsh-sdk-protocol@0.2.2-rc.1 \
  @deepseek-ai/dsh-session@0.2.2-rc.1 \
  @deepseek-ai/cordis@4.1.0
```

同时保证本机有可用的 `dsh` CLI（例如全局 `@deepseek-ai/dsh@0.2.2-rc.1`）。

### 最小示例（TypeScript / Node）

`run-once.mjs`：

```js
import { DeepSeekHarness } from '@deepseek-ai/dsh-sdk-client'
import { resolve } from 'node:path'

await using harness = new DeepSeekHarness({
  profile: 'sdk',
  dshHome: resolve(process.env.HOME, 'tmp/dsh-sdk-demo/dsh-home'),
  provider: 'deepseek-official',
  model: 'deepseek-v4-flash',
})

const result = await harness.run('say hi')
console.log(result.finalResponse)
```

- `run()` 返回里常见字段：`sessionId`、`finalResponse`、`finishReason`。
- 用 `await using`，或显式 `close()`，以便清理子进程。
- 构造选项里确认过的：`profile: 'sdk' | 'sdk-minimal'`、`dshHome`、`provider`（如 `'deepseek-official'`）、`model`（如 `'deepseek-v4-flash'`）、`maxTokens`。

### Key 怎么给

- **不要**把 API Key 放进构造参数。
- 用环境变量 `DEEPSEEK_API_KEY`，或 profile 凭据文件：`$DSH_HOME/profiles/<profile>/.credentials.yaml`。

### cwd 与工作目录

- **未确认** `cwd` 是否为 TS `DeepSeekHarness` 构造参数。
- 可用：`harness.session()` 上的 `setWorkingDirectory`，或 initialize 握手里的 `cwd` 字段。
- 务必用**独立工作目录**，尤其是 `sdk-minimal`（见下）。

### 模型地址

- `provider: 'deepseek-official'` 默认连 DeepSeek **官方 API**，一般不用再填地址。
- 若要自建 / 代理端点：改 profile 配置 `$DSH_HOME/profiles/<profile>/cordis.patch.yml`；**具体字段写法待核实**（本文未展开）。

### sdk vs sdk-minimal

| | `sdk` | `sdk-minimal` |
| --- | --- | --- |
| 组成 | dsh-base + sdk-app | 独立树，不带 base |
| 能力 | 完整工具、设置、托管凭据等 | 仅 shell / read_image / working_directory |
| 没有的 | — | 无设置、凭据库、skills、subagents |
| 权限 | 走完整产品路径 | **固定 danger-full-access**；shell **不限于 cwd** |

`sdk-minimal` 必须放在隔离工作区，不要对着贵重目录跑。

### 审批（approvals）

需要人审工具时：打开 `approvalRequests: true`，并用 `onRequest` 处理 `approval/request`。记住 stdout 仍留给 JSON-RPC。

### Python 对照

```python
from deepseek_harness import DeepSeekHarness

harness = DeepSeekHarness(
    provider=...,
    model=...,
    cwd=...,
    dsh_home=...,
    profile=...,
)
result = harness.run("...")
print(result.final_response)
```

PyPI 上见到的 `0.2.1rc2` **落后于** git tag `dsh-v0.2.2-rc.1`，选包时注意对齐。

## 决策记录

- 宿主程序默认优先 `profile: 'sdk'`（完整工具与凭据托管）；只有明确要极简、且工作区已隔离时才用 `sdk-minimal`。
- 依赖一律钉 `0.2.2-rc.1`（及文档要求的 `cordis@4.1.0`），避免踩 npm `latest` 旧包。
- 本文结论来自文档静态核对，**未实跑**；实跑后再用 remember / 补丁笔记修正 cwd 与自定义端点写法。

## 参考

- [packages/sdk/client/README.zh.md @ dsh-v0.2.2-rc.1](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/sdk/client/README.zh.md)
- [packages/bundle/sdk-minimal/README.zh.md @ dsh-v0.2.2-rc.1](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/bundle/sdk-minimal/README.zh.md)
- [docs/user/guide/python-sdk.zh.md @ dsh-v0.2.2-rc.1](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/user/guide/python-sdk.zh.md)