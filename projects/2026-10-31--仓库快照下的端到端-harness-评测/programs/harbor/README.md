# Harbor 原生 Codex

[harbor_eval.py](harbor_eval.py) 生成 Task 包，然后用 `harbor run -a codex` 运行内置 Agent。[harbor_verify.py](harbor_verify.py) 在 separate verifier 中解析 `/logs/agent/codex.txt` artifact，再复用 shared 判分。没有自写 MemoryAgent。

在本目录执行：

```bash
uv venv --python 3.12
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python harbor_eval.py --prepare-only --output .runs/prepared
.venv/bin/python -m unittest discover -s tests -v
# Docker 与模型鉴权就绪后：
.venv/bin/python harbor_eval.py --output .runs/native
```

Codex adapter 负责安装／版本检查、执行与轨迹；程序只准备环境、题目和评分。新环境使用干净 Codex HOME。支持 OPENAI_API_KEY 或显式 --auth-json。每个 Task 的评分标准仅上传到独立 verifier。完整参数与验证边界见 [共同运行说明](../README.md)。
