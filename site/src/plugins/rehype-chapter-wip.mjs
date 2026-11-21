/**
 * Mark the planned 「精选推文」 and 「精选播客」 chapters as under construction.
 * The badge is a data attribute, so the chapter title in the table of contents
 * stays the heading text. These chapters are not article cards and do not
 * join the selected-article filter.
 */
import path from 'node:path';

const WIP_CHAPTER = /^([〇一二三四五六七八九十]+)、精选(推文|播客)$/;

export function rehypeChapterWip() {
  return (tree, file) => {
    markChapterWip(tree, file);
  };
}

/**
 * @param {any} tree
 * @param {{ path?: string, history?: string[] }} [file]
 */
export function markChapterWip(tree, file) {
  const base = path.basename(file?.path || file?.history?.at?.(-1) || '');
  if (base && !/-ai-news\.md$/i.test(base)) return;
  walk(tree);
}

/**
 * @param {any} node
 */
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'element' && node.tagName === 'h2') tag(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) walk(child);
}

/**
 * @param {any} heading
 */
function tag(heading) {
  const label = textOf(heading);
  if (!WIP_CHAPTER.test(label)) return;
  heading.properties ??= {};
  if (heading.properties.dataWip) return;
  heading.properties.dataWip = '建设中';
  heading.properties.ariaLabel = `${label}，建设中`;
}

/**
 * @param {any} node
 */
function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map((child) => textOf(child)).join('').replace(/\s+/g, ' ').trim();
}
