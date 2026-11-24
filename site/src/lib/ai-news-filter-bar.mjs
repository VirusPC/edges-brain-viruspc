/** Wood-plaque filter bar shared by 精选文章 and 本周关键词. */

const SVG_NS = 'http://www.w3.org/2000/svg';

const VARIANT_CLASS = {
  all: 'ai-news-filter-all',
  category: 'ai-news-filter-cat',
  source: 'ai-news-filter-src',
  company: 'ai-news-filter-co',
  word: 'ai-news-filter-word',
};

const SEAM_GROOVE = 'M0 2.2 C 150 1.4, 300 3.2, 480 2.2 S 800 1.5, 1000 2.6';
const SEAM_LIP = 'M0 3.9 C 150 3.1, 300 4.9, 480 3.9 S 800 3.2, 1000 4.3';

/**
 * Visible chip text. A count is the same `名称 (n)` form as the article plaque.
 * @param {{ text?: string, count?: number }} option
 */
export function chipText(option) {
  const text = String(option?.text ?? '');
  if (typeof option?.count === 'number') return `${text} (${option.count})`;
  return text;
}

/**
 * The neutral「全部」chip shared by the article plaque and the keyword plaque.
 * A count uses the same `全部 (n)` label as the article rows. Without one, the
 * keyword plaque shows the word by itself.
 * @param {{ selected?: boolean, count?: number, row?: string }} [option]
 */
export function allOption(option = {}) {
  const data = { filter: 'all' };
  if (option.row) data.row = option.row;
  return {
    id: 'all',
    text: typeof option.count === 'number' ? chipText({ text: '全部', count: option.count }) : '全部',
    selected: Boolean(option.selected),
    variant: 'all',
    data,
  };
}

/**
 * @param {{ dataset?: { filter?: string } } | null | undefined} button
 */
export function isAllChip(button) {
  return button?.dataset?.filter === 'all';
}

/**
 * One row when the caller passes `options`. Several rows keep the article plaque's dimensions.
 * @param {{ title?: string, options?: object[], rows?: object[] }} spec
 */
export function filterRows(spec) {
  if (Array.isArray(spec?.rows) && spec.rows.length > 0) return spec.rows;
  return [{ id: 'main', label: spec?.title || '', options: spec?.options || [] }];
}

/**
 * Sticky tops so the keyword plaque, the chapter title, and the article plaque stack
 * without covering one another. `top` places each border box against the previous one.
 * The title and the article plaque have no vertical margin between them; that join is
 * padding on the title, and the height here already includes it.
 * @param {{ keyword?: { height?: number }, heading?: { height?: number }, article?: { height?: number } }} boxes
 */
export function stackLayout(boxes) {
  const keywordH = boxes?.keyword?.height || 0;
  const headingH = boxes?.heading?.height || 0;
  const articleH = boxes?.article?.height || 0;
  return {
    keywordTop: 0,
    headingTop: keywordH,
    articleTop: keywordH + headingH,
    stackHeight: keywordH + headingH + articleH,
  };
}

/**
 * @param {Document} doc
 * @param {string} name
 * @param {Record<string, string>} attrs
 */
function svgEl(doc, name, attrs) {
  const node = doc.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

/**
 * @param {HTMLButtonElement} button
 * @param {string} text
 */
export function fillChip(button, text) {
  button.dataset.label = text;
  button.replaceChildren();
  const face = button.ownerDocument.createElement('span');
  face.className = 'ai-news-filter-face';
  face.textContent = text;
  button.append(face);
}

/**
 * @param {HTMLButtonElement} button
 * @param {Record<string, string> | undefined} data
 */
function applyDataset(button, data) {
  if (!data) return;
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    button.dataset[key] = String(value);
  }
}

/**
 * @param {ParentNode} bar
 * @param {string} rowId
 * @param {string} optionId
 */
function findButton(bar, rowId, optionId) {
  for (const button of bar.querySelectorAll('button[data-option]')) {
    if (button.dataset.row === rowId && button.dataset.option === optionId) return button;
  }
  return null;
}

/** Wood plaque filters. Edge jitter is #wood-rough; grain is #wood-grain. */
function ensureWoodFilters(doc, bar) {
  if (doc.getElementById('wood-rough')) return;
  const defs = svgEl(doc, 'svg', { class: 'ai-news-filter-defs', 'aria-hidden': 'true', width: '0', height: '0' });
  const rough = svgEl(doc, 'filter', {
    id: 'wood-rough',
    filterUnits: 'objectBoundingBox',
    x: '-8%',
    y: '-20%',
    width: '116%',
    height: '150%',
  });
  rough.append(
    svgEl(doc, 'feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: '0.02',
      numOctaves: '2',
      seed: '7',
      result: 'noise',
    }),
    svgEl(doc, 'feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'noise',
      scale: '3.5',
    }),
  );
  const grain = svgEl(doc, 'filter', {
    id: 'wood-grain',
    x: '0',
    y: '0',
    width: '100%',
    height: '100%',
  });
  grain.append(
    svgEl(doc, 'feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: '0.012 0.35',
      numOctaves: '3',
      seed: '3',
      result: 'noise',
    }),
    svgEl(doc, 'feColorMatrix', {
      in: 'noise',
      type: 'matrix',
      values: '0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .15  0 0 0 .6 0',
      result: 'colored',
    }),
    svgEl(doc, 'feComposite', {
      in: 'colored',
      in2: 'SourceGraphic',
      operator: 'in',
    }),
  );
  defs.append(rough, grain);
  bar.prepend(defs);
}

/**
 * @param {Document} doc
 * @param {HTMLElement} bar
 */
function appendBoard(doc, bar) {
  const board = doc.createElement('div');
  board.className = 'ai-news-filter-board';
  board.setAttribute('aria-hidden', 'true');
  for (const side of ['l', 'r']) {
    const nail = doc.createElement('i');
    nail.className = `ai-news-filter-nail ${side}`;
    board.append(nail);
  }
  bar.prepend(board);
}

/**
 * @param {Document} doc
 * @param {HTMLElement} bar
 */
function appendSeam(doc, bar) {
  const seam = svgEl(doc, 'svg', {
    class: 'ai-news-filter-seam',
    viewBox: '0 0 1000 6',
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
  });
  seam.append(
    svgEl(doc, 'path', { class: 'groove', d: SEAM_GROOVE }),
    svgEl(doc, 'path', { class: 'lip', d: SEAM_LIP }),
  );
  bar.append(seam);
}

/**
 * @param {HTMLElement} button
 * @param {{ id?: string, text?: string, count?: number, selected?: boolean, hidden?: boolean, variant?: string, category?: string, data?: Record<string, string> }} option
 * @param {string} rowId
 */
function paintOption(button, option, rowId) {
  button.type = 'button';
  button.className = VARIANT_CLASS[option.variant] || VARIANT_CLASS.word;
  applyDataset(button, option.data);
  if (option.category) button.dataset.cat = option.category;
  button.dataset.row = rowId;
  button.dataset.option = option.id || '';
  fillChip(button, chipText(option));
  button.setAttribute('aria-pressed', option.selected ? 'true' : 'false');
  button.hidden = Boolean(option.hidden);
}

/**
 * Refresh labels, pressed state, and hidden chips. Rows and options stay as first rendered.
 * @param {HTMLElement} bar
 * @param {{ rows?: object[], options?: object[], title?: string, statusHidden?: boolean }} spec
 */
export function updateFilterBar(bar, spec) {
  for (const row of filterRows(spec)) {
    for (const option of row.options || []) {
      const button = findButton(bar, row.id, option.id || '');
      if (!button) continue;
      paintOption(button, option, row.id);
    }
  }
  const status = bar.querySelector('.ai-news-filter-status');
  if (status && spec?.statusHidden != null) status.hidden = Boolean(spec.statusHidden);
}

/**
 * @param {Document} doc
 * @param {{
 *   title?: string,
 *   selection?: 'single' | 'multi',
 *   sticky?: boolean,
 *   className?: string,
 *   options?: object[],
 *   rows?: object[],
 *   status?: string,
 *   onSelect?: (detail: { rowId: string, optionId: string, button: HTMLButtonElement }) => void,
 * }} spec
 */
export function createFilterBar(doc, spec) {
  const bar = doc.createElement('div');
  bar.className = ['ai-news-filter', spec?.className].filter(Boolean).join(' ');
  if (spec?.sticky === false) bar.classList.add('is-static');
  bar.dataset.selection = spec?.selection === 'single' ? 'single' : 'multi';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', spec?.title || '筛选');

  const rows = filterRows(spec);
  rows.forEach((row, index) => {
    if (index > 0) appendSeam(doc, bar);
    const line = doc.createElement('div');
    line.className = 'ai-news-filter-row';
    line.setAttribute('role', 'group');
    line.setAttribute('aria-label', row.label || spec?.title || '筛选');
    if (row.label) {
      const label = doc.createElement('span');
      label.className = 'ai-news-filter-label';
      label.textContent = row.label;
      label.setAttribute('aria-hidden', 'true');
      line.append(label);
    }
    for (const option of row.options || []) {
      const button = doc.createElement('button');
      paintOption(button, option, row.id);
      line.append(button);
    }
    bar.append(line);
  });

  let status = null;
  if (spec?.status) {
    status = doc.createElement('p');
    status.className = 'ai-news-filter-status';
    status.hidden = true;
    status.textContent = spec.status;
    bar.append(status);
  }
  ensureWoodFilters(doc, bar);
  appendBoard(doc, bar);

  if (spec?.onSelect) {
    bar.addEventListener('click', (event) => {
      const button = event.target?.closest?.('button');
      if (!button || !bar.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      spec.onSelect({
        rowId: button.dataset.row || '',
        optionId: button.dataset.option || '',
        button,
      });
    });
  }

  return {
    element: bar,
    status,
    update(next) { updateFilterBar(bar, next); },
  };
}

/**
 * @param {Window} view
 * @param {HTMLElement} el
 */
function readBox(view, el) {
  const style = view.getComputedStyle?.(el);
  return {
    height: el.offsetHeight || 0,
    marginTop: Number.parseFloat(style?.marginTop) || 0,
    marginBottom: Number.parseFloat(style?.marginBottom) || 0,
  };
}

/**
 * The h2 that introduces the selected-articles plaque.
 * @param {ParentNode} root
 */
function articleHeading(root) {
  const selected = root.querySelector(':scope > .ai-news-selected');
  let node = selected?.previousElementSibling || null;
  while (node && node.tagName !== 'H2') node = node.previousElementSibling;
  return node;
}

/**
 * Measure the keyword plaque and the chapter title, then pin the article plaque beneath them.
 * Offsets come from layout size only. Reading geometry on scroll and toggling paint from it
 * moves the stack on the same frame it pins.
 * @param {Document} doc
 */
export function bindFilterStack(doc) {
  const view = doc.defaultView;
  const root = doc.querySelector?.('.prose');
  const keyword = root?.querySelector('.ai-news-keyword-bar');
  if (!view || !root || !keyword || typeof view.ResizeObserver !== 'function') return;
  const article = root.querySelector('.ai-news-article-bar');
  const apply = () => {
    const heading = articleHeading(root);
    const keywordBox = readBox(view, keyword);
    const layout = stackLayout({
      keyword: keywordBox,
      heading: heading ? readBox(view, heading) : { height: 0, marginTop: 0, marginBottom: 0 },
      article: article ? readBox(view, article) : { height: 0, marginTop: 0, marginBottom: 0 },
    });
    root.style.setProperty('--ai-news-keyword-bar-h', `${keywordBox.height}px`);
    root.style.setProperty('--ai-news-heading-top', `${layout.headingTop}px`);
    root.style.setProperty('--ai-news-article-top', `${layout.articleTop}px`);
    root.style.setProperty('--ai-news-stack-h', `${layout.stackHeight}px`);
  };
  const heading = articleHeading(root);
  const observer = new view.ResizeObserver(apply);
  observer.observe(keyword);
  if (article) observer.observe(article);
  if (heading) observer.observe(heading);
  apply();
  view.addEventListener?.('resize', apply);
}
