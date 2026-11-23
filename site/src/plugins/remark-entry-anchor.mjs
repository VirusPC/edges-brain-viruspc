const MARK = /^<!--\s*entry-anchor:([A-Za-z0-9_-]+)\s*-->$/;

/**
 * Turn the compose-time comment into the next heading's id.
 * The id is the entry anchor, not the title slug.
 * @returns {(tree: any) => void}
 */
export function remarkEntryAnchor() {
  return (tree) => {
    const children = tree?.children;
    if (!Array.isArray(children)) return;
    let pending = '';
    /** @type {any[]} */
    const next = [];
    for (const node of children) {
      if (node?.type === 'html') {
        const match = MARK.exec(String(node.value || '').trim());
        if (match) {
          pending = match[1];
          continue;
        }
      }
      if (pending && node?.type === 'heading') {
        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties.id = pending;
        pending = '';
      }
      next.push(node);
    }
    tree.children = next;
  };
}
