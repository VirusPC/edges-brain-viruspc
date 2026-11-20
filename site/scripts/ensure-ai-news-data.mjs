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
 * Set AI_NEWS_DATA_ROOT to skip the clone. A missing issue directory is not
 * an error; that chart falls back to its PNG.
 */

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(siteRoot, '.cache/ai-news-data');
const remote = 'https://github.com/VirusPC/ai-news-data.git';

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
overlayAdoptedArena(cache);
await downloadModelCatalog(path.join(siteRoot, '.cache/openrouter-models.json'));
console.log(`ai-news-data: ${cache} @ ${rev.stdout.trim() || 'unknown'}`);

/**
 * @param {string} dir
 */
function clone(dir) {
  const result = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', 'main', remote, dir],
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
    ['-C', dir, 'fetch', '--depth', '1', 'origin', 'main'],
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

function overlayAdoptedArena(dir) {
  const branch = 'cursor/arena-adopted-boards-9b82';
  const fetched = spawnSync(
    'git',
    ['-C', dir, 'fetch', '--depth', '1', 'origin', branch],
    { stdio: 'inherit', timeout: 120_000 },
  );
  if (fetched.status !== 0) {
    console.warn(`ai-news-data: 没有 ${branch}，发布日对不上的 Arena 会退回 PNG`);
    return;
  }
  const listed = spawnSync('git', ['-C', dir, 'ls-tree', '-r', '--name-only', 'FETCH_HEAD'], {
    encoding: 'utf8',
  });
  if (listed.status !== 0) return;
  for (const file of listed.stdout.split('\n')) {
    if (!/^issues\/\d{4}-\d{2}-\d{2}\/llm-arena-\d{4}-\d{2}-\d{2}\.json$/.test(file)) continue;
    const dest = path.join(dir, file);
    if (fs.existsSync(dest)) continue;
    const show = spawnSync('git', ['-C', dir, 'show', `FETCH_HEAD:${file}`]);
    if (show.status !== 0) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, show.stdout);
    console.log(`ai-news-data overlay ${file}`);
  }
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
