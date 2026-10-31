# 原生 Codex 改造验证记录

日期：2026-10-31。范围：Inspect SWE codex_cli()、Harbor 内置 codex、Promptfoo openai:codex-sdk；不再使用共同 Agent worker。

| 检查 | 结果 | 实际验证了什么 |
| --- | --- | --- |
| shared | 14 项通过 | 快照隔离、软链接拒绝、完整性、错误不评分、未知用量、独立 HOME、探索性模式不输出默认开启结论 |
| Inspect | 2 项通过 | 真实 SDK 构建原生 Codex Task；ModelUsage 缓存字段正确映射 |
| Harbor | 2 项通过 | 真实 SDK 解析原生任务包；独立 verifier 读取 Codex JSONL、判分并保留用量 |
| Promptfoo | 2 项通过 | 真实框架 + Codex SDK 经测试 CLI 替身完成 8 次调用；单次重复缺失字段的兼容 |

合计 20 项离线检查通过。SDK 协议测试的 token 数由测试替身显式提供，不是模型产生的成本数据；该测试不代表真实 Codex 执行。生产函数的语法与注释检查通过。

已修复：单次重复没有 repeatIndex；绝对路径在原生导出中脱敏导致评分文件关联失败；截断 CLI 日志不能算成功；Inspect 缓存字段名不同；框架补出的默认 0 不冒充原始用量明细。

真实验证尚未闭环：

- Docker 未运行，Inspect／Harbor 的容器链路尚未执行。
- Inspect 的 Bridge 模型凭据尚未配置。
- 用户授权后，Promptfoo 分别用 gpt-5.4 和 gpt-6.1-sol 对同一问题执行 off/on 各一次。两轮均到达模型服务并返回 HTTP 400 / model_not_found：这条 SDK＋ChatGPT 登录链路不接受所指定模型。没有产生回答和模型用量，不能认定真实执行成功。每轮临时复制的 auth.json 已删除；未继续尝试其他模型。
- 失败原生记录在 .runs/promptfoo-native-live/ 与 .runs/promptfoo-native-live-sol/。完整结果明确 execution_status=failed；程序现在遇到执行／判分错误会保留报告并非零退出，答错题仍是正常评分结果。
- 原生 filesystem 权限的无模型探测被托管环境的 sandbox_apply: Operation not permitted 阻断；宿主目录版本明确保留为探索性，不声称有容器级读隔离。

复现离线检查与运行参数见 [README](README.md)；接入对比见 [原生版本对比](promptfoo/COMPARE_INSPECT.md)。

## 新增 DeepEval 版本

同日新增独立 `deepeval/`，固定 DeepEval 4.3.2、Codex CLI 0.156.1。与另外三个框架目录互不导入，复用 shared；由本入口调用 CLI，DeepEval 使用真实 `LLMTestCase + BaseMetric + evaluate()` 评分与记录。

6 项离线检查通过：准备模式不依赖 CLI；真实 DeepEval 经协议替身完成 8 个独立 trial；skip 保留未评分语义；执行失败保存完整报告并清理导入的登录副本；超时回收实际子进程；取消回收及显式 auth-json 的凭据优先级。测试提供的 token 数不是实际模型用量。shared 14 项同时复核通过。

单独安装的 CLI 已通过 `--version` 核对；生产函数语法和注释检查通过。审查发现的取消清理、API key 抢占显式登录文件两项问题已补回归并修复。未运行真实 Codex 模型请求、Docker 或 Confident AI 上传。DeepEval 宿主版本明确标记为探索性，不输出是否默认开启 memory 的受控实验结论。

至此四套程序共 26 项离线检查通过；本轮执行其中 shared 14 项和 DeepEval 6 项，未重复运行未修改的前三个框架测试。复现命令与接口对应见 [DeepEval README](deepeval/README.md)。

## 项目迁入个人大脑后的复核

2026-10-31 整个项目经 Edges NodeService 0.4.1 迁入公开个人脑的独立工作树。框架仓旧路径仅保留临时兼容跳转，供已开启的预览和旧链接使用；项目正文、四份程序和原始运行记录归个人脑。三个预览进程经用户授权短暂停顿后全部恢复，没有重新运行模型。

shared 不再假定项目位于框架仓固定深度：显式 `EDGES_ROOT` 优先，否则沿祖先查找框架本身或共同 workspace 下的 `edges/`。独立 clone 需要显式指定框架路径。框架源文件引用改用公开仓库链接。

新增 3 项路径定位回归，迁移后重新执行全部离线检查：shared 17、Inspect 2、Harbor 2、Promptfoo 2、DeepEval 6，共 29 项通过。协议替身测试仍不代表真实模型执行。
