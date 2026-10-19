"""Unit tests for the observation trace exporter. No network."""

from __future__ import annotations

import base64
import io
import json
import sys
import unittest
import urllib.error
from pathlib import Path

_OBSERVATION = Path(__file__).resolve().parents[2]
if str(_OBSERVATION) not in sys.path:
    sys.path.insert(0, str(_OBSERVATION))

from langfuse_sink import (  # noqa: E402
    USER_AGENT,
    Span,
    Trace,
    Usage,
    codex_event_value,
    exporter_from_env,
    make_session_id,
    pi_event_value,
    spans_from_codex_jsonl,
    spans_from_pi_jsonl,
)
from langfuse_sink.model import new_span_id, new_trace_id  # noqa: E402
from langfuse_sink.smoke import smoke_trace  # noqa: E402


def _events() -> str:
    return "\n".join(
        [
            json.dumps({"type": "thread.started", "thread_id": "thread-1"}),
            json.dumps(
                {
                    "type": "item.completed",
                    "item": {
                        "id": "item_1",
                        "type": "command_execution",
                        "command": "rg CONTEXT",
                        "aggregated_output": "CONTEXT.md\n",
                    },
                }
            ),
            json.dumps(
                {
                    "type": "item.completed",
                    "item": {"id": "item_2", "type": "reasoning", "text": "先看 CONTEXT"},
                }
            ),
            json.dumps(
                {
                    "type": "item.completed",
                    "item": {
                        "id": "item_3",
                        "type": "agent_message",
                        "text": '{"predicted":["a"]}',
                    },
                }
            ),
            json.dumps(
                {
                    "type": "turn.completed",
                    "usage": {
                        "input_tokens": 11,
                        "cached_input_tokens": 4,
                        "output_tokens": 3,
                        "reasoning_output_tokens": 1,
                    },
                }
            ),
        ]
    ) + "\n"


def _span_attributes(payload: dict) -> list[dict[str, str]]:
    spans = payload["resourceSpans"][0]["scopeSpans"][0]["spans"]
    flattened = []
    for span in spans:
        attrs = {}
        for item in span.get("attributes", []):
            value = item["value"]
            if "stringValue" in value:
                attrs[item["key"]] = value["stringValue"]
            elif "intValue" in value:
                attrs[item["key"]] = str(value["intValue"])
        flattened.append(
            {
                "name": span["name"],
                "traceId": span["traceId"],
                "spanId": span["spanId"],
                "parentSpanId": span.get("parentSpanId"),
                **attrs,
            }
        )
    return flattened


class _Capture:
    def __init__(self, status: int = 200, error: BaseException | None = None) -> None:
        self.status = status
        self.error = error
        self.requests: list[object] = []

    def __call__(self, request, timeout=None):
        if self.error is not None:
            raise self.error
        self.requests.append(request)
        body = io.BytesIO(b"")
        response = urllib.error.HTTPError(request.full_url, self.status, "status", hdrs=None, fp=body)
        if 200 <= self.status < 300:
            return _Ok(self.status)
        raise response


class _Ok:
    def __init__(self, status: int) -> None:
        self.status = status

    def read(self) -> bytes:
        return b""

    def __enter__(self):
        return self

    def __exit__(self, *args) -> bool:
        return False


def _retrieval_like_trace(events: str, *, sample_id: str, score: str) -> Trace:
    """The generic trace a retrieval caller would hand to export."""
    trace_id = new_trace_id()
    root_id = new_span_id()
    start = 1_700_000_000_000_000_000
    children = spans_from_codex_jsonl(
        events,
        trace_id=trace_id,
        parent_id=root_id,
        start_time_unix_nano=start,
    )
    root = Span(
        trace_id=trace_id,
        span_id=root_id,
        name=f"retrieval-eval {sample_id}",
        start_time_unix_nano=start,
        end_time_unix_nano=start + (len(children) + 1) * 1_000_000,
        kind="span",
        input="问题",
        output='["a"]' if score == "1.0" else "[]",
        attributes={
            "score": score,
            "grade": "good",
            "recall_at_5": score,
            "reasoning_summary": "detailed",
            "reasoning_effort": "high",
            "show_raw_reasoning": "true",
        },
    )
    return Trace(
        name=f"retrieval-eval {sample_id}",
        spans=[root, *children],
        service_name="edges-retrieval-eval",
        session_id="retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/ab12",
        user_id="codex",
        metadata={
            "cell_id": "cell-1",
            "sample_id": sample_id,
            "client_id": "codex",
            "repository_id": "edges",
            "repository_url": "https://github.com/VirusPC/edges.git",
            "repository_ref": "main",
            "repository_commit": "abc",
            "model": "gpt-5.4",
            "codex_version": "0.98.0",
        },
    )


class SessionIdTests(unittest.TestCase):
    def test_format_namespace_labels_stamp_suffix(self) -> None:
        self.assertEqual(
            make_session_id("retrieval", ["retrieval-smoke:edges:codex"], "2026-10-19-021500", suffix="ab12"),
            "retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/ab12",
        )
        self.assertEqual(
            make_session_id(
                "retrieval",
                ["retrieval-smoke:edges:codex", "retrieval-smoke:edges:codex", "other-suite:repo:codex"],
                "2026-10-19-021500",
                suffix="ab12",
            ),
            "retrieval/retrieval-smoke:edges:codex+other-suite:repo:codex/2026-10-19-021500/ab12",
        )
        generated = make_session_id("retrieval", ["retrieval-smoke:edges:codex"], "2026-10-19-021500")
        self.assertRegex(
            generated,
            r"^retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/[0-9a-f]{4}$",
        )

    def test_other_namespace_and_sanitized_labels(self) -> None:
        self.assertEqual(
            make_session_id("locomo", ["conv 44"], "2026-10-19-021500", suffix="ab12"),
            "locomo/conv-44/2026-10-19-021500/ab12",
        )
        self.assertEqual(
            make_session_id("", [], "!!!", suffix="ab12"),
            "trace/run/stamp/ab12",
        )

    def test_suffix_must_be_four_lowercase_hex(self) -> None:
        with self.assertRaises(ValueError):
            make_session_id("retrieval", ["a"], "stamp", suffix="AB12")
        with self.assertRaises(ValueError):
            make_session_id("retrieval", ["a"], "stamp", suffix="ab1")


class CodexSpanTests(unittest.TestCase):
    def test_jsonl_becomes_tool_reasoning_message_and_generation(self) -> None:
        trace_id = "a" * 32
        parent = "b" * 16
        start = 1_000
        spans = spans_from_codex_jsonl(
            _events(),
            trace_id=trace_id,
            parent_id=parent,
            start_time_unix_nano=start,
        )
        self.assertEqual([span.name for span in spans], ["rg CONTEXT", "reasoning", "agent_message", "turn.completed"])
        tool, reasoning, message, turn = spans
        self.assertEqual(tool.kind, "tool")
        self.assertEqual(tool.input, "rg CONTEXT")
        self.assertEqual(tool.output, "CONTEXT.md\n")
        self.assertEqual(reasoning.kind, "span")
        self.assertEqual(reasoning.output, "先看 CONTEXT")
        self.assertEqual(message.output, '{"predicted":["a"]}')
        self.assertEqual(turn.kind, "generation")
        self.assertIsNotNone(turn.usage)
        assert turn.usage is not None
        self.assertEqual(turn.usage.input_tokens, 11)
        self.assertEqual(turn.usage.output_tokens, 3)
        self.assertEqual(turn.usage.cached_input_tokens, 4)
        self.assertEqual(turn.usage.reasoning_tokens, 1)
        self.assertIsNone(turn.usage.model)
        for span in spans:
            self.assertEqual(span.trace_id, trace_id)
            self.assertEqual(span.parent_id, parent)
            self.assertEqual(span.attributes, {})
            self.assertFalse(any(key.startswith("langfuse.") for key in span.attributes))
        self.assertEqual(tool.start_time_unix_nano, start + 1_000_000)
        self.assertEqual(tool.end_time_unix_nano, start + 2_000_000)

    def test_identity_strings_and_summary_list(self) -> None:
        events = json.dumps({"type": "thread.started", "model": "gpt-5.4", "cli_version": "0.98.0"})
        self.assertEqual(codex_event_value(events, ("model",)), "gpt-5.4")
        self.assertEqual(codex_event_value(events, ("cli_version", "codex_version")), "0.98.0")
        self.assertIsNone(codex_event_value("not json\n", ("model",)))
        summary = json.dumps(
            {
                "type": "item.completed",
                "item": {"type": "reasoning", "summary": [{"text": "第一段"}, "第二段"]},
            }
        )
        spans = spans_from_codex_jsonl(summary, trace_id="a" * 32, parent_id="b" * 16, start_time_unix_nano=0)
        self.assertEqual(spans[0].output, "第一段\n第二段")

    def test_caps_span_count_and_ignores_bad_lines(self) -> None:
        lines = ["not-json", "{"]
        for index in range(45):
            lines.append(json.dumps({"type": "item.completed", "item": {"type": "command_execution", "command": f"cmd {index}"}}))
        spans = spans_from_codex_jsonl("\n".join(lines), trace_id="a" * 32, parent_id="b" * 16, start_time_unix_nano=0)
        self.assertEqual(len(spans), 40)

    def test_turn_without_ints_is_dropped(self) -> None:
        text = json.dumps({"type": "turn.completed", "usage": {"input_tokens": True, "output_tokens": "3"}})
        self.assertEqual(
            spans_from_codex_jsonl(text, trace_id="a" * 32, parent_id="b" * 16, start_time_unix_nano=0),
            [],
        )


class PiSpanTests(unittest.TestCase):
    def test_success_fixture_becomes_reasoning_message_generation_and_tool(self) -> None:
        events = Path(__file__).parent.joinpath("fixtures", "pi_success.jsonl").read_text(encoding="utf-8")
        trace_id = "c" * 32
        parent = "d" * 16
        start = 5_000
        spans = spans_from_pi_jsonl(
            events,
            trace_id=trace_id,
            parent_id=parent,
            start_time_unix_nano=start,
        )
        self.assertEqual(
            [span.name for span in spans],
            [
                "reasoning",
                "generation",
                "grep",
                "reasoning",
                "generation",
                "grep",
                "generation",
                "bash",
                "read",
                "reasoning",
                "agent_message",
                "generation",
            ],
        )
        self.assertEqual(pi_event_value(events, ("model",)), "MiniMax-M3")
        self.assertEqual(pi_event_value(events, ("provider",)), "minimax-cn")
        self.assertIsNone(pi_event_value("not json\n", ("model",)))
        first_gen = spans[1]
        self.assertEqual(first_gen.kind, "generation")
        assert first_gen.usage is not None
        self.assertEqual(first_gen.usage.input_tokens, 1619 + 128 + 0)
        self.assertEqual(first_gen.usage.output_tokens, 88)
        self.assertEqual(first_gen.usage.reasoning_tokens, 59)
        self.assertEqual(first_gen.usage.cached_input_tokens, 128)
        self.assertEqual(first_gen.usage.model, "MiniMax-M3")
        self.assertEqual(first_gen.attributes["stopReason"], "toolUse")
        self.assertNotIn("cost.total", first_gen.attributes)
        self.assertEqual(json.dumps(first_gen.usage.cost), json.dumps(0.00059898))
        self.assertIsNone(first_gen.status)
        third_gen = spans[6]
        assert third_gen.usage is not None
        self.assertIsNone(third_gen.usage.reasoning_tokens)
        self.assertEqual(third_gen.usage.input_tokens, 60 + 1853 + 0)
        tool = spans[2]
        self.assertEqual(tool.kind, "tool")
        self.assertEqual(tool.input, json.dumps({"pattern": "function needle"}, ensure_ascii=False))
        self.assertEqual(tool.output, "No matches found")
        self.assertIsNone(tool.status)
        self.assertEqual(spans[7].input, json.dumps({"command": "wc -l a.py"}, ensure_ascii=False))
        self.assertEqual(spans[7].output, "2 a.py\n")
        self.assertEqual(spans[10].kind, "span")
        self.assertEqual(spans[10].output, "`a.py` returns 2.")
        self.assertEqual(spans[0].kind, "span")
        self.assertTrue(spans[0].output)
        self.assertNotIn("thinkingSignature", spans[0].output or "")
        for span in spans:
            self.assertEqual(span.trace_id, trace_id)
            self.assertEqual(span.parent_id, parent)
            self.assertFalse(any(key.startswith("langfuse.") for key in span.attributes))
        ms = 1_000_000
        self.assertEqual(spans[0].start_time_unix_nano, 1792384899455 * ms)
        self.assertEqual(spans[0].end_time_unix_nano, (1792384899455 + 2571) * ms)
        self.assertEqual(spans[1].start_time_unix_nano, spans[0].start_time_unix_nano)
        self.assertEqual(spans[1].end_time_unix_nano, spans[0].end_time_unix_nano)
        self.assertEqual(spans[2].start_time_unix_nano, spans[0].end_time_unix_nano)
        self.assertEqual(spans[2].end_time_unix_nano, spans[2].start_time_unix_nano + 12 * ms)
        self.assertEqual(spans[7].start_time_unix_nano, spans[8].start_time_unix_nano)
        self.assertEqual(spans[7].end_time_unix_nano, spans[7].start_time_unix_nano + 7 * ms)
        self.assertEqual(spans[8].end_time_unix_nano, spans[8].start_time_unix_nano + 8 * ms)
        self.assertNotEqual(spans[0].start_time_unix_nano, start + ms)
        self.assertEqual(len(spans), 12)

    def test_span_times_use_event_clock_and_fall_back_to_steps(self) -> None:
        events = "\n".join(
            [
                json.dumps(
                    {
                        "type": "message_end",
                        "message": {
                            "role": "assistant",
                            "timestamp": 1_000,
                            "durationMs": 40,
                            "stopReason": "toolUse",
                            "content": [
                                {"type": "thinking", "thinking": "a"},
                                {"type": "text", "text": "b"},
                            ],
                            "usage": {"input": 1, "output": 1},
                        },
                    }
                ),
                json.dumps(
                    {
                        "type": "tool_execution_start",
                        "toolCallId": "t1",
                        "toolName": "read",
                        "args": {},
                    }
                ),
                json.dumps(
                    {
                        "type": "tool_execution_start",
                        "toolCallId": "t2",
                        "toolName": "bash",
                        "args": {},
                    }
                ),
                json.dumps(
                    {
                        "type": "tool_execution_end",
                        "toolCallId": "t1",
                        "toolName": "read",
                        "durationMs": 5,
                        "result": {"content": [{"type": "text", "text": "x"}]},
                    }
                ),
                json.dumps(
                    {
                        "type": "tool_execution_end",
                        "toolCallId": "t2",
                        "toolName": "bash",
                        "durationMs": 9,
                        "result": {"content": [{"type": "text", "text": "y"}]},
                    }
                ),
                json.dumps(
                    {
                        "type": "tool_execution_start",
                        "toolCallId": "t3",
                        "toolName": "grep",
                        "args": {},
                    }
                ),
                json.dumps(
                    {
                        "type": "tool_execution_end",
                        "toolCallId": "t3",
                        "toolName": "grep",
                        "durationMs": 3,
                        "result": {"content": [{"type": "text", "text": "z"}]},
                    }
                ),
                json.dumps(
                    {
                        "type": "message_end",
                        "message": {
                            "role": "assistant",
                            "stopReason": "stop",
                            "content": [{"type": "text", "text": "no time"}],
                        },
                    }
                ),
            ]
        )
        base = 5_000
        spans = spans_from_pi_jsonl(events, trace_id="c" * 32, parent_id="d" * 16, start_time_unix_nano=base)
        ms = 1_000_000
        self.assertEqual(
            [span.name for span in spans],
            ["reasoning", "agent_message", "generation", "read", "bash", "grep", "agent_message", "generation"],
        )
        for span in spans[:3]:
            self.assertEqual(span.start_time_unix_nano, 1_000 * ms)
            self.assertEqual(span.end_time_unix_nano, 1_040 * ms)
        self.assertEqual(spans[3].start_time_unix_nano, 1_040 * ms)
        self.assertEqual(spans[3].end_time_unix_nano, 1_045 * ms)
        self.assertEqual(spans[4].start_time_unix_nano, 1_040 * ms)
        self.assertEqual(spans[4].end_time_unix_nano, 1_049 * ms)
        self.assertEqual(spans[5].start_time_unix_nano, 1_049 * ms)
        self.assertEqual(spans[5].end_time_unix_nano, 1_052 * ms)
        self.assertEqual(spans[6].start_time_unix_nano, base + 7 * ms)
        self.assertEqual(spans[6].end_time_unix_nano, base + 8 * ms)
        self.assertEqual(spans[7].start_time_unix_nano, base + 8 * ms)
        self.assertEqual(spans[7].end_time_unix_nano, base + 9 * ms)

    def test_error_fixture_marks_generation_status(self) -> None:
        events = Path(__file__).parent.joinpath("fixtures", "pi_error.jsonl").read_text(encoding="utf-8")
        spans = spans_from_pi_jsonl(events, trace_id="c" * 32, parent_id="d" * 16, start_time_unix_nano=0)
        self.assertEqual([span.kind for span in spans], ["generation"])
        self.assertEqual(spans[0].status, "error")
        self.assertEqual(spans[0].attributes["stopReason"], "error")
        self.assertEqual(spans[0].attributes["errorMessage"], "401 authentication_error: invalid api key")
        assert spans[0].usage is not None
        self.assertEqual(spans[0].usage.input_tokens, 0)
        self.assertIsNone(spans[0].usage.reasoning_tokens)

    def test_tool_error_unknown_events_and_span_cap(self) -> None:
        lines = [
            "not-json",
            "{",
            json.dumps({"type": "message_update", "delta": "x"}),
            json.dumps({"type": "tool_execution_update", "toolCallId": "1"}),
            json.dumps({"type": "auto_retry_start"}),
            json.dumps({"type": "compaction_end"}),
            json.dumps(
                {
                    "type": "tool_execution_start",
                    "toolCallId": "1",
                    "toolName": "bash",
                    "args": {"command": "false"},
                }
            ),
            json.dumps(
                {
                    "type": "tool_execution_end",
                    "toolCallId": "1",
                    "toolName": "bash",
                    "isError": True,
                    "result": {"content": [{"type": "text", "text": "boom"}]},
                }
            ),
        ]
        for index in range(45):
            lines.append(
                json.dumps(
                    {
                        "type": "tool_execution_end",
                        "toolCallId": f"extra-{index}",
                        "toolName": "read",
                        "isError": False,
                        "result": {"content": [{"type": "text", "text": str(index)}]},
                    }
                )
            )
        spans = spans_from_pi_jsonl("\n".join(lines), trace_id="c" * 32, parent_id="d" * 16, start_time_unix_nano=0)
        self.assertEqual(len(spans), 40)
        self.assertEqual(spans[0].status, "error")
        self.assertEqual(spans[0].output, "boom")
        self.assertEqual(spans[0].input, json.dumps({"command": "false"}, ensure_ascii=False))


class ExporterTests(unittest.TestCase):
    def test_missing_env_is_noop_and_does_not_post(self) -> None:
        capture = _Capture()
        for env in (
            {},
            {"LANGFUSE_HOST": "https://langfuse.example"},
            {"LANGFUSE_PUBLIC_KEY": "pk", "LANGFUSE_SECRET_KEY": "sk"},
            {"LANGFUSE_BASE_URL": "https://langfuse.example", "LANGFUSE_PUBLIC_KEY": "pk"},
        ):
            with self.subTest(env=sorted(env)):
                exporter = exporter_from_env(env, opener=capture)
                result = exporter.export(_retrieval_like_trace(_events(), sample_id="s1", score="1.0"))
                self.assertEqual(result.status, "skipped")
                self.assertIsNone(result.error)
        self.assertEqual(capture.requests, [])

    def test_posts_otlp_json_with_basic_auth(self) -> None:
        capture = _Capture()
        exporter = exporter_from_env(
            {
                "LANGFUSE_HOST": "https://langfuse.example/",
                "LANGFUSE_BASE_URL": "https://other.example",
                "LANGFUSE_PUBLIC_KEY": "pk-test",
                "LANGFUSE_SECRET_KEY": "sk-test",
            },
            opener=capture,
        )
        trace = _retrieval_like_trace(_events(), sample_id="s1", score="1.0")
        self.assertFalse(any(key.startswith("langfuse.") for key in trace.metadata))
        result = exporter.export(trace)
        self.assertEqual(result.status, "sent")
        self.assertEqual(len(capture.requests), 1)
        request = capture.requests[0]
        self.assertEqual(request.full_url, "https://langfuse.example/api/public/otel/v1/traces")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Content-type"), "application/json")
        self.assertEqual(request.get_header("User-agent"), USER_AGENT)
        self.assertEqual(USER_AGENT, "edges-observation/1")
        self.assertNotIn("Python-urllib", request.get_header("User-agent"))
        expected_auth = "Basic " + base64.b64encode(b"pk-test:sk-test").decode("ascii")
        self.assertEqual(request.get_header("Authorization"), expected_auth)
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(
            payload["resourceSpans"][0]["resource"]["attributes"][0]["value"]["stringValue"],
            "edges-retrieval-eval",
        )
        self.assertEqual(payload["resourceSpans"][0]["scopeSpans"][0]["scope"]["name"], "edges-retrieval-eval")
        spans = _span_attributes(payload)
        self.assertGreaterEqual(len(spans), 4)
        self.assertTrue(all(len(span["traceId"]) == 32 for span in spans))
        self.assertEqual(len({span["traceId"] for span in spans}), 1)
        root = spans[0]
        self.assertIsNone(root["parentSpanId"])
        for child in spans[1:]:
            self.assertEqual(child["parentSpanId"], root["spanId"])
        joined = json.dumps(payload, ensure_ascii=False)
        self.assertIn("rg CONTEXT", joined)
        self.assertIn("先看 CONTEXT", joined)
        self.assertIn("agent_message", joined)
        self.assertIn("cell-1", joined)
        self.assertNotIn("sk-test", joined)
        self.assertNotIn("pk-test", joined)
        turn = next(span for span in spans if span["name"] == "turn.completed")
        usage = json.loads(turn["langfuse.observation.usage_details"])
        self.assertEqual(usage["input"], 7)
        self.assertEqual(usage["output"], 3)
        self.assertEqual(usage["input_cached_tokens"], 4)
        self.assertEqual(usage["reasoning_output_tokens"], 1)
        self.assertEqual(usage["input"] + usage["input_cached_tokens"] + usage["output"], 14)
        self.assertEqual(turn["gen_ai.usage.input_tokens"], "11")
        self.assertEqual(turn["gen_ai.usage.output_tokens"], "3")
        self.assertEqual(turn["langfuse.observation.type"], "generation")
        self.assertNotIn("gen_ai.request.model", turn)
        tool = next(span for span in spans if span["name"] == "rg CONTEXT")
        self.assertEqual(tool["langfuse.observation.type"], "tool")
        self.assertEqual(tool["langfuse.observation.input"], "rg CONTEXT")
        reasoning = next(span for span in spans if span["name"] == "reasoning")
        self.assertEqual(reasoning["langfuse.observation.output"], "先看 CONTEXT")
        self.assertNotIn("langfuse.trace.metadata.reasoning_effort", reasoning)
        self.assertEqual(root["langfuse.trace.metadata.reasoning_summary"], "detailed")
        self.assertEqual(root["langfuse.trace.metadata.reasoning_effort"], "high")
        self.assertEqual(root["langfuse.trace.metadata.show_raw_reasoning"], "true")
        self.assertEqual(root["langfuse.trace.metadata.score"], "1.0")
        self.assertNotIn("langfuse.trace.metadata.score", tool)
        self.assertEqual(root["langfuse.observation.input"], "问题")
        self.assertEqual(root["langfuse.observation.output"], '["a"]')

    def test_session_and_metadata_are_on_every_span(self) -> None:
        events = (
            json.dumps({"type": "thread.started", "model": "gpt-5.4", "cli_version": "0.98.0"})
            + "\n"
            + _events()
        )
        capture = _Capture()
        exporter = exporter_from_env(
            {
                "LANGFUSE_HOST": "https://langfuse.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=capture,
        )
        session_id = "retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/ab12"
        for sample_id, score in (("s1", "1.0"), ("s2", "0.0")):
            result = exporter.export(_retrieval_like_trace(events, sample_id=sample_id, score=score))
            self.assertEqual(result.status, "sent")
        payloads = [json.loads(request.data.decode("utf-8")) for request in capture.requests]
        trace_ids = set()
        for payload, sample_id, score in zip(payloads, ("s1", "s2"), ("1.0", "0.0")):
            spans = _span_attributes(payload)
            self.assertGreaterEqual(len(spans), 2)
            for span in spans:
                trace_ids.add(span["traceId"])
                self.assertEqual(span["langfuse.session.id"], session_id)
                self.assertEqual(span["session.id"], session_id)
                self.assertEqual(span["langfuse.trace.name"], f"retrieval-eval {sample_id}")
                self.assertEqual(span["langfuse.user.id"], "codex")
                self.assertEqual(span["langfuse.trace.metadata.cell_id"], "cell-1")
                self.assertEqual(span["langfuse.trace.metadata.sample_id"], sample_id)
                self.assertEqual(span["langfuse.trace.metadata.client_id"], "codex")
                self.assertEqual(span["langfuse.trace.metadata.repository_id"], "edges")
                self.assertEqual(span["langfuse.trace.metadata.repository_url"], "https://github.com/VirusPC/edges.git")
                self.assertEqual(span["langfuse.trace.metadata.repository_ref"], "main")
                self.assertEqual(span["langfuse.trace.metadata.repository_commit"], "abc")
                self.assertEqual(span["langfuse.trace.metadata.model"], "gpt-5.4")
                self.assertEqual(span["langfuse.trace.metadata.codex_version"], "0.98.0")
            self.assertEqual(spans[0]["langfuse.trace.metadata.score"], score)
            child = next(span for span in spans if span["name"] == "rg CONTEXT")
            self.assertNotIn("langfuse.trace.metadata.score", child)
        self.assertEqual(len(trace_ids), 2)

    def test_base_url_alias_when_host_missing(self) -> None:
        capture = _Capture()
        exporter = exporter_from_env(
            {
                "LANGFUSE_HOST": "  ",
                "LANGFUSE_BASE_URL": "https://alias.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=capture,
        )
        result = exporter.export(smoke_trace())
        self.assertEqual(result.status, "sent")
        self.assertEqual(capture.requests[0].full_url, "https://alias.example/api/public/otel/v1/traces")

    def test_bad_response_does_not_raise_or_print(self) -> None:
        env = {
            "LANGFUSE_HOST": "https://langfuse.example",
            "LANGFUSE_PUBLIC_KEY": "pk",
            "LANGFUSE_SECRET_KEY": "sk",
        }
        stderr = io.StringIO()
        real_stderr = sys.stderr
        try:
            sys.stderr = stderr
            failed = exporter_from_env(env, opener=_Capture(status=503)).export(smoke_trace())
            timed_out = exporter_from_env(env, opener=_Capture(error=TimeoutError("slow"))).export(smoke_trace())
        finally:
            sys.stderr = real_stderr
        self.assertEqual(failed.status, "failed")
        self.assertEqual(failed.error, "HTTP 503")
        self.assertEqual(timed_out.status, "failed")
        self.assertEqual(timed_out.error, "TimeoutError")
        self.assertEqual(stderr.getvalue(), "")

    def test_usage_details_subtract_cache_and_keep_genai_input(self) -> None:
        trace = Trace(
            name="usage",
            spans=[
                Span(
                    trace_id="c" * 32,
                    span_id="d" * 16,
                    name="generation",
                    start_time_unix_nano=1,
                    end_time_unix_nano=2,
                    kind="generation",
                    usage=Usage(
                        input_tokens=13839,
                        output_tokens=701,
                        cached_input_tokens=13056,
                        reasoning_tokens=10,
                        cost=0.5,
                    ),
                )
            ],
        )
        capture = _Capture()
        exporter_from_env(
            {
                "LANGFUSE_HOST": "https://langfuse.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=capture,
        ).export(trace)
        span = _span_attributes(json.loads(capture.requests[0].data.decode("utf-8")))[0]
        usage = json.loads(span["langfuse.observation.usage_details"])
        self.assertEqual(usage["input"], 783)
        self.assertEqual(usage["output"], 701)
        self.assertEqual(usage["input_cached_tokens"], 13056)
        self.assertEqual(usage["reasoning_output_tokens"], 10)
        self.assertEqual(usage["input"] + usage["input_cached_tokens"] + usage["output"], 14540)
        self.assertEqual(span["gen_ai.usage.input_tokens"], "13839")
        self.assertEqual(json.loads(span["langfuse.observation.cost_details"]), {"total": 0.5})

        floor = Trace(
            name="floor",
            spans=[
                Span(
                    trace_id="e" * 32,
                    span_id="f" * 16,
                    name="generation",
                    start_time_unix_nano=1,
                    end_time_unix_nano=2,
                    kind="generation",
                    usage=Usage(input_tokens=3, cached_input_tokens=10),
                )
            ],
        )
        capture = _Capture()
        exporter_from_env(
            {
                "LANGFUSE_HOST": "https://langfuse.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=capture,
        ).export(floor)
        span = _span_attributes(json.loads(capture.requests[0].data.decode("utf-8")))[0]
        usage = json.loads(span["langfuse.observation.usage_details"])
        self.assertEqual(usage["input"], 0)
        self.assertEqual(usage["input_cached_tokens"], 10)
        self.assertEqual(span["gen_ai.usage.input_tokens"], "3")
        self.assertNotIn("langfuse.observation.cost_details", span)

    def test_status_and_long_attribute_are_mapped(self) -> None:
        trace = Trace(
            name="named",
            service_name="svc",
            spans=[
                Span(
                    trace_id="c" * 32,
                    span_id="d" * 16,
                    name="root",
                    start_time_unix_nano=1,
                    end_time_unix_nano=2,
                    status="error",
                    attributes={"note": "x" * 8001},
                    kind="span",
                    usage=Usage(model="gpt-5.4", input_tokens=2),
                )
            ],
        )
        capture = _Capture()
        result = exporter_from_env(
            {
                "LANGFUSE_HOST": "https://langfuse.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=capture,
        ).export(trace)
        self.assertEqual(result.status, "sent")
        payload = json.loads(capture.requests[0].data.decode("utf-8"))
        span = payload["resourceSpans"][0]["scopeSpans"][0]["spans"][0]
        self.assertEqual(span["status"], {"code": 2})
        attrs = {item["key"]: item["value"] for item in span["attributes"]}
        self.assertTrue(attrs["langfuse.trace.metadata.note"]["stringValue"].endswith("…[truncated]"))
        self.assertEqual(attrs["gen_ai.request.model"]["stringValue"], "gpt-5.4")
        self.assertLessEqual(len(attrs["langfuse.trace.metadata.note"]["stringValue"]), 8000 + len("…[truncated]"))

    def test_smoke_trace_is_one_root_span(self) -> None:
        capture = _Capture()
        trace = smoke_trace()
        result = exporter_from_env(
            {
                "LANGFUSE_HOST": "https://langfuse.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=capture,
        ).export(trace)
        self.assertEqual(result.status, "sent")
        payload = json.loads(capture.requests[0].data.decode("utf-8"))
        spans = _span_attributes(payload)
        self.assertEqual(len(spans), 1)
        self.assertEqual(spans[0]["name"], "edges-langfuse-smoke")
        self.assertEqual(spans[0]["langfuse.trace.name"], "edges-langfuse-smoke")
        self.assertNotIn("langfuse.session.id", spans[0])
        self.assertEqual(
            payload["resourceSpans"][0]["resource"]["attributes"][0]["value"]["stringValue"],
            "edges-langfuse-smoke",
        )
        self.assertEqual(trace.trace_id, spans[0]["traceId"])


if __name__ == "__main__":
    unittest.main()
