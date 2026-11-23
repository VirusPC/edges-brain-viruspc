import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveAiNewsDataRoot } from '../lib/model-charts.mjs';

const UTC_WINDOW = /^覆盖窗口：(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) 至 (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})（UTC；生成日 (\d{4}-\d{2}-\d{2})，不含当天）。$/;
const DAY_WINDOW = /^覆盖窗口：(\d{4}-\d{2}-\d{2})～(\d{4}-\d{2}-\d{2})（生成日 (\d{4}-\d{2}-\d{2})）。$/;

const INFO_ICON = '<svg class="info-card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>';

/**
 * Turn a coverage-window line into a remark card.
 * UTC instants shift to Beijing time (UTC+8). The generation date stays as written.
 * A date-only line keeps its dates and does not invent a timezone.
 * Anything else returns null.
 *
 * @param {string} text
 * @returns {string | null}
 */
export function coverageCardHtml(text, provenance = null) {
  const source = String(text).trim();
  const utc = UTC_WINDOW.exec(source);
  if (utc) {
    return remarkCard({
      windowLabel: spanLabel(shiftUtc8(utc[1], utc[2]), shiftUtc8(utc[3], utc[4])),
      zone: '北京时间',
      generated: utc[5],
      excludeDay: true,
    }, provenance);
  }
  const days = DAY_WINDOW.exec(source);
  if (days) {
    return remarkCard({
      windowLabel: daySpan(days[1], days[2]),
      zone: '',
      generated: days[3],
      excludeDay: false,
    }, provenance);
  }
  return null;
}

/**
 * @param {any} tree
 */
export function shiftCoverageWindows(tree, provenance = null) {
  const children = tree?.children;
  if (!Array.isArray(children)) return;
  let attached = false;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.type !== 'paragraph') continue;
    const html = coverageCardHtml(plain(node), attached ? null : provenance);
    if (!html) continue;
    attached = true;
    children[index] = { type: 'html', value: html };
  }
}

export function remarkCoverageWindow(options = {}) {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  return (tree, file) => {
    const base = path.basename(file?.path || file?.history?.at(-1) || '');
    if (base && !/-ai-news\.md$/i.test(base)) return;
    const issueDate = /^(\d{4}-\d{2}-\d{2})-ai-news\.md$/i.exec(base)?.[1];
    const loaded = issueDate ? loadIssueIndex(resolveAiNewsDataRoot(repoRoot), issueDate) : null;
    shiftCoverageWindows(tree, loaded?.provenance || null);
    const sourcesHtml = sourcesCardHtml(loaded?.sources);
    if (sourcesHtml) insertSourcesCard(tree, sourcesHtml);
  };
}

export function provenanceForIssue(dataRoot, issueDate) {
  return loadIssueIndex(dataRoot, issueDate)?.provenance || null;
}

const SOURCE_CATEGORIES = ['模型榜单', 'GitHub Trending', '博客', '国内互联网'];
const SOURCE_UNITS = {
  模型榜单: '源',
  'GitHub Trending': '榜',
  博客: '团队',
  国内互联网: '团队',
};
const OPML_HREF = 'https://github.com/VirusPC/edges-brain-viruspc/blob/main/skills/managed/weekly-ai-blogs-digest/feeds/ai-coding-blogs.opml';
const RSS_ICON = '<svg class="info-card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>';
const CHEVRON_ICON = '<svg class="ai-news-sources-chev" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>';
const DOWNLOAD_ICON = '<svg class="info-card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>';

/**
 * Source card under the coverage note. Each category folds on its own.
 * Counts are fetches before selection. null is 未统计. 0 stays a count and
 * those publishers fold under 本期无新增.
 * GitHub boards render only when summary sources already lists them as
 * publishers. This does not split or invent per-board counts.
 * @param {{ categories?: { title?: string, count?: number | null, publishers?: { name?: string, url?: string, count?: number | null }[] }[] } | null | undefined} sources
 * @returns {string}
 */
export function sourcesCardHtml(sources) {
  if (!sources || !Array.isArray(sources.categories)) return '';
  const categories = SOURCE_CATEGORIES.map((title) => {
    const found = sources.categories.find((item) => item?.title === title);
    const publishers = Array.isArray(found?.publishers) ? found.publishers.filter((item) => item?.name && item?.url) : [];
    const count = found && (found.count === null || typeof found.count === 'number') ? found.count : null;
    return { title, count, publishers };
  });
  const sections = categories.map((category) => categorySection(category)).join('');
  return `<aside class="info-card ai-news-sources" aria-label="本期信息源"><div class="ai-news-sources-head"><div class="ai-news-sources-title"><p class="info-card-label">${RSS_ICON}<span>信息源</span></p>${tallyHtml(categories)}</div><a class="ai-news-sources-opml" href="${OPML_HREF}" target="_blank" rel="noopener noreferrer">${DOWNLOAD_ICON}<span>OPML</span></a></div><div class="ai-news-sources-body">${sections}</div></aside>`;
}

/**
 * @param {{ title: string, count: number | null, publishers: { name?: string, url?: string, count?: number | null }[] }[]} categories
 */
function tallyHtml(categories) {
  const sourceTotal = categories.reduce((sum, category) => sum + category.publishers.length, 0);
  const numbers = categories.filter((category) => typeof category.count === 'number');
  let items = '抓取未统计';
  if (numbers.length) {
    const sum = numbers.reduce((total, category) => total + category.count, 0);
    const plus = numbers.length === categories.length ? '' : '+';
    items = `抓取 <span class="ai-news-sources-tally-sum">${sum}${plus}</span><span class="ai-news-sources-tally-unit"> 条</span>`;
  }
  return `<span class="ai-news-sources-tally"><span class="ai-news-sources-tally-kinds">${categories.length} 类 </span>${sourceTotal} 源 · ${items}</span>`;
}

/**
 * @param {{ title: string, count: number | null, publishers: unknown[] }} category
 */
function categoryMeta(category) {
  const unit = SOURCE_UNITS[category.title] || '源';
  const label = `${category.publishers.length} ${unit}`;
  if (typeof category.count !== 'number') return `${label} · 未统计`;
  return `${label} · <strong>${category.count} 条</strong>`;
}

/**
 * @param {{ title: string, count: number | null, publishers: { name?: string, url?: string, count?: number | null }[] }} category
 */
function categorySection(category) {
  const active = category.publishers.filter((item) => item.count !== 0);
  const quiet = category.publishers.filter((item) => item.count === 0);
  const names = active.length
    ? `<div class="ai-news-sources-names">${active.map((item) => publisherLink(item)).join('')}</div>`
    : '';
  const extra = quiet.length
    ? `<details class="ai-news-sources-quiet"><summary>${CHEVRON_ICON}<span>本期无新增 (${quiet.length})</span></summary><div class="ai-news-sources-names">${quiet.map((item) => publisherLink(item)).join('')}</div></details>`
    : '';
  return `<details class="ai-news-sources-cat"><summary><span class="ai-news-sources-cat-name">${CHEVRON_ICON}<span>${escapeHtml(category.title)}</span></span><span class="ai-news-sources-cat-meta">${categoryMeta(category)}</span></summary>${names}${extra}</details>`;
}

/**
 * @param {{ name?: string, url?: string, count?: number | null }} publisher
 */
function publisherLink(publisher) {
  const count = typeof publisher.count === 'number'
    ? `<span class="ai-news-sources-count">${publisher.count}</span>`
    : '';
  return `<a class="ai-news-sources-pub" href="${escapeHtml(publisher.url || '')}" target="_blank" rel="noopener noreferrer"><span class="ai-news-sources-name">${escapeHtml(publisher.name || '')}</span>${count}</a>`;
}

function loadIssueIndex(dataRoot, issueDate) {
  if (!dataRoot || !issueDate) return null;
  const indexPath = path.join(dataRoot, 'issues', issueDate, 'summary', 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const commit = gitIssueCommit(dataRoot, issueDate);
  return {
    sources: index.sources,
    provenance: {
      skill: normalizeSkill(index.skill),
      routine: normalizeRoutine(index.routine),
      data: commit ? { repo: 'VirusPC/ai-news-data', commit, path: `issues/${issueDate}` } : null,
    },
  };
}

function insertSourcesCard(tree, html) {
  const children = tree?.children;
  if (!Array.isArray(children)) return;
  const index = children.findIndex((node) => node?.type === 'html'
    && String(node.value).includes('class="info-card"')
    && !String(node.value).includes('ai-news-coverage'));
  if (index === -1) return;
  children.splice(index + 1, 0, { type: 'html', value: html });
}

function gitIssueCommit(dataRoot, issueDate) {
  const result = spawnSync(
    'git',
    ['-C', dataRoot, 'log', '-1', '--format=%H', '--', `issues/${issueDate}`],
    { encoding: 'utf8' },
  );
  const commit = String(result.stdout || '').trim().toLowerCase();
  return COMMIT_SHA.test(commit) ? commit : '';
}

/**
 * @param {{ windowLabel: string, zone: string, generated: string, excludeDay: boolean }} fields
 */
/**
 * The selected-articles count uses the same 备注 card as the coverage window.
 * @param {string} sentence
 */
export function selectedArticlesRemarkHtml(sentence) {
  return `<aside class="info-card ai-news-coverage"><p class="info-card-label">${INFO_ICON}<span>备注</span></p><p>${escapeHtml(sentence)}</p></aside>`;
}

function remarkCard(fields, provenance) {
  const rows = [row('覆盖窗口', fields.windowLabel, true)];
  if (fields.zone) rows.push(row('时区', fields.zone, false));
  rows.push(row('生成日', fields.generated, false));
  if (provenance) {
    rows.push(rowHtml('生成规则', rulesHtml(normalizeSkill(provenance.skill), normalizeRoutine(provenance.routine))));
    rows.push(rowHtml('数据版本', dataHtml(normalizeData(provenance.data))));
  }
  const note = fields.excludeDay ? '<p class="info-card-note">不含生成当天</p>' : '';
  return `<aside class="info-card"><p class="info-card-label">${INFO_ICON}<span>备注</span></p><dl class="info-card-rows">${rows.join('')}</dl>${note}</aside>`;
}

/**
 * @param {string} label
 * @param {string} value
 * @param {boolean} mark
 */
function row(label, value, mark) {
  const body = mark ? `<mark class="note-card-hl">${escapeHtml(value)}</mark>` : escapeHtml(value);
  return `<div><dt>${escapeHtml(label)}</dt><dd>${body}</dd></div>`;
}

function rowHtml(label, html) {
  return `<div><dt>${escapeHtml(label)}</dt><dd class="info-card-wrap">${html}</dd></div>`;
}

const COMMIT_SHA = /^[0-9a-f]{40}$/;
const GITHUB_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

function normalizeSkill(skill) {
  if (!skill || typeof skill !== 'object') return null;
  const name = String(skill.name || '').trim();
  const version = String(skill.version || '').trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(name) || !SEMVER.test(version)) return null;
  return { name, version };
}

function normalizeData(data) {
  if (!data || typeof data !== 'object') return null;
  const repo = String(data.repo || '');
  const commit = String(data.commit || '').toLowerCase();
  const dataPath = cleanPath(data.path);
  if (!GITHUB_REPO.test(repo) || !COMMIT_SHA.test(commit) || !dataPath) return null;
  return { repo, commit, path: dataPath };
}

function cleanPath(value) {
  const path = String(value || '').replaceAll('\\', '/').replace(/^\/+/, '');
  if (!path || path.includes('..') || path.includes('://') || path.includes('?') || path.includes('#')) return '';
  return path;
}

function normalizeRoutine(value) {
  if (!value || typeof value !== 'object') return null;
  const repo = String(value.repo || '');
  const commit = String(value.commit || '').toLowerCase();
  const routinePath = cleanPath(value.path);
  if (!GITHUB_REPO.test(repo) || !COMMIT_SHA.test(commit) || !routinePath) return null;
  return { repo, commit, path: routinePath };
}

function rulesHtml(skill, routine) {
  const links = [];
  if (skill) {
    const repo = routine?.repo || 'VirusPC/edges-brain-viruspc';
    const href = `https://github.com/${repo}/tree/skill/${skill.name}@${skill.version}`;
    links.push(`<a href="${escapeHtml(href)}">${escapeHtml(`${skill.name}@${skill.version}`)}</a>`);
  }
  if (routine) {
    links.push(sourceLink(routine, routine.path, 'blob', routine.commit.slice(0, 7)));
  }
  return links.length ? links.join(' · ') : '未记录';
}

function dataHtml(data) {
  if (!data) return '未记录';
  return sourceLink(data, data.path, 'tree', data.commit.slice(0, 7));
}

function sourceLink(source, filePath, kind, text) {
  const href = `https://github.com/${source.repo}/${kind}/${source.commit}/${filePath.split('/').map(encodeURIComponent).join('/')}`;
  const label = text || `${source.commit.slice(0, 7)} ${filePath}`;
  return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

/**
 * @param {string} day
 * @param {string} time
 */
function shiftUtc8(day, time) {
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date, hour, minute, second) + 8 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    date: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/**
 * @param {{ year: number, month: number, date: number, hour: number, minute: number }} start
 * @param {{ year: number, month: number, date: number, hour: number, minute: number }} end
 */
function spanLabel(start, end) {
  const sameYear = start.year === end.year;
  const left = sameYear ? `${md(start)} ${hm(start)}` : `${ymd(start)} ${hm(start)}`;
  const right = sameYear ? `${md(end)} ${hm(end)}` : `${ymd(end)} ${hm(end)}`;
  return `${left} → ${right}`;
}

/**
 * @param {string} start
 * @param {string} end
 */
function daySpan(start, end) {
  const [startYear, startMonth, startDay] = start.split('-');
  const [endYear, endMonth, endDay] = end.split('-');
  if (startYear === endYear) return `${startMonth}-${startDay} → ${endMonth}-${endDay}`;
  return `${start} → ${end}`;
}

/** @param {{ year: number, month: number, date: number }} part */
function ymd(part) {
  return `${part.year}-${md(part)}`;
}

/** @param {{ month: number, date: number }} part */
function md(part) {
  return `${pad(part.month)}-${pad(part.date)}`;
}

/** @param {{ hour: number, minute: number }} part */
function hm(part) {
  return `${pad(part.hour)}:${pad(part.minute)}`;
}

/** @param {number} value */
function pad(value) {
  return String(value).padStart(2, '0');
}

/**
 * @param {any} node
 */
function plain(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value || '';
  if (Array.isArray(node.children)) return node.children.map(plain).join('');
  return '';
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
