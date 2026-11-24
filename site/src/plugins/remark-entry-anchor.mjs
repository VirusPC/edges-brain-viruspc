const MARK = /^<!--\s*entry-anchor:([A-Za-z0-9_-]+)(?:\s+entry-id:(\S+))?\s*-->$/;

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
    let pendingId = '';
    /** @type {any[]} */
    const next = [];
    for (const node of children) {
      if (node?.type === 'html') {
        const match = MARK.exec(String(node.value || '').trim());
        if (match) {
          pending = match[1];
          pendingId = match[2] ? safeDecode(match[2]) : '';
          continue;
        }
      }
      if (pending && node?.type === 'heading') {
        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties.id = pending;
        if (pendingId) node.data.hProperties.dataEntryId = pendingId;
        pending = '';
        pendingId = '';
      }
      next.push(node);
    }
    tree.children = next;
  };
}

/**
 * @param {string} value
 */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
