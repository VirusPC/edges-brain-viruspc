# 公共实验底层

[common.py](common.py) 复用 Edges 既有题集解析、judge 和 compare_trials，负责快照冻结、摘要、参数、结果归一化、判分与完整性检查。三个框架目录均依赖它；它不依赖框架 SDK，也不再执行 Agent。

[fixtures](fixtures) 是共同两题与 off/on 快照。[tests/fake_codex.py](tests/fake_codex.py) 仅模拟 SDK 所需的 CLI JSONL 协议，用于无模型检查，不是被评测的 Agent。[Dockerfile.codex](Dockerfile.codex) 可为 Inspect / Harbor 预装同一版本 CLI。

```bash
python3 -m unittest discover -s tests -v
```

执行失败保持 verdict=null；未知用量保持 null；缺失／重复 trial 保存 incomplete 报告。宿主目录模式的结果只用于探索性比较，不给出受控消融结论。详见 [公共运行说明](../README.md)。
