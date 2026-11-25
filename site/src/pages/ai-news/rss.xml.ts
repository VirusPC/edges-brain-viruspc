import rss from '@astrojs/rss';
import { getAiNews } from '../../lib/entries';
import { aiNewsIssueRecords } from '../../lib/ai-news.mjs';
import { siteUrl } from '../../lib/paths';

export async function GET(context: { site?: string | URL }) {
  const origin = context.site ?? 'https://viruspc.github.io';
  const site = new URL(import.meta.env.BASE_URL, origin);
  const issues = await getAiNews();
  const records = aiNewsIssueRecords(
    issues.map((issue) => ({
      id: issue.id,
      title: issue.data.title,
      date: issue.data.date,
      summary: issue.data.summary,
      legacy: issue.data.legacy,
      coverageStart: issue.data.coverageStart,
      coverageEnd: issue.data.coverageEnd,
    })),
    (id) => siteUrl(`/ai-news/${id}`),
  );
  const items = records.map((record) => ({
    title: record.title,
    pubDate: record.date,
    description: record.description,
    link: record.link,
    categories: record.legacy ? ['ai-news', 'legacy'] : ['ai-news'],
  }));

  return rss({
    title: 'AI 资讯',
    description: '每周一篇 AI 资讯。',
    site,
    items,
    customData: '<language>zh-cn</language>',
    trailingSlash: true,
  });
}
