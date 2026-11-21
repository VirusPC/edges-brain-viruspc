import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cloudHtml, inlineKeywordClouds } from '../src/plugins/rehype-keyword-cloud.mjs';
import {
  assignWeightTiers,
  fontSize,
  keywordWeight,
  renderCloudSvg,
} from '../../skills/managed/weekly-ai-blogs-digest/scripts/keyword_cloud_style.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fontFile = path.join(os.homedir(), '.local/share/fonts/NotoSansCJKsc-Bold.otf');

test('equal weights share a tier and the heaviest weight is top', () => {
  const tiered = assignWeightTiers([
    { word: '甲', weight: 3 },
    { word: '乙', weight: 3 },
    { word: '丙', weight: 5 },
    { word: '丁', weight: 1 },
  ]);
  const tier = Object.fromEntries(tiered.map((word) => [word.word, word.tier]));
  assert.equal(tier['丙'], 'top');
  assert.equal(tier['甲'], 'high');
  assert.equal(tier['乙'], 'high');
  assert.equal(tier['丁'], 'mid');
});

test('2026-11-20 tiers follow weight, not alphabetical order', () => {
  const body = fs.readFileSync(path.join(repoRoot, 'ai-news/2026-11-20-ai-news.md'), 'utf8');
  const json = body.match(/<!--\s*keywords-cloud\s*([\s\S]*?)-->/)[1];
  const words = JSON.parse(json).map((item) => ({ word: item.word, weight: keywordWeight(item) }));
  const tier = Object.fromEntries(assignWeightTiers(words).map((word) => [word.word, word.tier]));
  assert.equal(tier['GPT-6.2 Astra'], tier['Gemini 4 Neon']);
  assert.equal(tier['Gemini 4 Neon'], tier['GPT-6.2 Sol']);
  assert.equal(tier['Skill 自进化'], tier['LoopForge']);
  const top = words.filter((word) => tier[word.word] === 'top').map((word) => word.weight);
  assert.ok(top.length >= 1);
  assert.ok(top.every((weight) => weight === top[0]));
  assert.ok(Math.max(...words.map((word) => word.weight)) === top[0]);
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
      { text: '甲', x: 1, y: 2, size: 40, weight: 5 },
      { text: '乙', x: 3, y: 4, size: 30, weight: 4 },
      { text: '丙', x: 5, y: 6, size: 24, weight: 2 },
      { text: '丁', x: 7, y: 8, size: 18, weight: 1 },
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
  assert.match(plugin, /baseFrequency="0\.03"/);
  assert.match(plugin, /scale="2\.2"/);
  assert.match(plugin, /id="rough"/);
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
  const html = cloudHtml('<svg></svg>', 'A & B');
  assert.match(html, /aria-label="A &amp; B"/);
});

test('published clouds keep the measured positions when the bold font is installed', async (t) => {
  let cloud;
  try {
    cloud = await import('../../skills/managed/weekly-ai-blogs-digest/scripts/render_keyword_cloud.mjs');
  } catch {
    cloud = null;
  }
  if (!cloud || !fs.existsSync(fontFile)) {
    t.skip('keyword cloud font or canvas is not installed');
    return;
  }
  const font = { fontFile, fontFamily: 'Noto Sans CJK SC', fontWeight: 700 };
  for (const date of ['2026-11-06', '2026-11-13', '2026-11-20']) {
    const words = cloud.wordsFromMarkdown(path.join(repoRoot, 'ai-news', `${date}-ai-news.md`));
    const placed = cloud.placeKeywords(words, font, 1);
    const svg = fs.readFileSync(path.join(repoRoot, 'ai-news', `keywords-cloud-${date}.svg`), 'utf8');
    const byText = new Map(placed.map((word) => [word.text, word]));
    const drawn = [...svg.matchAll(/<text[^>]*x="([^"]+)" y="([^"]+)"[^>]*font-size="([^"]+)"[^>]*>([^<]+)<\/text>/g)];
    assert.equal(drawn.length, words.length, date);
    for (const [, x, y, size, text] of drawn) {
      const got = byText.get(text);
      assert.ok(got, `${date} ${text}`);
      assert.equal(String(got.x), x, text);
      assert.equal(String(got.y), y, text);
      assert.equal(String(got.size), size, text);
    }
  }
});
