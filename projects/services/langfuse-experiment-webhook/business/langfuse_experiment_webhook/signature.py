from __future__ import annotations

import hashlib
import hmac
import time


def verify_langfuse_signature(
    raw_body: bytes,
    signature_header: str | None,
    secret: str,
    tolerance_seconds: int,
    now: float | None = None,
) -> bool:
    """校验 `x-langfuse-signature: t=<unix>,v1=<hex>`。

    签名是 HMAC-SHA256(secret, f"{timestamp}.{raw_body}") 的十六进制摘要，
    覆盖的是原始请求体，不是重新序列化之后的 JSON。
    """
    if not signature_header:
        return False
    parts: dict[str, str] = {}
    for chunk in signature_header.split(","):
        if "=" not in chunk:
            return False
        key, value = chunk.split("=", 1)
        parts[key.strip()] = value.strip()
    timestamp = parts.get("t")
    received = parts.get("v1")
    if not timestamp or not received or not timestamp.isdigit():
        return False
    issued_at = int(timestamp)
    current = time.time() if now is None else now
    if tolerance_seconds >= 0 and abs(current - issued_at) > tolerance_seconds:
        return False
    message = timestamp.encode("utf-8") + b"." + raw_body
    expected = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received.lower())
