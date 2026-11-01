import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;
export type NoteEntry = CollectionEntry<'notes'>;
export type ProjectEntry = CollectionEntry<'projects'>;

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

/** Dated projects first (newest), then undated projects by title. */
export async function getProjects(): Promise<ProjectEntry[]> {
  const projects = await getCollection('projects');
  return projects.sort((a, b) => {
    const aTime = a.data.date?.getTime();
    const bTime = b.data.date?.getTime();
    const aDated = aTime != null;
    const bDated = bTime != null;
    if (aDated && bDated && aTime !== bTime) return bTime - aTime;
    if (aDated && !bDated) return -1;
    if (!aDated && bDated) return 1;
    return a.data.title.localeCompare(b.data.title, 'zh');
  });
}
