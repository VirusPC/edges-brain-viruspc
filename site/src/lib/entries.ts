import { getCollection, type CollectionEntry } from 'astro:content';
import { dateForProjectRow, listProjectFolders, projectsRoot, sortProjects, titleForProject } from './projects.mjs';

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

/** One homepage row per top-level project folder. Links only when that folder has a hub page. */
export async function getProjectSummaries(): Promise<
  { title: string; hrefId?: string; date?: Date }[]
> {
  const docs = await getProjects();
  const byProject = new Map<string, ProjectEntry[]>();
  for (const doc of docs) {
    const list = byProject.get(doc.data.projectId) ?? [];
    list.push(doc);
    byProject.set(doc.data.projectId, list);
  }
  const rows = listProjectFolders(projectsRoot()).map((folder) => {
    const projectDocs = byProject.get(folder.id) ?? [];
    const hub = projectDocs.find((doc) => doc.data.isHub && doc.data.hasPage);
    const date = dateForProjectRow(
      projectDocs.map((doc) => doc.data.date),
      folder.date,
    );
    return {
      title: hub?.data.projectTitle ?? titleForProject(folder.id, '', ''),
      hrefId: hub ? hub.id : undefined,
      date: date ?? undefined,
    };
  });
  return sortProjects(rows);
}
