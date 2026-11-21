import assert from 'node:assert/strict';
import test from 'node:test';
import { factsHtmlForHeading, renderModelFacts } from '../src/lib/model-releases.mjs';
import { insertModelFacts } from '../src/plugins/remark-model-facts.mjs';

const astra = {
  name: 'GPT-6.2 Astra',
  price: { input: 8, output: 40, cache_read: 0.4, source: 'release_article' },
  speed: {
    latency_s: 2.7,
    throughput_tps: 37,
    source: 'openrouter_endpoints',
    provider: 'OpenAI',
    endpoints_considered: [{ provider_name: 'OpenAI' }],
  },
  aa: {
    intelligence_index: 62.1,
    rank: 3,
    rank_of: 156,
    variant: 'GPT-6.2 Astra (Max)',
    fetched_at: '2026-11-20T12:50:05Z',
  },
  best_for: { text: '最难的专业项目', source: 'release_article' },
};

const sol = {
  name: 'GPT-6.2 Sol',
  price: { input: 2, output: 10, cache_read: 0.1, source: 'release_article' },
  speed: {
    latency_s: 3.1845,
    throughput_tps: 47,
    source: 'openrouter_endpoints',
    provider: 'OpenAI',
    endpoints_considered: [{ provider_name: 'OpenAI' }],
  },
  aa: { intelligence_index: 57.3, rank: 13, rank_of: 156, variant: 'GPT-6.2 Sol (Max)', fetched_at: '2026-11-20T12:50:05Z' },
  best_for: { text: '日常工作', source: 'release_article' },
};

test('a release-article price is labeled 原文 and speed names the OpenRouter provider', () => {
  const html = renderModelFacts(astra);
  assert.match(html, /GPT-6\.2 Astra/);
  assert.match(html, /输入 \$8 · 输出 \$40 · 缓存读 \$0\.4/);
  assert.doesNotMatch(html, /更便宜第/);
  assert.match(html, /model-facts-src">原文</);
  assert.match(html, /首 token 2\.7 秒 · 吞吐 37 token\/s/);
  assert.doesNotMatch(html, /更快第/);
  assert.match(html, /OpenRouter·OpenAI</);
  assert.match(html, /智力指数 62\.1，第 3\/156（GPT-6\.2 Astra \(Max\)）/);
  assert.doesNotMatch(html, /快照/);
  assert.doesNotMatch(html, /适合|最难的专业项目/);
  assert.match(html, /model-facts-src">AA</);
  const fitOnly = renderModelFacts({ name: '无智力指数', best_for: { text: '日常工作' } });
  assert.match(fitOnly.replace(/\s+/g, ' '), /效果<\/dt><dd>暂无<\/dd><dd class="model-facts-src">暂无/);
  assert.doesNotMatch(fitOnly, /适合|日常工作/);
});

test('several official endpoints are labeled as a median, and a missing price stays 暂无', () => {
  const html = renderModelFacts({
    name: 'Gemini 4 Neon',
    price: {
      input: 3,
      output: 15,
      cache_read: 0.15,
      source: 'openrouter',
      provider: 'Google AI Studio / Google',
    },
    speed: {
      latency_s: 3.72925,
      throughput_tps: 81.5,
      source: 'openrouter_endpoints',
      provider: 'Google AI Studio / Google',
      endpoints_considered: [{}, {}],
    },
    aa: {
      intelligence_index: 61.4,
      rank: 6,
      rank_of: 156,
      variant: 'Gemini 4 Neon (Xhigh)',
      fetched_at: '2026-11-20T12:50:05Z',
    },
    best_for: { text: '编程和 agent 工作流' },
  });
  assert.match(html, /OpenRouter·Google AI Studio \/ Google</);
  assert.match(html, /OpenRouter·Google AI Studio \/ Google（中位数）/);
  assert.match(html, /首 token 3\.73 秒 · 吞吐 81\.5 token\/s/);
  assert.match(html, /61\.4，第 6\/156/);
  assert.match(html, /原文写 Extra High 档 61 分、第 3；榜上的 Xhigh 是 61\.4，第 6\/156/);
  assert.doesNotMatch(html, /适合|编程和 agent/);
  assert.doesNotMatch(html, /快照/);
  assert.match(renderModelFacts({ name: '空', price: {} }).replace(/\s+/g, ' '), /价格<\/dt><dd>暂无<\/dd><dd class="model-facts-src">暂无/);
});

test('one heading can carry both models named in it', () => {
  const html = factsHtmlForHeading('Introducing GPT-6.2 Astra and Sol', [astra, sol]);
  assert.ok(html.indexOf('GPT-6.2 Astra') < html.indexOf('GPT-6.2 Sol'));
  assert.match(html, /输入 \$2 · 输出 \$10 · 缓存读 \$0\.1/);
  const tree = {
    type: 'root',
    children: [
      { type: 'heading', depth: 2, children: [{ type: 'text', value: '二、模型进展' }] },
      { type: 'heading', depth: 3, children: [{ type: 'text', value: 'OpenRouter' }] },
      { type: 'heading', depth: 4, children: [{ type: 'text', value: 'Introducing GPT-6.2 Astra and Sol' }] },
      { type: 'paragraph', children: [{ type: 'text', value: '原来的说明' }] },
      { type: 'heading', depth: 2, children: [{ type: 'text', value: '三、项目开源' }] },
      { type: 'heading', depth: 4, children: [{ type: 'text', value: 'Introducing GPT-6.2 Astra and Sol' }] },
    ],
  };
  insertModelFacts(tree, [astra, sol]);
  assert.equal(tree.children[3].type, 'html');
  assert.match(tree.children[3].value, /GPT-6\.2 Sol/);
  assert.equal(tree.children[4].children[0].value, '原来的说明');
  assert.equal(tree.children[6].type, 'heading');
  assert.equal(tree.children.length, 7);
});

test('a discounted OpenRouter price keeps the discount and the official provider', () => {
  const html = renderModelFacts({
    name: 'Qwen4-Max',
    price: {
      input: 1.425,
      output: 4.275,
      cache_read: 0.07125,
      source: 'openrouter',
      provider: 'Alibaba',
      discount: 0.05,
    },
    speed: {
      latency_s: 2.5875,
      throughput_tps: 42,
      source: 'openrouter_endpoints',
      provider: 'Alibaba',
      endpoints_considered: [{}],
    },
    aa: { intelligence_index: 42.9, rank: 52, rank_of: 156, variant: 'Qwen4 Max', fetched_at: '2026-11-20T12:50:05Z' },
  });
  assert.match(html, /输入 \$1\.425 · 输出 \$4\.275 · 缓存读 \$0\.07125 · 含 5% 折扣/);
  assert.match(html, /OpenRouter·Alibaba</);
  assert.match(html, /首 token 2\.59 秒/);
  assert.match(html, /第 52\/156/);
});

test('price and speed ranks use the cheaper and faster wording, and a missing rank is omitted', () => {
  const ranked = renderModelFacts({
    ...astra,
    price: { ...astra.price, rank: 123, rank_of: 142, rank_metric: 'blended_input_plus_3_output_over_4' },
    speed: { ...astra.speed, rank: 40, rank_of: 51, rank_metric: 'latency_p50_s' },
  });
  assert.match(ranked, /输入 \$8 · 输出 \$40 · 缓存读 \$0\.4 · 更便宜第 123\/142/);
  assert.match(ranked, /首 token 2\.7 秒 · 吞吐 37 token\/s · 更快第 40\/51/);
  assert.doesNotMatch(ranked, /快照|数据取自|抓取于/);
  const broken = renderModelFacts({
    ...astra,
    price: { ...astra.price, rank: null, rank_of: null },
    speed: { ...astra.speed, rank: '暂无', rank_of: 51 },
  });
  assert.doesNotMatch(broken, /更便宜第|更快第|第 暂无/);
  assert.match(broken, /输入 \$8 · 输出 \$40 · 缓存读 \$0\.4</);
  assert.match(broken, /首 token 2\.7 秒 · 吞吐 37 token\/s</);
});
