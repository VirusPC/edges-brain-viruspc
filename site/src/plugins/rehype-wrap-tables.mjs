/**
 * Give every markdown table its own horizontal scroller.
 * The weekly page clips overflow on `.prose` so the sticky plaques use the
 * viewport. A bare table would be clipped with the prose; `.table-wrap` scrolls.
 */

export function rehypeWrapTables() {
  return (tree) => {
    wrapTables(tree);
  };
}

/**
 * @param {any} node
 */
export function wrapTables(node) {
  const children = node?.children;
  if (!Array.isArray(children)) return;
  for (const child of children) wrapTables(child);
  if (isTableWrap(node)) return;
  node.children = children.map((child) => {
    if (child?.type !== 'element' || child.tagName !== 'table') return child;
    return {
      type: 'element',
      tagName: 'div',
      properties: { className: ['table-wrap'] },
      children: [child],
    };
  });
}

/**
 * @param {any} node
 */
function isTableWrap(node) {
  const names = node?.properties?.className;
  return Array.isArray(names) && names.includes('table-wrap');
}
