/**
 * Put each 「精选文章」 item in one div, so a filter can hide the border
 * together with the title, the one-line gist, and the folded summary.
 * Model-release and project headings stay unwrapped.
 *
 * @returns {(tree: any) => void}
 */
export function rehypeArticleCards() {
  return (tree) => {
    wrapArticleCards(tree);
  };
}

/**
 * @param {any} tree
 */
export function wrapArticleCards(tree) {
  walk(tree);
}

/**
 * @param {any} node
 */
function walk(node) {
  const children = node?.children;
  if (!Array.isArray(children)) return;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (isHeading(child, 'h2') && textOf(child).endsWith('精选文章')) {
      let end = children.length;
      for (let cursor = index + 1; cursor < children.length; cursor += 1) {
        if (isHeading(children[cursor], 'h2')) {
          end = cursor;
          break;
        }
      }
      const wrapped = wrapRange(children.slice(index + 1, end));
      children.splice(index + 1, end - (index + 1), ...wrapped);
      index += wrapped.length;
      continue;
    }
    if (child?.type === 'element' && !hasClass(child, 'article-card')) walk(child);
  }
}

/**
 * @param {any[]} nodes
 */
function wrapRange(nodes) {
  /** @type {any[]} */
  const out = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!isHeading(node, 'h4')) {
      out.push(node);
      continue;
    }
    let end = index + 1;
    while (
      end < nodes.length
      && !isHeading(nodes[end], 'h2')
      && !isHeading(nodes[end], 'h3')
      && !isHeading(nodes[end], 'h4')
    ) {
      end += 1;
    }
    while (end - 1 > index && isGap(nodes[end - 1])) end -= 1;
    out.push({
      type: 'element',
      tagName: 'div',
      properties: { className: ['article-card'] },
      children: nodes.slice(index, end),
    });
    index = end - 1;
  }
  return out;
}

/**
 * @param {any} node
 * @param {string} tag
 */
function isGap(node) {
  if (!node) return false;
  if (node.type === 'text') return !String(node.value || '').trim();
  if (node.type === 'element' && node.tagName === 'br') return true;
  if (node.type === 'raw') return /^<br\s*\/?>$/i.test(String(node.value || '').trim());
  return false;
}

function isHeading(node, tag) {
  return node?.type === 'element' && node.tagName === tag;
}

/**
 * @param {any} node
 * @param {string} name
 */
function hasClass(node, name) {
  const value = node?.properties?.className;
  const names = Array.isArray(value) ? value : String(value || '').split(/\s+/);
  return names.includes(name);
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
