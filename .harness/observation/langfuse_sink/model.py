"""Generic trace model.

Fields follow an OTel span: identity, parent, name, time, status, attributes.
`kind` and `usage` are optional and use OTel GenAI words (span, generation,
tool; input / output / reasoning tokens; model). Nothing in this module is
named after Langfuse.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass, field


def new_trace_id() -> str:
    """32 lowercase hex characters, the OTel trace id width."""
    return secrets.token_hex(16)


def new_span_id() -> str:
    """16 lowercase hex characters, the OTel span id width."""
    return secrets.token_hex(8)


def clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "…[truncated]"


@dataclass
class Usage:
    """Token counts for one generation. Absent fields were not reported."""

    input_tokens: int | None = None
    output_tokens: int | None = None
    reasoning_tokens: int | None = None
    model: str | None = None
    cached_input_tokens: int | None = None
    cost: int | float | None = None


@dataclass
class Span:
    trace_id: str
    span_id: str
    name: str
    start_time_unix_nano: int
    end_time_unix_nano: int
    parent_id: str | None = None
    status: str | None = None
    attributes: dict[str, str] = field(default_factory=dict)
    kind: str | None = None
    usage: Usage | None = None
    input: str | None = None
    output: str | None = None


@dataclass
class Trace:
    """One trace: a name plus the spans that share it.

    `metadata` is copied onto every span by an exporter. `attributes` on a
    span stay on that span. `service_name` is the OTel resource `service.name`.
    """

    name: str
    spans: list[Span]
    service_name: str | None = None
    session_id: str | None = None
    user_id: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)

    @property
    def trace_id(self) -> str:
        if not self.spans:
            raise ValueError("trace has no spans")
        return self.spans[0].trace_id
