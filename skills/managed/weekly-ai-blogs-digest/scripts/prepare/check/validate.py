#!/usr/bin/env python3
"""准备阶段汇合校验。通过之后才进入清洗。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import DATE, check_stage_file, load_gaps  # noqa: E402
from prepare.articles.validate import validate as validate_articles  # noqa: E402
from prepare.models.validate import validate as validate_models  # noqa: E402
from prepare.projects.validate import validate as validate_projects  # noqa: E402
from prepare.window.validate import validate as validate_window  # noqa: E402


def validate(issue: Path) -> list[str]:
    issue = Path(issue)
    if not DATE.fullmatch(issue.name):
        return [f"期次目录名必须是 YYYY-MM-DD，实际是 {issue.name}"]
    raw = issue / "raw"
    if not raw.is_dir():
        return ["raw/ 缺失"]
    errors = check_stage_file(issue, "raw")
    gaps, gap_errors = load_gaps(raw, "raw")
    errors.extend(gap_errors)
    if gap_errors:
        gaps = []
    errors += validate_window(issue, gaps)
    errors += validate_articles(issue, gaps)
    errors += validate_projects(issue, gaps)
    errors += validate_models(issue, gaps)
    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/prepare/check/validate.py <数据仓库.本地检出>/issues/<生成日>", file=sys.stderr)
        return 2
    errors = validate(Path(argv[0]))
    if errors:
        for item in errors:
            print(item, file=sys.stderr)
        return 1
    print("ok raw")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
