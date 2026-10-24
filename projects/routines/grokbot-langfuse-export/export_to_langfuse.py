#!/usr/bin/env python3
"""Export Grok Bot assistant turns to self-hosted Langfuse via OTLP/HTTP.

This box's Langfuse runs with LANGFUSE_MIGRATION_V4_WRITE_MODE=events_only, so the
legacy POST /api/public/ingestion rejects trace-create/span-create. Writes go to
POST /api/public/otel/v1/traces (public OTLP API) with x-langfuse-ingestion-version: 4.

Primary input for the hourly routine: staging JSONL produced from ReadTranscript
(same shape as /workspace/daily-scan/YYYY-MM-DD/<bot display name>.jsonl).
Fallback for ad-hoc tests: --daily-scan. Raw agent-transcripts under
/home/box/agent-data/agent-transcripts lack per-message timestamps and are NOT
sufficient alone for minute-precision timelines.

Cursor file is box-local only; never commit it.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator, Optional

DEFAULT_HOST = "https://langfuse.viruspc.tech"
DEFAULT_AGENTS_DIR = "/home/box/agent-data/agents"
DEFAULT_CURSOR = "/home/box/agent-data/langfuse/grokbot-export-cursors.json"
DEFAULT_DAILY_SCAN = "/workspace/daily-scan"
DEFAULT_STAGING = "/workspace/langfuse-export-staging"
SESSION_GAP = timedelta(hours=3)
TAGS_BASE = ("agent:grok-bot", "device:grokbot")
USER_ID = "peng-cheng"

TS_TAG_RE = re.compile(r"<timestamp>(.*?)</timestamp>", re.DOTALL | re.IGNORECASE)
USER_QUERY_RE = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.DOTALL | re.IGNORECASE)
HIDDEN_LINE_RE = re.compile(
    r"^\[(?:SAND_HIDDEN_PROMPT|GROK_BOT_HIDDEN_PROMPT)[^\]]*\][^\n]*\n?",
    re.MULTILINE,
)


def log(msg: str) -> None:
    print(msg, file=sys.stderr)


def minute_iso(dt: datetime) -> str:
    """Floor to minute; emit Zulu ISO without inventing sub-minute precision."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc).replace(second=0, microsecond=0)
    return dt.strftime("%Y-%m-%dT%H:%M:00.000Z")


def minute_unix_nano(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc).replace(second=0, microsecond=0)
    return str(int(dt.timestamp() * 1_000_000_000))


def parse_ts_tag(raw: str) -> Optional[datetime]:
    """Parse '<timestamp>Thursday, Oct 22, 2026, 10:07 AM (UTC+8)</timestamp>'."""
    m = TS_TAG_RE.search(raw or "")
    if not m:
        return None
    s = m.group(1).strip()
    # Drop weekday prefix
    parts = s.split(", ", 1)
    if len(parts) == 2 and parts[0] in {
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    }:
        s = parts[1]
    # Expect: Oct 22, 2026, 10:07 AM (UTC+8)
    m2 = re.match(
        r"^([A-Za-z]{3}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2})\s*(AM|PM)\s*\(([^)]+)\)\s*$",
        s,
    )
    if not m2:
        return None
    mon, day, year, hour, minute, ampm, tzlabel = m2.groups()
    months = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
        "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
    }
    month = months.get(mon)
    if not month:
        return None
    h = int(hour) % 12
    if ampm.upper() == "PM":
        h += 12
    # Only UTC+8 / Asia/Shanghai expected on this box
    offset = timezone(timedelta(hours=8))
    if "UTC+8" not in tzlabel and "Asia/Shanghai" not in tzlabel and "CST" not in tzlabel:
        # still assume +8 for Grok Bot box timestamps
        pass
    return datetime(int(year), month, int(day), h, int(minute), tzinfo=offset)


def parse_underscore_ts(value: Any) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    # "2026-10-22T10:07:00" — treat as Asia/Shanghai wall time (minute precision)
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone(timedelta(hours=8)))
        return dt
    except ValueError:
        return None


def extract_text_parts(message: dict) -> list[dict]:
    content = (message or {}).get("content")
    if isinstance(content, str):
        return [{"type": "text", "text": content}]
    if isinstance(content, list):
        return [p for p in content if isinstance(p, dict)]
    return []


def visible_user_text(raw: str) -> str:
    m = USER_QUERY_RE.search(raw or "")
    body = m.group(1) if m else (raw or "")
    body = TS_TAG_RE.sub("", body)
    body = HIDDEN_LINE_RE.sub("", body)
    # Drop leading hidden-prompt blocks that wrap the whole message
    if body.lstrip().startswith("[SAND_HIDDEN_PROMPT]") or body.lstrip().startswith(
        "[GROK_BOT_HIDDEN_PROMPT]"
    ):
        # keep a short marker so the turn is still visible, but strip bulk system cue
        first_nl = body.find("\n")
        if first_nl > 0:
            rest = body[first_nl + 1 :].strip()
            if rest:
                body = rest
    return body.strip()


def visible_assistant_text(parts: list[dict]) -> str:
    chunks = []
    for p in parts:
        if p.get("type") == "text" and p.get("text"):
            chunks.append(str(p["text"]))
        # intentionally skip thinking / reasoning
    return "\n".join(chunks).strip()


def tool_names_from_parts(parts: list[dict]) -> list[str]:
    names: list[str] = []
    for p in parts:
        if p.get("type") == "tool_use" and p.get("name"):
            names.append(str(p["name"]))
        elif p.get("type") == "tool_result" and p.get("name"):
            # name only; no args/results
            names.append(str(p["name"]))
    return names


def stable_hex(s: str, n: int) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:n]


def stable_trace_id(bot_id: str, turn_pos: int) -> str:
    return stable_hex(f"grokbot-trace:{bot_id}:{turn_pos}", 32)


def stable_span_id(bot_id: str, turn_pos: int) -> str:
    return stable_hex(f"grokbot-span:{bot_id}:{turn_pos}", 16)


def first_msg_stable_id(bot_id: str, turn_pos: int, user_text: str, ts: datetime) -> str:
    return stable_hex(
        f"grokbot-first:{bot_id}:{turn_pos}:{minute_iso(ts)}:{user_text[:200]}", 16
    )


@dataclass
class Agent:
    bot_id: str
    display_name: str


@dataclass
class Turn:
    bot_id: str
    display_name: str
    turn_pos: int  # 0-based among user turns for this bot (chronological)
    user_ts: datetime
    user_text: str
    assistant_text: str
    tool_names: list[str] = field(default_factory=list)


def load_agents(agents_dir: Path) -> list[Agent]:
    agents: list[Agent] = []
    if not agents_dir.is_dir():
        return agents
    for child in sorted(agents_dir.iterdir()):
        pf = child / "profile.json"
        if not pf.is_file():
            continue
        try:
            data = json.loads(pf.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        name = data.get("name") or child.name
        agents.append(Agent(bot_id=child.name, display_name=str(name)))
    return agents


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def messages_to_turns(
    bot_id: str, display_name: str, rows: list[dict]
) -> list[Turn]:
    """Split transcript rows into user→assistant turns."""
    # Group: each user message starts a turn; collect following until next user.
    turns: list[Turn] = []
    i = 0
    turn_pos = 0
    while i < len(rows):
        row = rows[i]
        if row.get("role") != "user":
            i += 1
            continue
        parts = extract_text_parts(row.get("message") or {})
        raw = "\n".join(p.get("text", "") for p in parts if p.get("type") == "text")
        ts = parse_ts_tag(raw) or parse_underscore_ts(row.get("_ts"))
        if ts is None:
            # Skip user rows without usable minute timestamp — cannot invent seconds.
            i += 1
            continue
        user_text = visible_user_text(raw)
        i += 1
        asst_chunks: list[str] = []
        tools: list[str] = []
        while i < len(rows) and rows[i].get("role") != "user":
            r = rows[i]
            role = r.get("role")
            p2 = extract_text_parts(r.get("message") or {})
            if role == "assistant":
                t = visible_assistant_text(p2)
                if t:
                    asst_chunks.append(t)
                tools.extend(tool_names_from_parts(p2))
            elif role == "tool":
                tools.extend(tool_names_from_parts(p2))
            i += 1
        # dedupe tool names preserving order
        seen = set()
        tool_names = []
        for n in tools:
            if n not in seen:
                seen.add(n)
                tool_names.append(n)
        turns.append(
            Turn(
                bot_id=bot_id,
                display_name=display_name,
                turn_pos=turn_pos,
                user_ts=ts,
                user_text=user_text,
                assistant_text="\n".join(asst_chunks).strip(),
                tool_names=tool_names,
            )
        )
        turn_pos += 1
    return turns


def assign_sessions(turns: list[Turn]) -> dict[int, str]:
    """Map turn_pos -> sessionId. Gap >3h from previous user-message => new session."""
    sessions: dict[int, str] = {}
    if not turns:
        return sessions
    session_first_pos = turns[0].turn_pos
    session_first_id = first_msg_stable_id(
        turns[0].bot_id, turns[0].turn_pos, turns[0].user_text, turns[0].user_ts
    )
    prev_ts = turns[0].user_ts
    for t in turns:
        if t.turn_pos != session_first_pos and (t.user_ts - prev_ts) > SESSION_GAP:
            session_first_pos = t.turn_pos
            session_first_id = first_msg_stable_id(
                t.bot_id, t.turn_pos, t.user_text, t.user_ts
            )
        sessions[t.turn_pos] = f"grokbot:{t.bot_id}:{session_first_id}"
        prev_ts = t.user_ts
    return sessions


def load_cursor(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {"bots": {}, "initialized_at": None}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"bots": {}, "initialized_at": None}


def save_cursor(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def collect_from_daily_scan(
    daily_scan: Path, agents: list[Agent], since: Optional[datetime]
) -> dict[str, list[Turn]]:
    by_name = {a.display_name: a for a in agents}
    # Also allow "Name-2" style duplicates from same-day re-runs
    out: dict[str, list[Turn]] = {a.bot_id: [] for a in agents}
    if not daily_scan.is_dir():
        return out
    day_dirs = sorted(
        [p for p in daily_scan.iterdir() if p.is_dir()],
        key=lambda p: p.name,
    )
    for day in day_dirs:
        for path in sorted(day.glob("*.jsonl")):
            stem = path.stem
            base = re.sub(r"-\d+$", "", stem)
            agent = by_name.get(stem) or by_name.get(base)
            if not agent:
                continue
            rows = load_jsonl(path)
            turns = messages_to_turns(agent.bot_id, agent.display_name, rows)
            out.setdefault(agent.bot_id, []).extend(turns)
    # Merge + sort + re-number turn_pos globally per bot
    for bot_id, turns in list(out.items()):
        turns.sort(key=lambda t: (t.user_ts, t.turn_pos))
        # Deduplicate identical (ts, user_text) from overlapping day files
        deduped: list[Turn] = []
        seen_keys = set()
        for t in turns:
            key = (minute_iso(t.user_ts), t.user_text[:500])
            if key in seen_keys:
                continue
            seen_keys.add(key)
            deduped.append(t)
        if since is not None:
            deduped = [t for t in deduped if t.user_ts >= since]
        for i, t in enumerate(deduped):
            t.turn_pos = i
        out[bot_id] = deduped
    return out


def collect_from_staging(
    staging: Path, agents: list[Agent], since: Optional[datetime]
) -> dict[str, list[Turn]]:
    """Staging files: <botId>.jsonl or <display name>.jsonl."""
    by_id = {a.bot_id: a for a in agents}
    by_name = {a.display_name: a for a in agents}
    out: dict[str, list[Turn]] = {}
    if not staging.is_dir():
        return out
    files = list(staging.glob("*.jsonl"))
    # Also accept YYYY-MM-DD/<name>.jsonl
    files += list(staging.glob("*/*.jsonl"))
    for path in sorted(files):
        stem = path.stem
        base = re.sub(r"-\d+$", "", stem)
        agent = by_id.get(stem) or by_name.get(stem) or by_name.get(base)
        if not agent:
            continue
        rows = load_jsonl(path)
        turns = messages_to_turns(agent.bot_id, agent.display_name, rows)
        out.setdefault(agent.bot_id, []).extend(turns)
    for bot_id, turns in list(out.items()):
        turns.sort(key=lambda t: (t.user_ts, t.turn_pos))
        if since is not None:
            turns = [t for t in turns if t.user_ts >= since]
        for i, t in enumerate(turns):
            t.turn_pos = i
        out[bot_id] = turns
    return out


def build_otlp_span(turn: Turn, session_id: str) -> dict:
    tid = stable_trace_id(turn.bot_id, turn.turn_pos)
    sid = stable_span_id(turn.bot_id, turn.turn_pos)
    start_nano = minute_unix_nano(turn.user_ts)
    tags = list(TAGS_BASE) + [f"bot:{turn.display_name}"]
    inp = {"role": "user", "content": turn.user_text}
    out = {"role": "assistant", "content": turn.assistant_text}
    attrs = [
        {"key": "langfuse.trace.name", "value": {"stringValue": "grokbot-turn"}},
        # SDK canonical keys (also accept langfuse.session.id / langfuse.user.id)
        {"key": "session.id", "value": {"stringValue": session_id}},
        {"key": "user.id", "value": {"stringValue": USER_ID}},
        {
            "key": "langfuse.trace.tags",
            "value": {
                "arrayValue": {
                    "values": [{"stringValue": t} for t in tags]
                }
            },
        },
        {"key": "langfuse.observation.type", "value": {"stringValue": "span"}},
        {
            "key": "langfuse.observation.input",
            "value": {"stringValue": json.dumps(inp, ensure_ascii=False)},
        },
        {
            "key": "langfuse.observation.output",
            "value": {"stringValue": json.dumps(out, ensure_ascii=False)},
        },
        {
            "key": "langfuse.trace.metadata.time_precision",
            "value": {"stringValue": "minute"},
        },
        {
            "key": "langfuse.observation.metadata.time_precision",
            "value": {"stringValue": "minute"},
        },
        {
            "key": "langfuse.trace.metadata.bot_id",
            "value": {"stringValue": turn.bot_id},
        },
        {
            "key": "langfuse.trace.metadata.bot_name",
            "value": {"stringValue": turn.display_name},
        },
        {
            "key": "langfuse.trace.metadata.turn_pos",
            "value": {"stringValue": str(turn.turn_pos)},
        },
        {
            "key": "langfuse.observation.metadata.tools",
            "value": {"stringValue": ",".join(turn.tool_names)},
        },
        {
            "key": "langfuse.trace.metadata.export_source",
            "value": {"stringValue": "grokbot-langfuse-export"},
        },
    ]
    return {
        "traceId": tid,
        "spanId": sid,
        "name": f"grokbot-turn:{turn.display_name}",
        "kind": 1,
        "startTimeUnixNano": start_nano,
        "endTimeUnixNano": start_nano,
        "attributes": attrs,
        "status": {"code": 1},
    }


def post_otlp_batch(
    host: str,
    public_key: str,
    secret_key: str,
    spans: list[dict],
) -> tuple[bool, str]:
    if not spans:
        return True, "empty"
    payload = {
        "resourceSpans": [
            {
                "resource": {
                    "attributes": [
                        {
                            "key": "service.name",
                            "value": {"stringValue": "grok-bot-export"},
                        }
                    ]
                },
                "scopeSpans": [
                    {
                        "scope": {
                            "name": "grokbot-langfuse-export",
                            "version": "0.1.0",
                        },
                        "spans": spans,
                    }
                ],
            }
        ]
    }
    auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    url = host.rstrip("/") + "/api/public/otel/v1/traces"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "x-langfuse-ingestion-version": "4",
            "User-Agent": "grokbot-langfuse-export/0.1",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return 200 <= resp.status < 300, f"HTTP {resp.status}: {body[:300]}"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return False, f"HTTP {e.code}: {body[:500]}"
    except Exception as e:  # noqa: BLE001
        return False, f"{type(e).__name__}: {e}"


def chunked(items: list[Any], size: int) -> Iterator[list[Any]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def main(argv: Optional[list[str]] = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--source",
        choices=("staging", "daily-scan"),
        default="staging",
        help="Where to read transcript JSONL (default: staging).",
    )
    p.add_argument("--staging-dir", default=DEFAULT_STAGING)
    p.add_argument("--daily-scan", default=DEFAULT_DAILY_SCAN)
    p.add_argument("--agents-dir", default=DEFAULT_AGENTS_DIR)
    p.add_argument("--cursor-file", default=DEFAULT_CURSOR)
    p.add_argument(
        "--host",
        default=os.environ.get("LANGFUSE_HOST")
        or os.environ.get("LANGFUSE_BASE_URL")
        or DEFAULT_HOST,
    )
    p.add_argument("--public-key", default=os.environ.get("LANGFUSE_PUBLIC_KEY", ""))
    p.add_argument("--secret-key", default=os.environ.get("LANGFUSE_SECRET_KEY", ""))
    p.add_argument(
        "--backfill-hours",
        type=int,
        default=24,
        help="On first run (no cursor), only export turns within this many hours.",
    )
    p.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="OTLP spans per HTTP request.",
    )
    p.add_argument("--dry-run", action="store_true")
    p.add_argument(
        "--bot",
        action="append",
        default=[],
        help="Limit to display name or bot id (repeatable).",
    )
    p.add_argument(
        "--max-turns",
        type=int,
        default=0,
        help="Cap turns written this run (0 = no cap). Useful for smoke tests.",
    )
    p.add_argument(
        "--force-reexport",
        action="store_true",
        help="Ignore cursor positions (still respects --backfill-hours if cursor empty logic skipped).",
    )
    args = p.parse_args(argv)

    agents = load_agents(Path(args.agents_dir))
    if not agents:
        log(f"ERROR: no agents found under {args.agents_dir}")
        return 2
    if args.bot:
        wanted = set(args.bot)
        agents = [
            a
            for a in agents
            if a.bot_id in wanted or a.display_name in wanted
        ]
        if not agents:
            log("ERROR: --bot filter matched nobody")
            return 2

    cursor = load_cursor(Path(args.cursor_file))
    bots_cursor: dict[str, Any] = cursor.setdefault("bots", {})

    now = datetime.now(timezone(timedelta(hours=8)))
    # Collect full timelines first; apply per-bot backfill when that bot has never been exported.
    if args.source == "daily-scan":
        by_bot = collect_from_daily_scan(Path(args.daily_scan), agents, since=None)
    else:
        by_bot = collect_from_staging(Path(args.staging_dir), agents, since=None)

    backfill_since = now - timedelta(hours=args.backfill_hours)
    log(f"per-bot backfill floor (first export only): {backfill_since.isoformat()} ({args.backfill_hours}h)")

    if not args.public_key or not args.secret_key:
        if not args.dry_run:
            log("ERROR: LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY required (or --dry-run)")
            return 2

    summary = {
        "bots_seen": 0,
        "turns_candidates": 0,
        "turns_written": 0,
        "turns_skipped_cursor": 0,
        "failures": [],
        "dry_run": args.dry_run,
        "host": args.host,
        "source": args.source,
    }

    written_this_run = 0
    for agent in agents:
        full_turns = by_bot.get(agent.bot_id) or []
        if not full_turns:
            continue
        summary["bots_seen"] += 1
        state = bots_cursor.get(agent.bot_id) or {}
        bot_never_exported = "next_turn_pos" not in state
        # Stable turn_pos comes from the full chronological timeline so hashed
        # trace ids stay stable across runs. First export for a bot (or
        # --force-reexport) only *selects* turns inside the backfill window.
        if bot_never_exported or args.force_reexport:
            turns = [t for t in full_turns if t.user_ts >= backfill_since]
            log(
                f"{agent.display_name}: first-export backfill "
                f"{len(full_turns)}->{len(turns)} turns since {backfill_since.isoformat()}"
            )
        else:
            turns = list(full_turns)
        sessions = assign_sessions(full_turns)
        next_pos = 0 if args.force_reexport else int(state.get("next_turn_pos", 0))
        pending = [t for t in turns if t.turn_pos >= next_pos]
        summary["turns_skipped_cursor"] += max(0, len([t for t in full_turns if t.turn_pos < next_pos]))
        if args.max_turns and written_this_run + len(pending) > args.max_turns:
            pending = pending[: max(0, args.max_turns - written_this_run)]
        summary["turns_candidates"] += len(pending)
        if not pending:
            continue

        log(
            f"{agent.display_name} ({agent.bot_id[:8]}…): "
            f"{len(full_turns)} turns total, {len(pending)} to export (from pos {next_pos})"
        )

        # Export in order; advance cursor only through contiguous successes.
        advanced_to = next_pos
        for batch in chunked(pending, args.batch_size):
            spans = [
                build_otlp_span(t, sessions[t.turn_pos]) for t in batch
            ]
            if args.dry_run:
                for t, sp in zip(batch, spans):
                    print(
                        json.dumps(
                            {
                                "dry_run": True,
                                "bot": agent.display_name,
                                "bot_id": agent.bot_id,
                                "turn_pos": t.turn_pos,
                                "traceId": sp["traceId"],
                                "sessionId": sessions[t.turn_pos],
                                "start": minute_iso(t.user_ts),
                                "tools": t.tool_names,
                                "user_preview": t.user_text[:120],
                                "assistant_preview": t.assistant_text[:120],
                            },
                            ensure_ascii=False,
                        )
                    )
                advanced_to = batch[-1].turn_pos + 1
                summary["turns_written"] += len(batch)
                written_this_run += len(batch)
                continue

            ok, detail = post_otlp_batch(
                args.host, args.public_key, args.secret_key, spans
            )
            if ok:
                advanced_to = batch[-1].turn_pos + 1
                summary["turns_written"] += len(batch)
                written_this_run += len(batch)
                log(f"  wrote {len(batch)} spans OK ({detail[:80]})")
            else:
                # Do not advance past the failed batch; leave for next hour.
                summary["failures"].append(
                    {
                        "bot_id": agent.bot_id,
                        "bot": agent.display_name,
                        "from_turn_pos": batch[0].turn_pos,
                        "error": detail,
                    }
                )
                log(f"  FAIL batch at pos {batch[0].turn_pos}: {detail}")
                break

        last_ts = state.get("last_user_ts")
        if advanced_to > next_pos:
            exported = [t for t in pending if t.turn_pos < advanced_to]
            if exported:
                last_ts = minute_iso(exported[-1].user_ts)
        bots_cursor[agent.bot_id] = {
            "display_name": agent.display_name,
            "next_turn_pos": advanced_to,
            "last_export_at": now.isoformat(),
            "last_user_ts": last_ts,
        }

    if cursor.get("initialized_at") is None:
        cursor["initialized_at"] = now.isoformat()
    cursor["bots"] = bots_cursor
    cursor["last_run_at"] = now.isoformat()
    cursor["last_summary"] = {
        k: summary[k]
        for k in (
            "bots_seen",
            "turns_candidates",
            "turns_written",
            "turns_skipped_cursor",
            "dry_run",
            "source",
            "host",
        )
    }
    if not args.dry_run:
        save_cursor(Path(args.cursor_file), cursor)
    else:
        log(f"dry-run: cursor NOT written ({args.cursor_file})")

    print(json.dumps({"summary": summary, "cursor_file": args.cursor_file}, ensure_ascii=False, indent=2))
    return 1 if summary["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
