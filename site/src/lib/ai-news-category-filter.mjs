/** Client-side filter for the AI 资讯「精选文章」 chapter. */

import { allOption, createFilterBar, fillChip, isAllChip } from './ai-news-filter-bar.mjs';

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
  { name: '国外非模型厂', companies: ['Cursor', 'Cognition', 'Amp', 'LangChain', 'Warp', 'Lovable', 'Hugging Face', 'AWS', 'CodeRabbit', 'Zed', 'Latitude', 'lucumr'] },
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
  if (!GROUP_NAMES.has(src)) src = '';
  if (src && sourceGroup(tag) !== src) {
    return {
      cat: PRIMARY.has(cat) ? cat : '',
      src,
      tag: '',
    };
  }
  return {
    cat: PRIMARY.has(cat) ? cat : '',
    src,
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
    next.tag = '';
  }
  if (action.kind === 'tag') {
    const value = canonicalCompany(action.value);
    if (next.tag === value) next.tag = '';
    else if (!next.src || sourceGroup(value) === next.src) next.tag = value;
  }
  return next;
}

export function filterQueryMatches(search, filter) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return (params.get('cat') || '') === (filter?.cat || '')
    && (params.get('src') || '') === (filter?.src || '')
    && (params.get('tag') || '') === (filter?.tag || '');
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
  if (item?.keywordMatch === false) return false;
  if (filter?.cat && item.cat !== filter.cat) return false;
  if (filter?.src && item.src !== filter.src) return false;
  if (filter?.tag && !(item.tags || []).map(canonicalCompany).includes(canonicalCompany(filter.tag))) return false;
  return true;
}

/** Visible chip text. The number is how many selected articles carry that label. */
export function countLabel(name, count) {
  return `${name} (${count})`;
}

/** Static counts for an unfiltered selected-articles chapter. */
export function featuredCounts(items) {
  const list = items || [];
  const cats = Object.fromEntries(PRIMARY_CATEGORIES.map((name) => [name, 0]));
  const srcs = Object.fromEntries(SOURCE_GROUPS.map((group) => [group.name, 0]));
  const companies = {};
  for (const item of list) {
    if (Object.hasOwn(cats, item?.cat)) cats[item.cat] += 1;
    if (Object.hasOwn(srcs, item?.src)) srcs[item.src] += 1;
    const seen = new Set();
    for (const tag of item?.tags || []) {
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      companies[tag] = (companies[tag] || 0) + 1;
    }
  }
  return { total: list.length, cats, srcs, companies };
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
  const top = view.getComputedStyle?.(bar)?.top;
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
    if (
      cursor.classList.contains('ai-news-filter')
      || cursor.classList.contains('ai-news-filter-status')
      || cursor.classList.contains('ai-news-coverage')
    ) {
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
  for (const button of groups.flatMap((group) => group.items.flatMap((item) => [...tagRoot(item).querySelectorAll('.ai-news-cat')]))) {
    button.setAttribute('aria-pressed', filter.cat && filter.cat === button.dataset.cat ? 'true' : 'false');
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

function withKeyword(item) {
  const card = item.nodes?.[0];
  if (card?.getAttribute?.('data-keyword-match') === '0') return { ...item, keywordMatch: false };
  return item;
}

function keywordItems(items) {
  return items.filter((item) => item.nodes?.[0]?.getAttribute?.('data-keyword-match') !== '0');
}

function updateCountLabels(bar, counts) {
  for (const button of bar.querySelectorAll('button')) {
    const kind = button.dataset.filter;
    let name = '';
    let count = null;
    if (kind === 'all') {
      name = '全部';
      count = counts.total;
    } else if (kind === 'cat') {
      name = button.dataset.cat || '';
      count = counts.cats[name] || 0;
    } else if (kind === 'src') {
      name = button.dataset.src || '';
      count = counts.srcs[name] || 0;
    } else if (kind === 'tag') {
      name = button.dataset.tag || '';
      count = counts.companies[name] || 0;
    }
    if (count == null || !name) continue;
    fillChip(button, countLabel(name, count));
  }
}

function applyDom(groups, status, filter) {
  const live = groups.map((group) => ({ ...group, items: group.items.map(withKeyword) }));
  const plan = sectionPlan(live, filter);
  groups.forEach((group, index) => {
    const planned = plan.sections[index];
    setShown(group.heading, planned.show);
    group.items.forEach((item, itemIndex) => {
      const show = planned.show && planned.items[itemIndex].show;
      for (const node of item.nodes) setShown(node, show);
    });
  });
  const anyKeyword = groups.some((group) => group.items.some((item) => item.nodes?.[0]?.getAttribute?.('data-keyword-match') !== '0'));
  status.hidden = !(filter?.cat || filter?.src || filter?.tag) || plan.any || !anyKeyword;
}

function labelHeading(heading, count) {
  const base = textOf(heading).replace(/ \(\d+\)$/, '');
  heading.textContent = countLabel(base, count);
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
  const items = chapter.groups.flatMap((group) => group.items);
  const counts = featuredCounts(items);
  for (const group of chapter.groups) labelHeading(group.heading, group.items.length);

  let filter = parseFilter(doc.defaultView?.location?.search || '');
  const companies = companiesPresent(chapter.groups.map((group) => group.items.flatMap((item) => item.tags)));
  const presentGroups = SOURCE_GROUPS.filter((group) => companies.some((name) => sourceGroup(name) === group.name));
  const rows = [{
    id: 'cat',
    label: '文章类型',
    options: [
      allOption({ selected: !filter.cat, count: counts.total, row: 'cat' }),
      ...present.map((name) => ({
        id: name,
        text: countLabel(name, counts.cats[name] || 0),
        selected: filter.cat === name,
        variant: 'category',
        category: name,
        data: { filter: 'cat', cat: name },
      })),
    ],
  }];
  if (companies.length > 0) {
    rows.push({
      id: 'src',
      label: '来源类型',
      options: [
        allOption({ selected: !filter.src, count: counts.total, row: 'src' }),
        ...presentGroups.map((group) => ({
          id: group.name,
          text: countLabel(group.name, counts.srcs[group.name] || 0),
          selected: filter.src === group.name,
          variant: 'source',
          data: { filter: 'src', src: group.name },
        })),
      ],
    });
    rows.push({
      id: 'tag',
      label: '来源公司',
      options: [
        allOption({ selected: !filter.tag, count: counts.total, row: 'tag' }),
        ...companies.map((name) => ({
          id: name,
          text: countLabel(name, counts.companies[name] || 0),
          selected: filter.tag === name,
          variant: 'company',
          data: { filter: 'tag', tag: name },
        })),
      ],
    });
  }
  let choose = () => {};
  const built = createFilterBar(doc, {
    title: '筛选精选文章',
    selection: 'multi',
    sticky: true,
    className: 'ai-news-article-bar',
    rows,
    status: '没有匹配的条目',
    onSelect({ button }) {
      const kind = button.dataset.filter;
      if (isAllChip(button)) choose({ kind: 'all', row: button.dataset.row });
      else if (kind === 'cat') choose({ kind: 'cat', value: button.dataset.cat });
      else if (kind === 'src') choose({ kind: 'src', value: button.dataset.src });
      else if (kind === 'tag') choose({ kind: 'tag', value: button.dataset.tag });
    },
  });
  const bar = built.element;
  const status = built.status;

  const wrapper = encloseChapter(chapter.heading);
  wrapper.prepend(bar);
  const note = wrapper.querySelector(':scope > .ai-news-coverage');
  if (note) bar.after(note);

  if (doc.defaultView?.location && !filterQueryMatches(doc.defaultView.location.search || '', filter)) {
    const view = doc.defaultView;
    const url = new URL(view.location.href);
    url.search = toSearch(filter, url.search);
    view.history?.replaceState?.({ aiNewsFilter: filter }, '', `${url.pathname}${url.search}${url.hash}`);
  }

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
    updateCountLabels(bar, featuredCounts(keywordItems(items)));
    syncPressed(bar, chapter.groups, filter);
    applyDom(chapter.groups, status, filter);
  };

  root.addEventListener('ai-news-keyword', () => {
    render();
  });

  choose = (action) => {
    const view = doc.defaultView;
    const rectTop = bar.getBoundingClientRect?.()?.top;
    const stuck = view && typeof rectTop === 'number'
      ? isFilterStuck(rectTop, stickyOffset(view, bar))
      : false;
    filter = nextFilter(filter, action);
    write(filter, false);
    render();
    if (stuck) chapter.heading.scrollIntoView?.({ block: 'start' });
  };

  root.addEventListener('click', (event) => {
    const category = event.target.closest('.ai-news-cat');
    if (category && root.contains(category)) {
      choose({ kind: 'cat', value: category.dataset.cat });
      return;
    }
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
