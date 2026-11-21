import path from 'node:path';

const CHAPTER = /^[〇一二三四五六七八九十]+、精选(?:推文|播客)$/;
const BADGE = '<span class="tag">建设中</span>';

/**
 * Mark 「精选推文」 and 「精选播客」 with the same tag used for 旧版.
 * The badge is raw HTML. Heading text for the chapter list skips that node,
 * so the sidebar title stays the chapter name.
 *
 * @param {any} tree
 */
export function markConstructionChapters(tree) {
  const children = tree?.children;
  if (!Array.isArray(children)) return;
  for (const node of children) {
    if (node?.type !== 'heading' || node.depth !== 2) continue;
    if (!CHAPTER.test(plain(node).trim())) continue;
    if (node.children.some((child) => child?.type === 'html' && String(child.value).includes('建设中'))) continue;
    node.children.push({ type: 'html', value: BADGE });
  }
}

export function remarkConstructionChapters() {
  return (tree, file) => {
    const base = path.basename(file?.path || file?.history?.at(-1) || '');
    if (base && !/-ai-news\.md$/i.test(base)) return;
    markConstructionChapters(tree);
  };
}

/**
 * @param {any} node
 */
function plain(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value || '';
  if (Array.isArray(node.children)) return node.children.map(plain).join('');
  return '';
}
