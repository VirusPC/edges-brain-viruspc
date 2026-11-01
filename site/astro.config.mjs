import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { rehypeSidenotes } from './src/plugins/rehype-sidenotes.mjs';
import { remarkLocalAssets } from './src/plugins/remark-local-assets.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function normalizeBase(input) {
  if (!input || input === '/') return '/';
  let value = input.startsWith('/') ? input : `/${input}`;
  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
  return value;
}

const base = normalizeBase(process.env.SITE_BASE ?? '/edges-brain-viruspc');

export default defineConfig({
  site: 'https://viruspc.github.io',
  base,
  trailingSlash: 'always',
  markdown: {
    gfm: true,
    smartypants: false,
    remarkPlugins: [[remarkLocalAssets, { repoRoot }]],
    rehypePlugins: [rehypeSidenotes],
  },
});
