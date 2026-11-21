/** Client-side filter for the AI 资讯「精选文章」 chapter. */

export const PRIMARY_CATEGORIES = ['模型', '架构', '产品', '实践', '开源', '其他'];
const PRIMARY = new Set(PRIMARY_CATEGORIES);

export function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function categoriesPresent(names) {
  const found = new Set(names.filter((name) => PRIMARY.has(name)));
  return PRIMARY_CATEGORIES.filter((name) => found.has(name));
}

export function filterChips(date, names) {
  const present = categoriesPresent(names);
  if (present.length === 0) return [];
  if (date >= '2026-11-20') return [...PRIMARY_CATEGORIES];
  return present;
}

/**
 * Hand-ordered 来源. Aliases collapse onto the canonical company.
 * Names missing from the lists stay in first-seen order after these.
 */
export const SOURCE_GROUPS = [
  { name: '国内模型厂', companies: ['DeepSeek', 'Kimi', 'GLM', 'MiniMax', 'StepFun'] },
  { name: '国外模型厂', companies: ['Anthropic', 'OpenAI', 'Google', 'xAI', 'Meta'] },
  { name: '国内非模型厂', companies: ['阿里', '腾讯', '字节', '快手', '美团', '百度'] },
  { name: '国外非模型厂', companies: ['Cursor', 'Cognition', 'Amp', 'LangChain', 'Warp', 'Lovable', 'Hugging Face', 'AWS', 'CodeRabbit', 'Zed', 'Latitude'] },
];

export const SOURCE_ORDER = SOURCE_GROUPS.flatMap((group) => group.companies);

/** Spellings that share one canonical chip. */
export const COMPANY_ALIASES = {
  月之暗面: 'Kimi',
  智谱: 'GLM',
  阶跃星辰: 'StepFun',
  淘宝: '阿里',
  火山引擎: '字节',
  ggml: 'Hugging Face',
  Cogonition: 'Cognition',
  Langchain: 'LangChain',
  Wrap: 'Warp',
  XAI: 'xAI',
};

const COMPANY_RANK = new Map(SOURCE_ORDER.map((name, index) => [name, index]));
const GROUP_OF = new Map(SOURCE_GROUPS.flatMap((group) => group.companies.map((name) => [name, group.name])));
const GROUP_NAMES = new Set(SOURCE_GROUPS.map((group) => group.name));

export function canonicalCompany(name) {
  return COMPANY_ALIASES[name] || name;
}

export function sourceGroup(name) {
  return GROUP_OF.get(canonicalCompany(name)) || '';
}

/** Company chips for one source type. An empty type means the full list. */
export function companiesForSource(names, src) {
  if (!src) return [...names];
  return names.filter((name) => sourceGroup(name) === src);
}

/** Unique company names in 来源 order. Repeats and aliases share one chip. */
export function companiesPresent(tagLists) {
  const seen = new Set();
  const names = [];
  for (const tags of tagLists) {
    for (const tag of tags || []) {
      if (!tag) continue;
      const name = canonicalCompany(tag);
      if (seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  const listed = [];
  const rest = [];
  for (const name of names) {
    if (COMPANY_RANK.has(name)) listed.push(name);
    else rest.push(name);
  }
  listed.sort((a, b) => COMPANY_RANK.get(a) - COMPANY_RANK.get(b));
  return listed.concat(rest);
}

function blankFilter() {
  return { cat: '', src: '', tag: '' };
}

export function parseFilter(search) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const cat = params.get('cat') || '';
  const tag = canonicalCompany((params.get('tag') || '').trim());
  let src = params.get('src') || '';
  const group = tag ? sourceGroup(tag) : '';
  if (group) src = group;
  return {
    cat: PRIMARY.has(cat) ? cat : '',
    src: GROUP_NAMES.has(src) ? src : '',
    tag,
  };
}

export function nextFilter(current, action) {
  const next = {
    cat: current?.cat || '',
    src: current?.src || '',
    tag: current?.tag ? canonicalCompany(current.tag) : '',
  };
  if (!action || action.kind === 'all') {
    if (action?.row === 'cat') next.cat = '';
    else if (action?.row === 'tag') next.tag = '';
    else if (action?.row === 'src') return { ...next, src: '', tag: '' };
    else return blankFilter();
    return next;
  }
  if (action.kind === 'cat') next.cat = next.cat === action.value ? '' : action.value;
  if (action.kind === 'src') {
    if (next.src === action.value) return { ...next, src: '', tag: '' };
    next.src = action.value;
    if (next.tag && sourceGroup(next.tag) !== next.src) next.tag = '';
  }
  if (action.kind === 'tag') {
    if (next.tag === action.value) next.tag = '';
    else {
      next.tag = action.value;
      const group = sourceGroup(action.value);
      if (group) next.src = group;
    }
  }
  return next;
}

export function toSearch(filter, currentSearch = '') {
  const raw = currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch;
  const params = new URLSearchParams(raw);
  params.delete('cat');
  params.delete('src');
  params.delete('tag');
  if (filter?.cat) params.set('cat', filter.cat);
  if (filter?.src) params.set('src', filter.src);
  if (filter?.tag) params.set('tag', filter.tag);
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** True when a sticky bar is pinned to its top offset, not sitting in normal flow. */
export function isFilterStuck(barTop, stickyTop, tolerance = 2) {
  return barTop <= stickyTop + tolerance;
}

export function itemMatches(item, filter) {
  if (filter?.cat && item.cat !== filter.cat) return false;
  if (filter?.src && item.src !== filter.src) return false;
  if (filter?.tag && !(item.tags || []).map(canonicalCompany).includes(canonicalCompany(filter.tag))) return false;
  return true;
}

export function sectionPlan(sections, filter) {
  const active = Boolean(filter?.cat || filter?.src || filter?.tag);
  const planned = sections.map((section) => {
    const items = section.items.map((item) => ({ id: item.id, show: itemMatches(item, filter) }));
    const show = !active || items.some((item) => item.show);
    return { id: section.id, show, items };
  });
  return { any: planned.some((section) => section.items.some((item) => item.show)), sections: planned };
}

function encloseChapter(heading) {
  const wrapper = heading.ownerDocument.createElement('div');
  wrapper.className = 'ai-news-selected';
  const nodes = [];
  let cursor = heading.nextElementSibling;
  while (cursor && cursor.tagName !== 'H2') {
    nodes.push(cursor);
    cursor = cursor.nextElementSibling;
  }
  heading.after(wrapper);
  for (const node of nodes) wrapper.append(node);
  return wrapper;
}

function stickyOffset(view, bar) {
  const top = view.getComputedStyle(bar).top;
  const value = Number.parseFloat(top);
  return Number.isFinite(value) ? value : 0;
}

function textOf(node) {
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

export function collectChapter(root) {
  const heading = [...root.querySelectorAll('h2')].find((node) => textOf(node).endsWith('精选文章'));
  if (!heading) return null;
  const groups = [];
  let cursor = heading.nextElementSibling;
  let group = null;
  let item = null;
  while (cursor && cursor.tagName !== 'H2') {
    if (cursor.classList.contains('ai-news-filter') || cursor.classList.contains('ai-news-filter-status')) {
      cursor = cursor.nextElementSibling;
      continue;
    }
    if (cursor.tagName === 'H3') {
      group = { id: String(groups.length), heading: cursor, items: [] };
      groups.push(group);
      item = null;
    } else if (isWrappedCard(cursor) && group) {
      const heading = cursor.querySelector('h4');
      if (heading) {
        item = itemFrom(group, heading, [cursor]);
        group.items.push(item);
      } else {
        item = null;
      }
    } else if (cursor.tagName === 'H4' && group) {
      item = itemFrom(group, cursor, [cursor]);
      group.items.push(item);
    } else if (item) {
      item.nodes.push(cursor);
    }
    cursor = cursor.nextElementSibling;
  }
  return { heading, groups };
}

function itemFrom(group, heading, nodes) {
  const tags = splitTags(heading.getAttribute('data-tags')).map(canonicalCompany);
  return {
    id: `${group.id}-${group.items.length}`,
    heading,
    nodes,
    cat: heading.getAttribute('data-cat') || '',
    tags,
    src: sourceGroup(tags[0] || '') || (GROUP_NAMES.has(textOf(group.heading)) ? textOf(group.heading) : ''),
  };
}

function setShown(node, show) {
  node.classList.toggle('ai-news-filter-hidden', !show);
}

function isWrappedCard(node) {
  return Boolean(node?.classList?.contains('article-card') || node?.classList?.contains('note-card'));
}

function tagRoot(item) {
  const card = item.nodes?.[0];
  if (card?.classList?.contains('note-card')) return card;
  return item.heading;
}

function paintTags(groups) {
  for (const section of groups) {
    for (const item of section.items) {
      const host = tagRoot(item);
      if ((!item.src && !item.tags.length) || host.querySelector('.ai-news-tag, .ai-news-src')) continue;
      const link = host.querySelector('a');
      const place = (button) => {
        if (link) host.insertBefore(button, link);
        else host.append(button);
      };
      if (item.src) {
        const source = host.ownerDocument.createElement('button');
        source.type = 'button';
        source.className = 'ai-news-filter-src ai-news-src';
        source.dataset.src = item.src;
        source.textContent = item.src;
        source.setAttribute('aria-pressed', 'false');
        place(source);
      }
      for (const tag of item.tags) {
        const button = host.ownerDocument.createElement('button');
        button.type = 'button';
        button.className = 'ai-news-filter-co ai-news-tag';
        button.dataset.tag = tag;
        button.textContent = tag;
        button.setAttribute('aria-pressed', 'false');
        place(button);
      }
      host.classList.add('has-tag-buttons');
    }
  }
}

function syncPressed(bar, groups, filter) {
  for (const button of bar.querySelectorAll('button')) {
    const kind = button.dataset.filter;
    let on = false;
    if (kind === 'all') {
      if (button.dataset.row === 'tag') on = !filter.tag;
      else if (button.dataset.row === 'src') on = !filter.src;
      else on = !filter.cat;
    } else if (kind === 'cat') on = filter.cat === button.dataset.cat;
    else if (kind === 'src') on = filter.src === button.dataset.src;
    else if (kind === 'tag') on = filter.tag === button.dataset.tag;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  for (const button of groups.flatMap((group) => group.items.flatMap((item) => [...tagRoot(item).querySelectorAll('.ai-news-src')]))) {
    button.setAttribute('aria-pressed', filter.src && filter.src === button.dataset.src ? 'true' : 'false');
  }
  for (const button of groups.flatMap((group) => group.items.flatMap((item) => [...tagRoot(item).querySelectorAll('.ai-news-tag')]))) {
    button.setAttribute('aria-pressed', filter.tag && filter.tag === button.dataset.tag ? 'true' : 'false');
  }
  const shown = new Set(companiesForSource(
    [...bar.querySelectorAll('.ai-news-filter-co')].map((button) => button.dataset.tag),
    filter.src,
  ));
  for (const button of bar.querySelectorAll('.ai-news-filter-co')) {
    button.hidden = !shown.has(button.dataset.tag);
  }
}

function applyDom(groups, status, filter) {
  const plan = sectionPlan(groups, filter);
  groups.forEach((group, index) => {
    const planned = plan.sections[index];
    setShown(group.heading, planned.show);
    group.items.forEach((item, itemIndex) => {
      const show = planned.show && planned.items[itemIndex].show;
      for (const node of item.nodes) setShown(node, show);
    });
  });
  status.hidden = !(filter?.cat || filter?.src || filter?.tag) || plan.any;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(doc, name, attrs) {
  const node = doc.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const SEAM_GROOVE = 'M0 2.2 C 150 1.4, 300 3.2, 480 2.2 S 800 1.5, 1000 2.6';
const SEAM_LIP = 'M0 3.9 C 150 3.1, 300 4.9, 480 3.9 S 800 3.2, 1000 4.3';

function fillChip(button, text) {
  button.dataset.label = text;
  button.replaceChildren();
  const face = button.ownerDocument.createElement('span');
  face.className = 'ai-news-filter-face';
  face.textContent = text;
  button.append(face);
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

export function mountCategoryFilter(doc) {
  const root = doc.querySelector?.('.prose');
  if (!root || root.dataset.filterReady === '1') return;
  const chapter = collectChapter(root);
  if (!chapter) return;
  const names = chapter.groups.flatMap((group) => group.items.map((item) => item.cat));
  const date = doc.querySelector('time[datetime]')?.getAttribute('datetime') || '';
  const present = filterChips(date, names);
  if (present.length === 0) return;
  root.dataset.filterReady = '1';
  paintTags(chapter.groups);

  const bar = doc.createElement('div');
  bar.className = 'ai-news-filter';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', '筛选精选文章');

  const addLabel = (row, text) => {
    const label = doc.createElement('span');
    label.className = 'ai-news-filter-label';
    label.textContent = text;
    label.setAttribute('aria-hidden', 'true');
    row.append(label);
  };

  const addAll = (row, rowName) => {
    const all = doc.createElement('button');
    all.type = 'button';
    all.className = 'ai-news-filter-all';
    all.dataset.filter = 'all';
    all.dataset.row = rowName;
    fillChip(all, '全部');
    row.append(all);
  };

  const row = doc.createElement('div');
  row.className = 'ai-news-filter-row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', '文章类型');
  addLabel(row, '文章类型');
  addAll(row, 'cat');
  for (const name of present) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'ai-news-filter-cat';
    button.dataset.filter = 'cat';
    button.dataset.cat = name;
    fillChip(button, name);
    row.append(button);
  }
  bar.append(row);

  const companies = companiesPresent(chapter.groups.map((group) => group.items.flatMap((item) => item.tags)));
  if (companies.length > 0) {
    const presentGroups = SOURCE_GROUPS.filter((group) => companies.some((name) => sourceGroup(name) === group.name));
    const sourceRow = doc.createElement('div');
    sourceRow.className = 'ai-news-filter-row';
    sourceRow.setAttribute('role', 'group');
    sourceRow.setAttribute('aria-label', '来源类型');
    addLabel(sourceRow, '来源类型');
    addAll(sourceRow, 'src');
    for (const group of presentGroups) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'ai-news-filter-src';
      button.dataset.filter = 'src';
      button.dataset.src = group.name;
      fillChip(button, group.name);
      sourceRow.append(button);
    }
    appendSeam(doc, bar);
    bar.append(sourceRow);

    const companyRow = doc.createElement('div');
    companyRow.className = 'ai-news-filter-row';
    companyRow.setAttribute('role', 'group');
    companyRow.setAttribute('aria-label', '来源公司');
    addLabel(companyRow, '来源公司');
    addAll(companyRow, 'tag');
    for (const name of companies) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'ai-news-filter-co';
      button.dataset.filter = 'tag';
      button.dataset.tag = name;
      fillChip(button, name);
      companyRow.append(button);
    }
    appendSeam(doc, bar);
    bar.append(companyRow);
  }
  const status = doc.createElement('p');
  status.className = 'ai-news-filter-status';
  status.hidden = true;
  status.textContent = '没有匹配的条目';
  bar.append(status);
  ensureWoodFilters(doc, bar);
  appendBoard(doc, bar);

  const wrapper = encloseChapter(chapter.heading);
  wrapper.prepend(bar);

  let filter = parseFilter(doc.defaultView?.location?.search || '');

  const write = (next, replace) => {
    const view = doc.defaultView;
    if (!view?.history || !view.location) return;
    const url = new URL(view.location.href);
    const search = toSearch(next, url.search);
    url.search = search;
    const target = `${url.pathname}${url.search}${url.hash}`;
    const current = `${view.location.pathname}${view.location.search}${view.location.hash}`;
    if (target === current) return;
    const state = { aiNewsFilter: next };
    if (replace) view.history.replaceState(state, '', target);
    else view.history.pushState(state, '', target);
  };

  const render = () => {
    syncPressed(bar, chapter.groups, filter);
    applyDom(chapter.groups, status, filter);
  };

  const choose = (action) => {
    const view = doc.defaultView;
    const stuck = view ? isFilterStuck(bar.getBoundingClientRect().top, stickyOffset(view, bar)) : false;
    filter = nextFilter(filter, action);
    write(filter, false);
    render();
    if (stuck) chapter.heading.scrollIntoView({ block: 'start' });
  };

  bar.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !bar.contains(button)) return;
    const kind = button.dataset.filter;
    if (kind === 'all') choose({ kind: 'all', row: button.dataset.row });
    else if (kind === 'cat') choose({ kind: 'cat', value: button.dataset.cat });
    else if (kind === 'src') choose({ kind: 'src', value: button.dataset.src });
    else if (kind === 'tag') choose({ kind: 'tag', value: button.dataset.tag });
  });

  root.addEventListener('click', (event) => {
    const source = event.target.closest('.ai-news-src');
    if (source && root.contains(source)) {
      choose({ kind: 'src', value: source.dataset.src });
      return;
    }
    const button = event.target.closest('.ai-news-tag');
    if (!button || !root.contains(button)) return;
    choose({ kind: 'tag', value: button.dataset.tag });
  });

  doc.defaultView?.addEventListener?.('popstate', () => {
    filter = parseFilter(doc.defaultView.location.search);
    render();
  });

  render();
}
