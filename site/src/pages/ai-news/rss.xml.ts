import rss from '@astrojs/rss';
import { getAiNews } from '../../lib/entries';
import { formatCoverage } from '../../lib/ai-news.mjs';
import { siteUrl } from '../../lib/paths';

export async function GET(context: { site?: string | URL }) {
  const origin = context.site ?? 'https://viruspc.github.io';
  const site = new URL(import.meta.env.BASE_URL, origin);
  const issues = await getAiNews();
  const items = issues.map((issue) => {
    const windowLabel = formatCoverage(issue.data.coverageStart, issue.data.coverageEnd);
    const description = issue.data.summary ? `${windowLabel} · ${issue.data.summary}` : windowLabel;
    return {
      title: issue.data.title,
      pubDate: issue.data.date,
      description,
      link: siteUrl(`/ai-news/${issue.id}`),
      categories: issue.data.legacy ? ['ai-news', 'legacy'] : ['ai-news'],
    };
  });

  return rss({
    title: 'AI 资讯',
    description: '每周一篇 AI 资讯。',
    site,
    items,
    customData: '<language>zh-cn</language>',
    trailingSlash: true,
  });
}
