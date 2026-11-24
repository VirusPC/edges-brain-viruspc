import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function chromeBin() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((file) => existsSync(file)) || null;
}

function fixtureHtml() {
  const global = readFileSync(path.join(siteRoot, 'src/styles/global.css'), 'utf8');
  const filter = readFileSync(path.join(siteRoot, 'src/styles/ai-news-filter.css'), 'utf8');
  const chips = Array.from({ length: 18 }, (_, index) => (
    `<button type="button" class="ai-news-filter-word" data-label="常驻 Agent ${index}"><span class="ai-news-filter-face">常驻 Agent ${index}</span></button>`
  )).join('');
  const wide = '宽'.repeat(80);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
${global}
${filter}
</style>
</head>
<body class="is-post has-toc">
<article class="post has-toc">
  <div class="prose">
    <h2>一、本周概览</h2>
    <div style="height: 420px"></div>
    <div class="ai-news-filter ai-news-keyword-bar">
      <div class="ai-news-filter-row">${chips}</div>
    </div>
    <h2>四、精选文章</h2>
    <div class="ai-news-selected">
      <div class="ai-news-filter ai-news-article-bar">
        <div class="ai-news-filter-row">
          <button type="button" class="ai-news-filter-all" data-label="全部"><span class="ai-news-filter-face">全部</span></button>
        </div>
      </div>
      <div class="table-wrap">
        <table><tr><td style="white-space: nowrap">${wide}</td></tr></table>
      </div>
      <div style="height: 1600px"></div>
    </div>
  </div>
</article>
<script>
  const root = document.querySelector('.prose');
  const keyword = document.querySelector('.ai-news-keyword-bar');
  const article = document.querySelector('.ai-news-article-bar');
  const heading = [...document.querySelectorAll('.prose > h2')].find((node) => node.textContent.includes('精选文章'));
  const wrap = document.querySelector('.table-wrap');
  const row = keyword.querySelector('.ai-news-filter-row');
  const chip = keyword.querySelector('button');
  const articleChip = article.querySelector('button');
  root.style.setProperty('--ai-news-keyword-bar-h', keyword.offsetHeight + 'px');
  root.style.setProperty('--ai-news-heading-top', keyword.offsetHeight + 'px');
  root.style.setProperty('--ai-news-article-top', (keyword.offsetHeight + heading.offsetHeight) + 'px');
  const proseStyle = getComputedStyle(root);
  const rowStyle = getComputedStyle(row);
  const ancestors = [];
  let node = root;
  while (node) {
    const style = getComputedStyle(node);
    ancestors.push({
      tag: node.tagName,
      cls: String(node.className || '').slice(0, 60),
      overflowX: style.overflowX,
      overflowY: style.overflowY,
    });
    node = node.parentElement;
  }
  const box = (el) => Math.round(el.getBoundingClientRect().top * 100) / 100;
  const hit = (button, dy) => {
    const rect = button.getBoundingClientRect();
    const found = document.elementFromPoint(rect.left + 8, rect.top + dy);
    return Boolean(found && (found === button || button.contains(found)));
  };
  const before = { keyword: box(keyword), heading: box(heading), article: box(article), scrollY: window.scrollY };
  window.scrollTo(0, 700);
  const pinned = { keyword: box(keyword), heading: box(heading), article: box(article), scrollY: window.scrollY };
  window.scrollTo(0, 980);
  const later = { keyword: box(keyword), heading: box(heading), article: box(article), scrollY: window.scrollY };
  wrap.scrollLeft = 80;
  const payload = {
    innerWidth: window.innerWidth,
    match960: matchMedia('(max-width: 960px)').matches,
    match560: matchMedia('(max-width: 560px)').matches,
    prose: { overflowX: proseStyle.overflowX, overflowY: proseStyle.overflowY },
    row: { overflowX: rowStyle.overflowX, overflowY: rowStyle.overflowY },
    ancestors,
    before,
    pinned,
    later,
    table: {
      clientWidth: wrap.clientWidth,
      scrollWidth: wrap.scrollWidth,
      scrollLeft: wrap.scrollLeft,
    },
    keywordRowScrolls: row.scrollWidth > row.clientWidth + 1,
    touch: {
      keywordCenter: hit(chip, chip.getBoundingClientRect().height / 2),
      keywordAbove: hit(chip, -6),
      articleCenter: hit(articleChip, articleChip.getBoundingClientRect().height / 2),
      articleAbove: hit(articleChip, -6),
    },
  };
  const out = document.createElement('pre');
  out.id = 'out';
  out.textContent = JSON.stringify(payload);
  document.body.append(out);
</script>
</body>
</html>`;
}

/**
 * @param {string} html
 * @param {number} width
 */
function evaluate(html, width) {
  const bin = chromeBin();
  assert.ok(bin, 'Set CHROME_PATH to a Chrome or Chromium binary');
  return mkdtemp(path.join(tmpdir(), 'sticky-overflow-')).then(async (dir) => {
    const htmlPath = path.join(dir, 'fixture.html');
    await writeFile(htmlPath, html);
    const stdout = await new Promise((resolve, reject) => {
      const child = spawn(bin, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        `--window-size=${width},900`,
        '--virtual-time-budget=5000',
        '--timeout=8000',
        '--dump-dom',
        `file://${htmlPath}`,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Chrome dump-dom exceeded 20s\n${err.slice(-500)}`));
      }, 20000);
      child.stdout.on('data', (chunk) => { out += chunk; });
      child.stderr.on('data', (chunk) => { err += chunk; });
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        if (!out.includes('id="out"')) reject(new Error(`Chrome exited ${code} without a result\n${err.slice(-800)}`));
        else resolve(out);
      });
    });
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    const match = stdout.match(/<pre id="out">([\s\S]*?)<\/pre>/);
    assert.ok(match, 'missing measurement output');
    return JSON.parse(match[1]);
  });
}

test('at 800px the weekly prose clips both axes and the plaques stay pinned', async () => {
  const measured = await evaluate(fixtureHtml(), 800);
  assert.equal(measured.innerWidth, 800);
  assert.equal(measured.match960, true);
  assert.equal(measured.match560, false);
  assert.deepEqual(measured.prose, { overflowX: 'clip', overflowY: 'clip' });
  assert.equal(measured.ancestors[0].overflowX, 'clip');
  assert.equal(measured.ancestors[0].overflowY, 'clip');
  for (const ancestor of measured.ancestors.slice(1)) {
    assert.equal(ancestor.overflowX, 'visible', ancestor.cls || ancestor.tag);
    assert.equal(ancestor.overflowY, 'visible', ancestor.cls || ancestor.tag);
  }
  assert.ok(measured.pinned.scrollY > measured.before.scrollY);
  assert.ok(measured.later.scrollY > measured.pinned.scrollY);
  for (const key of ['keyword', 'heading', 'article']) {
    assert.ok(Math.abs(measured.later[key] - measured.pinned[key]) <= 0.5, `${key} moved from ${measured.pinned[key]} to ${measured.later[key]}`);
    assert.ok(measured.pinned[key] < 120, `${key} did not pin (${measured.pinned[key]})`);
  }
  assert.ok(measured.table.scrollWidth > measured.table.clientWidth + 20);
  assert.ok(measured.table.scrollLeft >= 40, `table scrollLeft stayed ${measured.table.scrollLeft}`);
  assert.equal(measured.keywordRowScrolls, true);
  assert.equal(measured.row.overflowX, 'auto');
  assert.equal(measured.row.overflowY, 'hidden');
  assert.equal(measured.touch.keywordCenter, true);
  assert.equal(measured.touch.keywordAbove, false);
  assert.equal(measured.touch.articleCenter, true);
  assert.equal(measured.touch.articleAbove, true);
});
