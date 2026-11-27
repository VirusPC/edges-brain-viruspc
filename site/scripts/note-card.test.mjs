import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseArticleCard, splitNoteCards } from '../src/lib/note-card-model.mjs';

const selected = `
<h2 id="四精选文章">四、精选文章</h2>
<div class="article-card"><h4 id="building-always-on-agents" data-entry-id="https://claude.com/a" data-cat="架构" data-tags="Anthropic"><a href="https://claude.com/a">Building always-on agents</a></h4><p>常驻 Agent <mark>大部分时间在睡</mark>，再干活。</p><details class="article-more"><summary>完整总结</summary><p><strong>解决什么问题：</strong>不能真的不关机。</p><p><strong>如何解决：</strong>五个原语。</p><p><strong>效果怎样：</strong>没有成绩。</p><p><strong>洞察与启发：</strong>醒来再接着干。</p><p><strong>相关工作：</strong>Devin Bot。</p></details></div>
`;

test('selected articles keep surrounding html and shorten the five labels', () => {
  const blocks = splitNoteCards(`<p>前文</p>${selected}<p>后文</p>`);
  assert.match(blocks[0].html, /<p>前文<\/p>/);
  assert.match(blocks[0].html, /四、精选文章/);
  assert.match(blocks.at(-1).html, /<p>后文<\/p>/);
  const card = blocks[1].card;
  assert.equal(card.category, '架构');
  assert.deepEqual(card.sources, ['Anthropic']);
  assert.equal(card.title, 'Building always-on agents');
  assert.equal(card.href, 'https://claude.com/a');
  assert.equal(card.headingId, 'building-always-on-agents');
  assert.equal(card.entryId, 'https://claude.com/a');
  assert.match(card.ledeHtml, /<mark>大部分时间在睡<\/mark>/);
  assert.deepEqual(
    card.sections.map((section) => [section.label, section.highlight, section.html]),
    [
      ['什么问题', false, '不能真的不关机。'],
      ['如何解决', false, '五个原语。'],
      ['效果怎样', false, '没有成绩。'],
      ['洞察与启发', true, '醒来再接着干。'],
      ['相关工作', false, 'Devin Bot。'],
    ],
  );
});

test('a project card can omit category, source, and later sections', () => {
  const card = parseArticleCard(`
    <h4><a href="https://github.com/a/b">a/b</a></h4>
    <p>一句介绍。</p>
    <details class="article-more"><summary>完整总结</summary>
    <p><strong>解决什么问题：</strong>散。</p>
    <p><strong>如何解决：</strong>收。</p>
    <p><strong>效果怎样：</strong>没数字。</p>
    </details>
  `);
  assert.equal(card.category, '');
  assert.deepEqual(card.sources, []);
  assert.equal(card.title, 'a/b');
  assert.equal(card.sections.length, 3);
  assert.equal(card.sections.some((section) => section.highlight), false);
  assert.equal(card.sections[0].label, '什么问题');
});

test('a plain details block titled 完整总结 parses into the five card sections', () => {
  const card = parseArticleCard(`
    <h4><a href="https://example.com/post">一篇文章</a></h4>
    <p>一句导语。</p>
    <details><summary> 完整总结 </summary>
      <p><strong>解决什么问题：</strong>背景。</p>
      <p><strong>如何解决：</strong>做法。</p>
      <p><strong>效果怎样：</strong>效果。</p>
      <p><strong>洞察与启发：</strong>启发。</p>
      <p><strong>相关工作：</strong>相关内容。</p>
    </details>
  `);
  assert.deepEqual(card.sections.map((section) => section.label), [
    '什么问题', '如何解决', '效果怎样', '洞察与启发', '相关工作',
  ]);
  assert.equal(card.sections[3].highlight, true);
  assert.equal(card.extraHtml, '');
});

test('a plain details block with another summary stays in extraHtml', () => {
  const raw = '<details><summary>补充说明</summary><p>额外内容。</p></details>';
  const card = parseArticleCard(`<h4><a href="https://example.com/post">一篇文章</a></h4>${raw}`);
  assert.equal(card.sections.length, 0);
  assert.equal(card.extraHtml, raw);
});

test('a card without a fold keeps the paragraph and does not invent sections', () => {
  const card = parseArticleCard('<h4 data-cat="产品"><a href="https://x">只有标题</a></h4><p>订阅源里只有这些。</p>');
  assert.equal(card.category, '产品');
  assert.equal(card.sections.length, 0);
  assert.match(card.ledeHtml, /订阅源里只有这些/);
  assert.equal(card.extraHtml, '');
});

test('note card css stays serif and does not restyle the filter bar', () => {
  const css = fs.readFileSync(new URL('../src/styles/note-card.css', import.meta.url), 'utf8');
  const filter = fs.readFileSync(new URL('../src/styles/ai-news-filter.css', import.meta.url), 'utf8');
  assert.match(css, /font-family:\s*var\(--serif\)/);
  assert.doesNotMatch(css, /Caveat|Ma Shan Zheng|马善政|var\(--hand\)/);
  assert.doesNotMatch(css, /rotate\(|repeating-linear-gradient|note-card-tape/);
  assert.match(css, /grid-template-columns:\s*auto minmax\(0, 1fr\)/);
  assert.match(css, /\.note-card-k\s*\{[^}]*width:\s*5\.5em/);
  assert.match(css, /\.note-card-k\s*\{[^}]*text-align:\s*left/);
  assert.doesNotMatch(css, /text-align:\s*right/);
  assert.match(css, /@media \(max-width:\s*520px\)/);
  assert.match(css, /\.note-card-k\s*\{[^}]*font-weight:\s*400/);
  assert.match(css, /--note-hl:\s*rgba\(214,\s*160,\s*60,\s*0\.32\)/);
  assert.match(css, /transparent 55%/);
  assert.match(css, /--note-gap-section:\s*16px/);
  assert.match(css, /--note-leading:\s*1\.68/);
  assert.doesNotMatch(css, /#24180a|#ffd56a/);
  assert.match(css, /white-space:\s*nowrap/);
  assert.match(css, /\.note-card-hl/);
  assert.match(
    css,
    /\.prose \.note-card h4 \.ai-news-filter-src\.ai-news-src,\s*\n\.prose \.note-card h4 \.ai-news-filter-co\.ai-news-tag \{[^}]*font-weight:\s*400/,
  );
  assert.match(
    css,
    /\.prose \.note-card h4 \.ai-news-filter-src\.ai-news-src,\s*\n\.prose \.note-card h4 \.ai-news-filter-co\.ai-news-tag \{[^}]*box-shadow:\s*inset 0 0 0 1\.5px var\(--wood-chip-line\)/,
  );
  assert.match(
    css,
    /\.prose \.note-card h4 \.ai-news-filter-src\.ai-news-src\[aria-pressed='true'\],\s*\n\.prose \.note-card h4 \.ai-news-filter-co\.ai-news-tag\[aria-pressed='true'\] \{[^}]*font-weight:\s*600/,
  );
  assert.match(
    css,
    /\.prose \.note-card h4 \.ai-news-filter-src\.ai-news-src\[aria-pressed='true'\],\s*\n\.prose \.note-card h4 \.ai-news-filter-co\.ai-news-tag\[aria-pressed='true'\] \{[^}]*box-shadow:\s*inset 0 0 0 2\.5px var\(--wood-on-line\)/,
  );
  assert.match(
    css,
    /\.prose \.note-card h4 \.ai-news-filter-src\.ai-news-src\[aria-pressed='true'\],\s*\n\.prose \.note-card h4 \.ai-news-filter-co\.ai-news-tag\[aria-pressed='true'\] \{[^}]*color:\s*var\(--wood-on-ink\)/,
  );
  assert.match(css, /\.prose \.note-card h4 \.ai-news-src:focus-visible[\s\S]*outline:\s*2px solid var\(--wood-edge\)/);
  assert.doesNotMatch(
    css,
    /\.prose \.note-card h4 \.ai-news-filter-co\.ai-news-tag\[aria-pressed='true'\] \{[^}]*font-weight:\s*700/,
  );
  assert.doesNotMatch(css, /\.ai-news-filter\s*\{/);
  assert.match(filter, /\.ai-news-filter-cat\[data-cat='模型'\]/);
  assert.match(filter, /\.ai-news-filter\s*\{/);
});
