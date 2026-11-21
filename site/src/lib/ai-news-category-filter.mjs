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
 * Publishers on the 来源 row.
 * Sort is domestic then foreign, and within that model labs, AI-native
 * companies, then traditional internet. The same cell uses zh-CN collation
 * (pinyin, then case-insensitive Latin). Names missing here sort last.
 */
export const COMPANY_CLASS = {
  DeepSeek: { region: 'cn', kind: 'model' },
  阿里: { region: 'cn', kind: 'internet' },
  百度: { region: 'cn', kind: 'internet' },
  火山引擎: { region: 'cn', kind: 'internet' },
  美团: { region: 'cn', kind: 'internet' },
  腾讯: { region: 'cn', kind: 'internet' },
  Anthropic: { region: 'intl', kind: 'model' },
  OpenAI: { region: 'intl', kind: 'model' },
  Amp: { region: 'intl', kind: 'ai' },
  Cognition: { region: 'intl', kind: 'ai' },
  Cursor: { region: 'intl', kind: 'ai' },
  ggml: { region: 'intl', kind: 'ai' },
  'Hugging Face': { region: 'intl', kind: 'ai' },
  LangChain: { region: 'intl', kind: 'ai' },
  Lovable: { region: 'intl', kind: 'ai' },
  Warp: { region: 'intl', kind: 'ai' },
  AWS: { region: 'intl', kind: 'internet' },
  Google: { region: 'intl', kind: 'internet' },
};

const COMPANY_REGION_RANK = { cn: 0, intl: 1 };
const COMPANY_KIND_RANK = { model: 0, ai: 1, internet: 2 };
const UNLISTED_REGION = 2;
const UNLISTED_KIND = 3;

function companyRank(name) {
  const info = COMPANY_CLASS[name];
  if (!info) return [UNLISTED_REGION, UNLISTED_KIND];
  return [COMPANY_REGION_RANK[info.region], COMPANY_KIND_RANK[info.kind]];
}

function compareCompanies(a, b) {
  const [regionA, kindA] = companyRank(a);
  const [regionB, kindB] = companyRank(b);
  if (regionA !== regionB) return regionA - regionB;
  if (kindA !== kindB) return kindA - kindB;
  return a.localeCompare(b, 'zh-CN', { sensitivity: 'base' });
}

/** Unique company names in 来源 order. Repeats stay on the first chip. */
export function companiesPresent(tagLists) {
  const seen = new Set();
  const names = [];
  for (const tags of tagLists) {
    for (const tag of tags || []) {
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      names.push(tag);
    }
  }
  return names.sort(compareCompanies);
}

export function parseFilter(search) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const cat = params.get('cat') || '';
  const tag = (params.get('tag') || '').trim();
  return { cat: PRIMARY.has(cat) ? cat : '', tag };
}

export function nextFilter(current, action) {
  const next = { cat: current?.cat || '', tag: current?.tag || '' };
  if (!action || action.kind === 'all') {
    if (action?.row === 'cat') next.cat = '';
    else if (action?.row === 'tag') next.tag = '';
    else return { cat: '', tag: '' };
    return next;
  }
  if (action.kind === 'cat') next.cat = next.cat === action.value ? '' : action.value;
  if (action.kind === 'tag') next.tag = next.tag === action.value ? '' : action.value;
  return next;
}

export function toSearch(filter, currentSearch = '') {
  const raw = currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch;
  const params = new URLSearchParams(raw);
  params.delete('cat');
  params.delete('tag');
  if (filter?.cat) params.set('cat', filter.cat);
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
  if (filter?.tag && !(item.tags || []).includes(filter.tag)) return false;
  return true;
}

export function sectionPlan(sections, filter) {
  const active = Boolean(filter?.cat || filter?.tag);
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
        item = {
          id: `${group.id}-${group.items.length}`,
          heading,
          nodes: [cursor],
          cat: heading.getAttribute('data-cat') || '',
          tags: splitTags(heading.getAttribute('data-tags')),
        };
        group.items.push(item);
      } else {
        item = null;
      }
    } else if (cursor.tagName === 'H4' && group) {
      item = {
        id: `${group.id}-${group.items.length}`,
        heading: cursor,
        nodes: [cursor],
        cat: cursor.getAttribute('data-cat') || '',
        tags: splitTags(cursor.getAttribute('data-tags')),
      };
      group.items.push(item);
    } else if (item) {
      item.nodes.push(cursor);
    }
    cursor = cursor.nextElementSibling;
  }
  return { heading, groups };
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
      const heading = item.heading;
      const host = tagRoot(item);
      if (!item.tags.length || host.querySelector('.ai-news-tag')) continue;
      const link = heading.querySelector('a');
      for (const tag of item.tags) {
        const button = heading.ownerDocument.createElement('button');
        button.type = 'button';
        button.className = 'ai-news-tag';
        button.dataset.tag = tag;
        button.textContent = tag;
        button.setAttribute('aria-pressed', 'false');
        if (link) heading.insertBefore(button, link);
        else heading.append(button);
      }
      heading.classList.add('has-tag-buttons');
    }
  }
}

function syncPressed(bar, groups, filter) {
  for (const button of bar.querySelectorAll('button')) {
    const kind = button.dataset.filter;
    let on = false;
    if (kind === 'all') on = button.dataset.row === 'tag' ? !filter.tag : !filter.cat;
    else if (kind === 'cat') on = filter.cat === button.dataset.cat;
    else if (kind === 'tag') on = filter.tag === button.dataset.tag;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  for (const button of groups.flatMap((group) => group.items.flatMap((item) => [...tagRoot(item).querySelectorAll('.ai-news-tag')]))) {
    button.setAttribute('aria-pressed', filter.tag && filter.tag === button.dataset.tag ? 'true' : 'false');
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
  status.hidden = !(filter?.cat || filter?.tag) || plan.any;
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
  row.setAttribute('aria-label', '分类');
  addLabel(row, '分类');
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
    const companyRow = doc.createElement('div');
    companyRow.className = 'ai-news-filter-row';
    companyRow.setAttribute('role', 'group');
    companyRow.setAttribute('aria-label', '来源');
    addLabel(companyRow, '来源');
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
    else if (kind === 'tag') choose({ kind: 'tag', value: button.dataset.tag });
  });

  root.addEventListener('click', (event) => {
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
