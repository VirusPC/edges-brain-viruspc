import { entryAnchor } from './entry-anchor.mjs';

/**
 * @param {unknown} value
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Link the first non-overlapping occurrence of each label.
 * Longer labels win when two labels cover the same characters.
 * @param {string} text
 * @param {{ id?: string, label?: string }[] | undefined} refs
 */
export function linkOverviewText(text, refs) {
  const source = String(text ?? '');
  const candidates = (Array.isArray(refs) ? refs : [])
    .filter((ref) => ref && typeof ref.label === 'string' && ref.label && typeof ref.id === 'string' && source.includes(ref.label))
    .slice()
    .sort((a, b) => b.label.length - a.label.length || source.indexOf(a.label) - source.indexOf(b.label));
  /** @type {{ start: number, end: number, id: string, label: string }[]} */
  const spans = [];
  for (const ref of candidates) {
    const start = source.indexOf(ref.label);
    const end = start + ref.label.length;
    if (spans.some((span) => start < span.end && end > span.start)) continue;
    spans.push({ start, end, id: ref.id, label: ref.label });
  }
  spans.sort((a, b) => a.start - b.start);
  let html = '';
  let cursor = 0;
  for (const span of spans) {
    html += escapeHtml(source.slice(cursor, span.start));
    html += `<a href="#${entryAnchor(span.id)}">${escapeHtml(span.label)}</a>`;
    cursor = span.end;
  }
  html += escapeHtml(source.slice(cursor));
  return html;
}

/**
 * @param {{ themes?: { text?: string, refs?: { id?: string, label?: string }[] }[] }} data
 */
export function overviewListHtml(data) {
  const themes = Array.isArray(data?.themes) ? data.themes : [];
  const items = themes.map((theme) => `<li>${linkOverviewText(theme?.text, theme?.refs)}</li>`).join('\n');
  return `<ol class="weekly-overview">\n${items}\n</ol>\n\n`;
}
