import { defineCollection, z } from 'astro:content';
import { notesLoader, postsLoader, projectsLoader } from './loaders/brain';

const entry = z.object({
  title: z.string().min(1),
  date: z.coerce.date().optional(),
  description: z.string().optional(),
  draft: z.boolean().optional(),
  sourcePath: z.string(),
});

export const collections = {
  posts: defineCollection({
    loader: postsLoader(),
    schema: entry,
  }),
  notes: defineCollection({
    loader: notesLoader(),
    schema: entry.extend({
      date: z.coerce.date(),
    }),
  }),
  projects: defineCollection({
    loader: projectsLoader(),
    schema: entry.extend({
      hasPage: z.boolean(),
      isHub: z.boolean(),
      projectId: z.string(),
      projectTitle: z.string(),
      projectDate: z.coerce.date().optional(),
    }),
  }),
};
