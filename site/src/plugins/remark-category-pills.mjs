/**
 * Turn a leading `<label>` on a heading into `data-cat`, and drop it from the
 * heading text. The page paints the label with CSS; chapter lists keep the
 * title only, because they read the heading's text.
 *
 * Source files keep writing `#### &lt;标签&gt;[标题](url)`.
 */

const LEADING_LABEL = /^(?:<([^<>\n"]{1,32})>|&lt;([^<>\n"]{1,32})&gt;)\s*/;

export function remarkCategoryPills() {
  return (tree) => {
    walk(tree);
  };
}

/**
 * @param {any} node
 */
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'heading') tagHeading(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) walk(child);
}

/**
 * @param {any} heading
 */
function tagHeading(heading) {
  const children = heading.children;
  if (!Array.isArray(children) || children.length === 0) return;
  const index = children.findIndex((child) => child?.type === 'text' && String(child.value).trim() !== '');
  if (index < 0) return;
  if (children.slice(0, index).some((child) => child?.type !== 'text')) return;

  const text = children[index];
  const match = String(text.value).match(LEADING_LABEL);
  if (!match) return;
  const label = (match[1] ?? match[2] ?? '').trim();
  if (!label || label.includes('://')) return;

  const rest = String(text.value).slice(match[0].length);
  if (rest) text.value = rest;
  else children.splice(index, 1);

  heading.data ??= {};
  heading.data.hProperties ??= {};
  heading.data.hProperties.dataCat = label;
}
