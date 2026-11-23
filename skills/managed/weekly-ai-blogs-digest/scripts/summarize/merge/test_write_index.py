#!/usr/bin/env python3
"""汇合重写 index 时不回写 cleaned。"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from summarize.merge.write_index import write_index  # noqa: E402
from test_validate_stages import write_issue  # noqa: E402


class MergeDoesNotWriteCleaned(unittest.TestCase):
    def test_write_index_leaves_cleaned_bytes_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            issue = write_issue(Path(tmp))
            post = issue / "cleaned" / "articles" / "post.json"
            data = json.loads(post.read_text(encoding="utf-8"))
            data["publisher"] = "WRONG"
            post.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            before = {path.relative_to(issue).as_posix(): path.read_bytes() for path in (issue / "cleaned").rglob("*") if path.is_file()}
            write_index(
                issue,
                {
                    "repo": "VirusPC/edges-brain-viruspc",
                    "commit": "a" * 40,
                    "path": ".edges/routines/weekly-ai-blogs-digest/INDEX.md",
                },
            )
            after = {path.relative_to(issue).as_posix(): path.read_bytes() for path in (issue / "cleaned").rglob("*") if path.is_file()}
            self.assertEqual(before, after)
            self.assertEqual(json.loads(post.read_text(encoding="utf-8"))["publisher"], "WRONG")


if __name__ == "__main__":
    unittest.main()
