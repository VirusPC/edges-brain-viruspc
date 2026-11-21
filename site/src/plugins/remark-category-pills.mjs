/**
 * Turn leading `<label>` marks on a heading into attributes, and drop them
 * from the heading text. Chapter lists keep the title only.
 *
 * The first label is `data-cat` (one capsule). Further labels are `data-tags`.
 * A single label that names a 来源 company is `data-tags` only, so it does not
 * become the article type. Any other single label stays `data-cat`.
 *
 * Source: `#### &lt;主类&gt;&lt;公司&gt;[标题](url)`.
 */

import { canonicalCompany, sourceGroup } from '../lib/ai-news-category-filter.mjs';

function companyName(label) {
  const name = canonicalCompany(label);
  return sourceGroup(name) ? name : '';
}

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
  if (labels.length === 1 && companyName(labels[0])) {
    heading.data.hProperties.dataTags = companyName(labels[0]);
    return;
  }
  heading.data.hProperties.dataCat = labels[0];
  if (labels.length > 1) {
    heading.data.hProperties.dataTags = labels.slice(1).map((label) => companyName(label) || label).join(' · ');
  }
}
