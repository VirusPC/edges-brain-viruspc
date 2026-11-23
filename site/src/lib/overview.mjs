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

const ICON_ATTRS = 'class="info-card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

/** Lucide cpu. Model themes only. */
const MODEL_ICON = `<svg ${ICON_ATTRS}><path d="M12 20v2"></path><path d="M12 2v2"></path><path d="M17 20v2"></path><path d="M17 2v2"></path><path d="M2 12h2"></path><path d="M2 17h2"></path><path d="M2 7h2"></path><path d="M20 12h2"></path><path d="M20 17h2"></path><path d="M20 7h2"></path><path d="M7 20v2"></path><path d="M7 2v2"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="8" y="8" width="8" height="8" rx="1"></rect></svg>`;

/** Lucide newspaper. Other themes only. */
const OTHER_ICON = `<svg ${ICON_ATTRS}><path d="M15 18h-5"></path><path d="M18 14h-8"></path><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"></path><rect width="8" height="4" x="10" y="6" rx="1"></rect></svg>`;

/**
 * @param {unknown} kind
 */
function overviewIcon(kind) {
  if (kind === 'model') return MODEL_ICON;
  if (kind === 'other') return OTHER_ICON;
  return '';
}

/**
 * One theme card. Full text stays visible. Unknown kind keeps the sentence and drops the icon.
 * @param {{ kind?: string, text?: string, refs?: { id?: string, label?: string }[] }} theme
 */
function overviewCardHtml(theme) {
  const icon = overviewIcon(theme?.kind);
  const mark = icon ? `<p class="info-card-label" aria-hidden="true">${icon}</p>` : '';
  return `<article class="weekly-overview-card">${mark}<p class="weekly-overview-text">${linkOverviewText(theme?.text, theme?.refs)}</p></article>`;
}

/**
 * @param {{ themes?: { kind?: string, text?: string, refs?: { id?: string, label?: string }[] }[] }} data
 */
export function overviewListHtml(data) {
  const themes = Array.isArray(data?.themes) ? data.themes : [];
  const items = themes.map((theme) => overviewCardHtml(theme)).join('\n');
  return `<div class="weekly-overview">\n${items}\n</div>\n\n`;
}
