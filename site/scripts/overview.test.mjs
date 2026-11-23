import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { summaryLine } from '../src/lib/ai-news.mjs';
import { entryAnchor } from '../src/lib/entry-anchor.mjs';
import { linkOverviewText } from '../src/lib/overview.mjs';

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
    '<ol class="weekly-overview">',
    '<li><a href="#entry-x">常驻 Agent</a> 大部分时间在睡。</li>',
    '<li>第二条。</li>',
    '</ol>',
    '',
    '## 二、模型进展',
  ].join('\n');
  assert.equal(summaryLine(body, false), '常驻 Agent 大部分时间在睡。');
  assert.equal(summaryLine('## 一、本周关键词\n\n<br/>\n', false), '');
});

test('overview type matches the prose and the flash fades in both themes', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.prose ol\.weekly-overview\s*\{[^}]*font-size:\s*1em/);
  assert.match(css, /@keyframes entry-flash\s*\{[^}]*color-mix\(in srgb, var\(--note\) 24%, var\(--paper\)\)/);
  assert.match(css, /\.entry-flash\s*\{[^}]*animation:\s*entry-flash 2s/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.prose ol\.weekly-overview\s*\{[^}]*padding-left:\s*1\.15em/);
  assert.doesNotMatch(css, /\.prose ol\.weekly-overview\s*\{[^}]*0\.8em/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*--paper:\s*#1c1b19/);
  assert.equal(fileURLToPath(import.meta.url).endsWith('overview.test.mjs'), true);
});
