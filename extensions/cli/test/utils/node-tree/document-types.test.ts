import test from 'node:test';
import assert from 'node:assert/strict';
import { baseDocumentCodec } from "../../../src/utils/markdown/document.js";
import { memoryDocumentCodec } from "../../../src/domain/models/memory/documents.js";
import { agentsDocumentCodec } from "../../../src/domain/models/node/document.js";
import type { DocumentCodec, MarkdownDocument } from '../../../src/utils/markdown/types.js';
import * as tasks from '../../../src/domain/models/tasks/frontmatter.js';

const source = '---\ndescription: "Scope" # keep\nmetadata:\n  edges-type: project\n---\n## 本层记忆\n\n- [Local](memory/AGENTS.md)\n';

test('base and memory codecs tag documents without changing YAML classification', () => {
  function check<TType extends string>(codec: DocumentCodec<MarkdownDocument<TType>, TType>) {
    assert.ok(codec, 'a document codec is available');
    const doc = codec.parse(source);
    assert.equal(doc.type, codec.type);
    assert.deepEqual(doc.metadata!.metadata, { 'edges-type': 'project' });
    assert.deepEqual(codec.parse(codec.serialize(doc, source)), doc);
  }
  check(baseDocumentCodec);
  check(memoryDocumentCodec);
});

test('agents codec uses the existing section model and preserves original source', () => {
  assert.ok(agentsDocumentCodec);
  const model = agentsDocumentCodec.parse(source);
  assert.equal(agentsDocumentCodec.type, 'agents');
  assert.equal(model.memory.length, 1);
  model.memory.push({ content: [{ kind: 'text', value: 'Extra rule' }] });
  assert.deepEqual(agentsDocumentCodec.parse(agentsDocumentCodec.serialize(model, source)), model);
});

test('typed Markdown codec rejects documents belonging to another codec', () => {
  assert.ok(memoryDocumentCodec);
  const doc = { type: 'task', body: 'body' } as unknown as MarkdownDocument<'memory'>;
  assert.throws(() => memoryDocumentCodec.serialize(doc), /type|codec/i);
});

test('Task codec validates Task metadata while reusing shared Markdown handling', () => {
  assert.ok(tasks.taskDocumentCodec);
  const source = '---\nname: example\nmetadata:\n  edges-type: task\n  edges-title: original # keep\n---\nBody\n';
  const doc = tasks.taskDocumentCodec.parse(source);
  assert.equal(doc.type, 'task');
  assert.deepEqual(tasks.taskDocumentCodec.parse(tasks.taskDocumentCodec.serialize(doc, source)), doc);
  assert.throws(() => tasks.taskDocumentCodec.parse('---\nmetadata: [invalid]\n---\nBody'), /mapping/);
  assert.equal(tasks.parseTaskDoc(source).name, 'example');
});
