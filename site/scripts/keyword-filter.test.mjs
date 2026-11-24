import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { featuredCounts, itemMatches } from '../src/lib/ai-news-category-filter.mjs';
import {
  EMPTY_LABEL,
  chapterTally,
  entryListed,
  keywordCounts,
  matchingEntries,
  nextKeyword,
  overviewCardState,
} from '../src/lib/ai-news-keyword-filter.mjs';

const themes = ['进入工作流', '常驻 Agent', '验证评测', '软件工厂'];
const blocks = {
  models: [
    { ids: ['GPT-6.2 Astra', 'Artificial Analysis GPT-6.2 Astra (Max)'] },
    { ids: ['Gemini 4 Neon'] },
    { ids: ['Qwen4-Max'] },
    { ids: ['OpenRouter 本周用量 Hy4 flash'] },
  ],
  projects: [
    { ids: ['https://github.com/alibaba/open-code-review'] },
    { ids: ['https://github.com/backnotprop/plannotator'] },
  ],
  articles: [
    { ids: ['https://claude.com/always'] },
    { ids: ['https://devin.ai/bots'] },
    { ids: ['https://example.com/other'] },
  ],
};

const articles = [
  { entryId: 'https://claude.com/always', cat: '架构', tags: ['Anthropic'], src: '国外模型厂' },
  { entryId: 'https://devin.ai/bots', cat: '产品', tags: ['Cognition'], src: '国外非模型厂' },
  { entryId: 'https://langchain.com/goal', cat: '架构', tags: ['LangChain'], src: '国外非模型厂' },
  { entryId: 'https://example.com/other', cat: '实践', tags: ['Warp'], src: '国外非模型厂' },
];

const resident = new Set(['https://claude.com/always', 'https://devin.ai/bots', 'https://langchain.com/goal']);
const astra = new Set(['GPT-6.2 Astra', 'Artificial Analysis GPT-6.2 Astra (Max)']);

test('the default state filters nothing and lights no tag', () => {
  assert.equal(nextKeyword('', ''), '');
  for (const tag of themes) {
    assert.deepEqual(overviewCardState(tag, ''), { on: false, dim: false });
  }
  assert.equal(entryListed(['GPT-6.2 Astra'], null), true);
  assert.deepEqual(chapterTally(blocks.models, null), { shown: 4, total: 4, empty: false });
  assert.equal(keywordCounts(articles, null).total, 4);
});

test('a theme tag and the same cloud word share one selection', () => {
  assert.equal(nextKeyword('', '常驻 Agent'), '常驻 Agent');
  assert.equal(nextKeyword('常驻 Agent', '进入工作流'), '进入工作流');
  const states = Object.fromEntries(themes.map((tag) => [tag, overviewCardState(tag, '常驻 Agent')]));
  assert.deepEqual(states['常驻 Agent'], { on: true, dim: false });
  assert.deepEqual(states['进入工作流'], { on: false, dim: true });
  assert.deepEqual(states['软件工厂'], { on: false, dim: true });
  assert.deepEqual(chapterTally(blocks.articles, resident), { shown: 2, total: 3, empty: false });
  assert.deepEqual(chapterTally(blocks.projects, resident), { shown: 0, total: 2, empty: true });
  assert.equal(EMPTY_LABEL.projects, '无相关项目');
  assert.equal(entryListed(['https://example.com/other'], resident), false);
  assert.equal(entryListed(blocks.articles[2].ids, resident), false);
});

test('a cloud word that is not a theme tag dims every overview card', () => {
  for (const tag of themes) {
    assert.deepEqual(overviewCardState(tag, 'GPT-6.2 Astra'), { on: false, dim: true });
  }
  assert.deepEqual(chapterTally(blocks.models, astra), { shown: 1, total: 4, empty: false });
  assert.equal(chapterTally(blocks.projects, astra).empty, true);
  assert.equal(chapterTally(blocks.articles, astra).shown, 0);
  assert.equal(EMPTY_LABEL.models, '无相关模型');
  assert.equal(EMPTY_LABEL.articles, '无相关文章');
});

test('clicking the active word cancels the filter', () => {
  assert.equal(nextKeyword('常驻 Agent', '常驻 Agent'), '');
  assert.equal(nextKeyword('GPT-6.2 Astra', 'GPT-6.2 Astra'), '');
  assert.deepEqual(overviewCardState('常驻 Agent', nextKeyword('常驻 Agent', '常驻 Agent')), { on: false, dim: false });
  assert.equal(chapterTally(blocks.articles, null).empty, false);
});

test('an empty target list keeps the chapter and reports zero', () => {
  const none = new Set();
  assert.deepEqual(chapterTally(blocks.models, none), { shown: 0, total: 4, empty: true });
  assert.deepEqual(chapterTally(blocks.projects, none), { shown: 0, total: 2, empty: true });
  assert.deepEqual(chapterTally(blocks.articles, none), { shown: 0, total: 3, empty: true });
  assert.equal(keywordCounts(articles, none).total, 0);
});

test('wood plaque counts follow the keyword, then AND with the category', () => {
  const subset = matchingEntries(articles, resident);
  const counts = featuredCounts(subset);
  assert.equal(counts.total, 3);
  assert.equal(counts.cats['架构'], 2);
  assert.equal(counts.cats['产品'], 1);
  assert.equal(counts.cats['实践'], 0);
  assert.equal(featuredCounts(articles).total, 4);
  const wood = { cat: '产品', src: '', tag: '' };
  const visible = subset.filter((item) => itemMatches(item, wood));
  assert.equal(visible.length, 1);
  assert.equal(visible[0].entryId, 'https://devin.ai/bots');
  assert.equal(subset.filter((item) => itemMatches(item, { cat: '实践', src: '', tag: '' })).length, 0);
  assert.equal(keywordCounts(articles, resident).companies.Cognition, 1);
  assert.equal(keywordCounts(articles, resident).companies.Warp, undefined);
});

test('selected chips, dimming, and touch targets hold in light, dark, and mobile', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const filterCss = fs.readFileSync(new URL('../src/styles/ai-news-filter.css', import.meta.url), 'utf8');
  assert.match(css, /--tag-on:\s*var\(--note\)/);
  assert.match(css, /--tag-on-wash:\s*var\(--note-wash\)/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*--tag-on:\s*#e09a62/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*--tag-on-wash:\s*color-mix\(in srgb, #e09a62 22%, var\(--paper\)\)/);
  assert.match(css, /:root:not\(\[data-theme="light"\]\)[\s\S]*--tag-on:\s*#e09a62/);
  assert.match(css, /\.overview-tag\s*\{[^}]*font-family:\s*var\(--serif\)/);
  assert.match(css, /\.overview-tag\s*\{[^}]*font-size:\s*0\.95em/);
  assert.match(css, /\.overview-tag\s*\{[^}]*font-weight:\s*650/);
  assert.match(css, /\.overview-tag\s*\{[^}]*border:\s*1\.5px solid var\(--panel-line\)/);
  assert.match(css, /\.overview-tag\s*\{[^}]*border-radius:\s*999px/);
  assert.match(css, /\.overview-tag\s*\{[^}]*background:\s*transparent/);
  assert.match(css, /\.keyword-cloud button\[data-keyword\]\s*\{[^}]*padding:\s*0\.08em 0\.42em 0\.1em/);
  assert.match(css, /\.keyword-cloud button\[data-keyword\]\s*\{[^}]*border:\s*1\.5px solid transparent/);
  assert.match(css, /\.keyword-cloud button\[data-keyword\]\s*\{[^}]*border-radius:\s*999px/);
  assert.match(css, /\.overview-tag\.is-on,\s*\n\.keyword-cloud button\[data-keyword\]\.is-on,\s*\n\.keyword-filter-chip\s*\{[^}]*color:\s*var\(--tag-on\)/);
  assert.match(css, /\.overview-tag\.is-on,\s*\n\.keyword-cloud button\[data-keyword\]\.is-on,\s*\n\.keyword-filter-chip\s*\{[^}]*background:\s*var\(--tag-on-wash\)/);
  assert.match(css, /\.keyword-cloud\.is-filtering button\[data-keyword\]:not\(\.is-on\),\s*\n\.weekly-overview-card\.is-dim\s*\{[^}]*opacity:\s*0\.4/);
  assert.match(css, /\.keyword-cloud button\[data-keyword\]::before,\s*\n\.overview-tag::before,\s*\n\.keyword-filter-chip::before\s*\{[^}]*height:\s*44px/);
  assert.match(css, /\.model-panel\.is-keyword-hidden\s*\{[^}]*display:\s*none !important/);
  assert.match(filterCss, /\.ai-news-filter-hidden\s*\{[^}]*display:\s*none !important/);
  assert.match(css, /\.keyword-filter-empty\s*\{[^}]*color:\s*var\(--muted\)/);
  assert.doesNotMatch(css, /换个词试试|keyword-filter-sticky|position:\s*sticky[^}]*keyword-filter-chip/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.prose \.weekly-overview-card\s*\{[^}]*padding:\s*0\.6rem 0\.7rem 0\.65rem/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*padding:\s*0\.7rem 0\.85rem 0\.75rem/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*border-radius:\s*var\(--ai-news-radius\)/);
  assert.doesNotMatch(css, /\.weekly-overview-card\.is-dim\s*\{[^}]*display:\s*none/);
});
