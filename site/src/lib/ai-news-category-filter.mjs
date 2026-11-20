/** Client-side filter for AI 资讯「国内进展 / 国际进展」. */

export const PRIMARY_CATEGORIES = ['模型', '产品', 'Agent 与 Harness', '工程实践', '开源', '行业'];
const PROGRESS_SECTIONS = ['四、国内进展', '五、国际进展'];
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

export function parseFilter(search) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const cat = params.get('cat');
  if (cat && PRIMARY.has(cat)) return { kind: 'cat', value: cat };
  const tag = (params.get('tag') || '').trim();
  if (tag) return { kind: 'tag', value: tag };
  return { kind: 'all' };
}

export function nextFilter(current, action) {
  if (!action || action.kind === 'all') return { kind: 'all' };
  if (current.kind === action.kind && current.value === action.value) return { kind: 'all' };
  return { kind: action.kind, value: action.value };
}

export function toSearch(filter, currentSearch = '') {
  const raw = currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch;
  const params = new URLSearchParams(raw);
  params.delete('cat');
  params.delete('tag');
  if (filter.kind === 'cat') params.set('cat', filter.value);
  if (filter.kind === 'tag') params.set('tag', filter.value);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function itemMatches(item, filter) {
  if (!filter || filter.kind === 'all') return true;
  if (filter.kind === 'cat') return item.cat === filter.value;
  if (filter.kind === 'tag') return item.tags.includes(filter.value);
  return true;
}

export function sectionPlan(sections, filter) {
  const planned = sections.map((section) => {
    const items = section.items.map((item) => ({ id: item.id, show: itemMatches(item, filter) }));
    const show = !filter || filter.kind === 'all' || items.some((item) => item.show);
    return { id: section.id, show, items };
  });
  return { any: planned.some((section) => section.items.some((item) => item.show)), sections: planned };
}

function textOf(node) {
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

function collectSections(root) {
  const headings = [...root.querySelectorAll('h2')].filter((heading) => PROGRESS_SECTIONS.includes(textOf(heading)));
  return headings.map((heading, index) => {
    const items = [];
    let cursor = heading.nextElementSibling;
    let current = null;
    while (cursor && cursor.tagName !== 'H2') {
      if (cursor.tagName === 'H4') {
        current = {
          id: `${index}-${items.length}`,
          heading: cursor,
          nodes: [cursor],
          cat: cursor.getAttribute('data-cat') || '',
          tags: splitTags(cursor.getAttribute('data-tags')),
        };
        items.push(current);
      } else if (current) {
        current.nodes.push(cursor);
      }
      cursor = cursor.nextElementSibling;
    }
    const previous = heading.previousElementSibling;
    return {
      id: String(index),
      heading,
      breakBefore: previous && previous.tagName === 'BR' ? previous : null,
      items,
    };
  });
}

function setShown(node, show) {
  node.classList.toggle('ai-news-filter-hidden', !show);
}

function paintTags(sections) {
  for (const section of sections) {
    for (const item of section.items) {
      const heading = item.heading;
      if (!item.tags.length || heading.querySelector('.ai-news-tag')) continue;
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

function syncPressed(bar, sections, filter) {
  for (const button of bar.querySelectorAll('button')) {
    const kind = button.dataset.filter;
    const value = kind === 'cat' ? button.dataset.cat : kind === 'tag' ? button.dataset.tag : '';
    const on = filter.kind === 'all' ? kind === 'all' : filter.kind === kind && filter.value === value;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  for (const button of sections.flatMap((section) => section.items.flatMap((item) => [...item.heading.querySelectorAll('.ai-news-tag')]))) {
    const on = filter.kind === 'tag' && filter.value === button.dataset.tag;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

function applyDom(sections, status, filter) {
  const plan = sectionPlan(sections, filter);
  sections.forEach((section, index) => {
    const planned = plan.sections[index];
    setShown(section.heading, planned.show);
    if (section.breakBefore) setShown(section.breakBefore, planned.show);
    section.items.forEach((item, itemIndex) => {
      const show = planned.items[itemIndex].show;
      for (const node of item.nodes) setShown(node, show);
    });
  });
  status.hidden = filter.kind === 'all' || plan.any;
}

export function mountCategoryFilter(doc) {
  const root = doc.querySelector?.('.prose');
  if (!root || root.dataset.filterReady === '1') return;
  const sections = collectSections(root);
  const names = sections.flatMap((section) => section.items.map((item) => item.cat));
  const date = doc.querySelector('time[datetime]')?.getAttribute('datetime') || '';
  const present = filterChips(date, names);
  if (present.length === 0) return;
  root.dataset.filterReady = '1';
  paintTags(sections);

  const bar = doc.createElement('div');
  bar.className = 'ai-news-filter';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', '按标签筛选');
  const all = doc.createElement('button');
  all.type = 'button';
  all.className = 'ai-news-filter-all';
  all.dataset.filter = 'all';
  all.textContent = '全部';
  bar.append(all);
  for (const name of present) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'ai-news-filter-cat';
    button.dataset.filter = 'cat';
    button.dataset.cat = name;
    button.textContent = name;
    bar.append(button);
  }
  const status = doc.createElement('p');
  status.className = 'ai-news-filter-status';
  status.hidden = true;
  status.textContent = '没有匹配的条目';
  bar.append(status);

  const anchor = sections[0].breakBefore || sections[0].heading;
  anchor.before(bar);

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
    syncPressed(bar, sections, filter);
    applyDom(sections, status, filter);
  };

  const choose = (action) => {
    filter = nextFilter(filter, action);
    write(filter, false);
    render();
  };

  bar.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !bar.contains(button)) return;
    const kind = button.dataset.filter;
    if (kind === 'all') choose({ kind: 'all' });
    else if (kind === 'cat') choose({ kind: 'cat', value: button.dataset.cat });
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
