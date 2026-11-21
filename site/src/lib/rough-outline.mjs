/**
 * Paint one shared Rough.js stroke on each AI News card.
 * CSS keeps the plain border until this runs. Scroll does not repaint.
 */
const SELECTOR = '.keyword-cloud, .model-board, .model-facts, .info-card, .article-card';
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {Document} [doc]
 */
export async function mountRoughOutlines(doc = document) {
  const nodes = [...doc.querySelectorAll(SELECTOR)];
  if (!nodes.length || typeof ResizeObserver !== 'function') return;
  let api;
  try {
    api = await import('./rough-rounded-rect.mjs');
  } catch {
    return;
  }

  const keys = new WeakMap();
  const readRadius = () => {
    const root = doc.documentElement;
    const raw = getComputedStyle(root).getPropertyValue('--ai-news-radius').trim();
    if (raw.endsWith('rem')) {
      const base = parseFloat(getComputedStyle(root).fontSize) || 16;
      return parseFloat(raw) * base;
    }
    if (raw.endsWith('px')) return parseFloat(raw);
    return 11.2;
  };

  /**
   * @param {Element} el
   * @param {number} [width]
   * @param {number} [height]
   * @param {number} [radius]
   */
  const paint = (el, width, height, radius) => {
    if (!el.isConnected) return;
    const label = el.classList.contains('info-card')
      ? (el.querySelector('.info-card-label')?.textContent || '')
      : '';
    const seed = api.seedForCard(el.className, label);
    if (!seed) return;
    const boxWidth = width ?? el.offsetWidth;
    const boxHeight = height ?? el.offsetHeight;
    if (boxWidth < 8 || boxHeight < 8) return;
    const usedRadius = Math.round((radius ?? readRadius()) * 10) / 10;
    const key = `${seed}:${Math.round(boxWidth)}:${Math.round(boxHeight)}:${usedRadius}`;
    if (keys.get(el) === key) return;
    const d = api.roughOutlinePath(boxWidth, boxHeight, usedRadius, seed);
    if (!d) return;
    let svg = el.classList.contains('keyword-cloud')
      ? el.querySelector('.keyword-cloud-outline')
      : el.querySelector(':scope > .rough-outline');
    if (!svg) {
      svg = doc.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      el.prepend(svg);
    }
    svg.setAttribute('class', svg.classList.contains('keyword-cloud-outline')
      ? 'keyword-cloud-outline rough-outline'
      : 'rough-outline');
    svg.setAttribute('viewBox', `0 0 ${Math.round(boxWidth)} ${Math.round(boxHeight)}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    let path = svg.querySelector('path');
    if (!path) {
      path = doc.createElementNS(SVG_NS, 'path');
      svg.append(path);
    }
    if (path.getAttribute('d') !== d) path.setAttribute('d', d);
    keys.set(el, key);
    el.classList.add('has-rough-outline');
  };

  let radius = readRadius();
  for (const el of nodes) paint(el, undefined, undefined, radius);

  let frame = 0;
  /** @type {Map<Element, { width: number, height: number }>} */
  const pending = new Map();
  const flush = () => {
    frame = 0;
    radius = readRadius();
    for (const [el, box] of pending) paint(el, box.width, box.height, radius);
    pending.clear();
  };
  const queue = (el, width, height) => {
    pending.set(el, { width, height });
    if (!frame) frame = requestAnimationFrame(flush);
  };
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const box = entry.borderBoxSize?.[0];
      const width = box ? Math.round(box.inlineSize) : entry.target.offsetWidth;
      const height = box ? Math.round(box.blockSize) : entry.target.offsetHeight;
      queue(entry.target, width, height);
    }
  });
  for (const el of nodes) observer.observe(el);
  doc.fonts?.ready?.then(() => {
    radius = readRadius();
    for (const el of nodes) queue(el, el.offsetWidth, el.offsetHeight);
  });
}
