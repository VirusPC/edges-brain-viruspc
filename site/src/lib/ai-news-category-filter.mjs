/** Client-side filter for the AI 资讯「精选文章」 chapter. */

export const PRIMARY_CATEGORIES = ['模型', '产品', 'Agent 与 Harness', '工程实践', '开源', '行业'];
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
  { name: '国内非模型厂', companies: ['阿里', '腾讯', '火山引擎', '字节', '快手', '美团', '百度'] },
  { name: '国外非模型厂', companies: ['Cursor', 'Cognition', 'Amp', 'LangChain', 'Warp', 'Lovable', 'Hugging Face', 'AWS', 'CodeRabbit', 'Zed', 'Latitude'] },
];

export const SOURCE_ORDER = SOURCE_GROUPS.flatMap((group) => group.companies);

/** Spellings that share one canonical chip. */
export const COMPANY_ALIASES = {
  月之暗面: 'Kimi',
  智谱: 'GLM',
  阶跃星辰: 'StepFun',
  淘宝: '阿里',
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
  const tag = (params.get('tag') || '').trim();
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
  const next = { cat: current?.cat || '', src: current?.src || '', tag: current?.tag || '' };
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
  if (filter?.tag && !(item.tags || []).includes(filter.tag)) return false;
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
  for (const button of bar.querySelectorAll('.ai-news-filter-co')) {
    button.hidden = Boolean(filter.src) && sourceGroup(button.dataset.tag) !== filter.src;
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
    all.textContent = '全部';
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
    button.textContent = name;
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
      button.textContent = group.name;
      sourceRow.append(button);
    }
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
      button.textContent = name;
      companyRow.append(button);
    }
    bar.append(companyRow);
  }
  const status = doc.createElement('p');
  status.className = 'ai-news-filter-status';
  status.hidden = true;
  status.textContent = '没有匹配的条目';
  bar.append(status);

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
