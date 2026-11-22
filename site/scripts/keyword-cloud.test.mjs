import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cloudHtml, inlineKeywordClouds } from '../src/plugins/rehype-keyword-cloud.mjs';
import {
  assignWeightTiers,
  keywordWeight,
  renderCloudSvg,
  withVisualSizes,
} from '../../skills/managed/weekly-ai-blogs-digest/scripts/keyword_cloud_style.mjs';
import { loadKeywordWords } from '../src/lib/keyword-snapshot.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('equal weights share a tier and heat alone does not create the orange theme', () => {
  const tiered = assignWeightTiers([
    { word: '甲', weight: 3 },
    { word: '乙', weight: 3 },
    { word: '丙', weight: 5 },
    { word: '丁', weight: 1 },
  ]);
  const tier = Object.fromEntries(tiered.map((word) => [word.word, word.tier]));
  assert.equal(tier['丙'], 'high');
  assert.equal(tier['甲'], 'mid');
  assert.equal(tier['乙'], 'mid');
  assert.equal(tier['丁'], 'low');
  assert.equal(tiered.some((word) => word.tier === 'top'), false);
});

test('a high model score does not outsize the stored theme', () => {
  const sized = withVisualSizes([
    { word: 'New Model', kind: 'model', score: 5, mentions: 8, sources: 6, theme: false },
    { word: 'Weekly Theme', kind: 'concept', score: 3, mentions: 3, sources: 3, theme: true },
  ]);
  const byWord = Object.fromEntries(sized.map((word) => [word.word, word]));
  assert.equal(keywordWeight({ score: 5, mentions: 8, sources: 6 }), keywordWeight({ score: 3, mentions: 8, sources: 6 }));
  assert.ok(byWord['New Model'].weight >= byWord['Weekly Theme'].weight);
  assert.ok(byWord['Weekly Theme'].size >= byWord['New Model'].size + 8);
  const tier = Object.fromEntries(assignWeightTiers(sized).map((word) => [word.word, word.tier]));
  assert.equal(tier['Weekly Theme'], 'top');
  assert.notEqual(tier['New Model'], 'top');
});

test('2026-11-20 theme is 常驻 Agent, not the highest-scoring model', () => {
  const body = fs.readFileSync(path.join(repoRoot, 'ai-news/2026-11-20-ai-news.md'), 'utf8');
  const json = body.match(/<!--\s*keywords-cloud\s*([\s\S]*?)-->/)[1];
  const words = JSON.parse(json).map((item) => ({
    word: item.word,
    weight: keywordWeight(item),
    theme: item.theme === true,
  }));
  const tier = Object.fromEntries(assignWeightTiers(words).map((word) => [word.word, word.tier]));
  assert.equal(tier['常驻 Agent'], 'top');
  assert.notEqual(tier['Gemini 4 Neon'], 'top');
  assert.equal(words.some((word) => word.word === 'Qwen4-Max'), false);
  assert.equal(words.some((word) => word.word === 'always-on agents'), false);
  assert.equal(tier['GPT-6.2 Astra'], tier['GPT-6.2 Sol']);
  assert.equal(tier['Devin Bots'], tier['Devin Apps']);
  const top = words.filter((word) => tier[word.word] === 'top');
  assert.equal(top.length, 1);
  assert.equal(top[0].word, '常驻 Agent');
  for (const blocked of ['Codex', 'Claude Code', 'OpenRouter', 'Kiro', 'Octop']) {
    assert.equal(words.some((word) => word.word === blocked), false, blocked);
  }
});

test('the svg has tier classes and no baked background or outline', () => {
  const svg = renderCloudSvg(
    {
      tiers: {
        top: { fill: '#b4541f', fontWeight: 700 },
        high: { fill: '#1c1b19', fontWeight: 700 },
        mid: { fill: '#5c574e', fontWeight: 400 },
        low: { fill: '#746f65', fontWeight: 400 },
      },
    },
    { fontFamily: 'Noto Sans CJK SC' },
    [
      { text: '甲', x: 1, y: 2, size: 40, weight: 5, datum: { weight: 5, theme: true } },
      { text: '乙', x: 3, y: 4, size: 30, weight: 4, datum: { weight: 4 } },
      { text: '丙', x: 5, y: 6, size: 24, weight: 2, datum: { weight: 2 } },
      { text: '丁', x: 7, y: 8, size: 18, weight: 1, datum: { weight: 1 } },
    ],
    100,
    80,
    10,
    12,
  );
  assert.match(svg, /class="kw-top"/);
  assert.match(svg, /class="kw-low"/);
  assert.match(svg, /font-weight="400"/);
  assert.doesNotMatch(svg, /<rect|fffcf7|filter=|stroke=/i);
});

test('ai news cards share one radius token', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /--ai-news-radius:\s*0\.7rem/);
  assert.match(css, /\.model-board\s*\{[^}]*border-radius:\s*var\(--ai-news-radius\)/);
  assert.match(css, /\.model-facts\s*\{[^}]*border-radius:\s*var\(--ai-news-radius\)/);
  assert.match(css, /\.prose \.article-card\s*\{[^}]*border-radius:\s*var\(--ai-news-radius\)/);
  assert.match(css, /\.info-card\s*\{[^}]*border-radius:\s*var\(--ai-news-radius\)/);
  assert.match(css, /\.keyword-cloud-outline rect\s*\{[^}]*rx:\s*var\(--ai-news-radius\)/);
  assert.doesNotMatch(css, /border-radius:\s*0\.6rem/);
  const plugin = fs.readFileSync(new URL('../src/plugins/rehype-keyword-cloud.mjs', import.meta.url), 'utf8');
  assert.match(plugin, /<rect><\/rect>/);
  assert.doesNotMatch(plugin, /feTurbulence|feDisplacementMap|id="rough"/);
});

test('a keyword cloud image is inlined from the sibling svg', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-cloud-'));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text class="kw-top">甲</text></svg>
`;
  fs.writeFileSync(path.join(dir, 'keywords-cloud-2026-11-20.svg'), svg);
  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        children: [
          {
            type: 'element',
            tagName: 'img',
            properties: { src: './keywords-cloud-2026-11-20.png', alt: '甲、乙' },
          },
        ],
      },
    ],
  };
  inlineKeywordClouds(tree, { path: path.join(dir, '2026-11-20-ai-news.md') });
  assert.equal(tree.children[0].type, 'raw');
  assert.match(tree.children[0].value, /class="keyword-cloud"/);
  assert.match(tree.children[0].value, /class="keyword-cloud-art"/);
  assert.match(tree.children[0].value, /aria-label="甲、乙"/);
  assert.match(tree.children[0].value, /class="kw-top"/);
  assert.doesNotMatch(tree.children[0].value, /<\?xml/);
  const html = cloudHtml('<?xml version="1.0" encoding="UTF-8"?><svg></svg>', 'A & B');
  assert.match(html, /aria-label="A &amp; B"/);
  assert.match(html, /class="keyword-cloud-art"/);
  assert.doesNotMatch(html, /<\?xml/);
});

test('snapshot words lay out twice the same way when the bold font is installed', async (t) => {
  let cloud;
  try {
    cloud = await import('../../skills/managed/weekly-ai-blogs-digest/scripts/render_keyword_cloud.mjs');
  } catch {
    cloud = null;
  }
  const font = cloud?.inkMeasurementFont?.() || null;
  if (!cloud || !font) {
    t.skip('keyword cloud font or canvas is not installed');
    return;
  }
  const body = fs.readFileSync(path.join(repoRoot, 'ai-news/2026-11-20-ai-news.md'), 'utf8');
  const words = cloud.wordsFromMarkdown(path.join(repoRoot, 'ai-news/2026-11-20-ai-news.md'));
  assert.equal(words.length, JSON.parse(body.match(/<!--\s*keywords-cloud\s*([\s\S]*?)-->/)[1]).length);
  const first = cloud.renderKeywordCloudSvg(words, font, 1);
  const second = cloud.renderKeywordCloudSvg(words, font, 1);
  assert.equal(first, second);
  assert.match(first, /class="kw-top"[^>]*>常驻 Agent</);
  assert.match(first, /Gemini 4 Neon/);
  assert.doesNotMatch(first, /class="kw-top"[^>]*>Gemini 4 Neon</);
  assert.doesNotMatch(first, /Qwen4-Max/);
  const themeSize = Number(first.match(/class="kw-top"[^>]*font-size="(\d+)"/)[1]);
  const modelSize = Number(first.match(/font-size="(\d+)"[^>]*>Gemini 4 Neon</)[1]);
  assert.ok(themeSize > modelSize);
  assert.doesNotMatch(first, /<rect|fffcf7|filter=/i);
});

test('a themed digest comment wins over an older unthemed snapshot', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-snap-'));
  const issue = '2026-11-20';
  fs.mkdirSync(path.join(dir, 'issues', issue), { recursive: true });
  fs.writeFileSync(path.join(dir, 'issues', issue, 'keywords.json'), JSON.stringify({
    words: [{ word: 'Gemini 4 Neon', weight: 4.7, score: 5, mentions: 3, sources: 3 }],
  }));
  const markdown = `## 一、本周关键词

<!-- keywords-cloud
[{"word":"常驻 Agent","weight":4.2,"theme":true},{"word":"Gemini 4 Neon","weight":4.2}]
-->

## 二、模型进展
`;
  const words = loadKeywordWords(dir, issue, markdown);
  assert.equal(words[0].word, '常驻 Agent');
  assert.equal(words[0].theme, true);
  fs.writeFileSync(path.join(dir, 'issues', issue, 'keywords.json'), JSON.stringify({
    words: [{ word: '常驻 Agent', weight: 4.2, theme: true }],
  }));
  const published = loadKeywordWords(dir, issue, markdown);
  assert.equal(published.length, 1);
  assert.equal(published[0].word, '常驻 Agent');
});
