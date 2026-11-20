/**
 * Turn leading `<label>` marks on a heading into attributes, and drop them
 * from the heading text. Chapter lists keep the title only.
 *
 * The first label is `data-cat` (one capsule). Further labels are `data-tags`
 * (gray text). A single label, including older issues, stays `data-cat` only.
 *
 * Source: `#### &lt;主类&gt;&lt;自由标签&gt;[标题](url)`.
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
  const labels = [];
  let value = String(text.value);
  for (;;) {
    const match = value.match(LEADING_LABEL);
    if (!match) break;
    const label = (match[1] ?? match[2] ?? '').trim();
    if (!label || label.includes('://')) break;
    labels.push(label);
    value = value.slice(match[0].length);
  }
  if (labels.length === 0) return;

  if (value) text.value = value;
  else children.splice(index, 1);

  heading.data ??= {};
  heading.data.hProperties ??= {};
  heading.data.hProperties.dataCat = labels[0];
  if (labels.length > 1) heading.data.hProperties.dataTags = labels.slice(1).join(' · ');
}
