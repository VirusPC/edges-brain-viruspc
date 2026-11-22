import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The site build reads VirusPC/ai-news-data at build time and embeds the
 * top-15 series in the page. It does not call Arena, Artificial Analysis, or
 * OpenRouter while the page is open, and it does not copy the snapshots into
 * this repo: the archive is the source of truth and the Artificial Analysis
 * file alone is already over a megabyte per issue.
 *
 * Set AI_NEWS_DATA_ROOT to skip the clone. The clone is the default branch.
 * Charts and keywords are read from each issue's raw/ and summary/.
 */

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(siteRoot, '.cache/ai-news-data');
const remote = 'https://github.com/VirusPC/ai-news-data.git';
const dataRef = process.env.AI_NEWS_DATA_REF || 'main';

const configured = process.env.AI_NEWS_DATA_ROOT;
if (configured && fs.existsSync(path.join(configured, 'issues'))) {
  await downloadModelCatalog(path.join(siteRoot, '.cache/openrouter-models.json'));
  console.log(`ai-news-data: ${configured}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(cache), { recursive: true });
const ok = fs.existsSync(path.join(cache, '.git')) ? update(cache) : clone(cache);
if (!ok || !fs.existsSync(path.join(cache, 'issues'))) {
  console.error('ai-news-data: 构建时读不到快照仓库，模型榜单无法从 JSON 渲染。');
  process.exit(1);
}
const rev = spawnSync('git', ['-C', cache, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
await downloadModelCatalog(path.join(siteRoot, '.cache/openrouter-models.json'));
console.log(`ai-news-data: ${cache} @ ${rev.stdout.trim() || 'unknown'}`);

/**
 * @param {string} dir
 */
function clone(dir) {
  const result = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', dataRef, remote, dir],
    { stdio: 'inherit', timeout: 120_000 },
  );
  return result.status === 0;
}

/**
 * @param {string} dir
 */
function update(dir) {
  const fetched = spawnSync(
    'git',
    ['-C', dir, 'fetch', '--depth', '1', 'origin', dataRef],
    { stdio: 'inherit', timeout: 120_000 },
  );
  if (fetched.status !== 0) return false;
  spawnSync('git', ['-C', dir, 'clean', '-fd', 'issues'], { stdio: 'inherit', timeout: 30_000 });
  const reset = spawnSync('git', ['-C', dir, 'reset', '--hard', 'FETCH_HEAD'], {
    stdio: 'inherit',
    timeout: 30_000,
  });
  return reset.status === 0;
}

/**
 * @param {string} dest
 */
async function downloadModelCatalog(dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Accept: 'application/json', 'User-Agent': 'edges-brain-site' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.data) || payload.data.length === 0) throw new Error('empty catalog');
    fs.writeFileSync(dest, JSON.stringify({ data: payload.data }));
    console.log(`openrouter models: ${payload.data.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`openrouter models: 没拉到公开模型列表（${message}）`);
  }
}
