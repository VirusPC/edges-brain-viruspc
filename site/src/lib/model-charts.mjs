import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverageWindow } from './ai-news.mjs';
import { formatISODate, noteDateFromName } from './select.mjs';

const FILES = {
  'llm-arena': 'llm-arena.json',
  aa: 'aa-language-models.json',
  'openrouter-usage': 'openrouter-rankings-daily.json',
  'openrouter-programming': 'openrouter-rankings-programming.json',
  'openrouter-apps': 'openrouter-app-rankings.json',
};

const LABELS = {
  'llm-arena': 'LLM Arena',
  aa: 'Artificial Analysis',
  'openrouter-usage': 'OpenRouter 本周用量',
  'openrouter-programming': 'OpenRouter 编程用量',
  'openrouter-apps': 'OpenRouter 应用用量',
};

const ANCHORS = {
  'llm-arena': 'llm-arena',
  aa: 'artificial-analysis',
  'openrouter-usage': 'openrouter',
  'openrouter-programming': 'openrouter-programming',
  'openrouter-apps': 'openrouter-apps',
};

const AXES = {
  'llm-arena': 'Arena Score',
  aa: 'Intelligence Index',
  'openrouter-usage': 'Token 用量（T）',
  'openrouter-programming': 'Token 用量（T）',
  'openrouter-apps': 'Token 用量（T）',
};

const ORG_ALIASES = { moonshotai: 'moonshot' };
const TRILLION = 1_000_000_000_000n;
const TOP = 15;
const jsonCache = new Map();

/**
 * @param {string} repoRoot
 */
export function resolveAiNewsDataRoot(repoRoot) {
  const candidates = [
    process.env.AI_NEWS_DATA_ROOT,
    path.join(repoRoot, 'site/.cache/ai-news-data'),
    path.join(repoRoot, '../ai-news-data'),
  ].filter((candidate) => typeof candidate === 'string' && candidate.trim());
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'issues'))) return candidate;
  }
  return null;
}

/**
 * @param {string} issueDate YYYY-MM-DD
 * @returns {{ start: string, end: string } | null}
 */
export function coverageForIssueDate(issueDate) {
  const date = noteDateFromName(issueDate);
  if (!date) return null;
  const window = coverageWindow(date);
  return { start: formatISODate(window.start), end: formatISODate(window.end) };
}

/**
 * Image filename, alt text, or the section heading. OpenRouter's three
 * charts are told apart by the filename the weekly skill already uses.
 *
 * @param {string} url
 * @param {string} alt
 * @param {string} heading
 */
export function classifyChart(url, alt, heading) {
  const hay = `${url} ${alt}`.toLowerCase();
  if (hay.includes('openrouter-usage') || hay.includes('本周用量')) return 'openrouter-usage';
  if (hay.includes('openrouter-programming') || hay.includes('编程用量')) return 'openrouter-programming';
  if (hay.includes('openrouter-apps') || hay.includes('应用用量')) return 'openrouter-apps';
  if (hay.includes('aa-intelligence') || hay.includes('artificial analysis')) return 'aa';
  if (hay.includes('llm-arena') || hay.includes('llm arena')) return 'llm-arena';
  if (heading === 'Artificial Analysis') return 'aa';
  if (heading === 'LLM Arena' || heading === '整体排名') return 'llm-arena';
  return null;
}

/**
 * @param {string} kind
 */
export function chartLabel(kind) {
  return LABELS[kind] || kind;
}

/**
 * @param {string} kind
 */
export function chartAnchor(kind) {
  return ANCHORS[kind] || kind;
}

/**
 * Names after 「红圈：」. 「不圈」 and 「图中无红圈」 have no colon, so they
 * yield nothing. Parentheses stay attached to the name.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function highlightsFromCaption(text) {
  const flat = String(text || '').replace(/\s+/g, ' ');
  const match = flat.match(/红圈\s*[:：]\s*([^。\n]+)/);
  if (!match) return [];
  return splitNames(match[1]);
}

/**
 * @param {string} dataRoot
 * @param {string} issueDate
 * @param {string} kind
 * @param {string} caption
 */
export function loadSeries(dataRoot, issueDate, kind, caption) {
  if (!dataRoot || !FILES[kind]) return null;
  const coverage = coverageForIssueDate(issueDate);
  if (!coverage) return null;
  const file = path.join(dataRoot, 'issues', issueDate, FILES[kind]);
  if (!fs.existsSync(file)) return null;
  const payload = readJson(file);
  if (!payload || typeof payload !== 'object') return null;
  try {
    return seriesFromPayload(kind, payload, coverage, caption);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`model chart ${kind} ${issueDate}: ${message}`);
    return null;
  }
}

/**
 * @param {string} kind
 * @param {any} payload
 * @param {{ start: string, end: string }} coverage
 * @param {string} caption
 */
export function seriesFromPayload(kind, payload, coverage, caption) {
  if (!payload || typeof payload !== 'object' || payload.skipped) return null;
  let rows = null;
  if (kind === 'aa') rows = aaRows(payload, coverage);
  else if (kind === 'llm-arena') rows = rankedRows(payload, caption, kind);
  else if (String(kind).startsWith('openrouter')) rows = openRouterRows(kind, payload, coverage, caption);
  if (!rows || rows.length === 0) return null;
  return {
    kind,
    label: chartLabel(kind),
    axis: AXES[kind] || '',
    scaleZero: String(kind).startsWith('openrouter'),
    items: rows,
  };
}

/**
 * @param {any} file
 */
export function markdownPath(file) {
  const raw = file?.path || file?.history?.[0];
  if (!raw) return '';
  const asString = String(raw);
  if (asString.startsWith('file:')) return fileURLToPath(asString);
  return asString;
}

/**
 * @param {string} model
 * @param {string} wanted
 */
export function namesMatch(model, wanted) {
  const left = normalizeName(model);
  const right = normalizeName(wanted);
  if (!left || !right) return false;
  if (left === right) return true;
  return boundaryPrefix(left, right) || boundaryPrefix(right, left);
}

/**
 * @param {string} file
 */
function readJson(file) {
  if (jsonCache.has(file)) return jsonCache.get(file);
  let value = null;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    value = null;
  }
  jsonCache.set(file, value);
  return value;
}

/**
 * @param {any} payload
 * @param {{ start: string, end: string }} coverage
 */
function aaRows(payload, coverage) {
  const source = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
  const ranked = [];
  for (const row of source) {
    if (!row || typeof row !== 'object') continue;
    const score = aaScore(row);
    const name = aaName(row);
    if (score == null || !name) continue;
    ranked.push({
      name,
      value: score,
      organization: aaOrg(row),
      release: aaRelease(row),
    });
  }
  ranked.sort((a, b) => b.value - a.value || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return ranked.slice(0, TOP).map((row, index) => ({
    rank: index + 1,
    name: row.name,
    value: row.value,
    valueText: formatPlain(row.value),
    organization: row.organization,
    highlight: Boolean(row.release && row.release >= coverage.start && row.release <= coverage.end),
  }));
}

/**
 * Prepared `{items:[{model,score}]}` lists (Arena, and OpenRouter after the
 * weekly script has already aggregated). At most the top 15.
 *
 * @param {any} payload
 * @param {string} caption
 * @param {string} kind
 */
function rankedRows(payload, caption, kind) {
  const prepared = preparedItems(payload);
  if (!prepared) return null;
  prepared.sort((a, b) => (Number(a.rank) || 1e9) - (Number(b.rank) || 1e9));
  const names = highlightsFromCaption(caption);
  return prepared.slice(0, TOP).map((row, index) => {
    const name = String(row.model);
    const value = asNumber(row.score);
    return {
      rank: index + 1,
      name,
      value,
      valueText: kind === 'llm-arena' ? value.toFixed(1) : formatToken(value),
      organization: String(row.organization || orgFromSlug(row.model_permaslug || name)),
      highlight: names.some((wanted) => namesMatch(name, wanted)),
      detail: typeof row.model_permaslug === 'string' ? row.model_permaslug : undefined,
    };
  });
}

/**
 * @param {string} kind
 * @param {any} payload
 * @param {{ start: string, end: string }} coverage
 * @param {string} caption
 */
function openRouterRows(kind, payload, coverage, caption) {
  const prepared = preparedItems(payload);
  if (prepared) return rankedRows(payload, caption, kind);
  const data = Array.isArray(payload.data) ? payload.data : [];
  if (kind === 'openrouter-apps') return appRows(data, caption);
  if (kind === 'openrouter-programming') return programmingRows(data, coverage, caption);
  return usageRows(data, coverage, caption);
}

/**
 * @param {any[]} data
 * @param {{ start: string, end: string }} coverage
 * @param {string} caption
 */
function usageRows(data, coverage, caption) {
  /** @type {Map<string, bigint>} */
  const totals = new Map();
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const day = String(row.date || '');
    if (day < coverage.start || day > coverage.end) continue;
    const slug = row.model_permaslug;
    if (typeof slug !== 'string' || slug === 'other' || slug.endsWith('/other')) continue;
    const tokens = rowTokens(row);
    if (tokens == null) continue;
    totals.set(slug, (totals.get(slug) || 0n) + tokens);
  }
  return tokenRows(totals, caption);
}

/**
 * @param {any[]} data
 * @param {{ start: string, end: string }} coverage
 * @param {string} caption
 */
function programmingRows(data, coverage, caption) {
  const dates = [];
  for (const row of data) {
    if (row && typeof row.date === 'string') dates.push(row.date);
  }
  const monday = selectProgrammingMonday(dates, coverage.end);
  if (!monday) return null;
  /** @type {Map<string, bigint>} */
  const totals = new Map();
  for (const row of data) {
    if (!row || row.date !== monday) continue;
    const slug = row.model_permaslug;
    if (typeof slug !== 'string' || slug === 'other' || slug.endsWith('/other')) continue;
    const tokens = rowTokens(row);
    if (tokens == null) continue;
    totals.set(slug, (totals.get(slug) || 0n) + tokens);
  }
  return tokenRows(totals, caption);
}

/**
 * @param {any[]} data
 * @param {string} caption
 */
function appRows(data, caption) {
  const usable = [];
  for (const row of data) {
    if (!row || typeof row !== 'object' || typeof row.app_name !== 'string') continue;
    const tokens = rowTokens(row);
    if (tokens == null) continue;
    usable.push({ name: row.app_name, tokens, rank: row.rank });
  }
  if (usable.length === 0) return null;
  if (usable.every((row) => Number.isInteger(row.rank))) usable.sort((a, b) => a.rank - b.rank);
  else usable.sort((a, b) => (a.tokens < b.tokens ? 1 : a.tokens > b.tokens ? -1 : a.name < b.name ? -1 : 1));
  const names = highlightsFromCaption(caption);
  return usable.slice(0, TOP).map((row, index) => {
    const value = trillions(row.tokens);
    return {
      rank: index + 1,
      name: row.name,
      value,
      valueText: formatToken(value),
      organization: 'app',
      highlight: names.some((wanted) => namesMatch(row.name, wanted)),
    };
  });
}

/**
 * @param {Map<string, bigint>} totals
 * @param {string} caption
 */
function tokenRows(totals, caption) {
  const ranked = [...totals.entries()].sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : a[0] < b[0] ? -1 : 1));
  if (ranked.length === 0) return null;
  const names = highlightsFromCaption(caption);
  return ranked.slice(0, TOP).map(([slug, tokens], index) => {
    const name = modelFromSlug(slug);
    const value = trillions(tokens);
    return {
      rank: index + 1,
      name,
      value,
      valueText: formatToken(value),
      organization: orgFromSlug(slug),
      highlight: names.some((wanted) => namesMatch(name, wanted) || namesMatch(slug, wanted)),
      detail: slug,
    };
  });
}

/**
 * @param {any} payload
 */
function preparedItems(payload) {
  if (!Array.isArray(payload.items)) return null;
  const usable = payload.items.filter(
    (row) => row && typeof row.model === 'string' && asNumber(row.score) != null,
  );
  return usable.length ? usable : null;
}

/**
 * @param {any} row
 */
function aaScore(row) {
  if (row.intelligence_index != null) return asNumber(row.intelligence_index);
  const evaluations = row.evaluations;
  if (evaluations && typeof evaluations === 'object') {
    return asNumber(evaluations.artificial_analysis_intelligence_index);
  }
  return null;
}

/**
 * @param {any} row
 */
function aaName(row) {
  if (typeof row.name === 'string' && row.name.trim()) return row.name.trim();
  if (typeof row.slug === 'string') return row.slug;
  return '';
}

/**
 * @param {any} row
 */
function aaOrg(row) {
  if (typeof row.creator === 'string' && row.creator.trim()) return row.creator.trim();
  if (row.creator && typeof row.creator.name === 'string') return row.creator.name;
  if (row.model_creator && typeof row.model_creator.name === 'string') return row.model_creator.name;
  return 'unknown';
}

/**
 * @param {any} row
 */
function aaRelease(row) {
  if (typeof row.release_date !== 'string') return null;
  return row.release_date.slice(0, 10);
}

/**
 * @param {any} row
 */
function rowTokens(row) {
  const total = parseTokens(row.total_tokens);
  if (total != null) return total;
  const prompt = parseTokens(row.prompt_tokens);
  const completion = parseTokens(row.completion_tokens);
  if (prompt == null && completion == null) return null;
  return (prompt || 0n) + (completion || 0n);
}

/**
 * @param {unknown} value
 * @returns {bigint | null}
 */
function parseTokens(value) {
  if (typeof value === 'boolean' || value == null) return null;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value) && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) return BigInt(value);
  return null;
}

/**
 * Half-up to 2 decimal trillions. Matches the weekly script's display unit.
 *
 * @param {bigint} tokens
 */
function trillions(tokens) {
  const rounded = (tokens * 100n + TRILLION / 2n) / TRILLION;
  return Number(rounded) / 100;
}

/**
 * @param {number} value
 */
function formatToken(value) {
  return `${value.toFixed(2)} T`;
}

/**
 * @param {number} value
 */
function formatPlain(value) {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * @param {unknown} value
 */
function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/**
 * @param {string} slug
 */
function orgFromSlug(slug) {
  const org = slug.includes('/') ? slug.split('/')[0] : 'unknown';
  return ORG_ALIASES[org] || org;
}

/**
 * @param {string} slug
 */
function modelFromSlug(slug) {
  if (!slug.includes('/')) return slug;
  const rest = slug.split('/').slice(1).join('/');
  return rest || slug;
}

/**
 * Latest Monday whose Sunday is on or before `until`, and that actually
 * appears in the snapshot. Mirrors fetch_openrouter.py, without using the
 * build machine's clock.
 *
 * @param {string[]} dates
 * @param {string} until
 */
function selectProgrammingMonday(dates, until) {
  const untilDate = noteDateFromName(until);
  if (!untilDate) return null;
  const target = formatISODate(completeWeekMonday(untilDate));
  const mondays = [...new Set(dates)].filter((day) => {
    const date = noteDateFromName(day);
    return date && isoWeekday(date) === 0;
  }).sort();
  if (mondays.includes(target)) return target;
  const complete = mondays.filter((day) => {
    const date = noteDateFromName(day);
    if (!date) return false;
    return formatISODate(shiftDays(date, 6)) <= until;
  });
  return complete.length ? complete[complete.length - 1] : null;
}

/**
 * @param {Date} until
 */
function completeWeekMonday(until) {
  const mondayOffset = isoWeekday(until);
  const thisMonday = shiftDays(until, -mondayOffset);
  if (isoWeekday(until) === 6) return thisMonday;
  return shiftDays(thisMonday, -7);
}

/**
 * Monday = 0 … Sunday = 6.
 *
 * @param {Date} date
 */
function isoWeekday(date) {
  return (date.getUTCDay() + 6) % 7;
}

/**
 * @param {Date} date
 * @param {number} days
 */
function shiftDays(date, days) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

/**
 * @param {string} list
 */
function splitNames(list) {
  /** @type {string[]} */
  const parts = [];
  let buf = '';
  let depth = 0;
  for (const ch of list.trim()) {
    if (ch === '(' || ch === '（') depth += 1;
    else if ((ch === ')' || ch === '）') && depth > 0) depth -= 1;
    if (depth === 0 && (ch === '、' || ch === '，' || ch === ',' || ch === ';' || ch === '；')) {
      const name = cleanName(buf);
      if (name) parts.push(name);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const last = cleanName(buf);
  if (last) parts.push(last);
  return parts;
}

/**
 * @param {string} value
 */
function cleanName(value) {
  return value.replace(/^[：:\s]+|[。．.\s]+$/g, '').trim();
}

/**
 * @param {string} longer
 * @param {string} shorter
 */
function boundaryPrefix(longer, shorter) {
  if (shorter.length < 8 || !longer.startsWith(shorter)) return false;
  const next = longer.charAt(shorter.length);
  return next === '' || next === '(' || next === ' ' || next === ',' || next === '，';
}

/**
 * @param {string} value
 */
function normalizeName(value) {
  return String(value)
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
