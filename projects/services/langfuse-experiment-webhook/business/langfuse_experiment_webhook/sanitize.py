from __future__ import annotations

import re
from typing import Any


_SECRET_KEY = re.compile(
    r"(secret|token|password|passwd|authorization|credential|api[_-]?key|private[_-]?key)",
    re.IGNORECASE,
)
_SECRET_VALUE = re.compile(
    r"(?:sk-|pk-lf-|sk-lf-|lf-whsec_)[A-Za-z0-9_\-]+",
)
_MAX_DEPTH = 8
_MAX_STRING = 500
_MAX_LIST = 50


def sanitize(value: Any, depth: int = 0) -> Any:
    """返回可以写进日志的副本。密钥字段和常见密钥前缀会被替换。"""
    if depth > _MAX_DEPTH:
        return "<max-depth>"
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for key, item in value.items():
            name = str(key)
            if _SECRET_KEY.search(name):
                redacted[name] = "<redacted>"
            else:
                redacted[name] = sanitize(item, depth + 1)
        return redacted
    if isinstance(value, list):
        trimmed = value[:_MAX_LIST]
        items = [sanitize(item, depth + 1) for item in trimmed]
        if len(value) > _MAX_LIST:
            items.append(f"<truncated {len(value) - _MAX_LIST} items>")
        return items
    if isinstance(value, str):
        text = _SECRET_VALUE.sub("<redacted>", value)
        if len(text) > _MAX_STRING:
            return text[:_MAX_STRING] + "…<truncated>"
        return text
    if value is None or isinstance(value, (int, float, bool)):
        return value
    return sanitize(str(value), depth + 1)
