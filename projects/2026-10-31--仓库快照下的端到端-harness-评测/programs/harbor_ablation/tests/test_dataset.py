import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dataset import validate_dataset
from build_dataset import mine, explicit_non_user_role, assemble, object_sha
from export_langfuse import export
import export_langfuse


class DatasetTests(unittest.TestCase):
    def example(self):
        return {'schema_version': 1,
                'memories': [{'memory_id': 'm-1', 'scope': 'project', 'title': 'Rule', 'body': 'Retain source.',
                              'available_at': '2026-10-01T00:00:00Z', 'source': {'revision': 'fixed'}}],
                'cases': [{'case_id': 'c-1', 'scope': 'project', 'question': 'Where is the evidence?',
                           'query_at': '2026-11-01T00:00:00Z', 'gold_memory_ids': ['m-1'], 'split': 'test',
                           'source': {'session_id': 's1', 'trace_id': 't1', 'observation_id': 'o1'}}]}

    def test_temporal_leakage_rejected(self):
        data = self.example()
        data['memories'][0]['available_at'] = data['cases'][0]['query_at']
        with self.assertRaisesRegex(ValueError, 'strictly before'):
            validate_dataset(data)

    def test_session_leakage_rejected(self):
        data = self.example()
        second = copy.deepcopy(data['cases'][0])
        second.update(case_id='c-2', question='Second question', split='dev')
        second['source']['observation_id'] = 'o2'
        data['cases'].append(second)
        with self.assertRaisesRegex(ValueError, 'session spans'):
            validate_dataset(data)

    def test_path_traversal_rejected(self):
        data = self.example()
        data['memories'][0]['scope'] = 'project/../../home'
        with self.assertRaisesRegex(ValueError, 'normalized relative'):
            validate_dataset(data)

    def test_negative_cases_are_valid(self):
        data = self.example()
        data['cases'][0]['gold_memory_ids'] = []
        self.assertEqual(validate_dataset(data)['no_gold'], 1)

    def test_known_non_user_wrappers_are_not_human_prompts(self):
        self.assertTrue(explicit_non_user_role('{"role":"assistant","content":"do this"}'))
        self.assertFalse(explicit_non_user_role('{"role":"user","content":"do this"}'))
        self.assertFalse(explicit_non_user_role('Plain exporter text'))

    def test_export_preserves_but_flags_revisions(self):
        row = {'id': 'o1', 'traceId': 't1', 'startTime': '2026-11-01T00:00:00Z',
               'environment': 'test', 'type': 'AGENT'}
        class FakeClient:
            host = 'https://example.invalid'
            calls = 0
            def get(self, endpoint, params):
                self.calls += 1
                return {'data': [{**row, 'output': str(self.calls)}],
                        'meta': {'cursor': 'next' if self.calls == 1 else None}}
        client = FakeClient()
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)
            result = export(client, output, '2026-10-31T00:00:00Z', '2026-11-02T00:00:00Z')
            self.assertTrue(result['complete'])
            self.assertEqual(len(result['duplicate_observations']), 1)
            export(client, output, '2026-10-31T00:00:00Z', '2026-11-02T00:00:00Z')
            self.assertEqual(client.calls, 2, 'completed export must not refetch')

    def test_raw_integrity_is_checked_before_mining(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'page.json').write_text('{"data": []}')
            (root / 'manifest.json').write_text(json.dumps({'complete': True, 'pages': [
                {'file': 'page.json', 'sha256': 'tampered'}]}))
            with self.assertRaisesRegex(ValueError, 'checksum'):
                mine(root, '2026-10-31T00:00:00Z', root / 'out.json')

    def test_terminal_page_crash_is_not_a_complete_export(self):
        class FakeClient:
            host = 'https://example.invalid'
            calls = 0
            def get(self, endpoint, params):
                self.calls += 1
                return {'data': [], 'meta': {'cursor': None}}
        client = FakeClient()
        original_save = export_langfuse.save
        def interrupted_save(path, value):
            if path.name == 'inventory.json':
                raise OSError('simulated interruption during finalization')
            original_save(path, value)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with patch.object(export_langfuse, 'save', interrupted_save):
                with self.assertRaises(OSError):
                    export(client, root, '2026-10-31T00:00:00Z', '2026-11-02T00:00:00Z')
            self.assertFalse(json.loads((root / 'manifest.json').read_text())['complete'])
            with self.assertRaisesRegex(ValueError, 'Incomplete'):
                mine(root, '2026-10-31T00:00:00Z', root / 'out.json')
            export(client, root, '2026-10-31T00:00:00Z', '2026-11-02T00:00:00Z')
            self.assertTrue(json.loads((root / 'manifest.json').read_text())['complete'])
            self.assertEqual(client.calls, 1, 'resume finalization without another page request')

    def assembly_files(self, root):
        example = self.example()
        corpus = {'memories': example['memories'], 'snapshots': [], 'cutoff': '2026-10-31T00:00:00Z'}
        candidate = {'candidate_id': 'o1', 'question_original': 'What does that require?',
                     'query_at': example['cases'][0]['query_at'],
                     'source': example['cases'][0]['source'], 'split': 'test'}
        annotation = {'candidate_id': 'o1', 'status': 'accepted', 'annotator': 'first-reviewer',
                      'source_request_origin': 'direct_user', 'scope': 'project',
                      'question_normalized': 'What does the evidence rule require?',
                      'normalization_notes': {'method': 'prior-user-context'},
                      'gold_memory_ids': ['m-1'], 'relevance_rationale': {'m-1': 'Direct rule'},
                      'reference_answer': 'Retain source.'}
        (root / 'memories.json').write_text(json.dumps(corpus))
        (root / 'candidates.json').write_text(json.dumps({'candidates': [candidate]}))
        annotation['review'] = {'status': 'approved', 'reviewer': 'independent-reviewer',
                                'memory_corpus_sha256': hashlib.sha256((root / 'memories.json').read_bytes()).hexdigest(),
                                'candidate_sha256': object_sha(candidate),
                                'annotation_sha256': object_sha(annotation)}
        (root / 'annotations.json').write_text(json.dumps({'annotations': [annotation]}))
        return annotation

    def test_assembly_uses_disclosed_normalized_question(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.assembly_files(root)
            data = assemble(root / 'memories.json', root / 'candidates.json', root / 'annotations.json', root / 'data.json')
            self.assertEqual(data['cases'][0]['question'], 'What does the evidence rule require?')
            self.assertEqual(data['cases'][0]['question_original'], 'What does that require?')

    def test_review_is_invalidated_by_changed_annotations(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            annotation = self.assembly_files(root)
            annotation['gold_memory_ids'] = []
            (root / 'annotations.json').write_text(json.dumps({'annotations': [annotation]}))
            with self.assertRaisesRegex(ValueError, 'changed after review'):
                assemble(root / 'memories.json', root / 'candidates.json', root / 'annotations.json', root / 'data.json')

    def test_review_is_invalidated_by_changed_corpus(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.assembly_files(root)
            corpus = json.loads((root / 'memories.json').read_text())
            corpus['memories'][0]['body'] = 'A different rule.'
            (root / 'memories.json').write_text(json.dumps(corpus))
            with self.assertRaisesRegex(ValueError, 'frozen corpus'):
                assemble(root / 'memories.json', root / 'candidates.json', root / 'annotations.json', root / 'data.json')


if __name__ == '__main__':
    unittest.main()
