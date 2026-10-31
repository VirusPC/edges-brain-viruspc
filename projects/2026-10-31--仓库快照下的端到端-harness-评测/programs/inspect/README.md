# Inspect AI + Inspect SWE 原生 Codex

[inspect_eval.py](inspect_eval.py) 直接绑定 `Task(solver=codex_cli(...))`。setup 仅记录起始时间；Inspect 管理每个 sample / epoch 的 Docker sandbox；scorer 复用 shared 判分，随后从 EvalLog 补齐模型用量。没有自写 Agent 执行 worker。

在本目录执行：

```bash
uv venv --python 3.12
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python inspect_eval.py --prepare-only --output .runs/prepared
.venv/bin/python -m unittest discover -s tests -v
# Docker 和 OPENAI_API_KEY 就绪后才执行真实模型。
.venv/bin/python inspect_eval.py --output .runs/native
```

原生 Codex 来自独立安装的 Inspect SWE，不是 inspect_ai 单包内的 provider。模型请求经过 Agent Bridge，因此这个入口不接受 --auth-json。共同参数、评分和验证边界见 [运行说明](../README.md)；[与 Promptfoo 对比](../promptfoo/COMPARE_INSPECT.md)。
