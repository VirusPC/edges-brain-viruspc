"""Optional Langfuse v4 OTLP upload for one retrieval-eval sample.

Mirrors `.harness/observation/smoke/langfuse-otlp-smoke.sh`: POST JSON to
`$LANGFUSE_HOST/api/public/otel/v1/traces` with Basic auth. `LANGFUSE_BASE_URL`
is accepted when `LANGFUSE_HOST` is unset. Missing host, public key, or secret
key skips the upload. HTTP and network failures are returned, not raised.
Secrets and the instance origin stay in the environment, not in this repo.
"""

from __future__ import annotations

import base64
import json
import os
import secrets
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

_TRACE_PATH = "/api/public/otel/v1/traces"
_SERVICE = "edges-retrieval-eval"
_MAX_ATTR = 8000
_MAX_SPANS = 40
_TIMEOUT_SECONDS = 10.0

Opener = Callable[..., Any]


@dataclass(frozen=True)
class UploadResult:
    status: str
    error: str | None = None


def upload_sample_trace(
    *,
    events_jsonl: str,
    cell_id: str,
    sample_id: str,
    client_id: str,
    repository_id: str,
    repository_url: str,
    repository_ref: str | None,
    repository_commit: str | None,
    prompt: str,
    score_row: Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
    opener: Opener | None = None,
) -> UploadResult:
    """POST one sample trace when Langfuse env is complete. Never raises."""
    config = _langfuse_config(environ)
    if config is None:
        return UploadResult("skipped")
    host, public_key, secret_key = config
    payload = _build_payload(
        events_jsonl=events_jsonl,
        cell_id=cell_id,
        sample_id=sample_id,
        client_id=client_id,
        repository_id=repository_id,
        repository_url=repository_url,
        repository_ref=repository_ref,
        repository_commit=repository_commit,
        prompt=prompt,
        score_row=score_row,
    )
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    token = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode("ascii")
    try:
        status = _post_otlp(
            f"{host}{_TRACE_PATH}",
            body,
            f"Basic {token}",
            opener=opener,
        )
    except Exception as exc:
        return UploadResult("failed", error=type(exc).__name__)
    if status < 200 or status >= 300:
        return UploadResult("failed", error=f"HTTP {status}")
    return UploadResult("sent")


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


def _build_payload(
    *,
    events_jsonl: str,
    cell_id: str,
    sample_id: str,
    client_id: str,
    repository_id: str,
    repository_url: str,
    repository_ref: str | None,
    repository_commit: str | None,
    prompt: str,
    score_row: Mapping[str, Any],
) -> dict[str, Any]:
    trace_id = secrets.token_hex(16)
    root_id = secrets.token_hex(8)
    start = time.time_ns()
    spans = _event_spans(events_jsonl, trace_id, root_id, start)
    end = start + (len(spans) + 1) * 1_000_000
    predicted = score_row.get("predicted")
    output = json.dumps(predicted if isinstance(predicted, list) else [], ensure_ascii=False)
    root_attributes = [
        _string("langfuse.trace.name", f"retrieval-eval {sample_id}"),
        _string("langfuse.observation.type", "span"),
        _string("langfuse.observation.input", prompt),
        _string("langfuse.observation.output", output),
        _string("langfuse.trace.metadata.cell_id", cell_id),
        _string("langfuse.trace.metadata.sample_id", sample_id),
        _string("langfuse.trace.metadata.client_id", client_id),
        _string("langfuse.trace.metadata.repository_id", repository_id),
        _string("langfuse.trace.metadata.repository_url", repository_url),
        _string("langfuse.trace.metadata.repository_ref", repository_ref),
        _string("langfuse.trace.metadata.repository_commit", repository_commit),
        _string("langfuse.trace.metadata.score", _number_text(score_row.get("score"))),
        _string("langfuse.trace.metadata.grade", _optional_text(score_row.get("grade"))),
        _string("langfuse.trace.metadata.recall_at_5", _number_text(score_row.get("R@5"))),
        _string("langfuse.trace.metadata.precision_at_5", _number_text(score_row.get("P@5"))),
        _string("langfuse.trace.metadata.ndcg_at_5", _number_text(score_row.get("nDCG@5"))),
        _string("langfuse.trace.metadata.parse_error", _optional_text(score_row.get("parse_error"))),
    ]
    root = _span(
        name=f"retrieval-eval {sample_id}",
        trace_id=trace_id,
        span_id=root_id,
        parent_id=None,
        start=start,
        end=end,
        attributes=root_attributes,
    )
    return {
        "resourceSpans": [
            {
                "resource": {"attributes": [_string("service.name", _SERVICE)]},
                "scopeSpans": [
                    {
                        "scope": {"name": _SERVICE},
                        "spans": [root, *spans],
                    }
                ],
            }
        ]
    }


def _event_spans(events_jsonl: str, trace_id: str, parent_id: str, start: int) -> list[dict[str, Any]]:
    spans: list[dict[str, Any]] = []
    for event in _events(events_jsonl):
        if len(spans) >= _MAX_SPANS:
            break
        event_type = event.get("type")
        if event_type == "item.completed":
            span = _item_span(event.get("item"), trace_id, parent_id, start, len(spans))
        elif event_type == "turn.completed":
            span = _turn_span(event.get("usage"), trace_id, parent_id, start, len(spans))
        else:
            span = None
        if span is not None:
            spans.append(span)
    return spans


def _item_span(
    item: Any,
    trace_id: str,
    parent_id: str,
    start: int,
    index: int,
) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None
    item_type = item.get("type")
    if item_type == "command_execution":
        command = _optional_text(item.get("command")) or ""
        output = _optional_text(item.get("aggregated_output"))
        if output is None:
            output = _optional_text(item.get("output")) or ""
        name = " ".join(command.split()) or "command_execution"
        return _span(
            name=_clip(name, 120),
            trace_id=trace_id,
            span_id=secrets.token_hex(8),
            parent_id=parent_id,
            start=start + (index + 1) * 1_000_000,
            end=start + (index + 2) * 1_000_000,
            attributes=[
                _string("langfuse.observation.type", "tool"),
                _string("langfuse.observation.input", command),
                _string("langfuse.observation.output", output),
            ],
        )
    if item_type == "reasoning":
        return _span(
            name="reasoning",
            trace_id=trace_id,
            span_id=secrets.token_hex(8),
            parent_id=parent_id,
            start=start + (index + 1) * 1_000_000,
            end=start + (index + 2) * 1_000_000,
            attributes=[
                _string("langfuse.observation.type", "span"),
                _string("langfuse.observation.output", _item_text(item)),
            ],
        )
    if item_type == "agent_message":
        return _span(
            name="agent_message",
            trace_id=trace_id,
            span_id=secrets.token_hex(8),
            parent_id=parent_id,
            start=start + (index + 1) * 1_000_000,
            end=start + (index + 2) * 1_000_000,
            attributes=[
                _string("langfuse.observation.type", "span"),
                _string("langfuse.observation.output", _item_text(item)),
            ],
        )
    return None


def _turn_span(
    usage: Any,
    trace_id: str,
    parent_id: str,
    start: int,
    index: int,
) -> dict[str, Any] | None:
    if not isinstance(usage, dict):
        return None
    details: dict[str, int] = {}
    _copy_int(details, "input", usage.get("input_tokens"))
    _copy_int(details, "output", usage.get("output_tokens"))
    _copy_int(details, "input_cached_tokens", usage.get("cached_input_tokens"))
    _copy_int(details, "reasoning_output_tokens", usage.get("reasoning_output_tokens"))
    if not details:
        return None
    attributes: list[dict[str, Any] | None] = [
        _string("langfuse.observation.type", "generation"),
        _string("langfuse.observation.usage_details", json.dumps(details, ensure_ascii=False)),
        _int_attr("gen_ai.usage.input_tokens", details.get("input")),
        _int_attr("gen_ai.usage.output_tokens", details.get("output")),
    ]
    return _span(
        name="turn.completed",
        trace_id=trace_id,
        span_id=secrets.token_hex(8),
        parent_id=parent_id,
        start=start + (index + 1) * 1_000_000,
        end=start + (index + 2) * 1_000_000,
        attributes=attributes,
    )


def _events(text: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(event, dict):
            events.append(event)
    return events


def _item_text(item: Mapping[str, Any]) -> str:
    text = item.get("text")
    if isinstance(text, str):
        return text
    summary = item.get("summary")
    if isinstance(summary, str):
        return summary
    if isinstance(summary, list):
        parts = []
        for part in summary:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and isinstance(part.get("text"), str):
                parts.append(part["text"])
        return "\n".join(parts)
    return ""


def _span(
    *,
    name: str,
    trace_id: str,
    span_id: str,
    parent_id: str | None,
    start: int,
    end: int,
    attributes: list[dict[str, Any] | None],
) -> dict[str, Any]:
    span: dict[str, Any] = {
        "traceId": trace_id,
        "spanId": span_id,
        "name": name,
        "kind": 1,
        "startTimeUnixNano": str(start),
        "endTimeUnixNano": str(end),
        "attributes": [item for item in attributes if item is not None],
    }
    if parent_id:
        span["parentSpanId"] = parent_id
    return span


def _string(key: str, value: str | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return {"key": key, "value": {"stringValue": _clip(value, _MAX_ATTR)}}


def _int_attr(key: str, value: int | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return {"key": key, "value": {"intValue": str(value)}}


def _copy_int(details: dict[str, int], key: str, value: Any) -> None:
    if isinstance(value, bool) or not isinstance(value, int):
        return
    details[key] = value


def _number_text(value: Any) -> str | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return json.dumps(value)


def _optional_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return None


def _clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "…[truncated]"
