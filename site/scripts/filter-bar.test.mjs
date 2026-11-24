import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { countLabel } from '../src/lib/ai-news-category-filter.mjs';
import { mountCategoryFilter } from '../src/lib/ai-news-category-filter.mjs';
import {
  chipText,
  createFilterBar,
  filterRows,
  stackLayout,
  updateFilterBar,
} from '../src/lib/ai-news-filter-bar.mjs';
import { mountKeywordFilter } from '../src/lib/ai-news-keyword-filter.mjs';

function click(node) {
  node.click();
}

function buttons(bar, row) {
  return [...bar.querySelectorAll('button')].filter((button) => !row || button.dataset.row === row);
}

test('chip text matches the article plaque count, and a single row uses the title', () => {
  assert.equal(chipText({ text: '全部', count: 3 }), countLabel('全部', 3));
  assert.equal(chipText({ text: '常驻 Agent' }), '常驻 Agent');
  assert.deepEqual(filterRows({ title: '本周关键词', options: [{ id: '常驻 Agent', text: '常驻 Agent' }] }), [
    { id: 'main', label: '本周关键词', options: [{ id: '常驻 Agent', text: '常驻 Agent' }] },
  ]);
});

test('the plaque stacks the keyword bar, the chapter title, and the article bar', () => {
  assert.deepEqual(stackLayout({
    keyword: { height: 60, marginTop: 6, marginBottom: 18 },
    heading: { height: 32, marginTop: 26, marginBottom: 8 },
    article: { height: 120, marginTop: 6, marginBottom: 18 },
  }), {
    keywordTop: 0,
    headingTop: 60,
    articleTop: 92,
    stackHeight: 212,
  });
  const css = fs.readFileSync(new URL('../src/styles/ai-news-filter.css', import.meta.url), 'utf8');
  assert.match(css, /\.ai-news-keyword-bar\s*\{[^}]*z-index:\s*5/);
  assert.match(css, /\.ai-news-article-bar\s*\{[^}]*top:\s*var\(--ai-news-article-top/);
  assert.match(css, /\.prose:has\(\.ai-news-keyword-bar\) > h2:not\(:first-of-type\)\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /\.prose:has\(\.ai-news-keyword-bar\) > h2:not\(:first-of-type\)\s*\{[^}]*background:\s*var\(--paper\)/);
  assert.match(css, /\.ai-news-keyword-bar,\s*\n\.ai-news-article-bar\s*\{[^}]*background:\s*var\(--paper\)/);
  assert.match(css, /\.ai-news-keyword-bar\s*\{[^}]*box-shadow:[^;]*var\(--paper\)/);
  assert.match(css, /\.ai-news-article-bar::before\s*\{[^}]*background:\s*var\(--paper\)/);
  assert.match(css, /\.ai-news-article-bar::before\s*\{[^}]*bottom:\s*-12px/);
  assert.match(css, /\.ai-news-article-bar::before\s*\{[^}]*top:\s*calc\(-1 \* var\(--ai-news-article-top, 0px\) - 4px\)/);
  assert.doesNotMatch(css, /\.ai-news-article-bar::before\s*\{[^}]*transform:/);
  assert.doesNotMatch(css, /0 6px 0 var\(--paper\)/);
  assert.match(css, /\.ai-news-filter\s*\{[^}]*padding:\s*8px 12px 6px/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.ai-news-filter\s*\{[^}]*padding:\s*6px 8px 4px/);
  assert.match(css, /\.prose:has\(\.ai-news-keyword-bar\) h3\s*\{[^}]*position:\s*static/);
  assert.doesNotMatch(css, /\.prose:has\(\.ai-news-keyword-bar\) h3\s*\{[^}]*position:\s*sticky/);
  assert.match(css, /\.ai-news-filter button::before\s*\{[^}]*height:\s*44px/);
  assert.match(css, /\.ai-news-keyword-bar \.ai-news-filter-row\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(css, /\.ai-news-filter-label\s*\{[^}]*font-size:\s*16px/);
  assert.match(css, /\.ai-news-filter button\s*\{[^}]*font-size:\s*14px/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.ai-news-filter-row\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /:root\[data-theme="dark"\] \.ai-news-filter\s*\{[^}]*--wood-top:\s*#4a3526/);
  assert.match(css, /:root\[data-theme="dark"\] \.ai-news-filter\s*\{[^}]*--wood-chip:\s*#53402f/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*:root:not\(\[data-theme="light"\]\) \.ai-news-filter\s*\{[^}]*--wood-top:\s*#4a3526/);
  assert.doesNotMatch(css, /\.ai-news-keyword-bar\s*\{[^}]*--wood-top:\s*#ecd9b8/);
});

test('a multi-row plaque renders wood, counts, pressed state, and one click', () => {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  const clicks = [];
  const bar = createFilterBar(document, {
    title: '筛选精选文章',
    selection: 'multi',
    sticky: true,
    className: 'ai-news-article-bar',
    rows: [
      {
        id: 'cat',
        label: '文章类型',
        options: [
          { id: 'all', text: '全部', count: 2, selected: true, variant: 'all', data: { filter: 'all', row: 'cat' } },
          { id: '产品', text: '产品', count: 1, selected: false, variant: 'category', category: '产品', data: { filter: 'cat', cat: '产品' } },
        ],
      },
      {
        id: 'src',
        label: '来源类型',
        options: [
          { id: 'all', text: '全部', count: 2, selected: true, variant: 'all', data: { filter: 'all', row: 'src' } },
        ],
      },
    ],
    status: '没有匹配的条目',
    onSelect(detail) { clicks.push(detail); },
  });
  document.body.append(bar.element);
  assert.equal(bar.element.classList.contains('is-static'), false);
  assert.equal(bar.element.dataset.selection, 'multi');
  assert.equal(bar.element.getAttribute('aria-label'), '筛选精选文章');
  assert.deepEqual(
    [...bar.element.querySelectorAll('.ai-news-filter-label')].map((node) => node.textContent),
    ['文章类型', '来源类型'],
  );
  assert.equal(buttons(bar.element, 'cat')[0].textContent, '全部 (2)');
  assert.equal(buttons(bar.element, 'cat')[0].getAttribute('aria-pressed'), 'true');
  assert.equal(buttons(bar.element, 'cat')[1].dataset.cat, '产品');
  assert.equal(buttons(bar.element, 'cat')[1].classList.contains('ai-news-filter-cat'), true);
  assert.equal(bar.element.querySelectorAll('.ai-news-filter-seam').length, 1);
  assert.equal(bar.element.querySelectorAll('.ai-news-filter-nail').length, 2);
  assert.ok(document.getElementById('wood-rough'));
  assert.equal(bar.element.querySelector('.ai-news-filter-status').hidden, true);
  click(buttons(bar.element, 'cat')[1].querySelector('.ai-news-filter-face'));
  assert.equal(clicks.length, 1);
  assert.equal(clicks[0].optionId, '产品');
  assert.equal(clicks[0].rowId, 'cat');
  updateFilterBar(bar.element, {
    rows: [
      {
        id: 'cat',
        label: '文章类型',
        options: [
          { id: 'all', text: '全部', count: 1, selected: false, variant: 'all', data: { filter: 'all', row: 'cat' } },
          { id: '产品', text: '产品', count: 0, selected: true, variant: 'category', category: '产品', data: { filter: 'cat', cat: '产品' } },
        ],
      },
    ],
  });
  assert.equal(buttons(bar.element, 'cat')[0].textContent, '全部 (1)');
  assert.equal(buttons(bar.element, 'cat')[1].getAttribute('aria-pressed'), 'true');
  assert.equal(buttons(bar.element, 'cat')[1].textContent, '产品 (0)');
});

test('a static bar does not claim the sticky plaque', () => {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  const bar = createFilterBar(document, {
    title: '本周关键词',
    selection: 'single',
    sticky: false,
    options: [{ id: '常驻 Agent', text: '常驻 Agent', variant: 'word' }],
  });
  assert.equal(bar.element.classList.contains('is-static'), true);
  assert.equal(bar.element.dataset.selection, 'single');
  assert.equal(bar.element.querySelector('.ai-news-filter-seam'), null);
});

test('the selected-articles plaque keeps its rows, counts, and source linkage', () => {
  const { document } = parseHTML(`<!doctype html><html><body>
    <div class="prose">
      <time datetime="2026-11-20"></time>
      <h2>四、精选文章</h2>
      <h3>国内</h3>
      <article class="article-card" data-entry-id="https://claude.com/always">
        <h4 data-cat="产品" data-tags="DeepSeek">常驻</h4>
      </article>
      <article class="article-card" data-entry-id="https://example.com/other">
        <h4 data-cat="开源" data-tags="阿里">别的</h4>
      </article>
    </div>
  </body></html>`);
  mountCategoryFilter(document);
  const bar = document.querySelector('.ai-news-article-bar');
  assert.ok(bar);
  assert.equal(bar.classList.contains('ai-news-filter'), true);
  assert.deepEqual(
    [...bar.querySelectorAll('.ai-news-filter-label')].map((node) => node.textContent),
    ['文章类型', '来源类型', '来源公司'],
  );
  assert.equal(buttons(bar, 'cat').find((button) => button.dataset.filter === 'all').textContent, '全部 (2)');
  assert.equal(buttons(bar, 'cat').find((button) => button.dataset.cat === '产品').textContent, '产品 (1)');
  assert.equal(buttons(bar, 'cat').find((button) => button.dataset.cat === '模型').textContent, '模型 (0)');
  assert.equal(document.querySelector('h3').textContent, '国内 (2)');
  assert.equal(bar.querySelectorAll('.ai-news-filter-seam').length, 2);
  assert.equal(bar.querySelectorAll('.ai-news-filter-nail').length, 2);
  const ali = buttons(bar, 'tag').find((button) => button.dataset.tag === '阿里');
  const deepseek = buttons(bar, 'tag').find((button) => button.dataset.tag === 'DeepSeek');
  assert.equal(ali.hidden, false);
  click(buttons(bar, 'src').find((button) => button.dataset.src === '国内模型厂'));
  assert.equal(deepseek.hidden, false);
  assert.equal(ali.hidden, true);
  assert.equal(buttons(bar, 'src').find((button) => button.dataset.src === '国内模型厂').getAttribute('aria-pressed'), 'true');
  const cards = [...document.querySelectorAll('.article-card')];
  assert.equal(cards[0].classList.contains('ai-news-filter-hidden'), false);
  assert.equal(cards[1].classList.contains('ai-news-filter-hidden'), true);
  click(buttons(bar, 'src').find((button) => button.dataset.src === '国内模型厂'));
  assert.equal(ali.hidden, false);
  assert.equal(cards[1].classList.contains('ai-news-filter-hidden'), false);
});

test('the keyword plaque lists every keyword and stays in sync with the cloud and theme tags', () => {
  const { document } = parseHTML(`<!doctype html><html><body>
    <div class="prose">
      <h2>一、本周概览</h2>
      <div class="keyword-cloud">
        <button type="button" data-keyword="常驻 Agent">常驻 Agent</button>
        <button type="button" data-keyword="GPT-6.2 Astra">GPT-6.2 Astra</button>
        <script type="application/json" class="keyword-filter-data">${JSON.stringify({
          keywords: [
            { name: '常驻 Agent', targets: ['https://claude.com/always'] },
            { name: '常驻 Agent', targets: ['duplicate'] },
            { name: 'GPT-6.2 Astra', targets: [] },
          ],
        })}</script>
      </div>
      <article class="weekly-overview-card">
        <button type="button" class="overview-tag" data-keyword="常驻 Agent">常驻 Agent</button>
      </article>
      <article class="weekly-overview-card">
        <button type="button" class="overview-tag" data-keyword="别的主线">别的主线</button>
      </article>
      <h2>四、精选文章</h2>
      <h3>国内</h3>
      <article class="article-card" data-entry-id="https://claude.com/always">
        <h4 data-cat="产品" data-tags="DeepSeek">常驻</h4>
      </article>
      <article class="article-card" data-entry-id="https://example.com/other">
        <h4 data-cat="开源" data-tags="阿里">别的</h4>
      </article>
    </div>
  </body></html>`);
  mountCategoryFilter(document);
  mountKeywordFilter(document);
  const bar = document.querySelector('.ai-news-keyword-bar');
  const cloud = document.querySelector('.keyword-cloud');
  assert.equal(bar.nextElementSibling, cloud);
  assert.equal(bar.querySelector('.ai-news-filter-label').textContent, '本周关键词');
  assert.deepEqual(buttons(bar).map((button) => button.textContent), ['常驻 Agent', 'GPT-6.2 Astra']);
  assert.equal(bar.querySelector('.keyword-filter-chip'), null);
  const word = buttons(bar).find((button) => button.dataset.keyword === '常驻 Agent');
  const other = buttons(bar).find((button) => button.dataset.keyword === 'GPT-6.2 Astra');
  click(word.querySelector('.ai-news-filter-face'));
  assert.equal(word.getAttribute('aria-pressed'), 'true');
  assert.equal(other.getAttribute('aria-pressed'), 'false');
  assert.equal(cloud.querySelector('button[data-keyword="常驻 Agent"]').classList.contains('is-on'), true);
  assert.equal(document.querySelector('.overview-tag[data-keyword="常驻 Agent"]').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelectorAll('.weekly-overview-card')[1].classList.contains('is-dim'), true);
  assert.equal(document.querySelectorAll('.weekly-overview-card')[0].classList.contains('is-dim'), false);
  const articles = [...document.querySelectorAll('.article-card')];
  assert.equal(articles[0].classList.contains('ai-news-filter-hidden'), false);
  assert.equal(articles[1].classList.contains('ai-news-filter-hidden'), true);
  assert.equal(document.querySelector('.keyword-filter-chip'), null);
  assert.equal(document.querySelector('h2.has-keyword-filter .keyword-filter-count').textContent, '1/2');
  assert.equal(document.querySelector('.ai-news-article-bar .ai-news-filter-all').textContent, '全部 (1)');
  click(cloud.querySelector('button[data-keyword="GPT-6.2 Astra"]'));
  assert.equal(other.getAttribute('aria-pressed'), 'true');
  assert.equal(word.getAttribute('aria-pressed'), 'false');
  assert.equal(document.querySelector('.overview-tag').getAttribute('aria-pressed'), 'false');
  assert.equal(document.querySelectorAll('.weekly-overview-card')[0].classList.contains('is-dim'), true);
  assert.equal(document.querySelector('.keyword-filter-empty').hidden, false);
  assert.equal(document.querySelector('.keyword-filter-empty').textContent, '无相关文章');
  assert.equal(document.querySelector('.keyword-filter-count').textContent, '0/2');
  click(document.querySelector('.overview-tag[data-keyword="常驻 Agent"]'));
  assert.equal(word.getAttribute('aria-pressed'), 'true');
  click(word);
  assert.equal(word.getAttribute('aria-pressed'), 'false');
  assert.equal(other.getAttribute('aria-pressed'), 'false');
  assert.equal(cloud.classList.contains('is-filtering'), false);
  assert.equal(document.querySelector('.keyword-filter-count'), null);
  assert.equal(articles[0].classList.contains('ai-news-filter-hidden'), false);
  assert.equal(articles[1].classList.contains('ai-news-filter-hidden'), false);
  assert.equal(document.querySelector('.ai-news-article-bar .ai-news-filter-all').textContent, '全部 (2)');
});
