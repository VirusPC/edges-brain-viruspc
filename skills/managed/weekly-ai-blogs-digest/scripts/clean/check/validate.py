#!/usr/bin/env python3
"""清洗阶段汇合校验。准备校验通过之后才进入这里。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from clean.articles.validate import validate as validate_articles  # noqa: E402
from clean.models.validate import validate as validate_models  # noqa: E402
from clean.projects.validate import validate as validate_projects  # noqa: E402
from lib.issue import check_stage_file, load_gaps  # noqa: E402
from prepare.check.validate import validate as validate_prepare  # noqa: E402


def validate(issue: Path) -> list[str]:
    issue = Path(issue)
    prepare_errors = validate_prepare(issue)
    if prepare_errors:
        return ["准备校验未通过，不能进入清洗", *prepare_errors]
    cleaned = issue / "cleaned"
    if not cleaned.is_dir():
        return ["cleaned/ 缺失"]
    errors = check_stage_file(issue, "cleaned")
    gaps, gap_errors = load_gaps(cleaned, "cleaned")
    errors.extend(gap_errors)
    if gap_errors:
        gaps = []
    errors += validate_articles(issue, gaps)
    errors += validate_projects(issue, gaps)
    errors += validate_models(issue, gaps)
    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/clean/check/validate.py issues/YYYY-MM-DD", file=sys.stderr)
        return 2
    errors = validate(Path(argv[0]))
    if errors:
        for item in errors:
            print(item, file=sys.stderr)
        return 1
    print("ok cleaned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
