"""Build a retrieval sample trace and the session id for one run.

Scoring, when to export, reasoning settings, and `service.name` stay here.
OTLP, Langfuse attribute names, and the session id shape live in
`langfuse_sink`. Importing `retrieval_eval` puts `.harness/observation` on
`sys.path` so this module can `import langfuse_sink` without installing it.
"""

from __future__ import annotations

import json
import time
from collections.abc import Mapping
from typing import Any, Sequence

from langfuse_sink import (
    Span,
    Trace,
    codex_event_value,
    make_session_id,
    new_span_id,
    new_trace_id,
    pi_event_value,
    sanitize_label,
    spans_from_codex_jsonl,
    spans_from_pi_jsonl,
)

SERVICE_NAME = "edges-retrieval-eval"
_STEP_NS = 1_000_000


def session_label(sample_id: str, repository_id: str, client_id: str) -> str:
    """`{sample set}:{repository}:{client}`, dropping a repeated repository id.

    `retrieval-smoke/edges` with repository `edges` and client `codex` becomes
    `retrieval-smoke:edges:codex`. A repository id that is not already the last
    segment of the sample id is inserted before the client.
    """
    suite = sample_id.strip().replace("/", ":")
    tail = sample_id.strip().rsplit("/", 1)[-1]
    if repository_id and repository_id != tail:
        suite = f"{suite}:{repository_id}"
    return sanitize_label(f"{suite}:{client_id}")


def session_id_for_run(
    cells: Sequence[tuple[str, str, str]],
    stamp: str,
    suffix: str | None = None,
) -> str:
    """Session id for one retrieval run.

    Each tuple is `(sample_id, repository_id, client_id)`. The namespace is
    `retrieval`, so the id still reads
    `retrieval/{labels}/{stamp}/{4 hex}`.
    """
    return make_session_id(
        "retrieval",
        [session_label(sample_id, repository_id, client_id) for sample_id, repository_id, client_id in cells],
        stamp,
        suffix,
    )


def build_sample_trace(
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
    session_id: str | None = None,
    reasoning: Mapping[str, str] | None = None,
    client_kind: str = "codex",
    client_version: str | None = None,
) -> Trace:
    """One sample: root span plus client child spans. No Langfuse key names.

    `client_kind` selects the JSONL adapter. `codex` reads Codex `exec --json`.
    `pi` reads pi `--mode json`.
    """
    trace_id = new_trace_id()
    root_id = new_span_id()
    start = _now_ns()
    adapter = spans_from_pi_jsonl if client_kind == "pi" else spans_from_codex_jsonl
    children = adapter(
        events_jsonl,
        trace_id=trace_id,
        parent_id=root_id,
        start_time_unix_nano=start,
    )
    predicted = score_row.get("predicted")
    output = json.dumps(predicted if isinstance(predicted, list) else [], ensure_ascii=False)
    root_start, root_end = _root_window(start, children)
    root = Span(
        trace_id=trace_id,
        span_id=root_id,
        name=f"retrieval-eval {sample_id}",
        start_time_unix_nano=root_start,
        end_time_unix_nano=root_end,
        kind="span",
        input=prompt,
        output=output,
        attributes=_root_attributes(score_row, reasoning),
    )
    return Trace(
        name=f"retrieval-eval {sample_id}",
        spans=[root, *children],
        service_name=SERVICE_NAME,
        session_id=_blank(session_id),
        user_id=_blank(client_id),
        metadata=_identity_metadata(
            events_jsonl=events_jsonl,
            cell_id=cell_id,
            sample_id=sample_id,
            client_id=client_id,
            repository_id=repository_id,
            repository_url=repository_url,
            repository_ref=repository_ref,
            repository_commit=repository_commit,
            client_kind=client_kind,
            client_version=client_version,
        ),
    )


def _now_ns() -> int:
    return time.time_ns()


def _root_window(start: int, children: Sequence[Span]) -> tuple[int, int]:
    """Cover every child. Codex children sit just after `start`, so this matches the old window.

    Pi children use event time, which can be earlier than the upload clock.
    """
    root_start = start
    root_end = start + _STEP_NS
    for child in children:
        if child.start_time_unix_nano < root_start:
            root_start = child.start_time_unix_nano
        if child.end_time_unix_nano > root_end:
            root_end = child.end_time_unix_nano
    return root_start, root_end


def _identity_metadata(
    *,
    events_jsonl: str,
    cell_id: str,
    sample_id: str,
    client_id: str,
    repository_id: str,
    repository_url: str,
    repository_ref: str | None,
    repository_commit: str | None,
    client_kind: str = "codex",
    client_version: str | None = None,
) -> dict[str, str]:
    metadata = {
        "cell_id": cell_id,
        "sample_id": sample_id,
        "client_id": client_id,
        "repository_id": repository_id,
        "repository_url": repository_url,
    }
    if client_kind == "pi":
        optional = {
            "repository_ref": _blank(repository_ref),
            "repository_commit": _blank(repository_commit),
            "model": pi_event_value(events_jsonl, ("model",)),
            "provider": pi_event_value(events_jsonl, ("provider",)),
            "client_version": _blank(client_version),
        }
    else:
        optional = {
            "repository_ref": _blank(repository_ref),
            "repository_commit": _blank(repository_commit),
            "model": codex_event_value(events_jsonl, ("model",)),
            "codex_version": codex_event_value(events_jsonl, ("cli_version", "codex_version")),
        }
    for key, value in optional.items():
        if value is not None:
            metadata[key] = value
    return metadata


def _root_attributes(score_row: Mapping[str, Any], reasoning: Mapping[str, str] | None) -> dict[str, str]:
    attributes: dict[str, str] = {}
    scored = (
        ("score", _number_text(score_row.get("score"))),
        ("grade", _optional_text(score_row.get("grade"))),
        ("recall_at_5", _number_text(score_row.get("R@5"))),
        ("precision_at_5", _number_text(score_row.get("P@5"))),
        ("ndcg_at_5", _number_text(score_row.get("nDCG@5"))),
        ("parse_error", _optional_text(score_row.get("parse_error"))),
    )
    for key, value in scored:
        if value is not None:
            attributes[key] = value
    if reasoning:
        for key, value in reasoning.items():
            if not isinstance(key, str):
                continue
            cleaned = _blank(value)
            if cleaned is not None:
                attributes[key] = cleaned
    return attributes


def _number_text(value: Any) -> str | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return json.dumps(value)


def _optional_text(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    return None


def _blank(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None
