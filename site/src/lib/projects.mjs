import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanHeading,
  firstHeading,
  humanizeSlug,
  noteDateFromName,
  slugFromFolder,
} from './select.mjs';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git']);

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

/** Repo-root `projects/` directory, resolved from this module. */
export function projectsRoot() {
  return fileURLToPath(new URL('../../../projects', import.meta.url));
}

/**
 * Publishable documents under each project.
 * Markdown (including nested INDEX/README) becomes a page.
 * PDFs are listed only; their href is the GitHub blob, not a site page.
 *
 * Route ids:
 * - root `INDEX.md`, or root `README.md` when there is no INDEX → `<project>`
 * - `dir/INDEX.md`, or `dir/README.md` when that dir has no INDEX → `<project>/<dir>`
 * - any other file → `<project>/<dir>/<stem>`
 *
 * @param {string} projectsRootDir
 * @returns {Array<{
 *   projectId: string,
 *   projectDate: Date | null,
 *   relPosix: string,
 *   kind: 'md' | 'pdf',
 *   isHub: boolean,
 *   routeId: string,
 *   collectionId: string,
 *   date: Date | null,
 * }>}
 */
export function listProjectDocuments(projectsRootDir) {
  /** @type {ReturnType<typeof listProjectDocuments>} */
  const docs = [];
  for (const folder of listProjectFolders(projectsRootDir)) {
    walkProject(path.join(projectsRootDir, folder.id), folder.id, folder.date, '', docs);
  }
  const seen = new Map();
  for (const doc of docs) {
    const prev = seen.get(doc.collectionId);
    if (prev) {
      throw new Error(`Duplicate project document id ${doc.collectionId} (${prev} and ${doc.projectId}/${doc.relPosix})`);
    }
    seen.set(doc.collectionId, `${doc.projectId}/${doc.relPosix}`);
  }
  return docs;
}

/**
 * @param {string} dir
 * @param {string} projectId
 * @param {Date | null} projectDate
 * @param {string} relDir
 * @param {ReturnType<typeof listProjectDocuments>} out
 */
function walkProject(dir, projectId, projectDate, relDir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const hasIndex = entries.some((entry) => entry.isFile() && /^index\.mdx?$/i.test(entry.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkProject(path.join(dir, entry.name), projectId, projectDate, joinRel(relDir, entry.name), out);
      continue;
    }
    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    const isMd = /\.mdx?$/.test(lower);
    const isPdf = lower.endsWith('.pdf');
    if (!isMd && !isPdf) continue;
    const relPosix = joinRel(relDir, entry.name);
    const collapseHub = isMd && (hasIndex ? /^index\.mdx?$/i.test(entry.name) : /^readme\.mdx?$/i.test(entry.name));
    const routeId = routeIdFor(projectId, relPosix, collapseHub);
    const isHub = relDir === '' && collapseHub;
    out.push({
      projectId,
      projectDate,
      relPosix,
      kind: isPdf ? 'pdf' : 'md',
      isHub,
      routeId,
      collectionId: isPdf ? `${routeId}.pdf` : routeId,
      date: dateForProjectDocument(relPosix),
    });
  }
}

/**
 * @param {string} projectId
 * @param {string} relPosix
 * @param {boolean} collapseHub
 */
export function routeIdFor(projectId, relPosix, collapseHub) {
  const parts = relPosix.split('/');
  const base = parts.pop() ?? relPosix;
  if (collapseHub) return [projectId, ...parts].filter(Boolean).join('/');
  const stem = base.replace(/\.mdx?$/i, '').replace(/\.pdf$/i, '');
  return [projectId, ...parts, stem].filter(Boolean).join('/');
}

/**
 * Date from the file name, otherwise from the nearest dated parent folder.
 * Does not inherit the top-level project folder date.
 *
 * @param {string} relPosix
 * @returns {Date | null}
 */
export function dateForProjectDocument(relPosix) {
  const parts = relPosix.split('/');
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const date = noteDateFromName(parts[i]);
    if (date) return date;
  }
  return null;
}

/**
 * Name used when a document has no heading. INDEX/README fall back to their directory.
 *
 * @param {string} projectId
 * @param {string} relPosix
 */
export function fallbackDocumentName(projectId, relPosix) {
  const base = path.posix.basename(relPosix);
  if (/^(index|readme)\.mdx?$/i.test(base)) {
    const dir = path.posix.dirname(relPosix);
    if (dir === '.') return projectId;
    return path.posix.basename(dir);
  }
  return base.replace(/\.(mdx?|pdf)$/i, '');
}

/** @param {string} left @param {string} right */
function joinRel(left, right) {
  return left ? `${left}/${right}` : right;
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
 * @template {{ title: string, date?: Date | null }} T
 * @param {T[]} projects
 * @returns {T[]}
 */
export function sortProjects(projects) {
  return [...projects].sort(compareByDateThenTitle);
}

/**
 * Hub document first, then dated documents (newest), then undated by title.
 *
 * @template {{ title: string, date?: Date | null, isHub?: boolean }} T
 * @param {T[]} documents
 */
export function sortProjectDocuments(documents) {
  return [...documents].sort((a, b) => {
    if (Boolean(a.isHub) !== Boolean(b.isHub)) return a.isHub ? -1 : 1;
    return compareByDateThenTitle(a, b);
  });
}

/**
 * @param {{ title: string, date?: Date | null }} a
 * @param {{ title: string, date?: Date | null }} b
 */
function compareByDateThenTitle(a, b) {
  const aTime = a.date instanceof Date && !Number.isNaN(a.date.getTime()) ? a.date.getTime() : null;
  const bTime = b.date instanceof Date && !Number.isNaN(b.date.getTime()) ? b.date.getTime() : null;
  if (aTime != null && bTime != null && aTime !== bTime) return bTime - aTime;
  if (aTime != null && bTime == null) return -1;
  if (aTime == null && bTime != null) return 1;
  return a.title.localeCompare(b.title, 'zh');
}
