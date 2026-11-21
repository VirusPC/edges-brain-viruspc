import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  COMPANY_CLASS,
  categoriesPresent,
  companiesPresent,
  filterChips,
  isFilterStuck,
  itemMatches,
  nextFilter,
  parseFilter,
  sectionPlan,
  splitTags,
  toSearch,
} from '../src/lib/ai-news-category-filter.mjs';

const sections = [
  {
    id: 'cn',
    items: [
      { id: 'a', cat: '产品', tags: ['DeepSeek'] },
      { id: 'b', cat: '开源', tags: ['LoopForge'] },
    ],
  },
  {
    id: 'intl',
    items: [{ id: 'c', cat: '行业', tags: ['Cursor'] }],
  },
];

test('a page with no primary category offers no filter chips', () => {
  assert.deepEqual(categoriesPresent(['研发提效', 'Harness', '交付闭环']), []);
  assert.deepEqual(categoriesPresent(['产品', '产品合作', '开源']), ['产品', '开源']);
  assert.deepEqual(filterChips('2026-11-13', ['产品', '开源']), ['产品', '开源']);
  assert.deepEqual(filterChips('2026-11-06', ['审查', '云端']), []);
  assert.deepEqual(filterChips('2026-11-20', ['产品', '开源']), [
    '模型',
    '产品',
    'Agent 与 Harness',
    '工程实践',
    '开源',
    '行业',
  ]);
});

test('the query string keeps a primary and a company together', () => {
  assert.deepEqual(parseFilter(''), { cat: '', tag: '' });
  assert.deepEqual(parseFilter('?cat=产品'), { cat: '产品', tag: '' });
  assert.deepEqual(parseFilter('?cat=研发提效'), { cat: '', tag: '' });
  assert.deepEqual(parseFilter('?tag=DeepSeek'), { cat: '', tag: 'DeepSeek' });
  assert.deepEqual(parseFilter('?cat=产品&tag=DeepSeek'), { cat: '产品', tag: 'DeepSeek' });
  assert.deepEqual(parseFilter('?cat=不存在&tag=腾讯'), { cat: '', tag: '腾讯' });
});

test('choosing the active filter again clears only that row', () => {
  const both = { cat: '产品', tag: '腾讯' };
  assert.deepEqual(nextFilter(both, { kind: 'cat', value: '产品' }), { cat: '', tag: '腾讯' });
  assert.deepEqual(nextFilter(both, { kind: 'tag', value: '腾讯' }), { cat: '产品', tag: '' });
  assert.deepEqual(nextFilter(both, { kind: 'all', row: 'cat' }), { cat: '', tag: '腾讯' });
  assert.deepEqual(nextFilter(both, { kind: 'all', row: 'tag' }), { cat: '产品', tag: '' });
  assert.deepEqual(nextFilter(both, { kind: 'all' }), { cat: '', tag: '' });
  assert.deepEqual(nextFilter({ cat: '产品', tag: '' }, { kind: 'tag', value: '百度' }), {
    cat: '产品',
    tag: '百度',
  });
});

test('search keeps unrelated params and can share both filters', () => {
  assert.equal(toSearch({ cat: '产品', tag: '' }, ''), '?cat=%E4%BA%A7%E5%93%81');
  assert.equal(toSearch({ cat: '', tag: 'DeepSeek' }, '?from=share'), '?from=share&tag=DeepSeek');
  assert.equal(toSearch({ cat: '', tag: '' }, '?cat=%E4%BA%A7%E5%93%81&from=share'), '?from=share');
  assert.equal(
    toSearch({ cat: '产品', tag: '腾讯' }, '?from=share'),
    '?from=share&cat=%E4%BA%A7%E5%93%81&tag=%E8%85%BE%E8%AE%AF',
  );
});

test('company chips put domestic before foreign, then model, AI, and internet', () => {
  assert.deepEqual(
    companiesPresent([[
      'Google', 'Warp', 'ggml', '美团', 'OpenAI', '阿里', 'Hugging Face',
      'AWS', 'LangChain', '火山引擎', 'Amp', '腾讯', 'Cognition', '百度',
      'Lovable', 'Anthropic', 'Cursor', 'DeepSeek',
    ]]),
    [
      'DeepSeek',
      '阿里', '百度', '火山引擎', '美团', '腾讯',
      'Anthropic', 'OpenAI',
      'Amp', 'Cognition', 'Cursor', 'ggml', 'Hugging Face', 'LangChain', 'Lovable', 'Warp',
      'AWS', 'Google',
    ],
  );
  assert.deepEqual(
    companiesPresent([['Warp', '阿里'], ['DeepSeek', 'Warp']]),
    ['DeepSeek', '阿里', 'Warp'],
  );
  assert.deepEqual(companiesPresent([[], []]), []);
});

test('companies missing from the table sort last, in zh-CN order', () => {
  assert.deepEqual(
    companiesPresent([['Zed', '腾讯', 'Notion'], ['腾讯', '小红书']]),
    ['腾讯', '小红书', 'Notion', 'Zed'],
  );
});

test('every published company tag is listed in the source table', () => {
  const dir = new URL('../../ai-news/', import.meta.url);
  const files = fs.readdirSync(dir).filter((name) => /^\d{4}-\d{2}-\d{2}-ai-news\.md$/.test(name));
  assert.ok(files.length >= 1);
  const published = new Set();
  for (const name of files) {
    const text = fs.readFileSync(new URL(name, dir), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.startsWith('#### ')) continue;
      const head = line.slice('#### '.length).split('[')[0];
      const labels = [...head.matchAll(/(?:<([^<>\n"]{1,32})>|&lt;([^&]+?)&gt;)/g)]
        .map((match) => (match[1] ?? match[2]).trim())
        .filter(Boolean);
      for (const tag of labels.slice(1)) published.add(tag);
    }
  }
  const missing = [...published].filter((tag) => !COMPANY_CLASS[tag]);
  assert.deepEqual(missing, []);
  assert.ok(published.has('阿里'));
  assert.equal(published.has('淘宝'), false);
});

test('a stuck filter should return to the chapter, a resting one should not', () => {
  assert.equal(isFilterStuck(0, 0), true);
  assert.equal(isFilterStuck(1, 0), true);
  assert.equal(isFilterStuck(48, 0), false);
  assert.equal(isFilterStuck(12, 16), true);
});

test('the filter sticks inside the chapter and becomes one scrolling row on a phone', () => {
  const css = fs.readFileSync(new URL('../src/styles/ai-news-filter.css', import.meta.url), 'utf8');
  assert.match(css, /\.ai-news-selected\s*\{[^}]*display:\s*flow-root/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /top:\s*var\(--ai-news-filter-top,\s*0px\)/);
  assert.match(css, /background:\s*var\(--paper\)/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /\.ai-news-filter-all\s*\{[^}]*background:\s*transparent/);
  assert.match(css, /\.ai-news-filter-all\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--rule\)/);
  assert.match(css, /\.ai-news-filter-co\s*\{/);
  assert.match(css, /\.ai-news-filter-label\s*\{[^}]*color:\s*var\(--ink\)/);
  assert.match(css, /\.ai-news-filter-label\s*\{[^}]*font-weight:\s*700/);
  assert.match(css, /\.ai-news-filter-label\s*\{[^}]*font-size:\s*1em/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.ai-news-filter-label\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.ai-news-filter-label\s*\{[^}]*left:\s*0/);
  const source = fs.readFileSync(new URL('../src/lib/ai-news-category-filter.mjs', import.meta.url), 'utf8');
  assert.match(source, /addLabel\(row,\s*'分类'\)/);
  assert.match(source, /addLabel\(companyRow,\s*'来源'\)/);
});

test('a category and a company both have to match, and an empty section hides', () => {
  const byProduct = sectionPlan(sections, { cat: '产品', tag: '' });
  assert.equal(byProduct.any, true);
  assert.equal(byProduct.sections[0].show, true);
  assert.deepEqual(byProduct.sections[0].items.map((item) => item.show), [true, false]);
  assert.equal(byProduct.sections[1].show, false);

  const missing = sectionPlan(sections, { cat: '模型', tag: '' });
  assert.equal(missing.any, false);
  assert.equal(missing.sections.every((section) => section.show === false), true);

  const byTag = sectionPlan(sections, { cat: '', tag: 'Cursor' });
  assert.equal(byTag.sections[0].show, false);
  assert.equal(byTag.sections[1].items[0].show, true);

  const stacked = sectionPlan(sections, { cat: '产品', tag: 'DeepSeek' });
  assert.deepEqual(stacked.sections[0].items.map((item) => item.show), [true, false]);
  assert.equal(stacked.sections[1].show, false);

  const none = sectionPlan(sections, { cat: '产品', tag: 'Cursor' });
  assert.equal(none.any, false);
  assert.equal(none.sections.every((section) => section.show === false), true);

  assert.equal(itemMatches({ cat: '开源', tags: [] }, { cat: '', tag: '' }), true);
  assert.deepEqual(splitTags('Amp · Lovable · Claude'), ['Amp', 'Lovable', 'Claude']);
  assert.deepEqual(splitTags(''), []);
});
