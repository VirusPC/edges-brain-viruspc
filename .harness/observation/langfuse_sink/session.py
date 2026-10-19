"""Session ids of the form `{namespace}/{labels}/{stamp}/{4 hex}`."""

from __future__ import annotations

import re
import secrets
from collections.abc import Sequence


def sanitize_label(text: str) -> str:
    """Keep letters, digits, and `._:+-`. Other runs become a single hyphen."""
    return re.sub(r"[^A-Za-z0-9._:+-]+", "-", text).strip("-")


def make_session_id(
    namespace: str,
    labels: Sequence[str],
    stamp: str,
    suffix: str | None = None,
) -> str:
    """`{namespace}/{labels}/{stamp}/{4 hex}`.

    Labels are sanitized, empties dropped, duplicates dropped, then joined
    with `+`. A missing label list becomes `run`. The suffix is 4 lowercase
    hex characters; omit it to generate one. This is not a bare timestamp.
    """
    token = suffix if suffix is not None else secrets.token_hex(2)
    if not re.fullmatch(r"[0-9a-f]{4}", token):
        raise ValueError("session suffix must be 4 lowercase hex characters")
    parts: list[str] = []
    for label in labels:
        cleaned = sanitize_label(label)
        if cleaned and cleaned not in parts:
            parts.append(cleaned)
    label = "+".join(parts) if parts else "run"
    ns = sanitize_label(namespace) or "trace"
    return f"{ns}/{label}/{sanitize_label(stamp) or 'stamp'}/{token}"
