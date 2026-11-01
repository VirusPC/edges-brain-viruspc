import fs from 'node:fs';
import path from 'node:path';
import {
  cleanHeading,
  firstHeading,
  humanizeSlug,
  noteDateFromName,
  slugFromFolder,
} from './select.mjs';

/**
 * Top-level project directories. `projects/README.md` and dot-directories are not projects.
 * Hub file is `INDEX.md` when present, otherwise `README.md`.
 *
 * @param {string} projectsRoot
 * @returns {{ id: string, hub: 'INDEX.md' | 'README.md' | null, date: Date | null }[]}
 */
export function listProjectFolders(projectsRoot) {
  if (!fs.existsSync(projectsRoot)) return [];
  /** @type {{ id: string, hub: 'INDEX.md' | 'README.md' | null, date: Date | null }[]} */
  const found = [];
  for (const entry of fs.readdirSync(projectsRoot, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink() || !entry.isDirectory()) continue;
    const dir = path.join(projectsRoot, entry.name);
    found.push({
      id: entry.name,
      hub: hubFile(dir),
      date: noteDateFromName(entry.name),
    });
  }
  found.sort((a, b) => a.id.localeCompare(b.id, 'zh'));
  return found;
}

/**
 * @param {string} dir
 * @returns {'INDEX.md' | 'README.md' | null}
 */
function hubFile(dir) {
  if (isFile(path.join(dir, 'INDEX.md'))) return 'INDEX.md';
  if (isFile(path.join(dir, 'README.md'))) return 'README.md';
  return null;
}

/** @param {string} file */
function isFile(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

/**
 * Frontmatter title, else the first heading, else a readable folder name.
 * Dated prefixes (`YYYY-MM-DD--`) are stripped only for the fallback title.
 *
 * @param {string} folderName
 * @param {string} body
 * @param {string} fmTitle
 */
export function titleForProject(folderName, body, fmTitle) {
  if (fmTitle.trim()) return cleanHeading(fmTitle);
  const heading = firstHeading(body);
  if (heading?.text) return heading.text;
  return humanizeSlug(slugFromFolder(folderName));
}

/**
 * Dated projects first (newest date), then undated projects by title.
 *
 * @template {{ title: string, date?: Date | null }} T
 * @param {T[]} projects
 * @returns {T[]}
 */
export function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    const aTime = a.date instanceof Date && !Number.isNaN(a.date.getTime()) ? a.date.getTime() : null;
    const bTime = b.date instanceof Date && !Number.isNaN(b.date.getTime()) ? b.date.getTime() : null;
    if (aTime != null && bTime != null && aTime !== bTime) return bTime - aTime;
    if (aTime != null && bTime == null) return -1;
    if (aTime == null && bTime != null) return 1;
    return a.title.localeCompare(b.title, 'zh');
  });
}
