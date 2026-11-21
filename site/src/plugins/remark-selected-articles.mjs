import path from 'node:path';

const LEGACY = {
  国内进展: '国内',
  国际进展: '国际',
};

/**
 * Fold the old top-level 「国内进展」「国际进展」 into one chapter,
 * 「精选文章」, with those places as second-level headings.
 * A file that already has 「精选文章」 is left as written.
 * 「精选推文」 and 「精选播客」 stay sibling h2s and are not folded.
 *
 * @param {any} tree
 */
export function foldSelectedArticles(tree) {
  const children = tree?.children;
  if (!Array.isArray(children)) return;
  if (children.some((node) => isChapter(node, '精选文章'))) return;

  const hits = [];
  children.forEach((node, index) => {
    if (!isH2(node)) return;
    const parsed = parseNumbered(plain(node));
    if (!parsed || !LEGACY[parsed.name]) return;
    hits.push({ index, ...parsed });
  });
  if (hits.length === 0) return;

  const first = hits[0];
  setText(children[first.index], `${first.number}、精选文章`);
  children.splice(first.index + 1, 0, heading(3, LEGACY[first.name]));
  for (const hit of hits.slice(1)) {
    const node = children[hit.index + 1];
    node.depth = 3;
    setText(node, LEGACY[hit.name]);
  }
}

export function remarkSelectedArticles() {
  return (tree, file) => {
    const base = path.basename(file?.path || file?.history?.at(-1) || '');
    if (base && !/-ai-news\.md$/i.test(base)) return;
    foldSelectedArticles(tree);
  };
}

function isH2(node) {
  return node?.type === 'heading' && node.depth === 2;
}

function isChapter(node, name) {
  if (!isH2(node)) return false;
  return parseNumbered(plain(node))?.name === name;
}

function parseNumbered(text) {
  const match = text.match(/^([〇一二三四五六七八九十]+)、(.+)$/);
  if (!match) return null;
  return { number: match[1], name: match[2] };
}

function plain(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value || '';
  if (Array.isArray(node.children)) return node.children.map(plain).join('');
  return '';
}

function setText(node, value) {
  node.children = [{ type: 'text', value }];
}

function heading(depth, value) {
  return { type: 'heading', depth, children: [{ type: 'text', value }] };
}
