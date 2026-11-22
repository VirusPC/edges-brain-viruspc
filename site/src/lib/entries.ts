import { getCollection, type CollectionEntry } from 'astro:content';
import { buildProjectCatalog, projectStats, projectsRoot, sortProjects, titleForProject } from './projects.mjs';

export type PostEntry = CollectionEntry<'posts'>;
export type NoteEntry = CollectionEntry<'notes'>;
export type ProjectEntry = CollectionEntry<'projects'>;
export type AiNewsEntry = CollectionEntry<'aiNews'>;

function timeOf(entry: { data: { date?: Date } }) {
  return entry.data.date?.getTime() ?? Number.NEGATIVE_INFINITY;
}

export async function getPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts');
  return posts
    .filter((post) => post.data.draft !== true && !post.id.startsWith('__'))
    .sort((a, b) => timeOf(b) - timeOf(a) || a.data.title.localeCompare(b.data.title, 'zh'));
}

export async function getNotes(): Promise<NoteEntry[]> {
  const notes = await getCollection('notes');
  return notes.sort((a, b) => timeOf(b) - timeOf(a) || a.id.localeCompare(b.id, 'zh'));
}

export async function getAiNews(): Promise<AiNewsEntry[]> {
  const issues = await getCollection('aiNews');
  return issues.sort((a, b) => timeOf(b) - timeOf(a) || b.id.localeCompare(a.id));
}

/** Every publishable project document (markdown pages and PDF list rows). */
export async function getProjects(): Promise<ProjectEntry[]> {
  return getCollection('projects');
}

/** One homepage row per top-level project. The date is the newest content date in that subtree. */
export async function getProjectSummaries(): Promise<
  { title: string; hrefId?: string; date?: Date }[]
> {
  const catalog = buildProjectCatalog(projectsRoot());
  const docs = await getProjects();
  const titles = new Map<string, string>();
  for (const doc of docs) {
    if (doc.data.isHub) titles.set(doc.data.projectId, doc.data.title);
  }
  const stats = projectStats(catalog);
  const rows = catalog.projects
    .filter((project) => project.parentId == null)
    .map((project) => ({
      title: titles.get(project.id) ?? titleForProject(project.name, '', ''),
      hrefId: project.id,
      date: stats.get(project.id)?.rowDate ?? undefined,
    }));
  return sortProjects(rows);
}
