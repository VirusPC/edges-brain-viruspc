import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { sourcesCardHtml } from '../src/plugins/remark-coverage-window.mjs';

const sources = {
  categories: [
    {
      title: '模型榜单',
      count: null,
      publishers: [
        { name: 'Artificial Analysis', url: 'https://artificialanalysis.ai/leaderboards/models', count: null },
        { name: 'OpenRouter', url: 'https://openrouter.ai/rankings', count: null },
      ],
    },
    {
      title: 'GitHub Trending',
      count: 2,
      publishers: [
        { name: 'GitHub', url: 'https://github.com/trending?since=weekly', count: 2 },
      ],
    },
    {
      title: '博客',
      count: 3,
      publishers: [
        { name: 'OpenAI', url: 'https://openai.com/news/', count: 3 },
        { name: 'xAI', url: 'https://x.ai/news', count: 0 },
      ],
    },
    {
      title: '国内互联网',
      count: 0,
      publishers: [
        { name: '千问', url: 'https://qwen.ai/', count: 0 },
      ],
    },
  ],
};

test('the source card lists four categories and keeps zero publishers folded', () => {
  const html = sourcesCardHtml(sources);
  assert.match(html, /<aside class="info-card ai-news-sources">/);
  assert.match(html, /<span>信息源<\/span>/);
  assert.match(html, /4 类 6 源 · 筛前 5 条/);
  assert.doesNotMatch(html, /<details class="ai-news-sources-fold" open/);
  const titles = [...html.matchAll(/ai-news-sources-row"><span>([^<]+)/g)].map((match) => match[1]);
  assert.deepEqual(titles, ['模型榜单', 'GitHub Trending', '博客', '国内互联网']);
  assert.match(html, /模型榜单<\/span><span>2 源 · 未统计/);
  assert.match(html, /国内互联网<\/span><span>1 源 · 未统计/);
  assert.doesNotMatch(html, /筛前 0 条|>0</);
  assert.match(html, /href="https:\/\/openai.com\/news\/" target="_blank" rel="noopener noreferrer">OpenAI<\/a><span class="ai-news-sources-count">3<\/span>/);
  assert.match(html, /href="https:\/\/artificialanalysis.ai\/leaderboards\/models" target="_blank" rel="noopener noreferrer">Artificial Analysis<\/a><\/span>/);
  assert.match(html, /本期无新增 \(1\)[\s\S]*xAI/);
  assert.match(html, /本期无新增 \(1\)[\s\S]*千问/);
  assert.doesNotMatch(html.split('本期无新增')[0], /xAI|千问/);
  assert.match(html, /href="https:\/\/github.com\/VirusPC\/edges-brain-viruspc\/blob\/main\/skills\/managed\/weekly-ai-blogs-digest\/feeds\/ai-coding-blogs.opml"/);
  assert.match(html, />OPML</);
  assert.doesNotMatch(html, /xmlUrl|data-cat|ai-news-filter/);
});

test('a missing sources field does not invent a card', () => {
  assert.equal(sourcesCardHtml(null), '');
  assert.equal(sourcesCardHtml({}), '');
});

test('the source card reuses the note card colors and wraps names', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.ai-news-sources-names\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.ai-news-sources-opml\s*\{[^}]*border:\s*1px solid var\(--panel-line\)/);
  assert.match(css, /\.ai-news-sources-row\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.doesNotMatch(css, /\.ai-news-sources-opml\s*\{[^}]*background:\s*#fff/);
});
