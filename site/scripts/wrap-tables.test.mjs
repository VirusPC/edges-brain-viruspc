import assert from 'node:assert/strict';
import test from 'node:test';
import { wrapTables } from '../src/plugins/rehype-wrap-tables.mjs';

test('a markdown table scrolls inside its own wrap and is not wrapped twice', () => {
  const table = { type: 'element', tagName: 'table', properties: {}, children: [] };
  const tree = { type: 'root', children: [table, { type: 'element', tagName: 'p', properties: {}, children: [] }] };
  wrapTables(tree);
  assert.equal(tree.children[0].tagName, 'div');
  assert.deepEqual(tree.children[0].properties.className, ['table-wrap']);
  assert.equal(tree.children[0].children[0], table);
  assert.equal(tree.children[1].tagName, 'p');
  wrapTables(tree);
  assert.equal(tree.children[0].children.length, 1);
  assert.equal(tree.children[0].children[0].tagName, 'table');
});
