import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  COMPANY_ALIASES,
  SOURCE_ORDER,
  categoriesPresent,
  canonicalCompany,
  companiesForSource,
  companiesPresent,
  sourceGroup,
  countLabel,
  featuredCounts,
  filterChips,
  isFilterStuck,
  itemMatches,
  nextFilter,
  parseFilter,
  filterQueryMatches,
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
    items: [{ id: 'c', cat: '其他', tags: ['Cursor'] }],
  },
];

test('a page with no primary category offers no filter chips', () => {
  assert.deepEqual(categoriesPresent(['研发提效', 'Harness', '交付闭环']), []);
  assert.deepEqual(categoriesPresent(['产品', '产品合作', '开源']), ['产品', '开源']);
  assert.deepEqual(filterChips('2026-11-13', ['产品', '开源']), ['产品', '开源']);
  assert.deepEqual(filterChips('2026-11-13', ['其他', '架构', '实践']), ['架构', '实践', '其他']);
  assert.deepEqual(filterChips('2026-11-06', ['审查', '云端']), []);
  assert.deepEqual(filterChips('2026-11-06', ['Agent 与 Harness', '工程实践', '行业']), []);
  assert.deepEqual(filterChips('2026-11-20', ['产品', '开源']), ['架构', '产品', '实践', '其他']);
  assert.deepEqual(filterChips('2026-11-27', ['实践', '架构', '产品', '模型', '模型']), ['架构', '产品', '实践', '其他']);
  assert.deepEqual(filterChips('2026-12-04', ['产品', '模型']), ['架构', '产品', '实践', '其他']);
});

test('the query string keeps a primary, a source type, and a company apart', () => {
  assert.deepEqual(parseFilter(''), { cat: '', src: '', tag: '' });
  assert.deepEqual(parseFilter('?cat=产品'), { cat: '产品', src: '', tag: '' });
  assert.deepEqual(parseFilter('?cat=研发提效'), { cat: '', src: '', tag: '' });
  assert.deepEqual(parseFilter('?tag=DeepSeek'), { cat: '', src: '', tag: 'DeepSeek' });
  assert.deepEqual(parseFilter('?cat=产品&tag=DeepSeek'), { cat: '产品', src: '', tag: 'DeepSeek' });
  assert.deepEqual(parseFilter('?cat=不存在&tag=腾讯'), { cat: '', src: '', tag: '腾讯' });
  assert.deepEqual(parseFilter('?src=国内非模型厂&tag=阿里'), { cat: '', src: '国内非模型厂', tag: '阿里' });
  assert.deepEqual(parseFilter('?src=国外模型厂&tag=阿里'), { cat: '', src: '国外模型厂', tag: '' });
  assert.deepEqual(parseFilter('?src=没有这种&tag=阿里'), { cat: '', src: '', tag: '阿里' });
  assert.equal(filterQueryMatches('?tag=%E7%81%AB%E5%B1%B1%E5%BC%95%E6%93%8E', { cat: '', src: '', tag: '字节' }), false);
  assert.equal(filterQueryMatches('?tag=字节', { cat: '', src: '', tag: '字节' }), true);
});

test('choosing a company leaves the source type, and clearing the type clears the company', () => {
  const both = { cat: '产品', src: '国内非模型厂', tag: '腾讯' };
  assert.deepEqual(nextFilter(both, { kind: 'cat', value: '产品' }), { cat: '', src: '国内非模型厂', tag: '腾讯' });
  assert.deepEqual(nextFilter(both, { kind: 'tag', value: '腾讯' }), { cat: '产品', src: '国内非模型厂', tag: '' });
  assert.deepEqual(nextFilter(both, { kind: 'all', row: 'cat' }), { cat: '', src: '国内非模型厂', tag: '腾讯' });
  assert.deepEqual(nextFilter(both, { kind: 'all', row: 'tag' }), { cat: '产品', src: '国内非模型厂', tag: '' });
  assert.deepEqual(nextFilter(both, { kind: 'all', row: 'src' }), { cat: '产品', src: '', tag: '' });
  assert.deepEqual(nextFilter(both, { kind: 'all' }), { cat: '', src: '', tag: '' });
  assert.deepEqual(nextFilter({ cat: '产品', src: '', tag: '' }, { kind: 'tag', value: 'Google' }), {
    cat: '产品',
    src: '',
    tag: 'Google',
  });
  assert.deepEqual(nextFilter({ cat: '', src: '', tag: 'Google' }, { kind: 'tag', value: 'Google' }), {
    cat: '',
    src: '',
    tag: '',
  });
  assert.deepEqual(nextFilter({ cat: '', src: '国内非模型厂', tag: '阿里' }, { kind: 'src', value: '国外模型厂' }), {
    cat: '',
    src: '国外模型厂',
    tag: '',
  });
  assert.deepEqual(nextFilter({ cat: '', src: '国内非模型厂', tag: '阿里' }, { kind: 'src', value: '国内非模型厂' }), {
    cat: '',
    src: '',
    tag: '',
  });
  assert.equal(sourceGroup('阿里'), '国内非模型厂');
  assert.equal(sourceGroup('字节'), '国内非模型厂');
});

test('a source type limits the company row and always clears the selected company', () => {
  const names = ['DeepSeek', 'Anthropic', '阿里', 'Cursor', 'Notion'];
  assert.deepEqual(companiesForSource(names, ''), names);
  assert.deepEqual(companiesForSource(names, '国内模型厂'), ['DeepSeek']);
  assert.deepEqual(companiesForSource(names, '国外模型厂'), ['Anthropic']);
  assert.deepEqual(companiesForSource(names, '国内非模型厂'), ['阿里']);
  assert.deepEqual(companiesForSource(names, '国外非模型厂'), ['Cursor']);

  const domestic = { cat: '产品', src: '', tag: '阿里' };
  assert.deepEqual(nextFilter(domestic, { kind: 'src', value: '国内非模型厂' }), {
    cat: '产品',
    src: '国内非模型厂',
    tag: '',
  });
  assert.deepEqual(nextFilter({ cat: '产品', src: '国内模型厂', tag: 'DeepSeek' }, { kind: 'src', value: '国外模型厂' }), {
    cat: '产品',
    src: '国外模型厂',
    tag: '',
  });
  assert.deepEqual(nextFilter({ cat: '', src: '国内模型厂', tag: '' }, { kind: 'tag', value: 'DeepSeek' }), {
    cat: '',
    src: '国内模型厂',
    tag: 'DeepSeek',
  });
  assert.deepEqual(nextFilter({ cat: '', src: '国外模型厂', tag: '' }, { kind: 'tag', value: '阿里' }), {
    cat: '',
    src: '国外模型厂',
    tag: '',
  });
  assert.deepEqual(
    nextFilter({ cat: '产品', src: '国外模型厂', tag: '' }, { kind: 'all', row: 'src' }),
    { cat: '产品', src: '', tag: '' },
  );
  assert.deepEqual(
    nextFilter({ cat: '', src: '国内模型厂', tag: 'DeepSeek' }, { kind: 'cat', value: '模型' }),
    { cat: '模型', src: '国内模型厂', tag: 'DeepSeek' },
  );
  assert.deepEqual(
    nextFilter({ cat: '模型', src: '国内非模型厂', tag: '字节' }, { kind: 'cat', value: '模型' }),
    { cat: '', src: '国内非模型厂', tag: '字节' },
  );
  assert.deepEqual(parseFilter('?cat=架构&tag=火山引擎'), { cat: '架构', src: '', tag: '字节' });
  assert.deepEqual(
    nextFilter({ cat: '模型', src: '国内模型厂', tag: 'DeepSeek' }, { kind: 'all', row: 'tag' }),
    { cat: '模型', src: '国内模型厂', tag: '' },
  );
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

test('company chips follow the hand-ordered groups', () => {
  assert.deepEqual(
    companiesPresent([[
      'Google', 'Warp', '美团', 'OpenAI', '阿里', 'Hugging Face',
      'AWS', 'LangChain', '火山引擎', 'Amp', '腾讯', 'Cognition', '百度',
      'Lovable', 'Anthropic', 'Cursor', 'DeepSeek',
    ]]),
    [
      'DeepSeek',
      'Anthropic', 'OpenAI', 'Google',
      '阿里', '腾讯', '字节', '美团', '百度',
      'Cursor', 'Cognition', 'Amp', 'LangChain', 'Warp', 'Lovable', 'Hugging Face', 'AWS',
    ],
  );
  assert.equal(SOURCE_ORDER.includes('火山引擎'), false);
  assert.equal(canonicalCompany('火山引擎'), '字节');
  assert.equal(SOURCE_ORDER[SOURCE_ORDER.indexOf('腾讯') + 1], '字节');
  assert.equal(sourceGroup('火山引擎'), '国内非模型厂');
  assert.deepEqual(companiesPresent([['火山引擎', '字节', '腾讯']]), ['腾讯', '字节']);
  assert.deepEqual(parseFilter('?tag=火山引擎'), { cat: '', src: '', tag: '字节' });
  assert.deepEqual(parseFilter('?src=国内非模型厂&tag=火山引擎'), { cat: '', src: '国内非模型厂', tag: '字节' });
  assert.deepEqual(parseFilter('?src=国外模型厂&tag=火山引擎'), { cat: '', src: '国外模型厂', tag: '' });
  assert.equal(itemMatches({ cat: '架构', tags: ['火山引擎'], src: '国内非模型厂' }, { tag: '字节' }), true);
  assert.equal(itemMatches({ cat: '架构', tags: ['字节'], src: '国内非模型厂' }, { tag: '火山引擎' }), true);
  assert.deepEqual(
    nextFilter({ cat: '', src: '国内非模型厂', tag: '火山引擎' }, { kind: 'tag', value: '字节' }),
    { cat: '', src: '国内非模型厂', tag: '' },
  );
  assert.equal(SOURCE_ORDER.includes('ggml'), false);
  assert.deepEqual(
    companiesPresent([['Wrap', '月之暗面', 'XAI', 'Kimi'], ['Cogonition', 'Langchain', '智谱', '阶跃星辰']]),
    ['Kimi', 'GLM', 'StepFun', 'xAI', 'Cognition', 'LangChain', 'Warp'],
  );
  assert.deepEqual(companiesPresent([[], []]), []);
});

test('companies missing from the table sort last, in first-seen order', () => {
  assert.deepEqual(
    companiesPresent([['Zed', '腾讯', 'Notion'], ['腾讯', '小红书']]),
    ['腾讯', 'Zed', 'Notion', '小红书'],
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
  const known = new Set([...SOURCE_ORDER, ...Object.keys(COMPANY_ALIASES)]);
  const missing = [...published].filter((tag) => !known.has(tag));
  assert.deepEqual(missing, []);
  assert.ok(published.has('阿里'));
  assert.ok(published.has('Hugging Face'));
  assert.equal(published.has('淘宝'), false);
  assert.equal(published.has('ggml'), false);
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
  assert.match(css, /\.ai-news-filter\s*\{[^}]*background:\s*transparent/);
  assert.match(css, /\.ai-news-filter-board::before\s*\{[^}]*linear-gradient\(180deg, var\(--wood-top\), var\(--wood-bot\)\)/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /\.ai-news-filter-all,\s*\n\.ai-news-filter-co,\s*\n\.ai-news-filter-src,\s*\n\.ai-news-filter-word\s*\{[^}]*background:\s*var\(--wood-chip\)/);
  assert.match(css, /\.ai-news-filter-all,\s*\n\.ai-news-filter-co,\s*\n\.ai-news-filter-src,\s*\n\.ai-news-filter-word\s*\{[^}]*box-shadow:\s*inset 0 0 0 1\.5px var\(--wood-chip-line\)/);
  assert.match(css, /--wood-chip:\s*#fffaf0/);
  assert.match(css, /--wood-chip-line:\s*#bba98f/);
  assert.match(css, /--wood-on-line:\s*#3a2a1c/);
  assert.match(css, /--wood-on-ink:\s*#2a1d12/);
  assert.match(css, /--wood-title:\s*#6e3220/);
  assert.match(css, /--wood-top:\s*#ecd9b8/);
  assert.match(css, /--wood-bot:\s*#e6cfa8/);
  assert.match(css, /--wood-edge:\s*#8a5a34/);
  assert.match(css, /\.ai-news-filter-label\s*\{[^}]*color:\s*var\(--wood-title\)/);
  assert.match(css, /\.ai-news-filter-label\s*\{[^}]*font-weight:\s*700/);
  assert.match(css, /\.ai-news-filter-label\s*\{[^}]*font-size:\s*16px/);
  assert.match(css, /\.ai-news-filter button\[hidden\]\s*\{[^}]*display:\s*none !important/);
  assert.match(css, /\.ai-news-filter button\s*\{[^}]*font-size:\s*14px/);
  assert.match(css, /\.ai-news-filter button\s*\{[^}]*line-height:\s*1\.2/);
  assert.doesNotMatch(css, /\.ai-news-filter button\s*\{[^}]*font:\s*inherit/);
  assert.match(css, /\.ai-news-filter\s*\{[^}]*padding:\s*8px 12px 10px/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*padding:\s*8px 10px 10px/);
  assert.match(css, /\.ai-news-filter button::before\s*\{[^}]*height:\s*44px/);
  assert.match(css, /\.ai-news-filter button\s*\{[^}]*font-size:\s*14px/);
  assert.match(css, /transform:\s*rotate\(-0\.5deg\)/);
  assert.match(css, /filter:\s*url\("#wood-rough"\)/);
  assert.match(css, /\.ai-news-filter-seam path\s*\{[^}]*vector-effect:\s*non-scaling-stroke/);
  assert.match(css, /\.groove\s*\{[^}]*stroke-width:\s*1\.3px/);
  const restingWeight = css.match(/\.ai-news-filter button \.ai-news-filter-face\s*\{[^}]*font-weight:\s*(\d+)/);
  const selectedWeight = css.match(/\.ai-news-filter button\[aria-pressed='true'\] \.ai-news-filter-face\s*\{[^}]*font-weight:\s*(\d+)/);
  assert.ok(restingWeight && selectedWeight);
  assert.notEqual(restingWeight[1], selectedWeight[1]);
  assert.equal(restingWeight[1], '400');
  assert.equal(selectedWeight[1], '600');
  assert.match(css, /\.ai-news-filter \.ai-news-filter-co\[aria-pressed='true'\]/);
  assert.doesNotMatch(css, /(^|\n)\.ai-news-filter-co\[aria-pressed='true'\]/);
  assert.doesNotMatch(css, /AI News Chip Bold/);
  assert.doesNotMatch(css, /\.ai-news-filter-rule/);
  assert.doesNotMatch(css, /font-weight:\s*800/);
  assert.doesNotMatch(css, /font-weight:\s*900/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.ai-news-filter-label\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.ai-news-filter-label\s*\{[^}]*left:\s*0/);
  assert.match(css, /\.ai-news-filter-label\s*\{[^}]*background:\s*transparent/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.ai-news-filter-label\s*\{[^}]*background:\s*transparent/);
  assert.doesNotMatch(css, /--wood-label-bg/);
  const source = fs.readFileSync(new URL('../src/lib/ai-news-category-filter.mjs', import.meta.url), 'utf8');
  const wood = fs.readFileSync(new URL('../src/lib/ai-news-filter-bar.mjs', import.meta.url), 'utf8');
  assert.match(source, /label: '文章类型'/);
  assert.match(source, /label: '来源类型'/);
  assert.match(source, /label: '来源公司'/);
  assert.match(source, /createFilterBar/);
  assert.match(wood, /baseFrequency: '0\.02'/);
  assert.match(wood, /scale: '3\.5'/);
  assert.match(source, /allOption\(\{ selected: !filter\.cat, count: counts\.total, row: 'cat' \}\)/);
  assert.match(source, /allOption\(\{ selected: !filter\.src, count: counts\.total, row: 'src' \}\)/);
  assert.match(source, /allOption\(\{ selected: !filter\.tag, count: counts\.total, row: 'tag' \}\)/);
  assert.match(wood, /chipText\(\{ text: '全部', count: option\.count \}\)/);
  assert.match(source, /countLabel\(name, counts\.cats\[name\] \|\| 0\)/);
  assert.match(source, /countLabel\(group\.name, counts\.srcs\[group\.name\] \|\| 0\)/);
  assert.match(source, /countLabel\(name, counts\.companies\[name\] \|\| 0\)/);
  assert.match(source, /labelHeading\(group\.heading, group\.items\.length\)/);
  assert.match(source, /querySelector\(':scope > \.ai-news-coverage'\)/);
  assert.match(css, /\.ai-news-article-bar \+ \.ai-news-coverage\s*\{[^}]*margin-top:\s*0/);
  assert.doesNotMatch(css, /\.ai-news-coverage\s*\{[^}]*(background|padding|color|border)/);
  assert.match(css, /\.ai-news-filter button\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
  const global = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(global, /\.info-card\s*\{[^}]*background:\s*var\(--panel\)/);
  assert.match(global, /\.info-card\s*\{[^}]*color:\s*var\(--panel-ink\)/);
  assert.match(global, /:root\[data-theme="dark"\] \.info-card-label\s*\{[^}]*color:\s*#e09a62/);
  assert.match(global, /:root:not\(\[data-theme="light"\]\) \.info-card-label\s*\{[^}]*color:\s*#e09a62/);
  assert.match(global, /@media \(max-width:\s*560px\)[\s\S]*\.info-card\s*\{[^}]*padding:\s*0\.6rem 0\.7rem 0\.65rem/);
  const noteCard = fs.readFileSync(new URL('../src/styles/note-card.css', import.meta.url), 'utf8');
  assert.match(noteCard, /:root\[data-theme="dark"\] \.info-card/);
  assert.match(noteCard, /:root:not\(\[data-theme="light"\]\) \.info-card/);
  assert.match(wood, /preserveAspectRatio: 'none'/);
  assert.match(css, /\.prose h4 \.ai-news-tag,\s*\n\.prose h4 \.ai-news-src\s*\{[^}]*background:\s*var\(--wood-chip\)/);
  assert.match(css, /\.prose h4 \.ai-news-tag\[aria-pressed='true'\],\s*\n\.prose h4 \.ai-news-src\[aria-pressed='true'\]\s*\{[^}]*box-shadow:\s*inset 0 0 0 2\.5px var\(--wood-on-line\)/);
  assert.match(source, /querySelectorAll\('\.ai-news-cat'\)/);
  assert.match(source, /kind: 'cat', value: category\.dataset\.cat/);
  assert.match(source, /querySelectorAll\('\.ai-news-src'\)/);
  assert.match(source, /querySelectorAll\('\.ai-news-tag'\)/);
  assert.match(source, /addEventListener\?\.\('popstate'/);
});

test('labels show how many selected articles sit under each chip, including zero', () => {
  const items = [
    { cat: '产品', src: '国内模型厂', tags: ['DeepSeek', 'DeepSeek'] },
    { cat: '开源', src: '国内非模型厂', tags: ['阿里', '腾讯'] },
    { cat: '产品', src: '国外模型厂', tags: ['Anthropic'] },
  ];
  const counts = featuredCounts(items);
  assert.equal(counts.total, 3);
  assert.equal(counts.cats['产品'], 2);
  assert.equal(counts.cats['模型'], 0);
  assert.equal(counts.cats['架构'], 0);
  assert.equal(counts.srcs['国内模型厂'], 1);
  assert.equal(counts.srcs['国外模型厂'], 1);
  assert.equal(counts.srcs['国外非模型厂'], 0);
  assert.equal(counts.companies.DeepSeek, 1);
  assert.equal(counts.companies['阿里'], 1);
  assert.equal(counts.companies['腾讯'], 1);
  assert.equal(countLabel('全部', counts.total), '全部 (3)');
  assert.equal(countLabel('模型', counts.cats['模型']), '模型 (0)');
  assert.equal(countLabel('国内模型厂', 12), '国内模型厂 (12)');
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
