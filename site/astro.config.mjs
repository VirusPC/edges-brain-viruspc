import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { rehypeArticleCards } from './src/plugins/rehype-article-cards.mjs';
import { rehypeChapterWip } from './src/plugins/rehype-chapter-wip.mjs';
import { rehypeKeywordCloud } from './src/plugins/rehype-keyword-cloud.mjs';
import { rehypeModelCharts } from './src/plugins/rehype-model-charts.mjs';
import { rehypeSidenotes } from './src/plugins/rehype-sidenotes.mjs';
import { remarkCategoryPills } from './src/plugins/remark-category-pills.mjs';
import { remarkCoverageWindow } from './src/plugins/remark-coverage-window.mjs';
import { remarkLocalAssets } from './src/plugins/remark-local-assets.mjs';
import { remarkEntryAnchor } from './src/plugins/remark-entry-anchor.mjs';
import { remarkKeywordCloud } from './src/plugins/remark-keyword-cloud.mjs';
import { remarkModelCharts } from './src/plugins/remark-model-charts.mjs';
import { remarkModelFacts } from './src/plugins/remark-model-facts.mjs';
import { remarkSelectedArticles } from './src/plugins/remark-selected-articles.mjs';

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
    remarkPlugins: [remarkEntryAnchor, [remarkCoverageWindow, { repoRoot }], remarkCategoryPills, [remarkLocalAssets, { repoRoot }], [remarkKeywordCloud, { repoRoot }], [remarkModelCharts, { repoRoot }], [remarkModelFacts, { repoRoot }], remarkSelectedArticles],
    rehypePlugins: [rehypeKeywordCloud, rehypeSidenotes, rehypeModelCharts, rehypeArticleCards, rehypeChapterWip],
  },
});
