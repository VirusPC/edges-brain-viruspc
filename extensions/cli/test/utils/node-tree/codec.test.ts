import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNode, serializeNode, createAgentsDocument } from '../../../src/domain/models/node/document.js';

const source = '# Manual identity\n\nKeep this introduction.\n\n<!-- project-memory:start -->\n<!-- project-memory-important:start -->\n## 本层硬约束\n\n- Keep **secrets** private.\n<!-- project-memory-important:end -->\n\n<!-- project-memory-local:start -->\n## 本层记忆\n\nHuman explanation.\n\n- [Tasks](tasks/AGENTS.md) — work in progress\n<!-- custom-extension: untouched -->\n<!-- project-memory-local:end -->\n\n<!-- project-memory-children:start -->\n## 下层记忆索引\n\n- [Child](nested/AGENTS.md)\n<!-- project-memory-children:end -->\n<!-- project-memory:end -->\n\n## Custom module\n\nDo not rewrite `this`.\n';

test('pure parsing returns the three-part model with unresolved references and no source/location/AST', () => {
  const model = parseNode(source);
  assert.deepEqual(Object.keys(model), ['constraints', 'memory', 'children', 'compose', 'references']);
  assert.deepEqual(model.constraints, [{ content: [{ kind: 'text', value: 'Keep secrets private.' }] }]);
  assert.deepEqual(model.memory, [
    { content: [{ kind: 'text', value: 'Human explanation.' }] },
    { content: [{ kind: 'link', label: 'Tasks', target: 'tasks/AGENTS.md' }, { kind: 'text', value: ' — work in progress' }] },
  ]);
  assert.deepEqual(model.children, [{ content: [{ kind: 'link', label: 'Child', target: 'nested/AGENTS.md' }] }]);
});

test('unchanged serialization preserves body CRLF and unknown extensions after default BOM removal', () => {
  const original = '\uFEFF' + source.replaceAll('\n', '\r\n');
  assert.equal(serializeNode(parseNode(original), original), original.slice(1));
});

test('editing one constraint preserves every other original source fragment', () => {
  const model = parseNode(source);
  model.constraints[0].content = [{ kind: 'text', value: 'Keep credentials private.' }];
  const result = serializeNode(model, source);
  assert.equal(result, source.replace('- Keep **secrets** private.', '- Keep credentials private.'));
  assert.deepEqual(parseNode(result), model);
});

test('adding, changing and removing entries preserves unknown sections and manual introductions', () => {
  const model = parseNode(source);
  model.memory[1].content[0] = { kind: 'link', label: 'Tasks', target: '.harness/tasks/AGENTS.md' };
  model.children.push({ content: [{ kind: 'link', label: '新节点', target: 'deep/new node/AGENTS.md' }] });
  model.constraints = [];
  const result = serializeNode(model, source);
  assert.deepEqual(parseNode(result), model);
  assert.ok(result.includes('Human explanation.'));
  assert.ok(result.includes('<!-- custom-extension: untouched -->'));
  assert.ok(result.endsWith('## Custom module\n\nDo not rewrite `this`.\n'));
});

test('new model serialization escapes Markdown syntax without changing text or targets', () => {
  const model = createAgentsDocument();
  model.constraints.push({ content: [{ kind: 'text', value: 'Keep *literal* &copy; [text].' }] });
  model.memory.push({ content: [{ kind: 'link', label: 'a [label]', target: 'a space/AGENTS.md' }] });
  model.references.push({ kind: 'link', label: 'Outside', target: 'https://example.com/a?q=1&x=2' });
  const rendered = serializeNode(model);
  assert.deepEqual(parseNode(rendered), model);
  assert.match(rendered, /<!-- project-harness:start -->/);
  assert.doesNotMatch(rendered, /<!-- project-memory:start -->/);
  assert.match(rendered, /## 本层硬约束/);
  assert.match(rendered, /## 本层系统维护信息/);
  assert.match(rendered, /## 下层系统维护信息/);
});

test('missing sections can be added without overwriting manual node text', () => {
  const original = '# Local rules\n\nManual introduction.\n';
  const model = parseNode(original);
  model.memory.push({ content: [{ kind: 'link', label: 'Tasks', target: 'tasks/AGENTS.md' }] });
  const result = serializeNode(model, original);
  assert.ok(result.startsWith(original));
  assert.deepEqual(parseNode(result), model);
});

test('editing ambiguous duplicate or unclosed sections fails without fabricating a write', () => {
  for (const original of [
    '## 本层记忆\n\n- First\n\n## 本层记忆\n\n- Second\n',
    '<!-- project-memory-local:start -->\n## 本层记忆\n\n- First\n',
  ]) {
    const model = parseNode(original);
    assert.equal(serializeNode(model, original), original);
    model.memory.push({ content: [{ kind: 'text', value: 'New entry' }] });
    assert.throws(() => serializeNode(model, original), /ambiguous|unclosed/i);
  }
});

test('editing ordinary references leaves surrounding prose intact', () => {
  const original = '# Node\n\nRead [guide](docs/guide.md) before proceeding.\n';
  const model = parseNode(original);
  model.references[0].target = 'docs/new-guide.md';
  const output = serializeNode(model, original);
  assert.ok(output.startsWith('# Node\n\nRead '));
  assert.ok(output.endsWith(' before proceeding.\n'));
  assert.deepEqual(parseNode(output), model);
});

test('model equality and serialization do not depend on JSON property order', () => {
  const model = createAgentsDocument();
  model.memory.push({ content: [{ target: 'tasks/AGENTS.md', label: 'Tasks', kind: 'link' }] });
  assert.deepEqual(parseNode(serializeNode(model)), model);
});

test('edits preserve CRLF and retain unknown inline content in untouched entries', () => {
  const original = '## 本层记忆\r\n\r\n- ![Diagram](diagram.png) [Guide](guide.md)\r\n\r\n## 下层记忆索引\r\n\r\n- [Child](old/AGENTS.md)\r\n';
  const model = parseNode(original);
  model.children[0].content[0] = { kind: 'link', label: 'Child', target: 'new/AGENTS.md' };
  const output = serializeNode(model, original);
  assert.ok(output.includes('- ![Diagram](diagram.png) [Guide](guide.md)\r\n'));
  assert.equal(output.replaceAll('\r\n', '').includes('\n'), false);
  assert.deepEqual(parseNode(output), model);
  model.memory[0].content = [{ kind: 'text', value: 'Replace image item' }];
  assert.throws(() => serializeNode(model, original), /unsupported/i);
});

test('prepending and reordering retain protected image/HTML content even when it moves to the tail', () => {
  const original = '## 本层记忆\n\n- First **rule**\n- Keep ![Diagram](diagram.png) [Guide](guide.md)\n- <span>Custom</span> [Other](other.md)\n';
  const model = parseNode(original);
  model.memory.unshift({ content: [{ kind: 'text', value: 'New first item' }] });
  const output = serializeNode(model, original);
  assert.ok(output.includes('![Diagram](diagram.png)'));
  assert.ok(output.includes('<span>Custom</span>'));
  assert.ok(output.includes('First **rule**'));
  assert.deepEqual(parseNode(output), model);
  model.memory.reverse();
  const reordered = serializeNode(model, original);
  assert.ok(reordered.includes('![Diagram](diagram.png)'));
  assert.ok(reordered.includes('<span>Custom</span>'));
  assert.deepEqual(parseNode(reordered), model);
});

for (const original of [
  '## 下层记忆索引\n\n- [Child](child/AGENTS.md)\n',
  '## 本层重要约束\n\n- Rule\n\n## 本层记忆\n\n- Local\n\n## 下层记忆索引\n\n- [Child](child/AGENTS.md)\n',
  '## 本层记忆\n\n- Local\n\n## Custom\n\n[Earlier](earlier.md)\n\n## 下层记忆索引\n\n- [Child](child/AGENTS.md)\n',
]) {
  test(`new ordinary references stay outside managed sections: ${original.split('\n')[0]}`, () => {
    const model = parseNode(original);
    model.references.push({ kind: 'link', label: 'Guide', target: 'guide.md' });
    assert.deepEqual(parseNode(serializeNode(model, original)), model);
  });
}

test('navigation links in subsection headings remain in their owning section', () => {
  const original = '## 下层记忆索引\n\n### [Child](child/AGENTS.md)\n';
  const model = parseNode(original);
  assert.deepEqual(model.children, [{ content: [{ kind: 'link', label: 'Child', target: 'child/AGENTS.md' }] }]);
  model.children[0].content[0] = { kind: 'link', label: 'Child', target: 'new/AGENTS.md' };
  const result = serializeNode(model, original);
  assert.match(result, /### \[Child\]/);
  assert.deepEqual(parseNode(result), model);
});
