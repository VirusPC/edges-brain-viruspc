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
    const provenance = issueDate ? provenanceForIssue(resolveAiNewsDataRoot(repoRoot), issueDate) : null;
    shiftCoverageWindows(tree, provenance);
  };
}

export function provenanceForIssue(dataRoot, issueDate) {
  if (!dataRoot || !issueDate) return null;
  const indexPath = path.join(dataRoot, 'issues', issueDate, 'summary', 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const commit = gitIssueCommit(dataRoot, issueDate);
  return {
    skill: normalizeSkill(index.skill),
    routine: normalizeRoutine(index.routine),
    data: commit ? { repo: 'VirusPC/ai-news-data', commit, path: `issues/${issueDate}` } : null,
  };
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
