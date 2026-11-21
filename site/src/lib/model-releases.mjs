import fs from 'node:fs';
import path from 'node:path';

/**
 * Generation-day snapshot for model entries under 「二、模型进展」. Missing file means no cards.
 *
 * @param {string | null} dataRoot
 * @param {string} issueDate
 */
export function loadModelReleases(dataRoot, issueDate) {
  if (!dataRoot || !issueDate) return [];
  const file = path.join(dataRoot, 'issues', issueDate, 'model-releases.json');
  if (!fs.existsSync(file)) return [];
  try {
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(payload?.models) ? payload.models : [];
  } catch {
    return [];
  }
}

/**
 * @param {string} heading
 * @param {any[]} models
 */
export function factsHtmlForHeading(heading, models) {
  const headingTokens = tokens(heading);
  const matched = models.filter((model) => tokens(model?.name || '').every((token) => headingTokens.includes(token)));
  if (matched.length === 0) return '';
  return matched.map((model) => renderModelFacts(model)).join('\n');
}

/**
 * @param {any} model
 */
export function renderModelFacts(model) {
  const name = esc(model?.name || '模型');
  const price = priceRow(model);
  const speed = speedRow(model);
  const effect = effectRow(model);
  return `<aside class="model-facts">
<p class="model-facts-name">${name}</p>
<dl>
<div class="model-facts-row"><dt>价格</dt><dd>${price.text}</dd><dd class="model-facts-src">${esc(price.source)}</dd></div>
<div class="model-facts-row"><dt>速度</dt><dd>${speed.text}</dd><dd class="model-facts-src">${esc(speed.source)}</dd></div>
<div class="model-facts-row"><dt>效果</dt><dd>${effect.text}</dd><dd class="model-facts-src">${esc(effect.source)}</dd></div>
</dl>
</aside>`;
}

/**
 * @param {any} model
 */
function priceRow(model) {
  const price = model?.price;
  if (!price || (price.input == null && price.output == null && price.cache_read == null)) {
    return { text: '暂无', source: '暂无' };
  }
  const bits = [
    `输入 ${money(price.input)}`,
    `输出 ${money(price.output)}`,
    `缓存读 ${money(price.cache_read)}`,
  ];
  if (Number(price.discount) > 0) bits.push(`含 ${Math.round(Number(price.discount) * 100)}% 折扣`);
  return { text: esc(`${bits.join(' · ')}${rankSuffix(price, '更便宜')}`), source: priceSource(price) };
}

/**
 * @param {any} price
 */
function priceSource(price) {
  if (price.source === 'release_article') return '原文';
  if (price.source === 'openrouter') return openRouterLabel(price.provider, false);
  return '暂无';
}

/**
 * @param {any} model
 */
function speedRow(model) {
  const speed = model?.speed;
  if (!speed || (speed.latency_s == null && speed.throughput_tps == null)) {
    return { text: '暂无', source: '暂无' };
  }
  const text = `首 token ${seconds(speed.latency_s)} · 吞吐 ${rate(speed.throughput_tps)}${rankSuffix(speed, '更快')}`;
  const median = Array.isArray(speed.endpoints_considered) && speed.endpoints_considered.length > 1;
  const source = speed.source === 'openrouter_endpoints'
    ? openRouterLabel(speed.provider, median)
    : '暂无';
  return { text: esc(text), source };
}

/**
 * @param {any} model
 */
function effectRow(model) {
  const aa = model?.aa;
  if (!aa || aa.intelligence_index == null || aa.rank == null) {
    return { text: '暂无', source: '暂无' };
  }
  const parts = [
    `智力指数 ${formatNumber(aa.intelligence_index)}，第 ${aa.rank}/${aa.rank_of ?? '暂无'}`,
  ];
  if (aa.variant) parts[0] += `（${aa.variant}）`;
  if (model?.name === 'Gemini 4 Neon') {
    parts.push('原文写 Extra High 档 61 分、第 3；榜上的 Xhigh 是 61.4，第 6/156');
  }
  return { text: esc(parts.join('。')), source: 'AA' };
}

/**
 * Positive integer rank and denominator, or an empty suffix.
 *
 * @param {any} record
 * @param {string} label
 */
function rankSuffix(record, label) {
  const rank = record?.rank;
  const total = record?.rank_of;
  if (!Number.isInteger(rank) || rank < 1) return '';
  if (!Number.isInteger(total) || total < 1 || rank > total) return '';
  return ` · ${label}第 ${rank}/${total}`;
}

/**
 * @param {string | undefined} provider
 * @param {boolean} median
 */
function openRouterLabel(provider, median) {
  const who = provider || '提供商暂无';
  return median ? `OpenRouter·${who}（中位数）` : `OpenRouter·${who}`;
}

/**
 * @param {unknown} value
 */
function money(value) {
  if (value == null || value === '') return '暂无';
  const n = Number(value);
  if (!Number.isFinite(n)) return '暂无';
  return `$${formatNumber(n)}`;
}

/**
 * @param {unknown} value
 */
function seconds(value) {
  if (value == null || value === '') return '暂无';
  const n = Number(value);
  if (!Number.isFinite(n)) return '暂无';
  return `${formatNumber(Math.round(n * 100) / 100)} 秒`;
}

/**
 * @param {unknown} value
 */
function rate(value) {
  if (value == null || value === '') return '暂无';
  const n = Number(value);
  if (!Number.isFinite(n)) return '暂无';
  return `${formatNumber(Math.round(n * 10) / 10)} token/s`;
}

/**
 * @param {number} n
 */
function formatNumber(n) {
  return String(n);
}

/**
 * @param {string} value
 */
function tokens(value) {
  return String(value).toLowerCase().match(/[a-z0-9]+(?:\.[0-9]+)*/g) || [];
}

/**
 * @param {string} value
 */
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
