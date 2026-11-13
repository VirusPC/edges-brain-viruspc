import fs from 'node:fs';
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
 * New issues have a 「一、本周关键词」 chapter. Older flat digests do not.
 * @param {string} body
 */
export function isLegacyIssue(body) {
  return !/^##[ \t]*一、本周关键词[ \t]*$/m.test(body);
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
 * One line for the index. New issues use the first keyword line.
 * Legacy issues have no keyword chapter, so the line is the article count.
 * @param {string} body
 * @param {boolean} legacy
 */
export function summaryLine(body, legacy) {
  if (legacy) {
    const count = countArticles(body);
    return count > 0 ? `${count} 篇` : '';
  }
  const match = /^##[ \t]*一、本周关键词[ \t]*\r?\n+([^\r\n]+)/m.exec(body);
  if (!match) return '';
  const line = match[1].trim();
  if (!line || /^<br\s*\/?>$/i.test(line) || /^[-*]{3,}$/.test(line)) return '';
  return line;
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
