"""Write one cell's retrieval smoke report."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def write_report(path_stem: Path, payload: dict[str, Any]) -> tuple[Path, Path]:
    """Write `<stem>.json` and `<stem>.md`. The markdown says this is a smoke run."""
    path_stem.parent.mkdir(parents=True, exist_ok=True)
    json_path = path_stem.with_suffix(".json")
    md_path = path_stem.with_suffix(".md")
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(_markdown(payload), encoding="utf-8")
    return json_path, md_path


def _markdown(payload: dict[str, Any]) -> str:
    repo = payload["repository"]
    macro = payload["aggregate"]["macro"]
    lines = [
        f"# Retrieval smoke {payload['cell_id']}",
        "",
        "Evaluation Smoke. 这是链路记录，不是公开基准证明，也不是项目记忆有效的证据。",
        "",
        f"- repository: `{repo['url']}`",
        f"- ref: `{repo['ref'] or 'default'}`",
        f"- commit: `{repo['commit']}`",
        f"- client: `{payload['client']}`",
        f"- samples: `{payload['sample_id']}`",
        "",
        "## Macro",
        "",
        "| metric | value |",
        "| --- | --- |",
    ]
    for key in ("R@5", "P@5", "nDCG@5", "MAP@5", "MRR", "Hit@5", "score"):
        value = macro.get(key)
        rendered = "—" if value is None else f"{value:.4f}"
        lines.append(f"| {key} | {rendered} |")
    lines.extend(["", "## Samples", "", "| id | score | grade | predicted |", "| --- | --- | --- | --- |"])
    for row in payload["samples"]:
        predicted = ", ".join(f"`{path}`" for path in row.get("predicted") or []) or "—"
        score = row.get("score")
        score_text = "—" if score is None else f"{score:.4f}"
        lines.append(
            f"| {row['id']} | {score_text} | {row.get('grade', '—')} | {predicted} |"
        )
    lines.append("")
    return "\n".join(lines)
