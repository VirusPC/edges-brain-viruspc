import path from 'node:path';

const UTC_WINDOW = /^覆盖窗口：(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) 至 (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})（UTC；生成日 (\d{4}-\d{2}-\d{2})，不含当天）。$/;

/**
 * Rewrite one coverage-window sentence from UTC instants to Beijing time (UTC+8).
 * Lines without the UTC annotation, including older issues, are returned unchanged.
 * The generation date is a label, not an instant, so it stays as written.
 *
 * @param {string} text
 */
export function renderCoverageWindow(text) {
  const match = UTC_WINDOW.exec(String(text).trim());
  if (!match) return text;
  const start = shiftUtc8(match[1], match[2]);
  const end = shiftUtc8(match[3], match[4]);
  return `覆盖窗口：${start} 至 ${end}（北京时间；生成日 ${match[5]}）。`;
}

/**
 * @param {any} tree
 */
export function shiftCoverageWindows(tree) {
  const children = tree?.children;
  if (!Array.isArray(children)) return;
  for (const node of children) {
    if (node?.type !== 'paragraph') continue;
    const value = plain(node);
    const next = renderCoverageWindow(value);
    if (next !== value) setText(node, next);
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
 * @param {string} day
 * @param {string} time
 */
function shiftUtc8(day, time) {
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date, hour, minute, second) + 8 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
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

/**
 * @param {any} node
 * @param {string} value
 */
function setText(node, value) {
  node.children = [{ type: 'text', value }];
}
