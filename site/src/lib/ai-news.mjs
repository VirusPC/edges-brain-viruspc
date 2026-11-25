import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entryAnchor } from './entry-anchor.mjs';
import { formatISODate, noteDateFromName } from './select.mjs';

const ISSUE_FILE = /^(\d{4}-\d{2}-\d{2})-ai-news\.md$/;

/**
 * Dated digest files only. README, charts, and `*.notes.md` sidecars stay out.
 * The notes suffix does not match ISSUE_FILE, so those files are not pages.
 * @param {string} aiNewsRoot
 * @returns {string[]}
 */
export function listAiNewsFiles(aiNewsRoot) {
  if (!fs.existsSync(aiNewsRoot)) return [];
  return fs
    .readdirSync(aiNewsRoot)
    .filter((name) => ISSUE_FILE.test(name) && noteDateFromName(name))
    .sort();
}

/**
 * Current issues have 「一、本周概览」, or still use 「二、模型进展」 / 「四、精选文章」 when that chapter is omitted. Older flat digests do not.
 * @param {string} body
 */
export function isLegacyIssue(body) {
  if (/^##[ \t]*一、本周概览[ \t]*$/m.test(body)) return false;
  // A current issue can omit the keyword chapter when the snapshot has no words.
  if (/^##[ \t]*二、模型进展[ \t]*$/m.test(body)) return false;
  if (/^##[ \t]*四、精选文章[ \t]*$/m.test(body)) return false;
  return true;
}

/**
 * Article rows under 「文章总结列表」, stopping at the next chapter.
 * @param {string} body
 */
export function countArticles(body) {
  const match = /^##[ \t]*文章总结列表[ \t]*$/m.exec(body);
  if (!match || match.index == null) return 0;
  const rest = body.slice(match.index + match[0].length);
  const next = rest.search(/^##[ \t]+\S/m);
  const section = next === -1 ? rest : rest.slice(0, next);
  return (section.match(/^###[ \t]+\S/gm) || []).length;
}

/**
 * One line for the index. New issues use the first overview line.
 * Legacy issues have no overview chapter, so the line is the article count.
 * @param {string} body
 * @param {boolean} legacy
 */
export function summaryLine(body, legacy) {
  if (legacy) {
    const count = countArticles(body);
    return count > 0 ? `${count} 篇` : '';
  }
  const heading = /^##[ \t]*一、本周概览[ \t]*$/m.exec(body);
  if (!heading || heading.index == null) return '';
  const rest = body.slice(heading.index + heading[0].length);
  const next = rest.search(/^##[ \t]/m);
  const section = next === -1 ? rest : rest.slice(0, next);
  const item = section.match(/<p class="weekly-overview-text">([\s\S]*?)<\/p>/);
  if (item) return item[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  let inComment = false;
  for (const raw of section.split(/\r?\n/)) {
    const line = raw.trim();
    if (inComment) {
      if (line.includes('-->')) inComment = false;
      continue;
    }
    if (line.startsWith('<!--')) {
      if (!line.includes('-->')) inComment = true;
      continue;
    }
    if (!line || line.startsWith('<') || /^[-*]{3,}$/.test(line)) continue;
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line)) continue;
    return line;
  }
  return '';
}

/**
 * README: the window is the 7 days before the publish date, excluding that day.
 * @param {Date} date
 * @returns {{ start: Date, end: Date }}
 */
export function coverageWindow(date) {
  return {
    start: shiftUTCDays(date, -7),
    end: shiftUTCDays(date, -1),
  };
}

/**
 * @param {Date} start
 * @param {Date} end
 */
export function formatCoverage(start, end) {
  const from = formatISODate(start);
  const to = formatISODate(end);
  if (from.slice(0, 4) === to.slice(0, 4)) return `${from}～${to.slice(5)}`;
  return `${from}～${to}`;
}

/** @param {Date} date */
export function issueTitle(date) {
  return `${formatISODate(date)} AI 资讯`;
}

/**
 * @param {Date} date
 * @param {number} days
 */
function shiftUTCDays(date, days) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

/**
 * Repo root from this file: site/src/lib → repository root.
 */
export function brainRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

/**
 * Absolute URL on the deployed site. `base` is Astro's BASE_URL, with or without slashes.
 * @param {string} pathname
 * @param {string} origin
 * @param {string} base
 */
export function absoluteSiteUrl(pathname, origin, base) {
  const root = String(origin || 'https://viruspc.github.io').replace(/\/+$/, '');
  let prefix = String(base || '/');
  if (!prefix.startsWith('/')) prefix = `/${prefix}`;
  if (!prefix.endsWith('/')) prefix += '/';
  const clean = String(pathname || '').replace(/^\/+/, '');
  return `${root}${prefix}${clean}`;
}

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
function asDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Newest-first rows shared by `/ai-news/rss.xml` and `/ai-news/latest.json`.
 * Descriptions match the RSS item text: coverage window, then the overview line.
 * @param {Array<{ id: string, title?: string, date?: Date | string, summary?: string, legacy?: boolean, coverageStart?: Date | string, coverageEnd?: Date | string }>} issues
 * @param {(id: string) => string} linkFor
 */
export function aiNewsIssueRecords(issues, linkFor) {
  const rows = [...(Array.isArray(issues) ? issues : [])].sort((a, b) => {
    const left = asDate(a?.date)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const right = asDate(b?.date)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const byDate = right - left;
    if (byDate !== 0) return byDate;
    return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
  });
  return rows.map((issue) => {
    const date = asDate(issue.date);
    const start = asDate(issue.coverageStart);
    const end = asDate(issue.coverageEnd);
    const windowLabel = start && end ? formatCoverage(start, end) : '';
    const summary = typeof issue.summary === 'string' ? issue.summary : '';
    const description = summary ? (windowLabel ? `${windowLabel} · ${summary}` : summary) : windowLabel;
    const id = String(issue.id);
    return {
      id,
      title: String(issue.title ?? ''),
      date: date ?? new Date(Number.NaN),
      description,
      link: linkFor(id),
      legacy: Boolean(issue.legacy),
    };
  });
}

/**
 * @param {string} dataRoot
 * @param {string} issueId
 */
export function readIssueOverview(dataRoot, issueId) {
  if (!dataRoot || !/^\d{4}-\d{2}-\d{2}$/.test(String(issueId || ''))) return null;
  const file = path.join(dataRoot, 'issues', issueId, 'summary', 'overview.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {string} pageUrl
 */
function pageBase(pageUrl) {
  const raw = String(pageUrl || '').replace(/#.*$/, '');
  if (!raw) return '';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/**
 * Ref labels in one overview sentence, as absolute links on the issue page.
 * Longer labels win when two labels cover the same characters.
 * @param {string} text
 * @param {{ id?: string, label?: string }[] | undefined} refs
 * @param {string} pageUrl
 */
export function overviewSiteLinks(text, refs, pageUrl) {
  const source = String(text ?? '');
  const base = pageBase(pageUrl);
  const candidates = (Array.isArray(refs) ? refs : [])
    .filter((ref) => ref && typeof ref.label === 'string' && ref.label && typeof ref.id === 'string' && source.includes(ref.label))
    .slice()
    .sort((a, b) => b.label.length - a.label.length || source.indexOf(a.label) - source.indexOf(b.label));
  /** @type {{ start: number, end: number, label: string, url: string }[]} */
  const spans = [];
  for (const ref of candidates) {
    const start = source.indexOf(ref.label);
    const end = start + ref.label.length;
    if (spans.some((span) => start < span.end && end > span.start)) continue;
    spans.push({
      start,
      end,
      label: ref.label,
      url: `${base}#${entryAnchor(ref.id)}`,
    });
  }
  spans.sort((a, b) => a.start - b.start);
  return spans.map(({ label, url }) => ({ label, url }));
}

/**
 * Every 本周概览 sentence, with refs turned into issue-page links.
 * @param {{ themes?: { text?: string, refs?: { id?: string, label?: string }[] }[] } | null | undefined} overview
 * @param {string} pageUrl
 */
export function overviewPushThemes(overview, pageUrl) {
  const themes = Array.isArray(overview?.themes) ? overview.themes : [];
  return themes.flatMap((theme) => {
    if (typeof theme?.text !== 'string' || !theme.text.trim()) return [];
    const text = theme.text.trim();
    return [{ text, links: overviewSiteLinks(text, theme.refs, pageUrl) }];
  });
}

/**
 * The guide-page sample: the first overview sentence, plus the issue page.
 * Copy comes from the issue. Nothing is filled in when the sentence is missing.
 * @param {{ themes?: { text?: string, refs?: { id?: string, label?: string }[] }[] } | null | undefined} overview
 * @param {{ title: string, pageUrl: string }} issue
 */
export function pushSample(overview, issue) {
  const themes = overviewPushThemes(overview, issue?.pageUrl);
  const lead = themes[0];
  if (!lead) return null;
  return {
    title: String(issue?.title ?? ''),
    text: lead.text,
    url: String(issue?.pageUrl ?? ''),
    links: lead.links,
    themes,
  };
}

/**
 * Pointer at the newest deployed issue, plus the same rows the RSS feed lists.
 * @param {ReturnType<typeof aiNewsIssueRecords>} records
 * @param {{ themes?: { text?: string, refs?: { id?: string, label?: string }[] }[] } | null | undefined} overview
 * @param {string | null} rssUrl
 */
export function latestJsonDocument(records, overview, rssUrl) {
  const list = Array.isArray(records) ? records : [];
  const latest = list[0] ?? null;
  const pageUrl = latest?.link ?? null;
  const iso = (date) => (date instanceof Date && Number.isFinite(date.getTime()) ? formatISODate(date) : null);
  return {
    id: latest?.id ?? null,
    title: latest?.title ?? null,
    url: pageUrl,
    date: latest ? iso(latest.date) : null,
    rss: rssUrl ?? null,
    overview: pageUrl ? overviewPushThemes(overview, pageUrl) : [],
    issues: list.map((record) => ({
      id: record.id,
      title: record.title,
      date: iso(record.date),
      url: record.link,
      description: record.description,
      legacy: record.legacy,
    })),
  };
}
