const FLASH_MS = 2000;

/**
 * After a jump from the weekly overview, tint the target card, then let it fade.
 * @param {ParentNode} [root]
 */
export function flashEntry(root = document) {
  root.querySelectorAll('.entry-flash').forEach((node) => node.classList.remove('entry-flash'));
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const node = root.querySelector(`[id="${CSS.escape(id)}"]`);
  if (!node) return;
  const card = node.closest('.article-card, .note-card');
  /** @type {Element[]} */
  const targets = card ? [card] : [node];
  if (!card) {
    const next = node.nextElementSibling;
    if (next && (next.classList.contains('info-card') || next.classList.contains('model-facts'))) {
      targets.push(next);
    }
  }
  for (const target of targets) target.classList.add('entry-flash');
  window.setTimeout(() => {
    for (const target of targets) target.classList.remove('entry-flash');
  }, FLASH_MS);
}

export function mountEntryFlash(root = document) {
  flashEntry(root);
  window.addEventListener('hashchange', () => flashEntry(root));
}
