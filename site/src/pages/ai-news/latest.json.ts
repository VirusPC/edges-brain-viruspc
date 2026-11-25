import { getAiNews } from '../../lib/entries';
import {
  absoluteSiteUrl,
  aiNewsIssueRecords,
  brainRepoRoot,
  latestJsonDocument,
  readIssueOverview,
} from '../../lib/ai-news.mjs';
import { resolveAiNewsDataRoot } from '../../lib/model-charts.mjs';
import { PAGES_ORIGIN } from '../../lib/paths';

export async function GET() {
  const issues = await getAiNews();
  const base = import.meta.env.BASE_URL;
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
    (id) => absoluteSiteUrl(`ai-news/${id}/`, PAGES_ORIGIN, base),
  );
  const latest = records[0];
  const overview = latest
    ? readIssueOverview(resolveAiNewsDataRoot(brainRepoRoot()), latest.id)
    : null;
  const body = latestJsonDocument(
    records,
    overview,
    absoluteSiteUrl('ai-news/rss.xml', PAGES_ORIGIN, base),
  );
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
