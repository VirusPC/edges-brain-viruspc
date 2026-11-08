"""Read-only, resumable export of bounded Langfuse v2 observations (stdlib only).

Raw data belongs in private storage. Credentials are read at runtime, never copied
to output. A partial export is never marked complete. Original server rows are
preserved for provenance; filtering and redaction belong in the dataset builder.
"""
from __future__ import annotations

import argparse
import base64
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request


def save(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    with open(tmp, 'w', encoding='utf-8') as stream:
        os.chmod(tmp, 0o600)
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    tmp.replace(path)


class Client:
    def __init__(self, config: Path):
        config_data = json.loads(config.read_text())
        self.host = config_data.get('base_url', config_data.get('host', '')).rstrip('/')
        if not self.host.startswith('https://'):
            raise ValueError('Use an HTTPS Langfuse endpoint')
        self.authorization = 'Basic ' + base64.b64encode(
            (config_data['public_key'] + ':' + config_data['secret_key']).encode()
        ).decode()

    def get(self, endpoint: str, params: dict) -> dict:
        url = self.host + endpoint + '?' + urllib.parse.urlencode(params)
        request = urllib.request.Request(url, headers={
            'Authorization': self.authorization,
            'User-Agent': 'Mozilla/5.0 EdgesResearch/1.0',
            'Accept': 'application/json',
        })
        for attempt in range(6):
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    return json.load(response)
            except urllib.error.HTTPError as exc:
                if exc.code not in (429, 500, 502, 503, 504):
                    raise RuntimeError(f'Langfuse HTTP {exc.code}; response body withheld') from None
                if attempt == 5:
                    raise RuntimeError(f'Langfuse HTTP {exc.code}; retries exhausted') from None
            except (TimeoutError, urllib.error.URLError):
                if attempt == 5:
                    raise RuntimeError('Langfuse transport retries exhausted') from None
            time.sleep(min(2 ** attempt, 20))
        raise AssertionError('unreachable')


def export(client: Client, output: Path, start: str, end: str, *, trace_id: str | None = None) -> dict:
    params = {'fromStartTime': start, 'toStartTime': end,
              'limit': 100, 'fields': 'core,basic,io,metadata,usage,model,trace_context'}
    if trace_id:
        params['traceId'] = trace_id
    else:
        params['isRootObservation'] = 'true'
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = output / 'manifest.json'
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        if manifest['request'] != params or manifest['host'] != client.host:
            raise ValueError('Export directory belongs to a different request')
    else:
        manifest = {'host': client.host, 'request': params, 'complete': False,
                    'pages': [], 'next_cursor': None,
                    'started_at': datetime.now(timezone.utc).isoformat()}
        save(manifest_path, manifest)
    cursor = manifest['next_cursor']
    seen_cursors = {p['next_cursor'] for p in manifest['pages']}
    while not manifest.get('finished_at'):
        page = client.get('/api/public/v2/observations', {**params, **({'cursor': cursor} if cursor else {})})
        if not isinstance(page.get('data'), list):
            raise ValueError('Unexpected observations response')
        next_cursor = page.get('meta', {}).get('cursor')
        page_path = output / f'page-{len(manifest["pages"]):05d}.json'
        save(page_path, page)
        manifest['pages'].append({'file': page_path.name, 'rows': len(page['data']),
                                  'sha256': hashlib.sha256(page_path.read_bytes()).hexdigest(),
                                  'next_cursor': next_cursor})
        manifest['next_cursor'] = next_cursor
        # Complete only after integrity/duplicate auditing below. A crash after
        # the terminal page can resume finalization without re-fetching pages.
        manifest['complete'] = False
        if not next_cursor:
            manifest['finished_at'] = datetime.now(timezone.utc).isoformat()
        save(manifest_path, manifest)
        print(json.dumps({'pages': len(manifest['pages']), 'rows': sum(p['rows'] for p in manifest['pages']),
                          'complete': manifest['complete']}), flush=True)
        if not next_cursor:
            break
        if next_cursor in seen_cursors:
            raise ValueError('Server repeated a pagination cursor')
        seen_cursors.add(next_cursor)
        cursor = next_cursor
    rows = []
    for page_info in manifest['pages']:
        raw = (output / page_info['file']).read_bytes()
        if hashlib.sha256(raw).hexdigest() != page_info['sha256']:
            raise ValueError('Export page checksum mismatch')
        rows.extend(json.loads(raw)['data'])
    ids = [(row['traceId'], row['id']) for row in rows]
    duplicates = {pair for pair, count in Counter(ids).items() if count > 1}
    # v2 may expose revisions of one observation. Preserve every original row,
    # flag duplicates and let the corpus builder exclude them conservatively.
    manifest['duplicate_observations'] = [dict(trace_id=t, observation_id=i) for t, i in sorted(duplicates)]
    save(output / 'inventory.json', {
        'rows': len(rows), 'unique_observations': len(set(ids)),
        'duplicate_observations': len(duplicates), 'unique_traces': len({r['traceId'] for r in rows}),
        'environments': dict(Counter(r.get('environment') for r in rows)),
        'types': dict(Counter(r.get('type') for r in rows)),
        'time_min': min((r['startTime'] for r in rows), default=None),
        'time_max': max((r['startTime'] for r in rows), default=None),
        'input_present': sum(bool(r.get('input')) for r in rows),
        'output_present': sum(bool(r.get('output')) for r in rows),
    })
    manifest['complete'] = True
    manifest['finalization_version'] = 1
    save(manifest_path, manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--start', required=True)
    parser.add_argument('--end', required=True)
    parser.add_argument('--trace-id')
    args = parser.parse_args()
    for value in (args.start, args.end):
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            parser.error('Time boundaries must include timezone')
    if datetime.fromisoformat(args.start.replace('Z', '+00:00')) >= datetime.fromisoformat(args.end.replace('Z', '+00:00')):
        parser.error('--start must be earlier than --end')
    export(Client(args.config), args.output, args.start, args.end, trace_id=args.trace_id)


if __name__ == '__main__':
    main()
