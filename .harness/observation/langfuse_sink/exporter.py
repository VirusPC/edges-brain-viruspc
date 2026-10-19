"""TraceExporter: Langfuse OTLP when the environment is complete, otherwise no-op.

Langfuse attribute names are created only in this file.
"""

from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol

from langfuse_sink.model import Trace, Usage, clip

_TRACE_PATH = "/api/public/otel/v1/traces"
# Cloudflare 1010 rejects urllib's default Python-urllib signature.
USER_AGENT = "edges-observation/1"
_MAX_ATTR = 8000
_TIMEOUT_SECONDS = 10.0
_STATUS_CODE = {"ok": 1, "error": 2}

Opener = Callable[..., Any]


@dataclass(frozen=True)
class ExportResult:
    """`sent`, `skipped`, or `failed`. `error` is a short token, not a traceback."""

    status: str
    error: str | None = None


class TraceExporter(Protocol):
    def export(self, trace: Trace) -> ExportResult:
        """Send one trace. Does not raise."""


class NoopExporter:
    """Used when Langfuse env is incomplete. `export` does not touch the network."""

    def export(self, trace: Trace) -> ExportResult:
        return ExportResult("skipped")


class LangfuseOtlpExporter:
    """POST OTLP JSON to `$host/api/public/otel/v1/traces` with Basic auth."""

    def __init__(
        self,
        host: str,
        public_key: str,
        secret_key: str,
        opener: Opener | None = None,
    ) -> None:
        self._host = host.rstrip("/")
        self._public_key = public_key
        self._secret_key = secret_key
        self._opener = opener

    def export(self, trace: Trace) -> ExportResult:
        try:
            if not trace.spans:
                return ExportResult("failed", error="empty trace")
            body = json.dumps(_payload(trace), ensure_ascii=False).encode("utf-8")
            token = base64.b64encode(f"{self._public_key}:{self._secret_key}".encode()).decode("ascii")
            status = _post_otlp(
                f"{self._host}{_TRACE_PATH}",
                body,
                f"Basic {token}",
                opener=self._opener,
            )
        except Exception as exc:
            return ExportResult("failed", error=type(exc).__name__)
        if status < 200 or status >= 300:
            return ExportResult("failed", error=f"HTTP {status}")
        return ExportResult("sent")


def exporter_from_env(
    environ: Mapping[str, str] | None = None,
    opener: Opener | None = None,
) -> TraceExporter:
    """Langfuse exporter when host, public key, and secret key are all set.

    `LANGFUSE_HOST` wins. `LANGFUSE_BASE_URL` is used only when host is empty.
    Otherwise a no-op exporter.
    """
    config = _langfuse_config(environ)
    if config is None:
        return NoopExporter()
    host, public_key, secret_key = config
    return LangfuseOtlpExporter(host, public_key, secret_key, opener=opener)


def _langfuse_config(environ: Mapping[str, str] | None) -> tuple[str, str, str] | None:
    env = os.environ if environ is None else environ
    host = (env.get("LANGFUSE_HOST") or "").strip()
    if not host:
        host = (env.get("LANGFUSE_BASE_URL") or "").strip()
    host = host.rstrip("/")
    public_key = (env.get("LANGFUSE_PUBLIC_KEY") or "").strip()
    secret_key = (env.get("LANGFUSE_SECRET_KEY") or "").strip()
    if not host or not public_key or not secret_key:
        return None
    return host, public_key, secret_key


def _post_otlp(url: str, body: bytes, authorization: str, opener: Opener | None = None) -> int:
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": authorization,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    open_fn = opener or urllib.request.urlopen
    try:
        with open_fn(request, timeout=_TIMEOUT_SECONDS) as response:
            response.read()
            status = getattr(response, "status", None)
            if status is None:
                status = response.getcode()
            return int(status)
    except urllib.error.HTTPError as exc:
        if exc.fp is not None:
            exc.read()
        return int(exc.code)


def _payload(trace: Trace) -> dict[str, Any]:
    resource: list[dict[str, Any]] = []
    if trace.service_name:
        item = _string("service.name", trace.service_name)
        if item is not None:
            resource.append(item)
    scope_name = trace.service_name or "edges-observation"
    return {
        "resourceSpans": [
            {
                "resource": {"attributes": resource},
                "scopeSpans": [
                    {
                        "scope": {"name": scope_name},
                        "spans": [_otlp_span(trace, span) for span in trace.spans],
                    }
                ],
            }
        ]
    }


def _otlp_span(trace: Trace, span: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "traceId": span.trace_id,
        "spanId": span.span_id,
        "name": span.name,
        # OTel span kind INTERNAL. Semantic kind is `span.kind` and is mapped
        # to langfuse.observation.type, not to this integer.
        "kind": 1,
        "startTimeUnixNano": str(span.start_time_unix_nano),
        "endTimeUnixNano": str(span.end_time_unix_nano),
        "attributes": _attributes(trace, span),
    }
    if span.parent_id:
        body["parentSpanId"] = span.parent_id
    status = _STATUS_CODE.get(span.status or "")
    if status is not None:
        body["status"] = {"code": status}
    return body


def _attributes(trace: Trace, span: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any] | None] = []
    session = _blank(trace.session_id)
    if session:
        items.append(_string("langfuse.session.id", session))
        items.append(_string("session.id", session))
    user = _blank(trace.user_id)
    if user:
        items.append(_string("langfuse.user.id", user))
    if trace.name:
        items.append(_string("langfuse.trace.name", trace.name))
    for key, value in trace.metadata.items():
        items.append(_string(f"langfuse.trace.metadata.{key}", value))
    if span.kind:
        items.append(_string("langfuse.observation.type", span.kind))
    if span.input is not None:
        items.append(_string("langfuse.observation.input", span.input))
    if span.output is not None:
        items.append(_string("langfuse.observation.output", span.output))
    if span.usage is not None:
        items.extend(_usage_attributes(span.usage))
    for key, value in span.attributes.items():
        items.append(_string(f"langfuse.trace.metadata.{key}", value))
    return [item for item in items if item is not None]


def _usage_attributes(usage: Usage) -> list[dict[str, Any] | None]:
    """Langfuse total adds `input` and `input_cached_tokens`. Keep cache out of `input`.

    `gen_ai.usage.input_tokens` stays the original count, cache included.
    """
    details: dict[str, int] = {}
    _copy_int(details, "input", _uncached_input(usage))
    _copy_int(details, "output", usage.output_tokens)
    _copy_int(details, "input_cached_tokens", usage.cached_input_tokens)
    _copy_int(details, "reasoning_output_tokens", usage.reasoning_tokens)
    items: list[dict[str, Any] | None] = []
    if details:
        items.append(_string("langfuse.observation.usage_details", json.dumps(details, ensure_ascii=False)))
        items.append(_int_attr("gen_ai.usage.input_tokens", _plain_int(usage.input_tokens)))
        items.append(_int_attr("gen_ai.usage.output_tokens", _plain_int(usage.output_tokens)))
    if isinstance(usage.cost, (int, float)) and not isinstance(usage.cost, bool):
        items.append(_string("langfuse.observation.cost_details", json.dumps({"total": usage.cost})))
    model = _blank(usage.model)
    if model:
        items.append(_string("gen_ai.request.model", model))
    return items


def _uncached_input(usage: Usage) -> int | None:
    total = _plain_int(usage.input_tokens)
    if total is None:
        return None
    cached = _plain_int(usage.cached_input_tokens)
    if cached is None:
        return total
    return max(0, total - cached)


def _plain_int(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def _copy_int(details: dict[str, int], key: str, value: Any) -> None:
    if isinstance(value, bool) or not isinstance(value, int):
        return
    details[key] = value


def _string(key: str, value: str | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return {"key": key, "value": {"stringValue": clip(value, _MAX_ATTR)}}


def _int_attr(key: str, value: int | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return {"key": key, "value": {"intValue": str(value)}}


def _blank(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None
