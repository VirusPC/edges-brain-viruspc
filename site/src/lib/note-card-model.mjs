/**
 * Turn a wrapped 「项目开源」 or 「精选文章」 card into NoteCard props.
 * Sections and the one-line summary are optional. Source markdown stays as written.
 */

import { splitTags } from './ai-news-category-filter.mjs';

const VOID = new Set(['br', 'img', 'hr', 'wbr', 'source']);

/**
 * @param {string} html
 */
export function splitNoteCards(html) {
  /** @type {{ kind: 'html', html: string } | { kind: 'card', card: ReturnType<typeof parseArticleCard> }[]} */
  const blocks = [];
  let cursor = 0;
  while (cursor < html.length) {
    const found = findNextCard(html, cursor);
    if (!found) {
      const rest = html.slice(cursor);
      if (rest) blocks.push({ kind: 'html', html: rest });
      break;
    }
    if (found.start > cursor) blocks.push({ kind: 'html', html: html.slice(cursor, found.start) });
    blocks.push({ kind: 'card', card: parseArticleCard(found.inner) });
    cursor = found.end;
  }
  return blocks;
}

/**
 * @param {string} inner
 */
export function parseArticleCard(inner) {
  const nodes = topNodes(inner);
  let category = '';
  /** @type {string[]} */
  let sources = [];
  let title = '';
  let href = '';
  let headingId = '';
  /** @type {string[]} */
  const lede = [];
  /** @type {string[]} */
  const extra = [];
  /** @type {{ label: string, html: string, highlight: boolean }[]} */
  const sections = [];
  let phase = 'before';

  for (const node of nodes) {
    if (node.tag === 'h4' && phase === 'before') {
      const attrs = parseAttrs(node.attrText);
      category = decode(attrs['data-cat'] || '');
      sources = splitTags(decode(attrs['data-tags'] || ''));
      headingId = decode(attrs.id || '');
      const link = topNodes(node.inner).find((child) => child.tag === 'a');
      if (link) {
        href = decode(parseAttrs(link.attrText).href || '');
        title = stripTags(link.inner);
      } else {
        title = stripTags(node.inner);
      }
      phase = 'lead';
      continue;
    }
    if (node.tag === 'details' && phase === 'lead' && hasClass(node.attrText, 'article-more')) {
      for (const child of topNodes(node.inner)) {
        if (child.tag === 'summary') continue;
        if (child.tag === 'p') sections.push(parseParagraph(child.inner));
        else extra.push(child.raw);
      }
      phase = 'after';
      continue;
    }
    if (phase === 'lead' && node.tag === 'p') lede.push(node.inner.trim());
    else extra.push(node.raw);
  }

  return {
    category,
    sources,
    title,
    href,
    headingId,
    ledeHtml: lede.filter(Boolean).map((html) => `<p class="note-card-lede">${html}</p>`).join(''),
    sections: sections.filter((section) => section.label || section.html),
    extraHtml: extra.join(''),
  };
}

/**
 * @param {string} inner
 */
function parseParagraph(inner) {
  const match = inner.match(/^\s*<strong>([\s\S]*?)<\/strong>\s*/);
  if (!match) return { label: '', html: inner.trim(), highlight: false };
  const rawLabel = stripTags(match[1]).replace(/[:：]\s*$/, '').trim();
  const html = inner.slice(match[0].length).trim();
  return { label: displayLabel(rawLabel), html, highlight: rawLabel === '洞察与启发' };
}

/** Source copy keeps the long first label. The card shows the shorter one. */
const DISPLAY_LABELS = new Map([
  ['解决什么问题', '什么问题'],
  ['在解决什么问题', '什么问题'],
]);

/**
 * @param {string} label
 */
function displayLabel(label) {
  return DISPLAY_LABELS.get(label) || label;
}

/**
 * @param {string} html
 * @param {number} from
 */
function findNextCard(html, from) {
  const re = /<div\b([^>]*)>/gi;
  re.lastIndex = from;
  let match = re.exec(html);
  while (match) {
    if (hasClass(match[1], 'article-card')) {
      const openEnd = match.index + match[0].length;
      const close = findClose(html, openEnd, 'div');
      return { start: match.index, end: close.end, inner: html.slice(openEnd, close.start) };
    }
    match = re.exec(html);
  }
  return null;
}

/**
 * @param {string} html
 */
export function topNodes(html) {
  /** @type {{ tag: string, raw: string, inner: string, attrText: string }[]} */
  const nodes = [];
  let index = 0;
  while (index < html.length) {
    while (index < html.length && /\s/.test(html[index])) index += 1;
    if (index >= html.length) break;
    if (html.startsWith('<!--', index)) {
      const end = html.indexOf('-->', index);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[index] !== '<') {
      const next = html.indexOf('<', index);
      const text = html.slice(index, next === -1 ? html.length : next);
      if (text.trim()) nodes.push({ tag: '#text', raw: text, inner: text, attrText: '' });
      index = next === -1 ? html.length : next;
      continue;
    }
    const open = html.slice(index).match(/^<([A-Za-z][\w:-]*)\b([^>]*)>/);
    if (!open) break;
    const tag = open[1].toLowerCase();
    const attrText = open[2] || '';
    const openEnd = index + open[0].length;
    if (VOID.has(tag) || /\/\s*$/.test(attrText)) {
      nodes.push({ tag, raw: html.slice(index, openEnd), inner: '', attrText });
      index = openEnd;
      continue;
    }
    const close = findClose(html, openEnd, tag);
    nodes.push({
      tag,
      raw: html.slice(index, close.end),
      inner: html.slice(openEnd, close.start),
      attrText,
    });
    index = close.end;
  }
  return nodes;
}

/**
 * @param {string} html
 * @param {number} from
 * @param {string} tag
 */
function findClose(html, from, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1;
  let match = re.exec(html);
  while (match) {
    const closing = match[1] === '/';
    const selfClosing = !closing && /\/\s*>$/.test(match[0]);
    if (!selfClosing) depth += closing ? -1 : 1;
    if (depth === 0) return { start: match.index, end: match.index + match[0].length };
    match = re.exec(html);
  }
  return { start: html.length, end: html.length };
}

/**
 * @param {string} attrText
 */
function parseAttrs(attrText) {
  /** @type {Record<string, string>} */
  const attrs = {};
  const re = /([:@\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match = re.exec(attrText);
  while (match) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
    match = re.exec(attrText);
  }
  return attrs;
}

/**
 * @param {string} attrText
 * @param {string} name
 */
function hasClass(attrText, name) {
  return (parseAttrs(attrText).class || '').split(/\s+/).includes(name);
}

/**
 * @param {string} value
 */
function decode(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/**
 * @param {string} html
 */
function stripTags(html) {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
