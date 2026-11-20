import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { chartOption } from '../src/lib/model-chart-option.mjs';
import {
  classifyChart,
  coverageForIssueDate,
  highlightsFromCaption,
  loadSeries,
  seriesFromPayload,
} from '../src/lib/model-charts.mjs';
import { rehypeModelCharts } from '../src/plugins/rehype-model-charts.mjs';
import { remarkModelCharts } from '../src/plugins/remark-model-charts.mjs';

const fixtureRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/ai-news-data',
);
const window = { start: '2026-11-06', end: '2026-11-12' };

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function optionLabels(html) {
  return [...html.matchAll(/<option\b[^>]*>([^<]*)<\/option>/g)].map((match) => match[1].trim());
}

function chartSpecs(html) {
  return [...html.matchAll(/<pre\b[^>]*\bmodel-chart-spec\b[^>]*>([\s\S]*?)<\/pre>/g)].map((match) =>
    JSON.parse(decodeHtml(match[1])),
  );
}

test('coverage and chart kinds follow the weekly filenames', () => {
  assert.deepEqual(coverageForIssueDate('2026-11-13'), window);
  assert.equal(classifyChart('llm-arena-top15-2026-11-11-marked.png', '', ''), 'llm-arena');
  assert.equal(classifyChart('', 'LLM Arena Top15 2026-08-12', '整体排名'), 'llm-arena');
  assert.equal(classifyChart('aa-intelligence-top15-2026-11-13-marked.png', '', ''), 'aa');
  assert.equal(classifyChart('openrouter-usage-top15.png', '本周用量', 'OpenRouter'), 'openrouter-usage');
  assert.equal(classifyChart('openrouter-programming-top15.png', '', ''), 'openrouter-programming');
  assert.equal(classifyChart('openrouter-apps-top15.png', '', ''), 'openrouter-apps');
  assert.equal(classifyChart('keywords-cloud.png', '关键词', ''), null);
  assert.deepEqual(highlightsFromCaption('本期 Top 15 没有窗口内新发布的模型，不圈。'), []);
  assert.deepEqual(highlightsFromCaption('榜单发布日 2026-08-12。图中无红圈。'), []);
  assert.deepEqual(highlightsFromCaption('红圈：Gemini 4 Hydrogen (High)。名次另写。'), [
    'Gemini 4 Hydrogen (High)',
  ]);
});

test('snapshots become top-15 series, with release dates or the 红圈 line as the highlight', () => {
  const arena = loadSeries(
    fixtureRoot,
    '2026-11-13',
    'llm-arena',
    '榜单发布日 2026-11-11。红圈：Gemini 4 Hydrogen (High)。',
  );
  assert.equal(arena.items.length, 2);
  assert.equal(arena.items[0].highlight, false);
  assert.equal(arena.items[1].name, 'Gemini 4 Hydrogen (High)');
  assert.equal(arena.items[1].highlight, true);
  assert.equal(arena.scaleZero, false);

  const neon = seriesFromPayload(
    'llm-arena',
    { items: [{ rank: 3, model: 'Gemini 4 Neon (High)', organization: 'google', score: 1511 }] },
    window,
    '红圈：Gemini 4 Neon (High)（本周新发布，排第 3）。',
  );
  assert.equal(neon.items[0].highlight, true);

  const aa = loadSeries(fixtureRoot, '2026-11-13', 'aa', '红圈：不该覆盖发布日期。');
  assert.deepEqual(aa.items.map((item) => item.name), ['Old Model', 'New Model', 'A', 'B']);
  assert.deepEqual(aa.items.map((item) => item.highlight), [false, true, false, false]);

  const usage = loadSeries(fixtureRoot, '2026-11-13', 'openrouter-usage', '不圈。');
  assert.equal(usage.items[0].name, 'gpt-test');
  assert.equal(usage.items[0].valueText, '2.00 T');
  assert.equal(usage.items[0].detail, 'openai/gpt-test');
  assert.equal(usage.items[1].name, 'claude-test');
  assert.equal(usage.items[0].highlight, false);
  assert.equal(usage.scaleZero, true);

  const programming = loadSeries(fixtureRoot, '2026-11-13', 'openrouter-programming', '');
  assert.equal(programming.items.length, 1);
  assert.equal(programming.items[0].name, 'claude-test');
  assert.equal(programming.items[0].valueText, '3.00 T');

  const apps = loadSeries(fixtureRoot, '2026-11-13', 'openrouter-apps', '');
  assert.deepEqual(apps.items.map((item) => item.name), ['First', 'Second']);
  assert.equal(loadSeries(fixtureRoot, '1999-01-01', 'llm-arena', ''), null);

  const many = seriesFromPayload(
    'llm-arena',
    {
      items: Array.from({ length: 16 }, (_, index) => ({
        rank: index + 1,
        model: `M${index}`,
        organization: 'openai',
        score: 100 - index,
      })),
    },
    window,
    '',
  );
  assert.equal(many.items.length, 15);
  assert.equal(many.items.at(-1).name, 'M14');
});

test('chart option marks this-week releases and exposes the value in the tooltip', () => {
  const spec = seriesFromPayload(
    'llm-arena',
    {
      items: [
        { rank: 1, model: 'Kept', organization: 'openai', score: 10 },
        { rank: 2, model: 'Fresh', organization: 'anthropic', score: 9 },
      ],
    },
    window,
    '红圈：Fresh。',
  );
  const option = chartOption(spec, {
    ink: '#111',
    inkSoft: '#333',
    muted: '#888',
    rule: '#ddd',
    note: '#b4541f',
    noteWash: '#f8efe4',
    paper: '#fff',
  });
  assert.equal(option.series[0].data[1].itemStyle.borderColor, '#b4541f');
  assert.equal(option.series[0].data[0].itemStyle.borderWidth, 0);
  assert.match(option.yAxis.axisLabel.formatter('Fresh'), /新/);
  assert.doesNotMatch(option.yAxis.axisLabel.formatter('Kept'), /新/);
  const tip = option.tooltip.formatter({ dataIndex: 1, name: 'Fresh' });
  assert.match(tip, /Fresh/);
  assert.match(tip, /Arena Score：9\.0/);
  assert.match(tip, /本周新发布/);
});

test('platform sections become one dropdown, and a missing figure stays out of it', async () => {
  const previous = process.env.AI_NEWS_DATA_ROOT;
  process.env.AI_NEWS_DATA_ROOT = fixtureRoot;
  try {
    const processor = await createMarkdownProcessor({
      gfm: true,
      smartypants: false,
      syntaxHighlight: false,
      remarkPlugins: [[remarkModelCharts, { repoRoot: '/tmp/unused' }]],
      rehypePlugins: [rehypeModelCharts],
    });
    const source = [
      '## 一、本周关键词',
      '',
      '![关键词](https://example.com/keywords-cloud.png)',
      '',
      '## 二、模型进展',
      '',
      '### Artificial Analysis',
      '',
      '这一节没有图，不能进下拉。',
      '',
      '### LLM Arena',
      '',
      '![LLM Arena Top 15](https://example.com/llm-arena-top15-2026-11-11-marked.png)',
      '',
      '榜单发布日 2026-11-11。红圈：Gemini 4 Hydrogen (High)。',
      '',
      '### OpenRouter',
      '',
      '![OpenRouter 本周用量 Top 15](https://example.com/openrouter-usage-top15-2026-11-13-marked.png)',
      '',
      '用量说明。',
      '',
      '![OpenRouter 编程用量 Top 15](https://example.com/openrouter-programming-top15-2026-11-13-marked.png)',
      '',
      '编程说明。',
      '',
      '### 模型发布',
      '',
      '#### [新模型](https://example.com/model)',
      '',
      '发布说明。',
    ].join('\n');
    const result = await processor.render(source, {
      fileURL: new URL('file:///tmp/ai-news/2026-11-13-ai-news.md'),
    });
    const html = result.code;
    const headings = result.metadata.headings.map((heading) => heading.text);
    assert.equal(headings.includes('LLM Arena'), false);
    assert.equal(headings.includes('OpenRouter'), false);
    assert.equal(headings.includes('模型发布'), true);
    assert.ok(headings.includes('二、模型进展'));
    assert.deepEqual(optionLabels(html), ['LLM Arena', 'OpenRouter 本周用量', 'OpenRouter 编程用量']);
    assert.match(html, /data-model-board/);
    assert.match(html, /aria-label="切换模型榜单"/);
    assert.match(html, /这一节没有图，不能进下拉。/);
    assert.match(html, /<h3[^>]*>\s*Artificial Analysis\s*<\/h3>/);
    const specs = chartSpecs(html);
    assert.deepEqual(specs.map((spec) => spec.kind), ['llm-arena', 'openrouter-usage', 'openrouter-programming']);
    assert.equal(specs[0].items[1].highlight, true);
    assert.equal(specs[1].items[0].valueText, '2.00 T');
    assert.match(html, /keywords-cloud\.png/);
    const board = html.slice(html.indexOf('data-model-board'), html.indexOf('模型发布'));
    assert.doesNotMatch(board, /keywords-cloud/);
    assert.match(html, /id="llm-arena"/);
    assert.match(html, /红圈：Gemini 4 Hydrogen \(High\)/);
  } finally {
    if (previous == null) delete process.env.AI_NEWS_DATA_ROOT;
    else process.env.AI_NEWS_DATA_ROOT = previous;
  }
});

test('an old issue without a snapshot keeps the PNG inside the same dropdown', async () => {
  const previous = process.env.AI_NEWS_DATA_ROOT;
  process.env.AI_NEWS_DATA_ROOT = fixtureRoot;
  try {
    const processor = await createMarkdownProcessor({
      gfm: true,
      smartypants: false,
      syntaxHighlight: false,
      remarkPlugins: [[remarkModelCharts, { repoRoot: '/tmp/unused' }]],
      rehypePlugins: [rehypeModelCharts],
    });
    const source = [
      '## 二、模型进展',
      '',
      '#### 整体排名',
      '',
      '榜单发布日 2026-08-12。图中无红圈。',
      '',
      '![LLM Arena Top15 2026-08-12](https://example.com/llm-arena-top15-2026-08-12-marked.png)',
      '',
      '#### [下一则](https://example.com/next)',
      '',
      '正文。',
    ].join('\n');
    const result = await processor.render(source, {
      fileURL: new URL('file:///tmp/ai-news/2026-08-14-ai-news.md'),
    });
    const html = result.code;
    assert.equal(result.metadata.headings.some((heading) => heading.text === '整体排名'), false);
    assert.deepEqual(optionLabels(html), ['LLM Arena']);
    assert.equal(chartSpecs(html).length, 0);
    assert.match(html, /alt="LLM Arena Top15 2026-08-12"/);
    assert.match(html, /图中无红圈/);
    assert.match(html, /下一则/);
    const imageAt = html.indexOf('llm-arena-top15-2026-08-12');
    const captionAt = html.indexOf('图中无红圈');
    assert.ok(imageAt >= 0 && captionAt > imageAt);
  } finally {
    if (previous == null) delete process.env.AI_NEWS_DATA_ROOT;
    else process.env.AI_NEWS_DATA_ROOT = previous;
  }
});
