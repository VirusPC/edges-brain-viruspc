"""Turn Codex `exec --json` JSONL into generic spans.

Understands `command_execution`, `reasoning`, `agent_message`, and the
token usage on `turn.completed`. Other events are ignored. The caller
supplies the trace id, parent span id, and start time.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

from langfuse_sink.model import Span, Usage, clip, new_span_id

_MAX_SPANS = 40
_NAME_LIMIT = 120
_STEP_NS = 1_000_000


def codex_event_value(events_jsonl: str, keys: tuple[str, ...]) -> str | None:
    """First non-empty string among `keys` on any event. Does not invent one."""
    for event in _events(events_jsonl):
        for key in keys:
            value = event.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


def spans_from_codex_jsonl(
    events_jsonl: str,
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
) -> list[Span]:
    """Child spans in event order. At most 40. Times are synthetic 1 ms steps."""
    spans: list[Span] = []
    for event in _events(events_jsonl):
        if len(spans) >= _MAX_SPANS:
            break
        span = _event_span(
            event,
            trace_id=trace_id,
            parent_id=parent_id,
            start_time_unix_nano=start_time_unix_nano,
            index=len(spans),
        )
        if span is not None:
            spans.append(span)
    return spans


def _event_span(
    event: Mapping[str, Any],
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
    index: int,
) -> Span | None:
    event_type = event.get("type")
    if event_type == "item.completed":
        return _item_span(
            event.get("item"),
            trace_id=trace_id,
            parent_id=parent_id,
            start_time_unix_nano=start_time_unix_nano,
            index=index,
        )
    if event_type == "turn.completed":
        return _turn_span(
            event.get("usage"),
            trace_id=trace_id,
            parent_id=parent_id,
            start_time_unix_nano=start_time_unix_nano,
            index=index,
        )
    return None


def _item_span(
    item: Any,
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
    index: int,
) -> Span | None:
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
            name=clip(name, _NAME_LIMIT),
            trace_id=trace_id,
            parent_id=parent_id,
            start_time_unix_nano=start_time_unix_nano,
            index=index,
            kind="tool",
            input=command,
            output=output,
        )
    if item_type == "reasoning":
        return _span(
            name="reasoning",
            trace_id=trace_id,
            parent_id=parent_id,
            start_time_unix_nano=start_time_unix_nano,
            index=index,
            kind="span",
            output=_item_text(item),
        )
    if item_type == "agent_message":
        return _span(
            name="agent_message",
            trace_id=trace_id,
            parent_id=parent_id,
            start_time_unix_nano=start_time_unix_nano,
            index=index,
            kind="span",
            output=_item_text(item),
        )
    return None


def _turn_span(
    usage: Any,
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
    index: int,
) -> Span | None:
    if not isinstance(usage, dict):
        return None
    parsed = Usage(
        input_tokens=_as_int(usage.get("input_tokens")),
        output_tokens=_as_int(usage.get("output_tokens")),
        reasoning_tokens=_as_int(usage.get("reasoning_output_tokens")),
        cached_input_tokens=_as_int(usage.get("cached_input_tokens")),
    )
    if not _has_counts(parsed):
        return None
    return _span(
        name="turn.completed",
        trace_id=trace_id,
        parent_id=parent_id,
        start_time_unix_nano=start_time_unix_nano,
        index=index,
        kind="generation",
        usage=parsed,
    )


def _span(
    *,
    name: str,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
    index: int,
    kind: str,
    input: str | None = None,
    output: str | None = None,
    usage: Usage | None = None,
) -> Span:
    start = start_time_unix_nano + (index + 1) * _STEP_NS
    return Span(
        trace_id=trace_id,
        span_id=new_span_id(),
        parent_id=parent_id,
        name=name,
        start_time_unix_nano=start,
        end_time_unix_nano=start + _STEP_NS,
        kind=kind,
        input=input,
        output=output,
        usage=usage,
    )


def _has_counts(usage: Usage) -> bool:
    return any(
        value is not None
        for value in (
            usage.input_tokens,
            usage.output_tokens,
            usage.reasoning_tokens,
            usage.cached_input_tokens,
        )
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
        parts: list[str] = []
        for part in summary:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and isinstance(part.get("text"), str):
                parts.append(part["text"])
        return "\n".join(parts)
    return ""


def _as_int(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def _optional_text(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    return None


# Re-export for callers that only need the event walk's ignored types documented.
__all__ = ["codex_event_value", "spans_from_codex_jsonl"]
