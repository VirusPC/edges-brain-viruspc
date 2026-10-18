import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNode, serializeNode } from "../../../src/domain/models/node/document.js";
import { parseDocument, serializeDocument } from "../../../src/utils/markdown/document.js";
import type { MarkdownDocument } from '../../../src/utils/markdown/types.js';

const body = '## 本层记忆\n\n- [Memory](memory/AGENTS.md)\n';
const source = '---\ndescription: "[Not a node](fake/AGENTS.md)" # comment\nextra:\n  tags: [one, two]\n---\n' + body;

test('YAML links remain metadata instead of becoming node references', () => {
  const node = parseNode(source);
  assert.deepEqual(node.references, []);
  assert.deepEqual(node.metadata, { description: '[Not a node](fake/AGENTS.md)', extra: { tags: ['one', 'two'] } });
  assert.equal(node.memory.length, 1);
});

test('documents support optional YAML metadata and an opaque Markdown body', () => {
  assert.deepEqual(parseDocument(body), { body });
  assert.deepEqual(parseDocument('---\n---\n' + body), { metadata: {}, body });
  assert.equal(parseDocument(source).body, body);
  assert.equal(serializeDocument({ body }), body);
});

test('serialization uses default empty-header and final-newline behavior', () => {
  assert.equal(serializeDocument({ metadata: {}, body: 'Body' }), 'Body\n');
  assert.equal(serializeDocument({ metadata: { name: 'example' }, body: 'Body' }), '---\nname: example\n---\nBody\n');
});

test('YAML values use the default engine, including dates and alias references', () => {
  const doc = parseDocument('---\ndate: 2026-10-04\none: &item {name: example}\ntwo: *item\n---\nBody\n');
  assert.deepEqual(doc.metadata!.date, new Date('2026-10-04T00:00:00Z'));
  assert.equal(doc.metadata!.one, doc.metadata!.two);
  assert.deepEqual(parseDocument(serializeDocument(doc)), doc);
});

test('editing a parsed document does not mutate subsequent parses of the same source', () => {
  const doc = parseDocument(source);
  doc.metadata!.description = 'Changed';
  assert.equal(parseDocument(source).metadata!.description, '[Not a node](fake/AGENTS.md)');
});

test('metadata edits retain unknown fields and keep the Markdown body separate', () => {
  const doc = parseDocument(source);
  doc.metadata!.description = 'Updated description';
  const result = parseDocument(serializeDocument(doc));
  assert.deepEqual(result, doc);
  assert.equal(result.body, body);
});

test('node metadata and sections can be edited independently', () => {
  const node = parseNode(source);
  node.metadata!.description = 'New description';
  node.memory.push({ content: [{ kind: 'text', value: 'Extra memory' }] });
  assert.deepEqual(parseNode(serializeNode(node, source)), node);
});

test('document context is independent from similarly named YAML fields', () => {
  const doc: MarkdownDocument = {
    type: 'memory',
    metadata: { id: 'yaml-id', parent: 'yaml-parent', children: ['yaml-child'] },
    body: '# Note\n',
    id: 'loaded-id', parent: { target: 'loaded-parent' }, children: [],
  };
  assert.deepEqual(parseDocument(serializeDocument(doc)), {
    metadata: doc.metadata, body: '# Note\n',
  });
  assert.deepEqual(doc.children, []);
});

test('reading documents never executes a declared JavaScript header', () => {
  const probe = '__edges_frontmatter_probe__';
  const state = globalThis as unknown as Record<string, unknown>;
  try {
    for (const bom of ['', '\uFEFF']) {
      assert.throws(() => parseDocument(`${bom}---javascript\n(globalThis.${probe} = true, {})\n---\nBody\n`), /YAML/);
      assert.equal(state[probe], undefined);
    }
  } finally {
    delete state[probe];
  }
});

test('ordinary Markdown thematic breaks remain body content', () => {
  for (const body of ['----\nBody\n', '-----\nBody\n']) {
    assert.deepEqual(parseDocument(body), { body });
  }
});
