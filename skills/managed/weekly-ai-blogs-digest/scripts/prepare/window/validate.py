"""校验 raw/window.json 的窗口是否等于生成日 D 的 D-7 至 D-1。"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import DATE, check_document, gap_covers, gaps_for_lane, print_result  # noqa: E402


def validate(issue: Path, gaps: list[dict]) -> list[str]:
    path = issue / "raw" / "window.json"
    if not path.is_file():
        if gap_covers(gaps, "window.json"):
            return []
        return ["raw/window.json 缺失，raw/gaps.json 里也没有 path 为 window.json 的缺口"]
    errors, data = check_document(path, "raw/window.json", "schemas/raw/window.schema.json")
    if errors or not isinstance(data, dict):
        return errors
    if not DATE.fullmatch(issue.name):
        return [f"期次目录名必须是 YYYY-MM-DD，实际是 {issue.name}"]
    if data.get("issue") != issue.name:
        errors.append(f"raw/window.json 的 issue 是 {data.get('issue')}，目录名是 {issue.name}")
    try:
        day = date.fromisoformat(issue.name)
        since = date.fromisoformat(str(data.get("since")))
        until = date.fromisoformat(str(data.get("until")))
    except ValueError:
        errors.append("raw/window.json 的日期无法解析")
        return errors
    expect_since = (day - timedelta(days=7)).isoformat()
    expect_until = (day - timedelta(days=1)).isoformat()
    if since.isoformat() != expect_since or until.isoformat() != expect_until:
        errors.append(
            f"raw/window.json 窗口应为 {expect_since} 至 {expect_until}，实际是 {data.get('since')} 至 {data.get('until')}"
        )
    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/prepare/window/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    issue = Path(argv[0])
    gaps, gap_errors = gaps_for_lane(issue, "raw")
    return print_result(gap_errors + validate(issue, gaps), "ok raw/window")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
