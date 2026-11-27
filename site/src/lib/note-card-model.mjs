/**
 * Turn a wrapped 「项目开源」 or 「精选文章」 card into NoteCard props.
 * Category, source, lede, and the five sections come from the
 * `<!--summary-card:...-->` payload that compose writes before the heading.
 * A card without a payload keeps its paragraphs and invents nothing.
 */

const VOID = new Set(['br', 'img', 'hr', 'wbr', 'source']);

const PAYLOAD_COMMENT = /<!--summary-card:([A-Za-z0-9_-]+)-->/;

const SECTION_LABELS = ['解决什么问题', '如何解决', '效果怎样', '洞察与启发', '相关工作'];

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
    // The payload comment sits right before the wrapped card, outside the div.
    let start = found.start;
    let inner = found.inner;
    const payload = html.slice(cursor, start).match(/<!--summary-card:[A-Za-z0-9_-]+-->\s*$/);
    if (payload) {
      start -= payload[0].length;
      inner = `${payload[0].trim()}\n${inner}`;
    }
    if (start > cursor) blocks.push({ kind: 'html', html: html.slice(cursor, start) });
    blocks.push({ kind: 'card', card: parseArticleCard(inner) });
    cursor = found.end;
  }
  return blocks;
}

/**
 * @param {string} inner
 */
export function parseArticleCard(inner) {
  const payload = readPayload(inner);
  const nodes = topNodes(inner);
  let title = '';
  let href = '';
  let headingId = '';
  let entryId = '';
  /** @type {string[]} */
  const lede = [];
  /** @type {string[]} */
  const extra = [];
  let phase = 'before';
  let renderedLede = false;

  for (const node of nodes) {
    if (node.tag === 'h4' && phase === 'before') {
      const attrs = parseAttrs(node.attrText);
      headingId = decode(attrs.id || '');
      entryId = decode(attrs['data-entry-id'] || '');
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
    if (phase === 'lead' && node.tag === 'p' && payload && !renderedLede) {
      // The first paragraph is the rendered copy of payload.lede.
      renderedLede = true;
      continue;
    }
    if (phase === 'lead' && node.tag === 'p' && !payload) lede.push(node.inner.trim());
    else extra.push(node.raw);
  }

  const company = payload ? String(payload.company ?? '').trim() : '';
  return {
    category: payload ? String(payload.category ?? '') : '',
    sources: company ? [company] : [],
    title,
    href,
    headingId,
    entryId,
    ledeHtml: payload
      ? (typeof payload.lede === 'string' && payload.lede.trim()
        ? `<p class="note-card-lede">${payload.lede}</p>`
        : '')
      : lede.filter(Boolean).map((html) => `<p class="note-card-lede">${html}</p>`).join(''),
    sections: payload ? payloadSections(payload.sections) : [],
    extraHtml: extra.join(''),
  };
}

/**
 * @param {string} html
 */
function readPayload(html) {
  const match = PAYLOAD_COMMENT.exec(String(html));
  if (!match) return null;
  try {
    const data = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/**
 * @param {any} sections
 */
function payloadSections(sections) {
  if (!sections || typeof sections !== 'object') return [];
  return SECTION_LABELS
    .filter((label) => typeof sections[label] === 'string' && sections[label].trim())
    .map((label) => ({
      label: displayLabel(label),
      html: sections[label].trim(),
      highlight: label === '洞察与启发',
    }));
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
