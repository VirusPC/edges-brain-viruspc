"""Turn pi `--mode json` JSONL into generic spans.

Assistant `message_end` becomes one `reasoning` span per thinking block, one
`agent_message` span per text block, and one `generation` span for the
message. `tool_execution_end` becomes a `tool` span whose input is the
matching `tool_execution_start` args. Incremental updates and unknown events
are ignored. At most 40 spans. The caller supplies the trace id, parent span
id, and start time.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

from langfuse_sink.model import Span, Usage, clip, new_span_id

_MAX_SPANS = 40
_NAME_LIMIT = 120
_STEP_NS = 1_000_000
_FAILURE_REASONS = frozenset({"error", "aborted"})


def pi_event_value(events_jsonl: str, keys: tuple[str, ...]) -> str | None:
    """First non-empty string among `keys`, including nested objects."""
    for event in _events(events_jsonl):
        found = _nested_value(event, keys)
        if found is not None:
            return found
    return None


def spans_from_pi_jsonl(
    events_jsonl: str,
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
) -> list[Span]:
    """Child spans in event order. At most 40. Times are synthetic 1 ms steps."""
    spans: list[Span] = []
    tool_inputs: dict[str, str] = {}
    for event in _events(events_jsonl):
        if len(spans) >= _MAX_SPANS:
            break
        event_type = event.get("type")
        if event_type == "tool_execution_start":
            tool_id = event.get("toolCallId")
            if isinstance(tool_id, str):
                tool_inputs[tool_id] = _args_text(event.get("args"))
            continue
        if event_type == "tool_execution_end":
            _append(
                spans,
                _tool_span(
                    event,
                    tool_inputs,
                    trace_id=trace_id,
                    parent_id=parent_id,
                    start_time_unix_nano=start_time_unix_nano,
                    index=len(spans),
                ),
            )
            continue
        if event_type != "message_end":
            continue
        message = event.get("message")
        if not isinstance(message, dict) or message.get("role") != "assistant":
            continue
        _append_message_spans(
            spans,
            message,
            trace_id=trace_id,
            parent_id=parent_id,
            start_time_unix_nano=start_time_unix_nano,
        )
    return spans


def _append_message_spans(
    spans: list[Span],
    message: Mapping[str, Any],
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
) -> None:
    content = message.get("content")
    if isinstance(content, list):
        for block in content:
            if len(spans) >= _MAX_SPANS:
                break
            if not isinstance(block, dict):
                continue
            block_type = block.get("type")
            if block_type == "thinking":
                _append(
                    spans,
                    _text_span(
                        "reasoning",
                        _block_text(block, "thinking"),
                        trace_id=trace_id,
                        parent_id=parent_id,
                        start_time_unix_nano=start_time_unix_nano,
                        index=len(spans),
                    ),
                )
            elif block_type == "text":
                _append(
                    spans,
                    _text_span(
                        "agent_message",
                        _block_text(block, "text"),
                        trace_id=trace_id,
                        parent_id=parent_id,
                        start_time_unix_nano=start_time_unix_nano,
                        index=len(spans),
                    ),
                )
    if len(spans) >= _MAX_SPANS:
        return
    _append(
        spans,
        _generation_span(
            message,
            trace_id=trace_id,
            parent_id=parent_id,
            start_time_unix_nano=start_time_unix_nano,
            index=len(spans),
        ),
    )


def _text_span(
    name: str,
    output: str,
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
    index: int,
) -> Span:
    return _span(
        name=name,
        trace_id=trace_id,
        parent_id=parent_id,
        start_time_unix_nano=start_time_unix_nano,
        index=index,
        kind="span",
        output=output,
    )


def _generation_span(
    message: Mapping[str, Any],
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
    index: int,
) -> Span:
    usage_body = message.get("usage")
    usage = usage_body if isinstance(usage_body, dict) else {}
    model = _optional_text(message.get("model"))
    parsed = Usage(
        input_tokens=_sum_ints(usage.get("input"), usage.get("cacheRead"), usage.get("cacheWrite")),
        output_tokens=_as_int(usage.get("output")),
        reasoning_tokens=_as_int(usage.get("reasoning")),
        cached_input_tokens=_as_int(usage.get("cacheRead")),
        model=model,
    )
    stop_reason = message.get("stopReason")
    attributes: dict[str, str] = {}
    if isinstance(stop_reason, str) and stop_reason:
        attributes["stopReason"] = stop_reason
    cost = usage.get("cost")
    if isinstance(cost, dict):
        total = cost.get("total")
        if isinstance(total, (int, float)) and not isinstance(total, bool):
            attributes["cost.total"] = json.dumps(total)
    error_message = message.get("errorMessage")
    if isinstance(error_message, str) and error_message.strip():
        attributes["errorMessage"] = error_message.strip()
    status = "error" if stop_reason in _FAILURE_REASONS else None
    return _span(
        name="generation",
        trace_id=trace_id,
        parent_id=parent_id,
        start_time_unix_nano=start_time_unix_nano,
        index=index,
        kind="generation",
        usage=parsed if _has_usage(parsed) or isinstance(usage_body, dict) else None,
        attributes=attributes,
        status=status,
    )


def _tool_span(
    event: Mapping[str, Any],
    tool_inputs: Mapping[str, str],
    *,
    trace_id: str,
    parent_id: str,
    start_time_unix_nano: int,
    index: int,
) -> Span:
    tool_id = event.get("toolCallId")
    tool_input = tool_inputs.get(tool_id, "") if isinstance(tool_id, str) else ""
    name = _optional_text(event.get("toolName")) or "tool"
    is_error = event.get("isError") is True
    return _span(
        name=clip(name, _NAME_LIMIT),
        trace_id=trace_id,
        parent_id=parent_id,
        start_time_unix_nano=start_time_unix_nano,
        index=index,
        kind="tool",
        input=tool_input,
        output=_tool_output(event.get("result")),
        status="error" if is_error else None,
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
    attributes: dict[str, str] | None = None,
    status: str | None = None,
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
        attributes=dict(attributes or {}),
        status=status,
    )


def _append(spans: list[Span], span: Span) -> None:
    if len(spans) < _MAX_SPANS:
        spans.append(span)


def _has_usage(usage: Usage) -> bool:
    return any(
        value is not None
        for value in (
            usage.input_tokens,
            usage.output_tokens,
            usage.reasoning_tokens,
            usage.cached_input_tokens,
            usage.model,
        )
    )


def _tool_output(result: Any) -> str:
    if not isinstance(result, dict):
        return ""
    content = result.get("content")
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text" and isinstance(block.get("text"), str):
            parts.append(block["text"])
    return "\n".join(parts)


def _args_text(args: Any) -> str:
    if isinstance(args, str):
        return args
    if isinstance(args, (dict, list)):
        return json.dumps(args, ensure_ascii=False, sort_keys=True)
    return ""


def _block_text(block: Mapping[str, Any], key: str) -> str:
    value = block.get(key)
    if isinstance(value, str):
        return value
    return ""


def _nested_value(node: Any, keys: tuple[str, ...]) -> str | None:
    if isinstance(node, dict):
        for key in keys:
            value = node.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        for value in node.values():
            found = _nested_value(value, keys)
            if found is not None:
                return found
    elif isinstance(node, list):
        for item in node:
            found = _nested_value(item, keys)
            if found is not None:
                return found
    return None


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


def _sum_ints(*values: Any) -> int | None:
    ints = [parsed for value in values if (parsed := _as_int(value)) is not None]
    if not ints:
        return None
    return sum(ints)


def _as_int(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def _optional_text(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


__all__ = ["pi_event_value", "spans_from_pi_jsonl"]
