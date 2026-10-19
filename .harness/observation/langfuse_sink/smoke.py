"""Send one root span through TraceExporter. Prints the trace id on stdout."""

from __future__ import annotations

import sys
import time

from langfuse_sink.exporter import NoopExporter, exporter_from_env
from langfuse_sink.model import Span, Trace, new_span_id, new_trace_id


def smoke_trace() -> Trace:
    """One root span named `edges-langfuse-smoke`. No session and no scores."""
    trace_id = new_trace_id()
    start = time.time_ns()
    span = Span(
        trace_id=trace_id,
        span_id=new_span_id(),
        name="edges-langfuse-smoke",
        start_time_unix_nano=start,
        end_time_unix_nano=start + 150_000_000,
    )
    return Trace(
        name="edges-langfuse-smoke",
        spans=[span],
        service_name="edges-langfuse-smoke",
    )


def main() -> int:
    exporter = exporter_from_env()
    if isinstance(exporter, NoopExporter):
        print(
            "observation: LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY, and LANGFUSE_SECRET_KEY are required",
            file=sys.stderr,
        )
        return 2
    trace = smoke_trace()
    result = exporter.export(trace)
    if result.status != "sent":
        print(f"observation: trace export failed: {result.error}", file=sys.stderr)
        return 1
    print(trace.trace_id)
    return 0
