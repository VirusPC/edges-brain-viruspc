/** One keyword at a time, shared by the word cloud, overview tags, and the keyword plaque. */

import { featuredCounts } from './ai-news-category-filter.mjs';
import { allOption, bindFilterStack, createFilterBar, isAllChip } from './ai-news-filter-bar.mjs';

export const EMPTY_LABEL = {
  models: '无相关模型',
  projects: '无相关项目',
  articles: '无相关文章',
};

const CHAPTERS = [
  { title: '二、模型进展', key: 'models' },
  { title: '三、项目开源', key: 'projects' },
  { title: '四、精选文章', key: 'articles' },
];

/**
 * Clicking the active word clears it. Clicking another word switches.
 * @param {string} current
 * @param {string} name
 */
export function nextKeyword(current, name) {
  const word = String(name || '');
  if (!word) return current || '';
  return current === word ? '' : word;
}

/**
 * The shared「全部」chip always clears. A word still toggles.
 * @param {string} current
 * @param {string} optionId
 * @param {{ all?: boolean }} [choice]
 */
export function keywordAfterSelect(current, optionId, choice = {}) {
  if (choice.all) return '';
  return nextKeyword(current, optionId);
}

const FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

/**
 * Escape leaves the current word. A focused field keeps the key for itself.
 * @param {{ key?: string, defaultPrevented?: boolean, target?: { closest?: (selector: string) => unknown } }} event
 * @param {string} keyword
 */
export function escapeClearsKeyword(event, keyword) {
  if (!keyword) return false;
  if (!event || event.key !== 'Escape' || event.defaultPrevented) return false;
  const target = event.target;
  const field = typeof target?.closest === 'function' ? target.closest(FIELD_SELECTOR) : null;
  return !field;
}

/**
 * A word button keeps its toggle. Empty space inside the cloud clears.
 * Another control inside the cloud is left alone.
 * @param {{ closest?: (selector: string) => Element | null } | null | undefined} target
 * @param {Element | null | undefined} cloud
 * @returns {'word' | 'blank' | null}
 */
export function cloudClickKind(target, cloud) {
  let node = target;
  if (node?.nodeType === 3) node = node.parentElement;
  if (!cloud || !node || typeof node.closest !== 'function' || !cloud.contains(node)) return null;
  const word = node.closest('button[data-keyword]');
  if (word && cloud.contains(word)) return 'word';
  const other = node.closest('a, button, input, textarea, select, label');
  if (other && cloud.contains(other)) return null;
  return 'blank';
}

/**
 * A theme card stays bright only when its own tag is the active word.
 * A cloud word that is not a theme tag dims every card and lights no tag.
 * @param {string} tag
 * @param {string} keyword
 */
export function overviewCardState(tag, keyword) {
  const active = Boolean(keyword);
  const on = active && tag === keyword;
  return { on, dim: active && !on };
}

/**
 * No target set means the filter is off. An empty set matches nothing.
 * @param {string[] | undefined} ids
 * @param {Set<string> | null | undefined} targets
 */
export function entryListed(ids, targets) {
  if (!targets) return true;
  for (const id of ids || []) {
    if (targets.has(id)) return true;
  }
  return false;
}

/**
 * @param {{ ids?: string[] }[]} blocks
 * @param {Set<string> | null | undefined} targets
 */
export function chapterTally(blocks, targets) {
  const total = blocks.length;
  const shown = targets ? blocks.filter((block) => entryListed(block.ids, targets)).length : total;
  return { shown, total, empty: Boolean(targets) && shown === 0 };
}

/**
 * Wood-plaque counts use the keyword subset. Category chips then AND on top.
 * @param {{ entryId?: string }[]} items
 * @param {Set<string> | null | undefined} targets
 */
export function matchingEntries(items, targets) {
  if (!targets) return items;
  return items.filter((item) => targets.has(item.entryId));
}

/**
 * @param {{ entryId?: string, cat?: string, tags?: string[], src?: string }[]} items
 * @param {Set<string> | null | undefined} targets
 */
export function keywordCounts(items, targets) {
  return featuredCounts(matchingEntries(items, targets));
}

/**
 * @param {ParentNode} doc
 */
export function mountKeywordFilter(doc) {
  const root = doc.querySelector?.('.prose');
  if (!root || root.dataset.keywordReady === '1') return;
  const dataNode = root.querySelector('.keyword-filter-data');
  if (!dataNode?.textContent) return;
  let data;
  try {
    data = JSON.parse(dataNode.textContent);
  } catch {
    return;
  }
  const list = (Array.isArray(data?.keywords) ? data.keywords : [])
    .filter((item) => item && typeof item.name === 'string' && item.name);
  const keywords = new Map();
  /** @type {{ id: string, text: string, variant: string, data: { keyword: string } }[]} */
  const words = [];
  for (const item of list) {
    if (keywords.has(item.name)) continue;
    keywords.set(item.name, new Set(Array.isArray(item.targets) ? item.targets : []));
    words.push({
      id: item.name,
      text: item.name,
      variant: 'word',
      data: { keyword: item.name },
    });
  }
  if (keywords.size === 0) return;
  root.dataset.keywordReady = '1';

  const chapters = CHAPTERS.map((chapter) => {
    const heading = [...root.querySelectorAll('h2')].find((node) => textOf(node).startsWith(chapter.title));
    if (!heading) return null;
    return { ...chapter, heading, ...collect(chapter.key, heading) };
  }).filter(Boolean);

  const apply = (keyword) => {
    const active = Boolean(keyword);
    const targets = active ? (keywords.get(keyword) || new Set()) : null;
    root.dataset.activeKeyword = keyword || '';
    for (const cloud of root.querySelectorAll('.keyword-cloud')) {
      cloud.classList.toggle('is-filtering', active);
    }
    for (const button of root.querySelectorAll('button[data-keyword]')) {
      const on = active && button.getAttribute('data-keyword') === keyword;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    const all = root.querySelector('.ai-news-keyword-bar button[data-filter="all"]');
    if (all) all.setAttribute('aria-pressed', active ? 'false' : 'true');
    for (const card of root.querySelectorAll('.weekly-overview-card')) {
      const tag = card.querySelector('.overview-tag')?.getAttribute('data-keyword') || '';
      card.classList.toggle('is-dim', overviewCardState(tag, keyword).dim);
    }
    for (const chapter of chapters) {
      paintChapter(chapter, keyword, targets);
    }
    if (root.dataset.filterReady === '1') {
      const view = root.ownerDocument?.defaultView;
      const EventCtor = view?.CustomEvent || view?.Event;
      if (EventCtor) root.dispatchEvent(new EventCtor('ai-news-keyword'));
    }
  };

  const cloud = root.querySelector('.keyword-cloud');
  const options = [allOption({ selected: true }), ...words];
  const bar = createFilterBar(doc, {
    title: '本周关键词',
    selection: 'single',
    sticky: true,
    className: 'ai-news-keyword-bar',
    options,
    onSelect({ optionId, button }) {
      apply(keywordAfterSelect(root.dataset.activeKeyword || '', optionId, { all: isAllChip(button) }));
    },
  });
  if (cloud) cloud.before(bar.element);
  else {
    const heading = [...root.querySelectorAll('h2')].find((node) => textOf(node).startsWith('一、本周概览'));
    if (heading) heading.after(bar.element);
    else root.prepend(bar.element);
  }
  bindFilterStack(doc);

  root.addEventListener('click', (event) => {
    const origin = event.target?.nodeType === 3 ? event.target.parentElement : event.target;
    const cloudHit = origin?.closest?.('.keyword-cloud');
    if (cloudHit && root.contains(cloudHit)) {
      const kind = cloudClickKind(origin, cloudHit);
      if (kind === 'word') {
        const button = origin.closest('button[data-keyword]');
        event.preventDefault();
        apply(keywordAfterSelect(root.dataset.activeKeyword || '', button.getAttribute('data-keyword') || ''));
        return;
      }
      if (kind === 'blank') {
        apply('');
        return;
      }
    }
    const button = origin?.closest?.('button[data-keyword]');
    if (!button || !root.contains(button) || button.closest('.ai-news-keyword-bar')) return;
    event.preventDefault();
    apply(keywordAfterSelect(root.dataset.activeKeyword || '', button.getAttribute('data-keyword') || ''));
  });

  doc.defaultView?.addEventListener?.('keydown', (event) => {
    if (!escapeClearsKeyword(event, root.dataset.activeKeyword || '')) return;
    event.preventDefault();
    apply('');
  });
}

/**
 * @param {string} key
 * @param {Element} heading
 */
function collect(key, heading) {
  const elements = chapterElements(heading);
  if (key === 'models') return collectModels(elements);
  return { blocks: cardBlocks(elements) };
}

/**
 * @param {Element} heading
 */
function chapterElements(heading) {
  const nodes = [];
  let cursor = heading.nextElementSibling;
  while (cursor && cursor.tagName !== 'H2') {
    nodes.push(cursor);
    cursor = cursor.nextElementSibling;
  }
  if (nodes.length === 1 && nodes[0].classList.contains('ai-news-selected')) {
    return [...nodes[0].children];
  }
  return nodes;
}

/**
 * @param {Element[]} elements
 */
function collectModels(elements) {
  /** @type {{ ids: string[], nodes: Element[], panel?: Element, board?: Element }[]} */
  const blocks = [];
  const board = elements.find((node) => node.classList?.contains('model-board')) || null;
  if (board) {
    for (const panel of board.querySelectorAll('.model-panel')) {
      blocks.push({ ids: readIdList(panel), nodes: [panel], panel, board });
    }
  }
  for (let index = 0; index < elements.length; index += 1) {
    const node = elements[index];
    if (node.tagName !== 'H4') continue;
    const nodes = [node];
    for (let next = index + 1; next < elements.length; next += 1) {
      const sibling = elements[next];
      if (sibling.tagName === 'H2' || sibling.tagName === 'H3' || sibling.tagName === 'H4') break;
      if (sibling.classList?.contains('model-board')) break;
      nodes.push(sibling);
    }
    blocks.push({ ids: readEntryId(node), nodes });
  }
  return { blocks, board };
}

/**
 * @param {Element[]} elements
 */
function cardBlocks(elements) {
  return elements
    .filter((node) => node.classList?.contains('article-card'))
    .map((card) => ({ ids: readEntryId(card), nodes: [card] }));
}

/**
 * @param {{ key: string, heading: Element, blocks: { ids: string[], nodes: Element[], panel?: Element, board?: Element }[], board?: Element | null }} chapter
 * @param {string} keyword
 * @param {Set<string> | null} targets
 */
function paintChapter(chapter, keyword, targets) {
  const active = Boolean(keyword);
  const tally = chapterTally(chapter.blocks, targets);
  const { heading } = chapter;
  heading.classList.toggle('has-keyword-filter', active);
  let count = heading.querySelector('.keyword-filter-count');
  if (!active) {
    count?.remove();
  } else {
    if (!count) {
      count = heading.ownerDocument.createElement('span');
      count.className = 'keyword-filter-count';
      heading.append(count);
    }
    count.textContent = `${tally.shown}/${tally.total}`;
  }
  const note = ensureEmpty(heading, chapter.key);
  note.hidden = !tally.empty;
  const filterReady = Boolean(heading.closest('.prose')?.dataset.filterReady === '1');
  if (chapter.board) {
    let anyPanel = false;
    for (const block of chapter.blocks) {
      if (!block.panel) continue;
      const show = entryListed(block.ids, targets);
      block.panel.classList.toggle('is-keyword-hidden', active && !show);
      if (!active || show) anyPanel = true;
      const option = chapter.board.querySelector(`option[value="${block.panel.getAttribute('data-panel')}"]`);
      if (option) {
        option.hidden = active && !show;
        option.disabled = active && !show;
      }
    }
    chapter.board.classList.toggle('ai-news-filter-hidden', active && !anyPanel);
    chapter.board.dispatchEvent(new CustomEvent('keyword-board-sync'));
  }
  for (const block of chapter.blocks) {
    if (block.panel) continue;
    const show = entryListed(block.ids, targets);
    const article = chapter.key === 'articles';
    for (const node of block.nodes) {
      if (article) node.setAttribute('data-keyword-match', !active || show ? '1' : '0');
      if (!article || !filterReady) node.classList.toggle('ai-news-filter-hidden', active && !show);
    }
  }
}

/**
 * @param {Element} heading
 * @param {string} key
 */
function ensureEmpty(heading, key) {
  const next = heading.nextElementSibling;
  if (next?.classList.contains('keyword-filter-empty')) {
    next.textContent = EMPTY_LABEL[key];
    return next;
  }
  const note = heading.ownerDocument.createElement('p');
  note.className = 'keyword-filter-empty';
  note.textContent = EMPTY_LABEL[key];
  note.hidden = true;
  heading.after(note);
  return note;
}

/**
 * @param {Element} node
 */
function readEntryId(node) {
  const host = node.matches?.('[data-entry-id]') ? node : node.querySelector?.('[data-entry-id]');
  const id = host?.getAttribute('data-entry-id') || '';
  return id ? [id] : [];
}

/**
 * @param {Element} panel
 */
function readIdList(panel) {
  const host = panel.matches?.('[data-entry-ids]') ? panel : panel.querySelector?.('[data-entry-ids]');
  const raw = host?.getAttribute('data-entry-ids') || '';
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && id) : [];
  } catch {
    return [];
  }
}

/**
 * @param {Element} node
 */
function textOf(node) {
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
}
