"""文章链接的规范化。清洗、汇总和抓取共用这一份。"""

from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit

_TRACKING_KEYS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_src",
}


def host_of(url: str) -> str:
    host = urlsplit(url.strip()).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def normalize_link(url: str) -> str:
    parts = urlsplit(url.strip())
    host = parts.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = parts.path.rstrip("/")
    query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if key.lower() not in _TRACKING_KEYS and not key.lower().startswith("utm_")
    ]
    query.sort()
    encoded = urlencode(query)
    base = host + path
    return base + ("?" + encoded if encoded else "")
