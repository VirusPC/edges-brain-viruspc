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
 * Project entry is INDEX.md. README.md is only the legacy hub when INDEX is absent.
 * `index.md` is the pre-migration leaf name Edges still reads.
 *
 * @param {string} dir
 * @returns {'INDEX.md' | 'index.md' | 'README.md' | null}
 */
function hubFile(dir) {
  if (isFile(path.join(dir, 'INDEX.md'))) return 'INDEX.md';
  if (isFile(path.join(dir, 'index.md'))) return 'index.md';
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
 * One preview step lists at most this many child projects and this many direct documents.
 * The project page itself is the uncapped list.
 */
export const PREVIEW_LIMIT = 5;

/**
 * Module organization lists. These are composition indexes, not articles.
 * A note, task, or memory INDEX stays a content entry. A README elsewhere stays content.
 *
 * @param {string} relPosix path relative to the owning project
 */
const ORGANIZATION_LISTS = new Set([
  'notes/README.md',
  'tasks/README.md',
  'projects/README.md',
  'routines/README.md',
  'compose/README.md',
  'memory/README.md',
  'skills/README.md',
  'skills/managed/README.md',
  'skills/referenced/README.md',
]);

/**
 * @param {string} relPosix path relative to the owning project
 */
export function isOrganizationList(relPosix) {
  if (ORGANIZATION_LISTS.has(relPosix)) return true;
  return /^memory\/[^/]+\/README\.md$/.test(relPosix);
}

/**
 * @param {string} relPosix
 * @param {'md' | 'pdf'} format
 * @returns {'note' | 'task' | 'memory' | 'doc' | 'attachment'}
 */
export function contentKindFor(relPosix, format) {
  if (format === 'pdf') return 'attachment';
  const head = relPosix.split('/')[0];
  if (head === 'notes') return 'note';
  if (head === 'tasks') return 'task';
  if (head === 'memory') return 'memory';
  return 'doc';
}

/** Visible label for a content row. Icons are decorative; this text is the accessible name. */
export const CONTENT_KIND_LABEL = {
  note: '笔记',
  task: '任务',
  memory: '记忆',
  doc: '文档',
  attachment: '附件',
};

/**
 * Restrained row meta. Direct articles and the descendant total stay distinct.
 * A project with no child projects shows only `N 篇`. An empty one says so.
 * Zero children omit the redundant total. PDF attachments are not 篇.
 *
 * @param {{ childCount: number, directCount: number, totalCount: number }} counts
 */
export function formatProjectMeta({ childCount, directCount, totalCount }) {
  /** @type {string[]} */
  const parts = [];
  if (childCount > 0) parts.push(`${childCount} 子项目`);
  if (childCount > 0 && directCount > 0 && totalCount !== directCount) {
    parts.push(`直属 ${directCount} 篇`, `共 ${totalCount} 篇`);
  } else if (childCount > 0 && directCount > 0) {
    parts.push(`直属 ${directCount} 篇`);
  } else if (childCount > 0 && totalCount > 0) {
    parts.push(`共 ${totalCount} 篇`);
  } else if (childCount === 0 && directCount === 0) {
    parts.push('暂无直属内容');
  } else {
    parts.push(`${directCount} 篇`);
  }
  return parts.join(' · ');
}

/**
 * Publishable documents under each project.
 * Markdown (including nested INDEX/README) becomes a page.
 * PDFs are listed only; their href is the GitHub blob, not a site page.
 *
 * A nested Project is not a document of its parent. Its own hub stays the project page.
 *
 * Route ids:
 * - root `INDEX.md`, or root `README.md` when there is no INDEX → `<project>`
 * - `dir/INDEX.md`, or `dir/README.md` when that dir has no INDEX → `<project>/<dir>`
 * - any other file → `<project>/<dir>/<stem>`
 *
 * `projectId` is the owning project (`P` or `P/projects/Q`). `relPosix` is relative to that project.
 *
 * @param {string} projectsRootDir
 * @returns {Array<{
 *   projectId: string,
 *   projectDate: Date | null,
 *   relPosix: string,
 *   kind: 'md' | 'pdf',
 *   isHub: boolean,
 *   isOrgList: boolean,
 *   contentKind: 'note' | 'task' | 'memory' | 'doc' | 'attachment',
 *   routeId: string,
 *   collectionId: string,
 *   date: Date | null,
 * }>}
 */
export function listProjectDocuments(projectsRootDir) {
  return buildProjectCatalog(projectsRootDir).documents;
}

/**
 * Projects the public site can browse.
 *
 * Top-level identity stays the published site rule: every direct child directory of
 * `projects/` (the brain's `--super` projects collection). Registration in
 * `projects/README.md` is not required, because several live directories were
 * published before that list was complete.
 *
 * A nested Project reuses the Edges contract and does not invent a second one:
 * - the directory is `P/projects/Q` (and `Q/projects/R`, with no fixed depth);
 * - `Q/INDEX.md` (or the legacy `index.md`) exists;
 * - that file is linked from a composition block (`edges-entries-local` or
 *   `edges-entries-descendants`) on `P/projects/README.md` or on P's hub.
 *   `edges projects create --project P` registers the child on `P/projects/README.md`.
 *   A link in ordinary prose does not register a child.
 * - `notes/`, `tasks/`, `memory/` and `memory/projects/` (a memory type) are not projects.
 * - `metadata.edges-type: project` is not read. That field is a memory type.
 *
 * Documents belong to the nearest accepted Project. The walk stops at a child Project.
 *
 * @param {string} projectsRootDir
 */
export function buildProjectCatalog(projectsRootDir) {
  /** @type {ProjectRecord[]} */
  const projects = [];
  /** @type {ReturnType<typeof listProjectDocuments>} */
  const documents = [];
  if (fs.existsSync(projectsRootDir)) {
    for (const folder of listProjectFolders(projectsRootDir)) {
      addProject(path.join(projectsRootDir, folder.id), folder.id, null, projects, documents);
    }
  }
  const seen = new Map();
  for (const doc of documents) {
    const prev = seen.get(doc.collectionId);
    if (prev) {
      throw new Error(`Duplicate project document id ${doc.collectionId} (${prev} and ${doc.projectId}/${doc.relPosix})`);
    }
    seen.set(doc.collectionId, `${doc.projectId}/${doc.relPosix}`);
  }
  return {
    projects,
    documents,
    byId: new Map(projects.map((project) => [project.id, project])),
  };
}

/**
 * @typedef {{
 *   id: string,
 *   parentId: string | null,
 *   name: string,
 *   hub: 'INDEX.md' | 'index.md' | 'README.md' | null,
 *   folderDate: Date | null,
 *   childIds: string[],
 * }} ProjectRecord
 */

/**
 * @param {string} absDir
 * @param {string} id
 * @param {string | null} parentId
 * @param {ProjectRecord[]} projects
 * @param {ReturnType<typeof listProjectDocuments>} documents
 */
function addProject(absDir, id, parentId, projects, documents) {
  const name = path.basename(absDir);
  const children = discoverChildProjects(absDir);
  /** @type {ProjectRecord} */
  const project = {
    id,
    parentId,
    name,
    hub: hubFile(absDir),
    folderDate: noteDateFromName(name),
    childIds: children.map((child) => `${id}/projects/${child.name}`),
  };
  projects.push(project);
  walkOwned(absDir, project, '', new Set(children.map((child) => child.name)), documents);
  for (const child of children) {
    addProject(
      path.join(absDir, 'projects', child.name),
      `${id}/projects/${child.name}`,
      id,
      projects,
      documents,
    );
  }
}

/**
 * Child projects are directories of `<project>/projects/<name>` whose INDEX is
 * registered on the projects org list or the parent hub. Unregistered INDEX files
 * stay ordinary documents of the parent.
 *
 * @param {string} absDir
 * @returns {{ name: string }[]}
 */
function discoverChildProjects(absDir) {
  const projectsDir = path.join(absDir, 'projects');
  if (!isDirectory(projectsDir)) return [];
  const registered = registeredChildIndexes(absDir);
  /** @type {{ name: string }[]} */
  const found = [];
  let entries;
  try {
    entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink() || !entry.isDirectory()) continue;
    const indexFile = childIndexFile(path.join(projectsDir, entry.name));
    if (!indexFile || !registered.has(path.resolve(indexFile))) continue;
    found.push({ name: entry.name });
  }
  found.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  return found;
}

/**
 * @param {string} dir
 * @returns {string | null}
 */
function childIndexFile(dir) {
  const upper = path.join(dir, 'INDEX.md');
  if (isFile(upper)) return upper;
  const lower = path.join(dir, 'index.md');
  if (isFile(lower)) return lower;
  return null;
}

/**
 * @param {string} absDir owning project directory
 * @returns {Set<string>} absolute paths of composition targets
 */
function registeredChildIndexes(absDir) {
  /** @type {Set<string>} */
  const targets = new Set();
  /** @type {string[]} */
  const files = [];
  const org = path.join(absDir, 'projects', 'README.md');
  if (isFile(org)) files.push(org);
  const hub = hubFile(absDir);
  if (hub) files.push(path.join(absDir, hub));
  for (const file of files) {
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const href of entryHrefs(text)) {
      const resolved = resolveMarkdownHref(file, href);
      if (resolved) targets.add(resolved);
    }
  }
  return targets;
}

const ENTRY_BLOCK = /<!--\s*edges-entries-(?:local|descendants):start\s*-->([\s\S]*?)<!--\s*edges-entries-(?:local|descendants):end\s*-->/g;
const MARKDOWN_LINK = /\[(?:\\.|[^\]])*\]\(\s*(<[^>\n]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

/**
 * Href targets inside composition blocks only. Body links are not registration.
 *
 * @param {string} markdown
 * @returns {string[]}
 */
export function entryHrefs(markdown) {
  /** @type {string[]} */
  const hrefs = [];
  for (const block of markdown.matchAll(ENTRY_BLOCK)) {
    const body = block[1] ?? '';
    for (const link of body.matchAll(MARKDOWN_LINK)) {
      if (link[1]) hrefs.push(link[1]);
    }
  }
  return hrefs;
}

/**
 * @param {string} fromFile
 * @param {string} href
 * @returns {string | null}
 */
function resolveMarkdownHref(fromFile, href) {
  let raw = href.trim();
  if (raw.startsWith('<') && raw.endsWith('>')) raw = raw.slice(1, -1).trim();
  if (!raw || raw.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  const pathname = raw.split(/[?#]/, 1)[0] ?? '';
  if (!pathname) return null;
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!decoded || decoded.startsWith('/') || decoded.includes('\\')) return null;
  return path.resolve(path.dirname(fromFile), decoded);
}

/**
 * Direct counts, descendant totals, and the content date.
 * The content date is the newest filename or dated-directory date among owned
 * documents and descendant documents. It is not a file mtime and not "最近更新".
 * The project folder prefix is used only when that subtree has no document date.
 *
 * @param {ReturnType<typeof buildProjectCatalog>} catalog
 */
export function projectStats(catalog) {
  /** @type {Map<string, ReturnType<typeof listProjectDocuments>>} */
  const docsByProject = new Map();
  for (const doc of catalog.documents) {
    const list = docsByProject.get(doc.projectId) ?? [];
    list.push(doc);
    docsByProject.set(doc.projectId, list);
  }

  /**
   * @param {string} projectId
   */
  function owned(projectId) {
    /** @type {Map<string, ReturnType<typeof listProjectDocuments>[number]>} */
    const byKey = new Map();
    for (const doc of docsByProject.get(projectId) ?? []) {
      if (doc.isHub || doc.isOrgList) continue;
      if (!byKey.has(doc.collectionId)) byKey.set(doc.collectionId, doc);
    }
    return [...byKey.values()];
  }

  /** @type {Map<string, ReturnType<typeof owned>>} */
  const directDocs = new Map(catalog.projects.map((project) => [project.id, owned(project.id)]));

  /**
   * @param {string} projectId
   * @param {Set<string>} routes
   * @param {Date[]} dates
   */
  function accumulate(projectId, routes, dates) {
    for (const doc of directDocs.get(projectId) ?? []) {
      if (doc.kind === 'md') routes.add(doc.routeId);
      if (doc.date instanceof Date && !Number.isNaN(doc.date.getTime())) dates.push(doc.date);
    }
    const project = catalog.byId.get(projectId);
    for (const childId of project?.childIds ?? []) accumulate(childId, routes, dates);
  }

  /** @type {Map<string, { childCount: number, directCount: number, totalCount: number, contentDate: Date | null, rowDate: Date | null }>} */
  const stats = new Map();
  for (const project of catalog.projects) {
    const routes = new Set();
    /** @type {Date[]} */
    const dates = [];
    accumulate(project.id, routes, dates);
    const directCount = (directDocs.get(project.id) ?? []).filter((doc) => doc.kind === 'md').length;
    /** @type {Date | null} */
    let contentDate = null;
    for (const date of dates) {
      if (!contentDate || date.getTime() > contentDate.getTime()) contentDate = date;
    }
    stats.set(project.id, {
      childCount: project.childIds.length,
      directCount,
      totalCount: routes.size,
      contentDate,
      rowDate: contentDate ?? project.folderDate,
    });
  }
  return stats;
}

/**
 * Walk documents owned by one project. A registered child directory under
 * `projects/` is a boundary and is not listed again here.
 *
 * @param {string} dir
 * @param {ProjectRecord} project
 * @param {string} relDir
 * @param {Set<string>} childNames
 * @param {ReturnType<typeof listProjectDocuments>} out
 */
function walkOwned(dir, project, relDir, childNames, out) {
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
      if (relDir === 'projects' && childNames.has(entry.name)) continue;
      walkOwned(path.join(dir, entry.name), project, joinRel(relDir, entry.name), childNames, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    const isMd = /\.mdx?$/.test(lower);
    const isPdf = lower.endsWith('.pdf');
    if (!isMd && !isPdf) continue;
    const relPosix = joinRel(relDir, entry.name);
    const collapseHub = isMd && (hasIndex ? /^index\.mdx?$/i.test(entry.name) : /^readme\.mdx?$/i.test(entry.name));
    const routeId = routeIdFor(project.id, relPosix, collapseHub);
    const kind = isPdf ? 'pdf' : 'md';
    out.push({
      projectId: project.id,
      projectDate: project.folderDate,
      relPosix,
      kind,
      isHub: relDir === '' && collapseHub,
      isOrgList: isOrganizationList(relPosix),
      contentKind: contentKindFor(relPosix, kind),
      routeId,
      collectionId: isPdf ? `${routeId}.pdf` : routeId,
      date: dateForProjectDocument(relPosix),
    });
  }
}

/** @param {string} dir */
function isDirectory(dir) {
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
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
 * Date used to sort and label a project row.
 * The newest publishable document date wins. Those dates are the same ones
 * `dateForProjectDocument` already assigns, so a row never shows an older day
 * than the article that put it first. The top-level folder prefix is only a
 * fallback when no document has a date.
 *
 * @param {Array<Date | null | undefined>} documentDates
 * @param {Date | null | undefined} [folderDate]
 * @returns {Date | null}
 */
export function dateForProjectRow(documentDates, folderDate) {
  /** @type {Date | null} */
  let latest = null;
  for (const date of documentDates) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) continue;
    if (latest == null || date.getTime() > latest.getTime()) latest = date;
  }
  if (latest) return latest;
  if (folderDate instanceof Date && !Number.isNaN(folderDate.getTime())) return folderDate;
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
