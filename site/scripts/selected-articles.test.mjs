import assert from 'node:assert/strict';
import test from 'node:test';
import { foldSelectedArticles } from '../src/plugins/remark-selected-articles.mjs';

function heading(depth, value) {
  return { type: 'heading', depth, children: [{ type: 'text', value }] };
}

function text(node) {
  return node.children.map((child) => child.value).join('');
}

test('old domestic and international headings fold under one selected-articles chapter', () => {
  const tree = {
    type: 'root',
    children: [
      heading(2, '三、项目开源'),
      { type: 'paragraph', children: [{ type: 'text', value: '项目' }] },
      heading(2, '四、国内进展'),
      { type: 'paragraph', children: [{ type: 'text', value: '国内条目' }] },
      heading(2, '五、国际进展'),
      { type: 'paragraph', children: [{ type: 'text', value: '国际条目' }] },
    ],
  };
  foldSelectedArticles(tree);
  assert.deepEqual(tree.children.filter((node) => node.type === 'heading').map((node) => [node.depth, text(node)]), [
    [2, '三、项目开源'],
    [2, '四、精选文章'],
    [3, '国内'],
    [3, '国际'],
  ]);
  assert.equal(text(tree.children[4]), '国内条目');
  assert.equal(text(tree.children[6]), '国际条目');
});

test('an issue that only has international keeps that chapter number', () => {
  const tree = {
    type: 'root',
    children: [heading(2, '五、国际进展'), { type: 'paragraph', children: [{ type: 'text', value: '一条' }] }],
  };
  foldSelectedArticles(tree);
  assert.equal(tree.children[0].depth, 2);
  assert.equal(text(tree.children[0]), '五、精选文章');
  assert.equal(tree.children[1].depth, 3);
  assert.equal(text(tree.children[1]), '国际');
});

test('a chapter already named 精选文章 is not folded again', () => {
  const tree = {
    type: 'root',
    children: [
      heading(2, '四、精选文章'),
      heading(3, '国内'),
      heading(3, '国际'),
      heading(2, '五、推特'),
    ],
  };
  foldSelectedArticles(tree);
  assert.equal(text(tree.children[3]), '五、推特');
  assert.equal(tree.children[3].depth, 2);
  assert.equal(tree.children.filter((node) => text(node) === '四、精选文章').length, 1);
});
