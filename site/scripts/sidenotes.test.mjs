import assert from 'node:assert/strict';
import test from 'node:test';
import { rehypeSidenotes } from '../src/plugins/rehype-sidenotes.mjs';

function el(tag, properties, children) {
  return { type: 'element', tagName: tag, properties, children };
}

function text(value) {
  return { type: 'text', value };
}

function sampleTree() {
  return {
    type: 'root',
    children: [
      el('p', {}, [
        text('Hello'),
        el('sup', {}, [
          el(
            'a',
            { href: '#user-content-fn-1', id: 'user-content-fnref-1', dataFootnoteRef: true },
            [text('1')],
          ),
        ]),
        text(' and '),
        el('sup', {}, [
          el(
            'a',
            { href: '#user-content-fn-2', id: 'user-content-fnref-2', dataFootnoteRef: '' },
            [text('2')],
          ),
        ]),
      ]),
      el('section', { dataFootnotes: true, className: ['footnotes'] }, [
        el('h2', { id: 'footnote-label' }, [text('Footnotes')]),
        el('ol', {}, [
          el('li', { id: 'user-content-fn-1' }, [
            el('p', {}, [
              text('A handwritten note.'),
              el('a', { href: '#user-content-fnref-1', dataFootnoteBackref: true }, [text('↩')]),
            ]),
          ]),
          el('li', { id: 'user-content-fn-2' }, [
            el('p', {}, [text('Second note.')]),
          ]),
        ]),
      ]),
    ],
  };
}

function findAll(node, tag) {
  const found = [];
  const visit = (current) => {
    if (current?.type === 'element' && current.tagName === tag) found.push(current);
    for (const child of current?.children || []) visit(child);
  };
  visit(node);
  return found;
}

function textContent(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textContent).join('');
}

test('footnote refs become sidenotes and the endnote list is removed', () => {
  const tree = sampleTree();
  rehypeSidenotes()(tree);
  const sidenotes = findAll(tree, 'span').filter((node) =>
    (node.properties.className || []).includes('sidenote'),
  );
  assert.equal(sidenotes.length, 2);
  assert.match(textContent(sidenotes[0]), /A handwritten note/);
  assert.equal(textContent(sidenotes[0]).includes('↩'), false);
  assert.match(textContent(sidenotes[1]), /Second note/);
  assert.equal(findAll(tree, 'section').length, 0);
  assert.equal(findAll(tree, 'input').length, 2);
  assert.equal(findAll(tree, 'label')[0].properties.htmlFor, findAll(tree, 'input')[0].properties.id);
});

test('an unresolved footnote ref keeps the endnote section', () => {
  const tree = sampleTree();
  tree.children[0].children.push(
    el('sup', {}, [
      el('a', { href: '#user-content-fn-9', id: 'user-content-fnref-9', dataFootnoteRef: true }, [
        text('9'),
      ]),
    ]),
  );
  rehypeSidenotes()(tree);
  assert.equal(findAll(tree, 'section').length, 1);
  assert.equal(
    findAll(tree, 'span').filter((node) => (node.properties.className || []).includes('sidenote')).length,
    2,
  );
});
