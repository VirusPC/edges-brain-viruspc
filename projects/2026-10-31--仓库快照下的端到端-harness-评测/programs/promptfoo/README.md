# Promptfoo 原生 Codex SDK

[promptfoo_eval.py](promptfoo_eval.py) 配置两个 `openai:codex-sdk` provider，分别指向冻结的 off/on 目录，开启 copy_working_dir，关闭 thread 持久化和结果缓存。原生 SDK 负责启动 Codex、取得回答和用量；不再有自定义 provider.py。

[hooks.py](hooks.py) 的正式 beforeEach hook 为每次调用创建全新的 Codex HOME；[assertion.py](assertion.py) 通过共享 judge 独立判分。导出结果中的 provider label 和 repeatIndex 定义共同 trial 标识；单次执行没有 repeatIndex 时按第 1 次处理。

在本目录执行，需要 Python 3.12+、Node.js 22.22.0+：

```bash
npm ci
python3.12 promptfoo_eval.py --prepare-only --output .runs/prepared
python3.12 -m unittest discover -s tests -v
# 使用真实模型；OPENAI_API_KEY 就绪，或显式指定 --auth-json。
python3.12 promptfoo_eval.py --output .runs/native
```

Promptfoo 0.125.1 和 Codex SDK / CLI 0.156.1 已固定在 lockfile。无需安装 Inspect / Harbor SDK。--codex-path 可指定兼容的二进制，provider 会检查其版本；离线测试用它接协议替身，不能据此声称真实 Codex 已跑通。

这是宿主机上的原生 SDK 示例，不提供容器级读隔离。结果明确标为探索性，不输出 memory 默认开启结论。完整参数和边界见 [共同运行说明](../README.md)，接线差异见 [与 Inspect 对比](COMPARE_INSPECT.md)。
