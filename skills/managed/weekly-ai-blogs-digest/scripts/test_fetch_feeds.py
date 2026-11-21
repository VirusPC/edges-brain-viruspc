#!/usr/bin/env python3
"""Feed fallback, health, and title dedupe. No network."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_feeds import assert_fallback_rules  # noqa: E402


class FallbackRules(unittest.TestCase):
    def test_primary_backup_and_title_dedupe(self) -> None:
        assert_fallback_rules()


if __name__ == "__main__":
    unittest.main()
