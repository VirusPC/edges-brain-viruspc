"""Validate frozen, trace-backed three-arm memory QA datasets without an SDK."""
from __future__ import annotations

from collections import Counter
from datetime import datetime
import json
from pathlib import Path, PurePosixPath
import re


def timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamps must include timezone')
    return parsed


def safe_scope(value: str) -> None:
    if not isinstance(value, str) or not value or '\\' in value or '\x00' in value:
        raise ValueError('Invalid scope')
    p = PurePosixPath(value)
    if p.is_absolute() or '..' in p.parts or str(p) != value:
        raise ValueError('Scope must be a normalized relative path (or .)')


def validate_dataset(data: dict) -> dict:
    if data.get('schema_version') != 1:
        raise ValueError('Unsupported dataset schema')
    memories, cases = data.get('memories'), data.get('cases')
    if not isinstance(memories, list) or not memories or not isinstance(cases, list) or not cases:
        raise ValueError('Dataset needs nonempty memories and cases')
    ids = set()
    memory_times = {}
    for memory in memories:
        mid = memory['memory_id']
        if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]*', mid) or mid in ids:
            raise ValueError('Unsafe or duplicate memory ID')
        ids.add(mid)
        safe_scope(memory['scope'])
        memory_times[mid] = timestamp(memory['available_at'])
        for field in ('title', 'body'):
            if not isinstance(memory[field], str) or not memory[field].strip():
                raise ValueError('Memory requires title and body')
        if not memory.get('source'):
            raise ValueError('Memory provenance required')
    case_ids, observations, sessions, questions = set(), set(), {}, {}
    for case in cases:
        cid = case['case_id']
        if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]*', cid) or cid in case_ids:
            raise ValueError('Unsafe or duplicate case ID')
        case_ids.add(cid)
        safe_scope(case['scope'])
        query_time = timestamp(case['query_at'])
        gold = case['gold_memory_ids']
        if not isinstance(gold, list) or len(gold) != len(set(gold)) or not set(gold) <= ids:
            raise ValueError('Unknown or duplicate gold memory IDs')
        if any(memory_times[mid] >= query_time for mid in gold):
            raise ValueError('Gold memory is not strictly before query')
        if not isinstance(case['question'], str) or not case['question'].strip():
            raise ValueError('Question cannot be empty')
        for check in case.get('answer_checks', []):
            re.compile(check['pattern'])
        for pattern in case.get('forbidden_patterns', []):
            re.compile(pattern)
        split = case.get('split')
        if split not in ('dev', 'test'):
            raise ValueError('Explicit dev/test split required')
        source = case.get('source', {})
        if not source.get('session_id') or not source.get('trace_id'):
            raise ValueError('Source session and trace are required')
        sid = source['session_id']
        if sid in sessions and sessions[sid] != split:
            raise ValueError('A source session spans dev and test')
        sessions[sid] = split
        oid = (source['trace_id'], source.get('observation_id', cid))
        if oid in observations:
            raise ValueError('Duplicate source observation')
        observations.add(oid)
        normalized = re.sub(r'\s+', '', case['question']).lower()
        if normalized in questions:
            raise ValueError('Duplicate normalized query; retain only one case')
        questions[normalized] = split
    return {'memories': len(memories), 'cases': len(cases), 'sessions': len(sessions),
            'scopes': dict(Counter(m['scope'] for m in memories)),
            'splits': dict(Counter(c['split'] for c in cases)),
            'with_gold': sum(bool(c['gold_memory_ids']) for c in cases),
            'no_gold': sum(not c['gold_memory_ids'] for c in cases)}


def load_dataset(path: Path) -> dict:
    result = json.loads(path.read_text())
    validate_dataset(result)
    return result
