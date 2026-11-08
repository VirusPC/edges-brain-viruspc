"""Freeze historical memory files and mine real Langfuse prompts for annotation.

This does NOT auto-label gold answers. Explicit, reviewed annotations are required
by `assemble`. Raw exports and all generated datasets belong in private storage.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess

from export_langfuse import save


def git(repo: Path, *args: str) -> str:
    return subprocess.check_output(['git', '-C', str(repo), *args]).decode('utf-8')


def text_content(value) -> str:
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except ValueError:
            return value
        if isinstance(parsed, (dict, list)):
            return text_content(parsed)
        return value
    if isinstance(value, dict):
        return text_content(value.get('content', value.get('text', '')))
    if isinstance(value, list):
        return '\n'.join(text_content(part) for part in value)
    return ''


def explicit_non_user_role(value) -> bool:
    """Reject known non-user message wrappers; plain exporter text has no role."""
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            return False
    if isinstance(value, dict):
        return 'role' in value and value['role'] != 'user'
    if isinstance(value, list):
        return any(explicit_non_user_role(item) for item in value)
    return False


def freeze_memories(repos: list[str], cutoff: str, output: Path) -> dict:
    import yaml
    memories, snapshots = [], []
    for spec in repos:
        label, path = spec.split('=', 1)
        if not re.fullmatch('[a-z][a-z0-9_-]*', label):
            raise ValueError('Repository label must be a neutral path component')
        repo = Path(path).resolve()
        revision = git(repo, 'rev-list', '-1', '--before=' + cutoff, 'HEAD').strip()
        if not revision:
            raise ValueError('No historical revision at cutoff')
        files = git(repo, '-c', 'core.quotepath=false', 'ls-tree', '-r', '--name-only', revision).splitlines()
        selected = [p for p in files if re.search(r'(^|/)\.edges/memory/[^/]+/[^/]+/(?:INDEX|index)\.md$', p)]
        snapshots.append({'label': label, 'revision': revision, 'cutoff': cutoff, 'memory_files': len(selected)})
        for path in selected:
            raw = git(repo, 'show', revision + ':' + path)
            metadata = {}
            if raw.startswith('---\n'):
                parts = raw.split('---', 2)
                metadata = yaml.safe_load(parts[1]) or {}
                body = parts[2].strip()
            else:
                body = raw.strip()
            if not body:
                continue
            scope_path = path.split('.edges/memory/')[0].rstrip('/')
            scope = label + ('/' + scope_path if scope_path else '')
            title = ((metadata.get('metadata') or {}).get('edges-title')
                     or metadata.get('name') or PurePosixPath(path).parent.name)
            updated_at = git(repo, 'log', '-1', '--format=%cI', revision, '--', path).strip()
            memories.append({
                'memory_id': 'm-' + hashlib.sha256((label + '/' + path).encode()).hexdigest()[:12],
                'scope': scope, 'title': str(title), 'body': body, 'available_at': updated_at,
                'source': {'kind': 'git-memory', 'repository': label, 'revision': revision,
                           'path': path, 'original_sha256': hashlib.sha256(raw.encode()).hexdigest()},
            })
    result = {'schema_version': 1, 'cutoff': cutoff, 'snapshots': snapshots, 'memories': memories}
    save(output, result)
    return result


def mine(export_dir: Path, cutoff: str, output: Path) -> dict:
    manifest = json.loads((export_dir / 'manifest.json').read_text())
    if not manifest.get('complete'):
        raise ValueError('Incomplete Langfuse export')
    rows = []
    for page in manifest['pages']:
        data = (export_dir / page['file']).read_bytes()
        if hashlib.sha256(data).hexdigest() != page['sha256']:
            raise ValueError('Raw page checksum mismatch')
        rows.extend(json.loads(data)['data'])
    # Recompute from immutable pages instead of trusting a possibly interrupted
    # export's summary. All revisions of an ambiguous observation are excluded.
    duplicate_counts = Counter((r['traceId'], r['id']) for r in rows)
    duplicates = {key for key, count in duplicate_counts.items() if count > 1}
    rejected = Counter()
    candidates = []
    seen = set()
    for row in sorted(rows, key=lambda r: (r['startTime'], r['id'])):
        prompt = text_content(row.get('input')).strip()
        session = row.get('sessionId')
        reason = None
        if (row['traceId'], row['id']) in duplicates:
            reason = 'ambiguous-observation-revision'
        elif row.get('name') not in ('Grok Bot Turn', 'Codex Turn', 'Cursor Turn'):
            reason = 'not-supported-user-turn'
        elif datetime.fromisoformat(row['startTime'].replace('Z', '+00:00')) <= datetime.fromisoformat(cutoff.replace('Z', '+00:00')):
            reason = 'before-memory-freeze'
        elif not session:
            reason = 'missing-session'
        elif explicit_non_user_role(row.get('input')):
            reason = 'non-user-message-wrapper'
        elif not prompt or not text_content(row.get('output')).strip():
            reason = 'missing-io'
        elif 'Its Agent Store is readable' in prompt or 'AGENTS.md instructions for' in prompt or '<codex_internal_context' in prompt:
            reason = 'machine-context-or-forwarded-agent-result'
        elif not 8 <= len(prompt) <= 5000:
            reason = 'too-short-or-long'
        elif (session, re.sub(r'\s+', '', prompt)) in seen:
            reason = 'duplicate-prompt-within-session'
        if reason:
            rejected[reason] += 1
            continue
        seen.add((session, re.sub(r'\s+', '', prompt)))
        candidates.append({
            'candidate_id': row['id'], 'question_original': prompt,
            'historical_answer_for_annotation_only': text_content(row.get('output')),
            'query_at': row['startTime'],
            'source': {'kind': 'langfuse', 'trace_id': row['traceId'], 'observation_id': row['id'],
                       'session_id': session, 'environment': row.get('environment'),
                       'observation_name': row.get('name'), 'metadata': row.get('metadata', {})},
            # Deterministic split of whole source sessions, before annotations/results.
            'split': 'dev' if int(hashlib.sha256(session.encode()).hexdigest()[:8], 16) % 5 == 0 else 'test',
        })
    result = {'schema_version': 1, 'cutoff': cutoff, 'export_manifest_sha256': hashlib.sha256((export_dir / 'manifest.json').read_bytes()).hexdigest(),
              'source_rows': len(rows), 'exclusion_counts': dict(rejected), 'candidates': candidates}
    save(output, result)
    return result


def assemble(memories_path: Path, candidates_path: Path, annotations_path: Path, output: Path) -> dict:
    corpus = json.loads(memories_path.read_text())
    candidates = {r['candidate_id']: r for r in json.loads(candidates_path.read_text())['candidates']}
    annotations = json.loads(annotations_path.read_text())
    memories = {m['memory_id']: m for m in corpus['memories']}
    corpus_sha = hashlib.sha256(memories_path.read_bytes()).hexdigest()
    cases = []
    for a in annotations['annotations']:
        if a.get('status') != 'accepted':
            continue
        c = candidates[a['candidate_id']]
        if not a.get('review') or a['review'].get('status') != 'approved':
            raise ValueError('Independent review is required for accepted cases')
        review = a['review']
        if not review.get('reviewer') or not a.get('annotator') or review['reviewer'] == a['annotator']:
            raise ValueError('Annotator and independent reviewer must be identified and different')
        if review.get('memory_corpus_sha256') != corpus_sha or review.get('candidate_sha256') != object_sha(c):
            raise ValueError('Review does not match frozen corpus and source candidate')
        if review.get('annotation_sha256') != object_sha({k: v for k, v in a.items() if k != 'review'}):
            raise ValueError('Annotation changed after review')
        gold = a['gold_memory_ids']
        if len(gold) != len(set(gold)) or not set(gold) <= memories.keys():
            raise ValueError('Unknown or duplicate gold memory IDs')
        if not a.get('relevance_rationale') or not a.get('reference_answer'):
            raise ValueError('Gold rationale and reference answer are required')
        if gold and (not isinstance(a['relevance_rationale'], dict) or not set(gold) <= a['relevance_rationale'].keys()):
            raise ValueError('Every gold memory needs an explicit relevance rationale')
        if a.get('source_request_origin') not in ('direct_user', 'delegated_agent', 'uncertain'):
            raise ValueError('Request origin must be explicitly annotated')
        visible = [m for m in corpus['memories'] if datetime.fromisoformat(m['available_at'].replace('Z', '+00:00')) < datetime.fromisoformat(c['query_at'].replace('Z', '+00:00'))]
        if not visible:
            raise ValueError('No visible corpus: cannot test placement or irrelevant-memory rejection')
        if a.get('question_original', c['question_original']) != c['question_original']:
            raise ValueError('Annotation original question differs from source')
        if 'question' in a and 'question_normalized' in a and a['question'] != a['question_normalized']:
            raise ValueError('Conflicting normalized question fields')
        question = a.get('question', a.get('question_normalized', c['question_original']))
        if question != c['question_original'] and not a.get('normalization_notes'):
            raise ValueError('Changed prompt must disclose normalization')
        for mid in gold:
            if datetime.fromisoformat(memories[mid]['available_at']) >= datetime.fromisoformat(c['query_at'].replace('Z', '+00:00')):
                raise ValueError('Future memory in gold')
        cases.append({**a, 'case_id': 'lf-' + c['candidate_id'],
                      'question': question,
                      'question_original': c['question_original'], 'query_at': c['query_at'],
                      'source': c['source'], 'split': c['split']})
    result = {'schema_version': 1, 'memories': corpus['memories'], 'cases': cases,
              'provenance': {'memory_snapshots': corpus['snapshots'], 'cutoff': corpus['cutoff'],
                             'annotation_sha256': hashlib.sha256(annotations_path.read_bytes()).hexdigest(),
                             'candidate_sha256': hashlib.sha256(candidates_path.read_bytes()).hexdigest()}}
    from dataset import validate_dataset
    validate_dataset(result)
    save(output, result)
    return result


def object_sha(value: object) -> str:
    """Canonical content hash binds a review to the exact objects reviewed."""
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('memories')
    p.add_argument('--repo', action='append', required=True, help='neutral-label=/absolute/git/repo')
    p.add_argument('--cutoff', required=True)
    p.add_argument('--output', type=Path, required=True)
    p = sub.add_parser('candidates')
    p.add_argument('--export', type=Path, required=True)
    p.add_argument('--cutoff', required=True)
    p.add_argument('--output', type=Path, required=True)
    p = sub.add_parser('assemble')
    p.add_argument('--memories', type=Path, required=True)
    p.add_argument('--candidates', type=Path, required=True)
    p.add_argument('--annotations', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'memories':
        result = freeze_memories(args.repo, args.cutoff, args.output)
        print('memory files:', len(result['memories']), 'scopes:', len({m['scope'] for m in result['memories']}))
    elif args.command == 'candidates':
        result = mine(args.export, args.cutoff, args.output)
        print('candidates:', len(result['candidates']), 'excluded:', result['exclusion_counts'])
    else:
        result = assemble(args.memories, args.candidates, args.annotations, args.output)
        print('accepted cases:', len(result['cases']))


if __name__ == '__main__':
    main()
