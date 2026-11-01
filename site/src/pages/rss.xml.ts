import rss from '@astrojs/rss';
import { getNotes, getPosts } from '../lib/entries';
import { siteUrl } from '../lib/paths';

export async function GET(context: { site?: string | URL }) {
  const origin = context.site ?? 'https://viruspc.github.io';
  const site = new URL(import.meta.env.BASE_URL, origin);
  const posts = await getPosts();
  const notes = await getNotes();
  const items = [
    ...posts.flatMap((post) =>
      post.data.date
        ? [
            {
              title: post.data.title,
              pubDate: post.data.date,
              description: post.data.description,
              link: siteUrl(`/posts/${post.id}`),
              categories: ['posts'],
            },
          ]
        : [],
    ),
    ...notes.flatMap((note) =>
      note.data.date
        ? [
            {
              title: note.data.title,
              pubDate: note.data.date,
              description: note.data.description,
              link: siteUrl(`/notes/${note.id}`),
              categories: ['notes'],
            },
          ]
        : [],
    ),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'peng cheng',
    description: 'Essays and dated notes.',
    site,
    items,
    customData: '<language>zh-cn</language>',
    trailingSlash: true,
  });
}
