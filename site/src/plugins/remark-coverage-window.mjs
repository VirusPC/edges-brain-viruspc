import path from 'node:path';

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
export function shiftCoverageWindows(tree) {
  const provenance = takeProvenance(tree);
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

export function remarkCoverageWindow() {
  return (tree, file) => {
    const base = path.basename(file?.path || file?.history?.at(-1) || '');
    if (base && !/-ai-news\.md$/i.test(base)) return;
    shiftCoverageWindows(tree);
  };
}

/**
 * @param {{ windowLabel: string, zone: string, generated: string, excludeDay: boolean }} fields
 */
function remarkCard(fields, provenance) {
  const rows = [row('覆盖窗口', fields.windowLabel, true)];
  if (fields.zone) rows.push(row('时区', fields.zone, false));
  rows.push(row('生成日', fields.generated, false));
  if (provenance) {
    rows.push(rowHtml('生成规则', rulesHtml(
      normalizeRules(provenance.rules),
      normalizeRoutineCurrent(provenance.routineCurrent),
    )));
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

const PROVENANCE_COMMENT = /<!--\s*provenance\s*([\s\S]*?)-->/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;
const GITHUB_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/**
 * Read one provenance comment and drop it from the tree.
 * A missing comment stays null, so older issues keep the card they already have.
 * @param {any} tree
 */
function takeProvenance(tree) {
  const children = tree?.children;
  if (!Array.isArray(children)) return null;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.type !== 'html') continue;
    const match = PROVENANCE_COMMENT.exec(String(node.value || ''));
    if (!match) continue;
    const rest = String(node.value).replace(match[0], '').trim();
    if (rest) node.value = rest;
    else children.splice(index, 1);
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`provenance comment is not JSON: ${error.message}`);
    }
    return {
      rules: normalizeRules(parsed?.rules),
      routineCurrent: normalizeRoutineCurrent(parsed?.routineCurrent),
      data: normalizeData(parsed?.data),
    };
  }
  return null;
}

function normalizeRules(rules) {
  if (!rules || typeof rules !== 'object') return null;
  const repo = String(rules.repo || '');
  const commit = String(rules.commit || '').toLowerCase();
  const routine = cleanPath(rules.routine);
  const skill = cleanPath(rules.skill);
  if (!GITHUB_REPO.test(repo) || !COMMIT_SHA.test(commit) || (!routine && !skill)) return null;
  return { repo, commit, routine, skill };
}

function normalizeData(data) {
  if (!data || typeof data !== 'object') return null;
  const repo = String(data.repo || '');
  const commit = String(data.commit || '').toLowerCase();
  const path = cleanPath(data.path);
  const kind = data.kind === 'blob' ? 'blob' : 'tree';
  if (!GITHUB_REPO.test(repo) || !COMMIT_SHA.test(commit) || !path) return null;
  return { repo, commit, path, kind };
}

function cleanPath(value) {
  const path = String(value || '').replaceAll('\\', '/').replace(/^\/+/, '');
  if (!path || path.includes('..') || path.includes('://') || path.includes('?') || path.includes('#')) return '';
  return path;
}

function normalizeRoutineCurrent(value) {
  if (!value || typeof value !== 'object') return null;
  const repo = String(value.repo || '');
  const commit = String(value.commit || '').toLowerCase();
  const path = cleanPath(value.path);
  const name = String(value.name || '').trim();
  if (!GITHUB_REPO.test(repo) || !COMMIT_SHA.test(commit) || !path || !/^[A-Za-z0-9_.-]+$/.test(name)) return null;
  return { repo, commit, path, name };
}

function rulesHtml(rules, routineCurrent) {
  if (rules) {
    const links = [];
    if (rules.routine) links.push(sourceLink(rules, rules.routine, 'blob'));
    if (rules.skill) links.push(sourceLink(rules, rules.skill, 'blob'));
    if (links.length) return links.join(' ');
  }
  if (!routineCurrent) return '未记录';
  const text = `${routineCurrent.commit.slice(0, 7)} ${routineCurrent.name}`;
  return `${sourceLink(routineCurrent, routineCurrent.path, 'blob', text)}<span class="info-card-current">（当前版本）</span> · skill 未记录`;
}

function dataHtml(data) {
  if (!data) return '未记录';
  return sourceLink(data, data.path, data.kind);
}

function sourceLink(source, path, kind, text) {
  const href = `https://github.com/${source.repo}/${kind}/${source.commit}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const label = text || `${source.commit.slice(0, 7)} ${path}`;
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
