"""校验 raw/models。旁路 coding 榜缺了不用缺口；其余文件缺了必须写缺口。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import require_file, require_pattern  # noqa: E402

ARENA_SLOT = "models/llm-arena-YYYY-MM-DD.json"
ARENA_PATTERN = r"models/llm-arena-\d{4}-\d{2}-\d{2}\.json"

REQUIRED = (
    "models/aa-language-models.json",
    "models/openrouter-rankings-daily.json",
    "models/openrouter-rankings-programming.json",
    "models/openrouter-app-rankings.json",
    "models/openrouter-official-endpoints.json",
)


def validate(issue: Path, gaps: list[dict]) -> list[str]:
    stage = issue / "raw"
    errors: list[str] = []
    for rel in REQUIRED:
        schema = f"schemas/raw/{rel.replace('.json', '.schema.json')}"
        errors += require_file(stage, "raw", rel, schema, gaps, reject_skipped=True)
    errors += require_pattern(
        stage,
        "raw",
        ARENA_PATTERN,
        ARENA_SLOT,
        "schemas/raw/models/llm-arena.schema.json",
        gaps,
        reject_skipped=True,
    )
    errors += require_file(
        stage,
        "raw",
        "models/openrouter-app-rankings-coding.json",
        "schemas/raw/models/openrouter-app-rankings-coding.schema.json",
        gaps,
        optional=True,
        reject_skipped=True,
    )
    return errors
