import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;
export type NoteEntry = CollectionEntry<'notes'>;

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
