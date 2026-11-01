import fs from 'node:fs';
import path from 'node:path';

export const FIXTURE_ID = 'sample-margin-notes';
export const FIXTURE_TITLE = '页边注样张';

/**
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {Date | null}
 */
export function calendarDate(year, month, day) {
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Folder or filename prefix `YYYY-MM-DD`, when it is a real calendar date.
 * @param {string} name
 * @returns {Date | null}
 */
export function noteDateFromName(name) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[^0-9])/.exec(name);
  if (!match) return null;
  return calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** @param {string} name */
export function isDatedNoteFolder(name) {
  return noteDateFromName(name) instanceof Date;
}

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
export function asUTCDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return calendarDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
    if (match) return calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return null;
}

/** @param {Date} date */
export function formatISODate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** @param {string} name */
export function slugFromFolder(name) {
  const match = /^(\d{4}-\d{2}-\d{2})(.*)$/.exec(name);
  if (!match) return name.replace(/\.mdx?$/i, '');
  let rest = match[2];
  if (rest.startsWith('--')) rest = rest.slice(2);
  else if (rest.startsWith('-')) rest = rest.slice(1);
  rest = rest.replace(/\.mdx?$/i, '');
  return rest || name;
}

/** @param {string} slug */
export function humanizeSlug(slug) {
  const text = slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text || slug;
}

/** @param {string} text */
export function cleanHeading(text) {
  return text
    .replace(/\s+#+\s*$/, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * First markdown heading, skipping a leading HTML comment and blank lines.
 * @param {string} body
 * @returns {{ index: number, text: string } | null}
 */
export function firstHeading(body) {
  const lines = body.replace(/^\uFEFF/, '').split(/\r?\n/);
  let index = 0;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      index += 1;
      continue;
    }
    if (trimmed.startsWith('<!--')) {
      if (!trimmed.includes('-->')) {
        while (index < lines.length && !lines[index].includes('-->')) index += 1;
      }
      index += 1;
      continue;
    }
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(trimmed);
    if (!match) return null;
    const text = cleanHeading(match[1]);
    return text ? { index, text } : null;
  }
  return null;
}

/**
 * Drop a leading calendar date from a display title.
 * `YYYY-MM-DD--`, `YYYY-MM-DD-`, and `YYYY-MM-DD ` are redundant next to the date column.
 * An invalid date, a date with nothing after it, or a date later in the title stays.
 *
 * @param {string} title
 */
export function stripLeadingDatePrefix(title) {
  let text = title.trim();
  for (let i = 0; i < 3; i += 1) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:--|-\s*|\s+)(.+)$/.exec(text);
    if (!match) return text;
    const date = calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!date) return text;
    const rest = match[4].trim();
    if (!rest) return text;
    text = rest;
  }
  return text;
}

export function stripMatchingFirstHeading(body, title) {
  const heading = firstHeading(body);
  if (!heading) return body;
  const display = cleanHeading(title);
  const headingDisplay = stripLeadingDatePrefix(heading.text);
  if (heading.text !== display && headingDisplay !== display) return body;
  const lines = body.replace(/^\uFEFF/, '').split(/\r?\n/);
  lines.splice(heading.index, 1);
  return lines.join('\n').replace(/^\n/, '');
}

/**
 * Frontmatter title, else the first heading, else a readable folder slug.
 * A leading date prefix is removed from the text the site shows. The folder slug stays the URL.
 *
 * @param {string} body
 * @param {string} folderName
 * @param {string} [fmTitle]
 */
export function titleForNote(body, folderName, fmTitle = '') {
  const chosen = fmTitle.trim()
    ? cleanHeading(fmTitle)
    : firstHeading(body)?.text || humanizeSlug(slugFromFolder(folderName));
  return stripLeadingDatePrefix(chosen);
}

/**
 * @param {string} body
 * @param {string} relPosix
 * @param {string} fmTitle
 */
export function titleForPost(body, relPosix, fmTitle) {
  if (fmTitle.trim()) return cleanHeading(fmTitle);
  const heading = firstHeading(body);
  if (heading?.text) return heading.text;
  const base = relPosix.split('/').pop() || relPosix;
  return humanizeSlug(slugFromFolder(base.replace(/\.mdx?$/i, '')));
}

/**
 * @param {string} relPosix
 * @param {unknown} fmDate
 * @returns {Date | null}
 */
export function dateForPost(relPosix, fmDate) {
  const fromMatter = asUTCDate(fmDate);
  if (fromMatter) return fromMatter;
  const base = relPosix.split('/').pop() || relPosix;
  return noteDateFromName(base);
}

/**
 * @param {string} body
 * @param {number} [limit]
 */
export function excerpt(body, limit = 180) {
  const source = body.replace(/^\s*#{1,6}\s+.*(?:\n|$)/, '');
  const text = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/!\[\[[^\]]+]]/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#>*_`[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit).replace(/\s+\S*$/, '');
  return `${cut || text.slice(0, limit)}…`;
}

/** @param {string} relPosix */
export function isIgnoredPost(relPosix) {
  const base = (relPosix.split('/').pop() || relPosix).toLowerCase();
  return base === 'readme.md' || base === 'readme.mdx';
}

/** @param {string} id */
export function isFixtureId(id) {
  return id === FIXTURE_ID;
}

/**
 * Top-level `notes/YYYY-MM-DD…/INDEX.md` only.
 * @param {string} notesRoot
 * @returns {string[]}
 */
export function listDatedNoteDirs(notesRoot) {
  if (!fs.existsSync(notesRoot)) return [];
  /** @type {string[]} */
  const found = [];
  for (const entry of fs.readdirSync(notesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    if (!isDatedNoteFolder(entry.name)) continue;
    const indexPath = path.join(notesRoot, entry.name, 'INDEX.md');
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) found.push(entry.name);
  }
  found.sort((a, b) => a.localeCompare(b, 'zh'));
  return found;
}

/**
 * @param {string} postsRoot
 * @returns {string[]} repo-relative posix paths from `postsRoot`
 */
export function listPostFiles(postsRoot) {
  /** @type {string[]} */
  const found = [];
  if (!fs.existsSync(postsRoot)) return found;

  /** @param {string} current */
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.isSymbolicLink()) continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.isFile() || !/\.mdx?$/i.test(entry.name)) continue;
      const rel = path.relative(postsRoot, abs).split(path.sep).join('/');
      if (isIgnoredPost(rel)) continue;
      found.push(rel);
    }
  };

  walk(postsRoot);
  found.sort((a, b) => a.localeCompare(b, 'zh'));
  return found;
}
