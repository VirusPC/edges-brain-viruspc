#!/usr/bin/env python3
"""用现行 skill 重写 summary/index.json 的结构字段。

不改 raw，不改 cleaned，不改摘要正文。章节和卡片文字保持原样。数据版本不写进 index，由站点构建时用 git log 计算。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import SKILL_ROOT  # noqa: E402
from summarize.merge.article_coverage import article_coverage  # noqa: E402
from summarize.merge.sources import sources_document  # noqa: E402


def skill_version() -> str:
    text = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
    match = re.search(r"^version:\s*(\S+)\s*$", text, re.M)
    if not match:
        raise ValueError("SKILL.md 没有 version")
    return match.group(1)


def write_index(issue: Path, routine: dict) -> None:
    issue = Path(issue)
    path = issue / "summary" / "index.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    window = json.loads((issue / "raw" / "window.json").read_text(encoding="utf-8"))
    updated = {
        "skill": {"name": "weekly-ai-blogs-digest", "version": skill_version()},
        "routine": {
            "repo": routine["repo"],
            "commit": routine["commit"],
            "path": routine["path"],
        },
        "articles_coverage": article_coverage(issue),
        "window": {
            "issue": window.get("issue") or issue.name,
            "since": window["since"],
            "until": window["until"],
        },
        "sources": sources_document(issue),
        "chapters": data.get("chapters") or [],
    }
    path.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="重写一期 summary/index.json 的结构字段")
    parser.add_argument("issue")
    parser.add_argument("--routine-repo", required=True)
    parser.add_argument("--routine-commit", required=True)
    parser.add_argument("--routine-path", required=True)
    args = parser.parse_args(argv)
    if not re.fullmatch(r"[0-9a-f]{40}", args.routine_commit):
        print("routine commit 必须是 40 位小写 sha", file=sys.stderr)
        return 2
    try:
        write_index(
            Path(args.issue),
            {"repo": args.routine_repo, "commit": args.routine_commit, "path": args.routine_path},
        )
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print("ok index")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
