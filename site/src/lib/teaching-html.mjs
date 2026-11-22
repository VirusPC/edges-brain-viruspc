import fs from 'node:fs';
import path from 'node:path';

/**
 * Pull a lesson body out of a full teaching document.
 * Old `html` / `body` / `:root` styles are dropped. Ids, quiz hooks, and scripts stay.
 */

/**
 * @param {string} raw
 * @param {{
 *   rewrite?: (url: string, attr: 'href' | 'src') => string | null,
 *   cheatsheetHref?: string,
 * }} [options]
 */
export function transformLessonHtml(raw, options = {}) {
  const rewrite = options.rewrite || (() => null);
  let html = extractBody(raw);
  html = stripStyles(html);
  html = rewriteScriptSources(html, rewrite);
  html = mapOutside(html, (chunk) => rewriteChunk(chunk, rewrite));
  const headings = [];
  html = mapOutside(html, (chunk) => addHeadingIds(chunk, headings));
  html = mapOutside(html, wrapSvgs);
  html = mapOutside(html, (chunk) => chunk
    .replace(/<table\b/gi, '<div class="lesson-table"><table')
    .replace(/<\/table>/gi, '</table></div>'));
  html = moveLeadingKicker(html);
  const tools = toolsBlock(headings.filter((heading) => heading.depth === 2), options.cheatsheetHref || '');
  html = insertTools(html, tools);
  html = addLiveRegions(html);
  return {
    html,
    title: textContent(matchTag(html, 'h1') || matchTag(raw, 'title')),
    headings,
    usesLocalStorage: /localStorage/.test(raw),
  };
}

/**
 * @param {string} raw
 */
function extractBody(raw) {
  const match = raw.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  return (match ? match[1] : raw).trim();
}

/**
 * @param {string} html
 */
function stripStyles(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<link\b[^>]*rel\s*=\s*["'][^"']*stylesheet[^"']*["'][^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '');
}

/**
 * @param {string} raw
 * @param {string} fileAbs
 */
export function rewriteHtmlUrls(html, rewrite) {
  return mapOutside(html, (chunk) => rewriteChunk(chunk, rewrite));
}

export function lessonStoresLocally(raw, fileAbs) {
  if (/localStorage/.test(raw)) return true;
  const dir = path.dirname(fileAbs);
  for (const match of raw.matchAll(/<script\b[^>]*\ssrc\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) {
    const src = (match[1] || match[2] || '').split('#')[0];
    if (!src || /^(?:[a-z]+:|\/\/)/i.test(src)) continue;
    const abs = path.resolve(dir, src);
    if (fs.existsSync(abs) && /localStorage/.test(fs.readFileSync(abs, 'utf8'))) return true;
  }
  return false;
}

/**
 * @param {string} html
 * @param {(chunk: string) => string} fn
 */
function mapOutside(html, fn) {
  const re = /<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi;
  let out = '';
  let last = 0;
  for (const match of html.matchAll(re)) {
    out += fn(html.slice(last, match.index));
    out += match[0];
    last = match.index + match[0].length;
  }
  out += fn(html.slice(last));
  return out;
}

/**
 * @param {string} chunk
 * @param {(url: string, attr: 'href' | 'src') => string | null} rewrite
 */
function rewriteScriptSources(html, rewrite) {
  return html.replace(/<script\b([^>]*)>/gi, (full, attrs) => {
    const match = attrs.match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i);
    if (!match) return full;
    const next = rewrite(match[2] ?? match[3] ?? '', 'src');
    if (!next) return full;
    const quote = match[1].startsWith("'") ? "'" : '"';
    return `<script${attrs.replace(match[0], ` src=${quote}${next}${quote}`)}>`;
  });
}

function rewriteChunk(chunk, rewrite) {
  return chunk.replace(/\s(href|src)\s*=\s*("([^"]*)"|'([^']*)')/gi, (full, attr, quoted, doubleValue, singleValue) => {
    const url = doubleValue ?? singleValue ?? '';
    const next = rewrite(url, attr.toLowerCase());
    if (!next) return full;
    const quote = quoted.startsWith("'") ? "'" : '"';
    return ` ${attr}=${quote}${next}${quote}`;
  });
}

/**
 * @param {string} chunk
 * @param {{ depth: number, id: string, text: string }[]} headings
 */
function addHeadingIds(chunk, headings) {
  const used = new Set(headings.map((heading) => heading.id));
  for (const match of chunk.matchAll(/\sid\s*=\s*("([^"]+)"|'([^']+)')/gi)) {
    used.add(match[2] || match[3]);
  }
  return chunk.replace(/<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level, attrs, inner) => {
    const text = textContent(inner);
    const existing = attrs.match(/\sid\s*=\s*("([^"]*)"|'([^']*)')/i);
    let id = existing ? (existing[2] ?? existing[3] ?? '') : '';
    if (!id) {
      id = uniqueId(text, used);
      attrs = `${attrs} id="${id}"`;
    } else {
      used.add(id);
    }
    headings.push({ depth: Number(level), id, text });
    return `<h${level}${attrs}>${inner}</h${level}>`;
  });
}

/**
 * @param {string} chunk
 */
function wrapSvgs(chunk) {
  let out = '';
  let index = 0;
  while (index < chunk.length) {
    const start = chunk.toLowerCase().indexOf('<svg', index);
    if (start < 0) {
      out += chunk.slice(index);
      break;
    }
    out += chunk.slice(index, start);
    const openEnd = chunk.indexOf('>', start);
    if (openEnd < 0) {
      out += chunk.slice(start);
      break;
    }
    if (chunk.slice(start, openEnd + 1).trimEnd().endsWith('/>')) {
      const svg = chunk.slice(start, openEnd + 1);
      out += sheet(svg);
      index = openEnd + 1;
      continue;
    }
    const end = closeOf(chunk, start, 'svg');
    if (end < 0) {
      out += chunk.slice(start);
      break;
    }
    out += sheet(chunk.slice(start, end));
    index = end;
  }
  return out;
}

/**
 * @param {string} html
 * @param {number} start
 * @param {string} name
 */
function sheet(svg) {
  return `<figure class="lesson-sheet"><div class="lesson-sheet-frame">${svg}</div><button type="button" class="lesson-sheet-size">原尺寸</button></figure>`;
}

function closeOf(html, start, name) {
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0;
  for (const match of html.matchAll(re)) {
    if (match.index < start) continue;
    depth += match[1] ? -1 : 1;
    if (depth === 0) return match.index + match[0].length;
  }
  return -1;
}

/**
 * @param {string} html
 */
function moveLeadingKicker(html) {
  const match = html.match(/^(\s*)(<p\b[^>]*class="[^"]*\bkicker\b[^"]*"[^>]*>[\s\S]*?<\/p>\s*)(<h1\b[\s\S]*?<\/h1>)/i);
  if (!match) return html;
  return html.replace(match[0], `${match[1]}${match[3]}${match[2]}`);
}

/**
 * @param {{ id: string, text: string }[]} headings
 * @param {string} cheatsheetHref
 */
function toolsBlock(headings, cheatsheetHref) {
  if (headings.length === 0 && !cheatsheetHref) return '';
  const items = headings
    .map((heading) => `<li><a href="#${escapeAttr(heading.id)}">${escapeText(heading.text)}</a></li>`)
    .join('');
  const toc = headings.length
    ? `<details class="lesson-toc"><summary>本课目录</summary><ol>${items}</ol></details>`
    : '';
  const sheet = cheatsheetHref
    ? `<a class="lesson-ref" href="${escapeAttr(cheatsheetHref)}">术语速查</a>`
    : '';
  return `<div class="lesson-tools">${toc}${sheet}</div>`;
}

/**
 * @param {string} html
 * @param {string} tools
 */
function insertTools(html, tools) {
  if (!tools) return html;
  const re = /(<h1\b[\s\S]*?<\/h1>)(\s*(?:<p\b[^>]*class="[^"]*\b(?:kicker|lede)\b[^"]*"[^>]*>[\s\S]*?<\/p>\s*)*)/i;
  if (re.test(html)) return html.replace(re, `$1$2${tools}`);
  return `${tools}${html}`;
}

/**
 * @param {string} html
 */
function addLiveRegions(html) {
  return html
    .replace(/<([a-z0-9]+)\b([^>]*\sdata-feedback\b(?![^>]*\baria-live\b)[^>]*)>/gi, '<$1$2 aria-live="polite">')
    .replace(/<([a-z0-9]+)\b([^>]*\sid="result"(?![^>]*\baria-live\b)[^>]*)>/gi, '<$1$2 aria-live="polite">');
}

/**
 * @param {string} text
 * @param {Set<string>} used
 */
function uniqueId(text, used) {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

/**
 * @param {string} html
 * @param {string} name
 */
function matchTag(html, name) {
  const match = html.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? match[1] : '';
}

/**
 * @param {string} html
 */
function textContent(html) {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
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
    .replace(/&#39;/g, "'");
}

/**
 * @param {string} value
 */
function escapeText(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {string} value
 */
function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;');
}
