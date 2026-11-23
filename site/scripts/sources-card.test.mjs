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

test('each category folds on its own and zero publishers stay folded', () => {
  const html = sourcesCardHtml(sources);
  assert.match(html, /<aside class="info-card ai-news-sources"/);
  assert.match(html, /<span>信息源<\/span>/);
  assert.match(html, /<path d="M4 11a9 9 0 0 1 9 9"><\/path>/);
  assert.match(html, /<path d="m9 18 6-6-6-6"><\/path>/);
  assert.doesNotMatch(html, /<circle cx="12" cy="12" r="10">/);
  assert.match(html, /<span class="ai-news-sources-tally-kinds">4 类 <\/span>6 源 · 抓取 <span class="ai-news-sources-tally-sum">5<\/span><span class="ai-news-sources-tally-unit"> 条<\/span>/);
  assert.doesNotMatch(html, /筛前/);
  assert.equal((html.match(/<details class="ai-news-sources-cat"/g) || []).length, 4);
  assert.doesNotMatch(html, /ai-news-sources-fold|<details[^>]* open/);
  const titles = [...html.matchAll(/ai-news-sources-cat-name">[\s\S]*?<span>([^<]+)/g)].map((match) => match[1]);
  assert.deepEqual(titles, ['模型榜单', 'GitHub Trending', '博客', '国内互联网']);
  assert.match(html, /模型榜单<\/span><\/span><span class="ai-news-sources-cat-meta">2 源<\/span>/);
  assert.doesNotMatch(html, /未统计/);
  assert.match(html, /GitHub Trending<\/span><\/span><span class="ai-news-sources-cat-meta">1 榜 · <strong>2 条<\/strong>/);
  assert.match(html, /博客<\/span><\/span><span class="ai-news-sources-cat-meta">2 团队 · <strong>3 条<\/strong>/);
  assert.match(html, /国内互联网<\/span><\/span><span class="ai-news-sources-cat-meta">1 团队 · <strong>0 条<\/strong>/);
  assert.match(html, /href="https:\/\/openai.com\/news\/" target="_blank" rel="noopener noreferrer"><span class="ai-news-sources-name">OpenAI<\/span><span class="ai-news-sources-count">3<\/span>/);
  assert.match(html, /href="https:\/\/artificialanalysis.ai\/leaderboards\/models" target="_blank" rel="noopener noreferrer"><span class="ai-news-sources-name">Artificial Analysis<\/span><\/a>/);
  assert.match(html, /本期无新增 \(1\)[\s\S]*xAI<\/span><span class="ai-news-sources-count">0<\/span>/);
  assert.match(html, /本期无新增 \(1\)[\s\S]*千问<\/span><span class="ai-news-sources-count">0<\/span>/);
  assert.doesNotMatch(html.split('本期无新增')[0], /xAI|千问|>0</);
  assert.doesNotMatch(html, /每周/);
  assert.match(html, /href="https:\/\/github.com\/VirusPC\/edges-brain-viruspc\/blob\/main\/skills\/managed\/weekly-ai-blogs-digest\/feeds\/ai-coding-blogs.opml"/);
  assert.match(html, />OPML</);
  assert.doesNotMatch(html, /xmlUrl|data-cat|ai-news-filter/);
});

test('github boards render only when summary already lists them', () => {
  const html = sourcesCardHtml({
    categories: [
      {
        title: 'GitHub Trending',
        count: 45,
        publishers: [
          { name: '每周 / TypeScript', url: 'https://github.com/trending/typescript?since=weekly', count: 17 },
          { name: '每周 / Python', url: 'https://github.com/trending/python?since=weekly', count: 15 },
          { name: '每周 / 全部', url: 'https://github.com/trending?since=weekly', count: 13 },
        ],
      },
    ],
  });
  assert.match(html, /3 榜 · <strong>45 条<\/strong>/);
  assert.match(html, /每周 \/ TypeScript<\/span><span class="ai-news-sources-count">17<\/span>/);
  assert.match(html, /每周 \/ Python<\/span><span class="ai-news-sources-count">15<\/span>/);
  assert.match(html, /每周 \/ 全部<\/span><span class="ai-news-sources-count">13<\/span>/);
  assert.match(html, /href="https:\/\/github.com\/trending\/typescript\?since=weekly"/);
  assert.match(html, /href="https:\/\/github.com\/trending\/python\?since=weekly"/);
  assert.match(html, /href="https:\/\/github.com\/trending\?since=weekly"/);
});

test('model boards count as sources and stay out of the fetch total', () => {
  const html = sourcesCardHtml({
    categories: [
      {
        title: '模型榜单',
        count: 828,
        publishers: [
          { name: 'Artificial Analysis', url: 'https://artificialanalysis.ai/leaderboards/models', count: 763 },
          { name: 'LLM Arena', url: 'https://arena.ai/', count: 20 },
          { name: 'OpenRouter', url: 'https://openrouter.ai/rankings', count: 45 },
        ],
      },
      {
        title: 'GitHub Trending',
        count: 35,
        publishers: [
          { name: 'GitHub', url: 'https://github.com/trending?since=weekly', count: 35 },
        ],
      },
      {
        title: '博客',
        count: 144,
        publishers: [
          { name: 'OpenAI', url: 'https://openai.com/news/', count: 144 },
        ],
      },
      {
        title: '国内互联网',
        count: 26,
        publishers: [
          { name: '阿里', url: 'https://developer.aliyun.com/', count: 26 },
        ],
      },
    ],
  });
  assert.match(html, /6 源 · 抓取 <span class="ai-news-sources-tally-sum">205<\/span>/);
  assert.doesNotMatch(html, /抓取 <span class="ai-news-sources-tally-sum">205\+/);
  assert.match(html, /模型榜单<\/span><\/span><span class="ai-news-sources-cat-meta">3 源<\/span>/);
  const board = html.slice(html.indexOf('模型榜单'), html.indexOf('GitHub Trending'));
  assert.doesNotMatch(board, /未统计|条|ai-news-sources-count/);
  assert.match(board, /Artificial Analysis<\/span><\/a>/);
  assert.match(board, /LLM Arena<\/span><\/a>/);
  assert.match(board, /OpenRouter<\/span><\/a>/);
  assert.match(html, /1 榜 · <strong>35 条<\/strong>/);
  assert.match(html, /OpenAI<\/span><span class="ai-news-sources-count">144<\/span>/);
});

test('a missing sources field does not invent a card', () => {
  assert.equal(sourcesCardHtml(null), '');
  assert.equal(sourcesCardHtml({}), '');
});

test('the source card reuses the note card type scale', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /--info-card-font-size:\s*0\.8em/);
  assert.match(css, /--info-card-line-height:\s*1\.5/);
  assert.match(css, /--info-card-row-pad:\s*0\.08rem/);
  assert.match(css, /\.info-card\s*\{[^}]*font-size:\s*var\(--info-card-font-size\)/);
  assert.match(css, /\.info-card\s*\{[^}]*line-height:\s*var\(--info-card-line-height\)/);
  assert.match(css, /\.info-card-rows > div\s*\{[^}]*padding:\s*var\(--info-card-row-pad\)/);
  assert.match(css, /\.ai-news-sources\s*\{[^}]*font-size:\s*var\(--info-card-font-size\)/);
  assert.match(css, /\.ai-news-sources\s*\{[^}]*line-height:\s*var\(--info-card-line-height\)/);
  assert.match(css, /\.ai-news-sources-cat > summary\s*\{[^}]*padding:\s*var\(--info-card-row-pad\)/);
  assert.match(css, /\.ai-news-sources-cat > summary\s*\{[^}]*line-height:\s*var\(--info-card-line-height\)/);
  assert.match(css, /\.prose a\.ai-news-sources-pub\s*\{[^}]*line-height:\s*var\(--info-card-line-height\)/);
  assert.match(css, /\.prose \.ai-news-sources-opml\s*\{[^}]*line-height:\s*var\(--info-card-line-height\)/);
  assert.match(css, /\.ai-news-sources-names\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.ai-news-sources-cat\s*\{[^}]*border-top:\s*1px solid var\(--rule\)/);
  assert.match(css, /\.prose \.ai-news-sources-opml\s*\{[^}]*border:\s*1px solid var\(--panel-line\)/);
  assert.match(css, /\.prose \.ai-news-sources-opml\s*\{[^}]*background:\s*var\(--paper\)/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.prose \.ai-news-sources-opml::before\s*\{[^}]*height:\s*44px/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.ai-news-sources-cat > summary::before,[\s\S]*?height:\s*44px/);
  assert.doesNotMatch(css, /\.ai-news-sources-opml\s*\{[^}]*background:\s*#fff/);
  assert.doesNotMatch(css, /\.ai-news-sources-cat > summary\s*\{[^}]*min-height:\s*44px/);
});
