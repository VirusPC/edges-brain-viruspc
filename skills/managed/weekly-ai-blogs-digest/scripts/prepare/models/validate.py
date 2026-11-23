"""校验 raw/models。旁路 coding 榜缺了不用缺口；其余文件缺了必须写缺口。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import gaps_for_lane, print_result, require_file, require_pattern  # noqa: E402

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


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/prepare/models/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    issue = Path(argv[0])
    gaps, gap_errors = gaps_for_lane(issue, "raw")
    return print_result(gap_errors + validate(issue, gaps), "ok raw/models")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
