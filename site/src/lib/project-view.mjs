import {
  PREVIEW_LIMIT,
  contentKindFor,
  fallbackDocumentName,
  formatProjectMeta,
  projectStats,
  sortProjects,
  titleForProject,
} from './projects.mjs';

/**
 * The same list model for `/projects/` and any project page.
 * `projectId` null is the root. Child rows inside a preview are not expandable:
 * one chevron reveals one level, and entering a project resets the indent.
 *
 * @param {ReturnType<import('./projects.mjs').buildProjectCatalog>} catalog
 * @param {Map<string, { title?: string, description?: string }>} titles keyed by collection or project id
 * @param {string | null} projectId
 */
export function buildProjectBrowser(catalog, titles, projectId) {
  const stats = projectStats(catalog);
  if (projectId == null) {
    return {
      id: null,
      title: 'Projects',
      intro: '',
      ancestors: [],
      hub: null,
      meta: '',
      date: null,
      children: sortProjects(
        catalog.projects
          .filter((project) => project.parentId == null)
          .map((project) => presentProject(catalog, stats, titles, project, true)),
      ),
      documents: [],
    };
  }
  const project = catalog.byId.get(projectId);
  if (!project) throw new Error(`Unknown project ${projectId}`);
  const own = stats.get(project.id);
  return {
    id: project.id,
    title: projectTitle(titles, project),
    intro: titles.get(project.id)?.description?.trim() || '',
    ancestors: ancestorsOf(catalog, titles, project),
    hub: project.hub,
    meta: own ? formatProjectMeta(own) : '',
    date: own?.rowDate ?? null,
    children: sortProjects(
      project.childIds.map((id) => presentProject(catalog, stats, titles, catalog.byId.get(id), true)),
    ),
    documents: visibleDocuments(catalog, titles, project.id),
  };
}

/**
 * Owning project and its ancestors, nearest last.
 *
 * @param {ReturnType<import('./projects.mjs').buildProjectCatalog>} catalog
 * @param {Map<string, { title?: string, description?: string }>} titles
 * @param {string} projectId
 */
export function projectChain(catalog, titles, projectId) {
  const project = catalog.byId.get(projectId);
  if (!project) return [];
  return [
    ...ancestorsOf(catalog, titles, project),
    { id: project.id, title: projectTitle(titles, project) },
  ];
}

/**
 * @param {ReturnType<import('./projects.mjs').buildProjectCatalog>} catalog
 * @param {Map<string, { title?: string }>} titles
 * @param {{ id: string, parentId: string | null, name: string }} project
 */
function ancestorsOf(catalog, titles, project) {
  /** @type {{ id: string, title: string }[]} */
  const chain = [];
  let current = project.parentId ? catalog.byId.get(project.parentId) : undefined;
  while (current) {
    chain.unshift({ id: current.id, title: projectTitle(titles, current) });
    current = current.parentId ? catalog.byId.get(current.parentId) : undefined;
  }
  return chain;
}

/**
 * @param {ReturnType<import('./projects.mjs').buildProjectCatalog>} catalog
 * @param {ReturnType<typeof projectStats>} stats
 * @param {Map<string, { title?: string }>} titles
 * @param {{ id: string, name: string, childIds: string[] } | undefined} project
 * @param {boolean} expandable
 */
function presentProject(catalog, stats, titles, project, expandable) {
  if (!project) throw new Error('Missing child project');
  const own = stats.get(project.id);
  const counts = own ?? { childCount: 0, directCount: 0, totalCount: 0 };
  /** @type {{
   *   id: string,
   *   title: string,
   *   meta: string,
   *   date: Date | null,
   *   expandable: boolean,
   *   previewProjects: { id: string, title: string, meta: string, date: Date | null }[],
   *   previewDocuments: ReturnType<typeof visibleDocuments>,
   *   moreProjects: number,
   *   moreDocuments: number,
   * }} */
  const row = {
    id: project.id,
    title: projectTitle(titles, project),
    meta: formatProjectMeta(counts),
    date: own?.rowDate ?? null,
    expandable,
    previewProjects: [],
    previewDocuments: [],
    moreProjects: 0,
    moreDocuments: 0,
  };
  if (!expandable) return row;
  const children = sortProjects(
    project.childIds.map((id) => presentProject(catalog, stats, titles, catalog.byId.get(id), false)),
  );
  const documents = visibleDocuments(catalog, titles, project.id);
  row.previewProjects = children.slice(0, PREVIEW_LIMIT).map((child) => ({
    id: child.id,
    title: child.title,
    meta: child.meta,
    date: child.date,
  }));
  row.previewDocuments = documents.slice(0, PREVIEW_LIMIT);
  row.moreProjects = Math.max(0, children.length - row.previewProjects.length);
  row.moreDocuments = Math.max(0, documents.length - row.previewDocuments.length);
  return row;
}

/**
 * @param {ReturnType<import('./projects.mjs').buildProjectCatalog>} catalog
 * @param {Map<string, { title?: string }>} titles
 * @param {string} projectId
 */
function visibleDocuments(catalog, titles, projectId) {
  const project = catalog.byId.get(projectId);
  const seen = new Set();
  /** @type {{ id: string, routeId: string, title: string, date: Date | null, kind: 'md' | 'pdf', contentKind: string, sourcePath: string }[]} */
  const docs = [];
  for (const doc of catalog.documents) {
    if (doc.projectId !== projectId || doc.isHub || doc.isOrgList) continue;
    if (seen.has(doc.collectionId)) continue;
    seen.add(doc.collectionId);
    docs.push({
      id: doc.collectionId,
      routeId: doc.routeId,
      title: titles.get(doc.collectionId)?.title
        || fallbackDocumentName(project?.name || projectId, doc.relPosix),
      date: doc.date,
      kind: doc.kind,
      contentKind: doc.contentKind || contentKindFor(doc.relPosix, doc.kind),
      sourcePath: `projects/${doc.projectId}/${doc.relPosix}`,
    });
  }
  return docs.sort(compareDocs);
}

/**
 * @param {{ title: string, date?: Date | null }} a
 * @param {{ title: string, date?: Date | null }} b
 */
function compareDocs(a, b) {
  const aTime = a.date instanceof Date && !Number.isNaN(a.date.getTime()) ? a.date.getTime() : null;
  const bTime = b.date instanceof Date && !Number.isNaN(b.date.getTime()) ? b.date.getTime() : null;
  if (aTime != null && bTime != null && aTime !== bTime) return bTime - aTime;
  if (aTime != null && bTime == null) return -1;
  if (aTime == null && bTime != null) return 1;
  return a.title.localeCompare(b.title, 'zh');
}

/**
 * @param {Map<string, { title?: string }>} titles
 * @param {{ id: string, name: string }} project
 */
function projectTitle(titles, project) {
  return titles.get(project.id)?.title || titleForProject(project.name, '', '');
}
