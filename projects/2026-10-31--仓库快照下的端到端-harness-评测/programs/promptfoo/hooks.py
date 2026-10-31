"""Promptfoo 生命周期 hook：每次 trial 使用干净 Codex HOME，不实现 Agent provider。"""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared"))
from common import isolated_codex_home


def beforeEach(context: dict, options: dict | None = None) -> dict:
    """为本次调用创建唯一 HOME 和结果目录，将路径作为 vars 交给原生 provider。"""
    root = Path(os.environ["ABLATION_OUTPUT"])
    auth = os.environ.get("ABLATION_AUTH_JSON")
    home = isolated_codex_home(root / "codex-homes", Path(auth) if auth else None)
    trial_dir = root / "trials" / home.name
    trial_dir.mkdir(parents=True, mode=0o700)
    context["test"] = {**context["test"], "vars": {**context["test"].get("vars", {}),
                        "codexHome": str(home), "trialKey": home.name}}
    return context
