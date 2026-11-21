import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseArticleCard, splitNoteCards } from '../src/lib/note-card-model.mjs';

const selected = `
<h2 id="四精选文章">四、精选文章</h2>
<div class="article-card"><h4 id="building-always-on-agents" data-cat="Agent 与 Harness" data-tags="Anthropic"><a href="https://claude.com/a">Building always-on agents</a></h4><p>常驻 Agent <mark>大部分时间在睡</mark>，再干活。</p><details class="article-more"><summary>完整总结</summary><p><strong>解决什么问题：</strong>不能真的不关机。</p><p><strong>如何解决：</strong>五个原语。</p><p><strong>效果怎样：</strong>没有成绩。</p><p><strong>洞察与启发：</strong>醒来再接着干。</p><p><strong>相关工作：</strong>Devin Bot。</p></details></div>
`;

test('selected articles keep surrounding html and shorten the five labels', () => {
  const blocks = splitNoteCards(`<p>前文</p>${selected}<p>后文</p>`);
  assert.match(blocks[0].html, /<p>前文<\/p>/);
  assert.match(blocks[0].html, /四、精选文章/);
  assert.match(blocks.at(-1).html, /<p>后文<\/p>/);
  const card = blocks[1].card;
  assert.equal(card.category, 'Agent 与 Harness');
  assert.deepEqual(card.sources, ['Anthropic']);
  assert.equal(card.title, 'Building always-on agents');
  assert.equal(card.href, 'https://claude.com/a');
  assert.equal(card.headingId, 'building-always-on-agents');
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
  assert.doesNotMatch(css, /\.ai-news-filter\s*\{/);
  assert.match(filter, /\.ai-news-filter-cat\[data-cat='模型'\]/);
  assert.match(filter, /\.ai-news-filter\s*\{/);
});
