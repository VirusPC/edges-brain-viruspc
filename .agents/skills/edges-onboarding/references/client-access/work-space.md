# work：参考 ChatGPT Work

首期按 OpenAI 公开的 **ChatGPT Work** 资料写步骤。下列【官方】来自 learn.chatgpt.com；【待试】表示文档未写明或本仓未实测。

**本轮不写 Claude Cowork。** 未找到 OpenAI 官方使用「Codex Cowork」这一名称的页面；不要与 Claude Cowork 混写。

## 步骤（本地项目）

1. 在 ChatGPT 桌面 App 中创建或打开一个**本地项目**，把大脑仓库所在文件夹挂进去，并设为 **primary** 文件夹。【官方 · [Projects and chats](https://learn.chatgpt.com/docs/projects)】
2. 新会话从 primary 文件夹开始；该文件夹即客户端工作区根，应等于大脑仓库根。【官方 · 同上】
3. 文档写明：**Codex** 从 primary 文件夹自动发现 `AGENTS.md`、skills 与 `config.toml`；次要文件夹不自动发现这些文件。【官方 · 同上】
4. **【待试】** Work 会话本身是否同样加载大脑 `AGENTS.md`；公开说明只明确写了 Codex。未验证前不得宣称 Work 聊天已加载大脑规则。
5. 按 [contract.md](contract.md) 做七层核验。

## Cloud 与本地文件夹

- Work 使用 Cloud、并需要本机文件夹时：挂文件夹的电脑须在线且已连接；会话同步**不会**上传整个本地文件夹。【官方 · [ChatGPT Work Overview](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-overview)】
- 云端执行环境不会自动继承本机文件、应用或登录态。【官方 · 同上】

## 未实测声明

在七层核验与上述【待试】项跑通前，不得写成「ChatGPT Work 已支持个人大脑接入」。
