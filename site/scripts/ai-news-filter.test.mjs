import assert from 'node:assert/strict';
import test from 'node:test';
import {
  categoriesPresent,
  filterChips,
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

test('the query string selects one primary or one free tag', () => {
  assert.deepEqual(parseFilter(''), { kind: 'all' });
  assert.deepEqual(parseFilter('?cat=产品'), { kind: 'cat', value: '产品' });
  assert.deepEqual(parseFilter('?cat=研发提效'), { kind: 'all' });
  assert.deepEqual(parseFilter('?tag=DeepSeek'), { kind: 'tag', value: 'DeepSeek' });
  assert.deepEqual(parseFilter('?cat=产品&tag=DeepSeek'), { kind: 'cat', value: '产品' });
});

test('choosing the active filter again clears it', () => {
  const product = { kind: 'cat', value: '产品' };
  assert.deepEqual(nextFilter(product, { kind: 'cat', value: '产品' }), { kind: 'all' });
  assert.deepEqual(nextFilter(product, { kind: 'all' }), { kind: 'all' });
  assert.deepEqual(nextFilter({ kind: 'all' }, { kind: 'tag', value: 'Cursor' }), {
    kind: 'tag',
    value: 'Cursor',
  });
});

test('search keeps unrelated params and drops the filter when cleared', () => {
  assert.equal(toSearch({ kind: 'cat', value: '产品' }, ''), '?cat=%E4%BA%A7%E5%93%81');
  assert.equal(toSearch({ kind: 'tag', value: 'DeepSeek' }, '?from=share'), '?from=share&tag=DeepSeek');
  assert.equal(toSearch({ kind: 'all' }, '?cat=%E4%BA%A7%E5%93%81&from=share'), '?from=share');
});

test('a category hides other sections and a free tag matches that tag only', () => {
  const byProduct = sectionPlan(sections, { kind: 'cat', value: '产品' });
  assert.equal(byProduct.any, true);
  assert.equal(byProduct.sections[0].show, true);
  assert.deepEqual(byProduct.sections[0].items.map((item) => item.show), [true, false]);
  assert.equal(byProduct.sections[1].show, false);

  const missing = sectionPlan(sections, { kind: 'cat', value: '模型' });
  assert.equal(missing.any, false);
  assert.equal(missing.sections.every((section) => section.show === false), true);

  const byTag = sectionPlan(sections, { kind: 'tag', value: 'Cursor' });
  assert.equal(byTag.sections[0].show, false);
  assert.equal(byTag.sections[1].items[0].show, true);

  assert.equal(itemMatches({ cat: '开源', tags: [] }, { kind: 'all' }), true);
  assert.deepEqual(splitTags('Amp · Lovable · Claude'), ['Amp', 'Lovable', 'Claude']);
  assert.deepEqual(splitTags(''), []);
});
