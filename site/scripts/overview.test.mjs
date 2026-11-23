import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { summaryLine } from '../src/lib/ai-news.mjs';
import { entryAnchor } from '../src/lib/entry-anchor.mjs';
import { linkOverviewText, overviewListHtml } from '../src/lib/overview.mjs';
import { seedForCard } from '../src/lib/rough-rounded-rect.mjs';

test('entry anchors are stable and do not keep spaces from the id', () => {
  const first = entryAnchor('GPT-6.2 Astra');
  assert.equal(first, entryAnchor('GPT-6.2 Astra'));
  assert.match(first, /^entry-[A-Za-z0-9_-]+$/);
  assert.notEqual(entryAnchor('GPT-6.2 Astra'), entryAnchor('GPT-6.2 Sol'));
});

test('overview links the first label and lets the longer label win', () => {
  const html = linkOverviewText('常驻 Agent 里的常驻 Agent，还有 GPT-6.2 Astra。', [
    { id: 'short', label: 'Agent' },
    { id: 'astra', label: 'GPT-6.2 Astra' },
    { id: 'theme', label: '常驻 Agent' },
  ]);
  assert.match(html, new RegExp(`^<a href="#${entryAnchor('theme')}">常驻 Agent</a>`));
  assert.equal(html.match(/href="#entry-/g).length, 2);
  assert.match(html, new RegExp(`href="#${entryAnchor('astra')}"`));
  assert.doesNotMatch(html, new RegExp(`href="#${entryAnchor('short')}"`));
  assert.match(html, /常驻 Agent，还有/);
});

test('the index line is the first overview item, not the cloud', () => {
  const body = [
    '## 一、本周概览',
    '',
    '<div class="weekly-overview">',
    '<article class="weekly-overview-card"><p class="info-card-label" aria-hidden="true"><svg></svg></p><p class="weekly-overview-text"><a href="#entry-x">常驻 Agent</a> 大部分时间在睡。</p></article>',
    '<article class="weekly-overview-card"><p class="weekly-overview-text">第二条。</p></article>',
    '</div>',
    '',
    '## 二、模型进展',
  ].join('\n');
  assert.equal(summaryLine(body, false), '常驻 Agent 大部分时间在睡。');
  assert.equal(summaryLine('## 一、本周关键词\n\n<br/>\n', false), '');
});

test('overview themes are cards in the existing frame, with the sentence left intact', () => {
  const html = overviewListHtml({
    themes: [
      { kind: 'model', text: '常驻 Agent 里的 GPT-6.2 Astra。', refs: [{ id: 'astra', label: 'GPT-6.2 Astra' }] },
      { kind: 'other', text: '一篇说明了变化。', refs: [{ id: 'post', label: '一篇' }] },
      { kind: 'other', text: '另一条主线也在。', refs: [] },
      { text: '没有种类时只留句子。', refs: [] },
    ],
  });
  assert.match(html, /^<div class="weekly-overview">/);
  assert.equal((html.match(/class="weekly-overview-card"/g) || []).length, 4);
  assert.equal((html.match(/<p class="weekly-overview-text">/g) || []).length, 4);
  assert.equal((html.match(/class="info-card-icon"/g) || []).length, 3);
  assert.match(html, /<rect x="4" y="4" width="16" height="16" rx="2"><\/rect>/);
  assert.match(html, /<path d="M15 18h-5"><\/path>/);
  assert.match(html, new RegExp(`href="#${entryAnchor('astra')}">GPT-6\\.2 Astra</a>`));
  assert.match(html, /没有种类时只留句子。/);
  assert.doesNotMatch(html, /<ol|本周主线|编号/);
  const unmarked = html.slice(html.lastIndexOf('<article'));
  assert.doesNotMatch(unmarked, /info-card-icon|info-card-label/);
});

test('overview type matches the prose and the flash fades in both themes', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const outline = fs.readFileSync(new URL('../src/lib/rough-outline.mjs', import.meta.url), 'utf8');
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*font-size:\s*1em/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*font-family:\s*var\(--serif\)/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*line-height:\s*1\.7/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*border:\s*1px solid var\(--panel-line\)/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*border-radius:\s*var\(--ai-news-radius\)/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*background:\s*var\(--panel\)/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*color:\s*var\(--panel-ink\)/);
  assert.match(css, /\.prose \.weekly-overview-card\s*\{[^}]*padding:\s*0\.7rem 0\.85rem 0\.75rem/);
  assert.match(css, /\.prose \.weekly-overview\s*\{[^}]*gap:\s*0\.85rem/);
  assert.match(css, /@keyframes entry-flash\s*\{[^}]*color-mix\(in srgb, var\(--note\) 24%, var\(--paper\)\)/);
  assert.match(css, /\.entry-flash\s*\{[^}]*animation:\s*entry-flash 2s/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.prose \.weekly-overview-card\s*\{[^}]*padding:\s*0\.6rem 0\.7rem 0\.65rem/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.prose \.weekly-overview-card a::before\s*\{[^}]*height:\s*44px/);
  assert.match(css, /\.weekly-overview-text\s*\{[^}]*overflow-wrap:\s*break-word/);
  assert.doesNotMatch(css, /\.weekly-overview(?:-card|-text)[^{]*\{[^}]*(?:line-clamp|max-height|-webkit-line-clamp|overflow:\s*hidden)/);
  assert.doesNotMatch(css, /\.prose \.weekly-overview-card\s*\{[^}]*0\.8em/);
  assert.doesNotMatch(css, /\.prose \.weekly-overview-card\s*\{[^}]*font-size:\s*var\(--info-card-font-size\)/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*--paper:\s*#1c1b19/);
  assert.match(css, /:root\[data-theme="dark"\] \.info-card-label\s*\{[^}]*color:\s*#e09a62/);
  assert.match(outline, /weekly-overview-card/);
  assert.equal(seedForCard('weekly-overview-card', ''), 59);
  assert.equal(fileURLToPath(import.meta.url).endsWith('overview.test.mjs'), true);
});
