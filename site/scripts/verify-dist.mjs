import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entryAnchor } from '../src/lib/entry-anchor.mjs';
import { giscusReady } from '../src/lib/reader-feedback.mjs';
import { FIXTURE_ID, listDatedNoteDirs } from '../src/lib/select.mjs';
import { buildProjectCatalog, listProjectDocuments } from '../src/lib/projects.mjs';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(siteRoot, '..');
const dist = path.join(siteRoot, 'dist');
const fixtureOn = process.env.SITE_INCLUDE_FIXTURE === '1';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

const files = walk(dist);
const rels = files.map((file) => path.relative(dist, file).split(path.sep).join('/'));

function gitIssueCommit(issueDate) {
  const dataRoot = process.env.AI_NEWS_DATA_ROOT
    || path.join(siteRoot, '.cache/ai-news-data');
  const result = spawnSync(
    'git',
    ['-C', dataRoot, 'log', '-1', '--format=%H', '--', `issues/${issueDate}`],
    { encoding: 'utf8' },
  );
  return String(result.stdout || '').trim();
}

const SOURCE_UNITS = {
  模型榜单: '源',
  'GitHub Trending': '榜',
  博客: '团队',
  国内互联网: '团队',
};
const BOARD_CATEGORY = '模型榜单';

function summarySources(issueDate) {
  const dataRoot = process.env.AI_NEWS_DATA_ROOT
    || path.join(siteRoot, '.cache/ai-news-data');
  const indexPath = path.join(dataRoot, 'issues', issueDate, 'summary', 'index.json');
  return JSON.parse(fs.readFileSync(indexPath, 'utf8')).sources;
}

function assertSourcesCard(html, issueDate) {
  const start = html.indexOf('class="info-card ai-news-sources"');
  const note = html.indexOf('class="info-card"');
  const end = html.indexOf('id="一本周概览"');
  assert.ok(note >= 0 && start > note && end > start, `${issueDate} source card is not under the top note`);
  const card = html.slice(start, end);
  const sources = summarySources(issueDate);
  assert.match(card, /<span>信息源<\/span>/);
  assert.match(card, /<path d="M4 11a9 9 0 0 1 9 9"><\/path>/);
  assert.doesNotMatch(card, /<circle cx="12" cy="12" r="10">/);
  assert.equal((card.match(/<details class="ai-news-sources-cat"/g) || []).length, 4);
  assert.doesNotMatch(card, /ai-news-sources-fold|<details[^>]* open/);
  assert.match(card, /href="https:\/\/github.com\/VirusPC\/edges-brain-viruspc\/blob\/main\/skills\/managed\/weekly-ai-blogs-digest\/feeds\/ai-coding-blogs.opml"/);
  assert.doesNotMatch(card, /data-cat|ai-news-filter|xmlUrl/);
  let publisherTotal = 0;
  let sum = 0;
  let incomplete = false;
  const names = new Set();
  for (const title of Object.keys(SOURCE_UNITS)) {
    const category = (sources.categories || []).find((item) => item?.title === title);
    const publishers = (category?.publishers || []).filter((item) => item?.name && item?.url);
    publisherTotal += publishers.length;
    const unit = SOURCE_UNITS[title];
    const board = title === BOARD_CATEGORY;
    if (board) {
      assert.match(card, new RegExp(`${title}</span></span><span class="ai-news-sources-cat-meta">${publishers.length} ${unit}</span>`));
      const boardHtml = card.slice(card.indexOf(title), card.indexOf('GitHub Trending'));
      assert.doesNotMatch(boardHtml, /未统计|ai-news-sources-count|条/);
    } else if (typeof category?.count === 'number') {
      sum += category.count;
      assert.match(card, new RegExp(`${title}</span></span><span class="ai-news-sources-cat-meta">${publishers.length} ${unit} · <strong>${category.count} 条</strong>`));
    } else {
      incomplete = true;
      assert.match(card, new RegExp(`${title}</span></span><span class="ai-news-sources-cat-meta">${publishers.length} ${unit} · 未统计`));
    }
    const quiet = board ? 0 : publishers.filter((item) => item.count === 0).length;
    if (quiet) assert.match(card, new RegExp(`本期无新增 \\(${quiet}\\)`));
    for (const publisher of publishers) {
      names.add(publisher.name);
      const href = String(publisher.url).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const label = String(publisher.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!board && typeof publisher.count === 'number') {
        assert.match(card, new RegExp(`href="${href}"[^>]*>[\\s\\S]*?${label}</span><span class="ai-news-sources-count">${publisher.count}</span>`));
      } else {
        assert.match(card, new RegExp(`href="${href}"[^>]*>[\\s\\S]*?${label}</span></a>`));
      }
    }
  }
  const plus = incomplete ? '\\+' : '';
  assert.match(card, new RegExp(`4 类 </span>${publisherTotal} 源 · 抓取 <span class="ai-news-sources-tally-sum">${sum}${plus}</span>`));
  assert.doesNotMatch(card, /筛前/);
  const css = fs.readFileSync(path.join(siteRoot, 'src/styles/global.css'), 'utf8');
  assert.match(css, /--info-card-font-size:\s*0\.8em/);
  assert.match(css, /--info-card-line-height:\s*1\.5/);
  assert.match(css, /\.info-card\s*\{[^}]*font-size:\s*var\(--info-card-font-size\)/);
  assert.match(css, /\.info-card\s*\{[^}]*line-height:\s*var\(--info-card-line-height\)/);
  assert.match(css, /\.ai-news-sources\s*\{[^}]*font-size:\s*var\(--info-card-font-size\)/);
  assert.match(css, /\.ai-news-sources\s*\{[^}]*line-height:\s*var\(--info-card-line-height\)/);
  for (const label of ['每周 / TypeScript', '每周 / Python', '每周 / 全部']) {
    if (!names.has(label)) assert.doesNotMatch(card, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
}

function exists(rel) {
  assert.ok(rels.includes(rel), `missing ${rel}`);
}

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

function firstPanelKind(html) {
  const match = html.match(/<div class="model-panel"([^>]*)>/);
  assert.ok(match, 'model panel is missing');
  assert.doesNotMatch(match[1], /\bhidden\b/, 'the first model panel is hidden');
  const kind = match[1].match(/data-chart-kind="([^"]+)"/);
  assert.ok(kind, 'first model panel has no kind');
  return kind[1];
}

function assertModelProgressToc(toc) {
  const item = toc.match(/<li>\s*<a href="[^"]+">二、模型进展<\/a>([\s\S]*?)<\/li>/);
  assert.ok(item, 'toc is missing 二、模型进展');
  assert.doesNotMatch(item[1], /<ol|模型发布/);
}

function chartSpecs(html) {
  return [...html.matchAll(/<pre\b[^>]*\bmodel-chart-spec\b[^>]*>([\s\S]*?)<\/pre>/g)].map((match) =>
    JSON.parse(decodeHtml(match[1])),
  );
}

function boardIds(issueDate) {
  const dataRoot = process.env.AI_NEWS_DATA_ROOT
    || path.join(siteRoot, '.cache/ai-news-data');
  const index = JSON.parse(fs.readFileSync(
    path.join(dataRoot, 'issues', issueDate, 'summary', 'index.json'),
    'utf8',
  ));
  const chapter = (index.chapters || []).find((item) => item?.title === '模型进展');
  return Array.isArray(chapter?.boards) ? chapter.boards : [];
}

function assertSwitchableCharts(html, issueDate) {
  const boards = boardIds(issueDate);
  const switches = html.match(/data-model-board/g) || [];
  assert.equal(switches.length, boards.length > 0 ? 1 : 0, `${issueDate} 可切换图表`);
  const select = html.match(/<select\b[^>]*aria-label="切换模型榜单"[^>]*>([\s\S]*?)<\/select>/);
  const options = select ? [...select[1].matchAll(/<option\b[^>]*>/g)] : [];
  assert.equal(options.length, boards.length, `${issueDate} 图表数应等于榜单数`);
  assert.equal(chartSpecs(html).length, boards.length, `${issueDate} 图表数据应等于榜单数`);
  assert.doesNotMatch(html, /\[[^\]]{0,160}Top 15，/, `${issueDate} 模型区不应剩下方括号 alt`);
}

function assertCategoryPills(html, samples, plainHeadings = [/<h4\b(?![^>]*data-cat)[^>]*>\s*整体排名\s*<\/h4>/]) {
  const toc = html.match(/<nav class="toc"[\s\S]*?<\/nav>/);
  assert.ok(toc, 'issue is missing the chapter toc');
  assert.doesNotMatch(toc[0], /&lt;|&#x3C;|data-cat/);
  for (const pattern of plainHeadings) {
    assert.match(html, pattern);
  }
  for (const [label, title] of samples) {
    const heading = html.match(new RegExp(`<h4\\b[^>]*\\bdata-cat="${label}"[^>]*>[\\s\\S]*?<\\/h4>`));
    assert.ok(heading, `missing category pill ${label}`);
    assert.match(heading[0], new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(heading[0].replace(/<h4\b[^>]*>/, ''), /&lt;|&#x3C;/);
  }
}

exists('index.html');
exists('404.html');
exists('rss.xml');
exists('posts/index.html');
exists('notes/index.html');
exists('projects/index.html');
exists('about/index.html');
exists('ai-news/index.html');
exists('ai-news/rss.xml');
exists('ai-news/latest.json');
exists('ai-news/subscribe/index.html');
exists('favicon.svg');

const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
assert.match(home, /recent-posts/);
assert.match(home, /recent-notes/);
assert.match(home, /recent-projects/);
assert.match(home, /class="post-list"/);
const recentNotes = home.match(/<section class="home-notes[\s\S]*?<\/section>/)?.[0] ?? '';
assert.match(recentNotes, /<time datetime="\d{4}-\d{2}-\d{2}">/);
assert.match(recentNotes, /<a href="[^"]+\/notes\/[^"]+">[^<]+<\/a>/);
assert.doesNotMatch(recentNotes, />\d{4}-\d{2}-\d{2}--/);
assert.doesNotMatch(home, /class="dash"|entry-list|note-kicker/);
assert.match(home, /Projects/);

const notesPage = fs.readFileSync(path.join(dist, 'notes/index.html'), 'utf8');
assert.match(notesPage, /class="post-list"/);
assert.match(notesPage, /class="archive-year"/);
assert.match(notesPage, /class="list-month"/);
assert.match(notesPage, /<time /);
assert.match(notesPage, />open-grokbot 全程坑点</);
assert.doesNotMatch(notesPage, />2026-\d{2}-\d{2}--/);
assert.doesNotMatch(notesPage, /class="dash"|entry-list|note-kicker|NoteList/);

const expectedNotes = listDatedNoteDirs(path.join(repoRoot, 'notes'));
const noteDetails = rels.filter(
  (rel) => rel.startsWith('notes/') && rel.endsWith('/index.html') && rel !== 'notes/index.html',
);
assert.equal(
  noteDetails.length,
  expectedNotes.length,
  `note pages ${noteDetails.length} != dated folders ${expectedNotes.length}`,
);

const projectDocs = listProjectDocuments(path.join(repoRoot, 'projects'));
const postsPage = fs.readFileSync(path.join(dist, 'posts/index.html'), 'utf8');
assert.match(postsPage, /class="post-list"|class="empty"/);

const projectCatalog = buildProjectCatalog(path.join(repoRoot, 'projects'));
const projectBrowserRels = new Set(projectCatalog.projects.map((project) => `projects/${project.id}/index.html`));
const projectPage = fs.readFileSync(path.join(dist, 'projects/index.html'), 'utf8');
assert.match(projectPage, /data-project-browser/);
assert.match(projectPage, /class="project-chevron"/);
assert.match(projectPage, /aria-expanded="false"/);
assert.doesNotMatch(projectPage, /<details class="project-fold"/);
assert.doesNotMatch(projectPage, /data-project-toggle="[^"]*"[^>]*aria-expanded="true"/);
const projectCss = fs.readFileSync(path.join(siteRoot, 'src/styles/global.css'), 'utf8');
assert.match(projectCss, /\.project-chevron:focus-visible/);
assert.match(projectCss, /min-height:\s*44px/);
assert.match(projectCss, /prefers-reduced-motion:\s*reduce/);
assert.match(projectPage, /class="project-title"/);
const agentProject = fs.readFileSync(path.join(dist, 'projects/agent-infra/index.html'), 'utf8');
assert.match(agentProject, /prompt-caching/);
assert.match(agentProject, /项目说明/);
assert.match(agentProject, /data-project-browser/);
const memoryProject = fs.readFileSync(path.join(dist, 'projects/memory/index.html'), 'utf8');
assert.match(memoryProject, /github\.com\/VirusPC\/edges-brain-viruspc\/blob\/main\/projects\/memory\//);
assert.doesNotMatch(projectPage, /class="dash"|entry-list|note-kicker/);
assert.doesNotMatch(notesPage, /data-project-browser/);
assert.doesNotMatch(postsPage, /data-project-browser/);

const grokNote = path.join(dist, 'notes/2026-10-29--open-grokbot-全程坑点/index.html');
const grokHtml = fs.readFileSync(grokNote, 'utf8');
assert.match(grokHtml, /<h1>\s*open-grokbot 全程坑点\s*<\/h1>/);
assert.doesNotMatch(grokHtml, /<h1>[^<]*2026-10-29/);
const grokToc = grokHtml.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(grokToc, 'note detail is missing the chapter toc');
for (const heading of ['背景', '主题', '过程', '结果', '所学', '行动指南', '补充说明']) {
  assert.match(grokToc[0], new RegExp(heading));
}

const sampleNote = noteDetails[0];
assert.ok(sampleNote, 'expected at least one note detail');
const noteDetail = fs.readFileSync(path.join(dist, sampleNote), 'utf8');
assert.match(noteDetail, /class="post-head"/);
assert.match(noteDetail, /class="post-kicker"/);
assert.match(noteDetail, /class="post has-toc"/);
assert.doesNotMatch(noteDetail, /note-kicker|is-post/);
const projectDetails = rels.filter(
  (rel) => rel.startsWith('projects/') && rel.endsWith('/index.html') && rel !== 'projects/index.html',
);
const markdownDocs = projectDocs.filter((doc) => doc.kind === 'md');
const hublessProjects = projectCatalog.projects.filter((project) => !project.hub).length;
assert.equal(
  projectDetails.length,
  markdownDocs.length + hublessProjects,
  `project pages ${projectDetails.length} != markdown documents ${markdownDocs.length} plus ${hublessProjects} hubless projects`,
);
assert.ok(projectDetails.some((rel) => rel.includes('agent-infra')));
assert.equal(
  rels.some((rel) => rel.endsWith('.pdf/index.html') || rel.endsWith('.pdf')),
  false,
  'pdf files stay on GitHub and do not become site pages',
);

assert.equal(
  rels.some((rel) => rel === 'posts/README/index.html' || rel === 'posts/readme/index.html'),
  false,
);

const sample = rels.find((rel) => rel.includes(FIXTURE_ID));
if (fixtureOn) {
  assert.ok(sample, 'fixture post was not built');
  const html = fs.readFileSync(path.join(dist, sample), 'utf8');
  assert.match(html, /class="sidenote"/);
  assert.doesNotMatch(html, /data-footnotes|class="footnotes"/);
  assert.doesNotMatch(html, /skin-notes/);
  assert.match(html, /is-post/);
  const fixtureToc = html.match(/<nav class="toc"[\s\S]*?<\/nav>/);
  assert.ok(fixtureToc, 'fixture post is missing the chapter toc');
  assert.match(fixtureToc[0], /栏外的注/);
  assert.match(fixtureToc[0], /第二条/);
} else {
  assert.equal(sample, undefined);
}

const feed = fs.readFileSync(path.join(dist, 'rss.xml'), 'utf8');
assert.match(feed, /<rss/);
assert.match(feed, /<item>/);
assert.match(feed, /<link>https:\/\/viruspc\.github\.io\/edges-brain-viruspc\/<\/link>/);
assert.match(feed, /edges-brain-viruspc\/notes\//);
assert.doesNotMatch(feed, /\/posts\/README/);
assert.doesNotMatch(feed, /ai-news/);

const issuePages = rels.filter((rel) => /^ai-news\/\d{4}-\d{2}-\d{2}\/index\.html$/.test(rel));
assert.equal(rels.includes('ai-news/README/index.html'), false);

const aiNewsList = fs.readFileSync(path.join(dist, 'ai-news/index.html'), 'utf8');
assert.match(aiNewsList, /<h1>AI News<\/h1>/);
assert.match(aiNewsList, /每周五上午 9 点开始生成（北京时间）/);
assert.doesNotMatch(aiNewsList, /上午 8 点|08:00|准点/);
assert.match(aiNewsList, /href="\/edges-brain-viruspc\/ai-news\/"[^>]*aria-current="page"/);
assert.match(aiNewsList, /href="\/edges-brain-viruspc\/ai-news\/2026-11-06\/"/);
assert.match(aiNewsList, /2026-10-30～11-05/);
assert.doesNotMatch(aiNewsList, /交付闭环：OpenAI 收购 Pierre，Amp 接入 GitLab/);
assert.match(aiNewsList, /2026-10-23 AI 资讯/);
assert.doesNotMatch(aiNewsList, /MiniMax M3\.1 Flash，DeepSeek V4\.1 Flash/);
assert.match(aiNewsList, /href="\/edges-brain-viruspc\/ai-news\/rss\.xml"/);
assert.doesNotMatch(aiNewsList, /class="tag">旧版/);

const latestIssue = fs.readFileSync(path.join(dist, 'ai-news/2026-11-06/index.html'), 'utf8');
assert.doesNotMatch(latestIssue, /每周五上午 9 点开始生成/);
assert.match(latestIssue, /<h1>\s*2026-11-06 AI 资讯\s*<\/h1>/);
assert.match(latestIssue, /10-30 08:00 → 11-06 07:59/);
assert.doesNotMatch(latestIssue, /〇、薅羊毛/);
const latestToc = latestIssue.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(latestToc, 'latest issue is missing the chapter toc');
for (const heading of ['一、本周概览', '二、模型进展', '三、项目开源', '四、精选文章', '五、精选推文', '六、精选播客', '国内模型厂', '国外模型厂', '国内非模型厂', '国外非模型厂']) {
  assert.match(latestToc[0], new RegExp(heading));
}
assert.doesNotMatch(latestToc[0], /SWE-2 Flash|####|is-current|&lt;|&#x3C;|data-cat/);
assert.match(latestIssue, /IntersectionObserver/);
assert.match(latestIssue, /is-current/);
const plainNote = fs.readFileSync(path.join(dist, 'notes/2026-10-29--open-grokbot-全程坑点/index.html'), 'utf8');
assert.match(plainNote, /IntersectionObserver/);
assert.doesNotMatch(aiNewsList, /IntersectionObserver/);
assert.match(latestIssue, /aria-current="page"[^>]*>\s*AI News\s*</);
assert.match(latestIssue, /这一期的榜单。/);
assert.doesNotMatch(latestIssue, /较上周无新榜/);
assert.match(latestIssue, /data-model-board/);
assert.equal(chartSpecs(latestIssue)[0].publishDate, '2026-10-28');
assert.doesNotMatch(latestIssue, /llm-arena-top15-2026-11-06/);
assert.doesNotMatch(latestIssue, /ai-news\.notes/);
assert.doesNotMatch(aiNewsList, /ai-news\.notes/);
assert.equal(
  rels.some((rel) => rel.includes('.notes')),
  false,
  'notes sidecars are not site pages',
);
assert.match(latestIssue, /class="keyword-cloud"/);
assert.match(latestIssue, /aria-label="会话可续、生产 Harness、长程操作、Hy4、LongCat-2\.5、Kimi Hosted Agents、GPT-6 Cyber、SWE-2 Flash、美团 LongCat-2\.5、腾讯混元 Hy4、Devin Review 2\.0、Gemini Omni 1\.2 Flash"/);
assert.match(latestIssue, /class="kw-high"[^>]*>会话可续</);
assert.match(latestIssue, /data-keyword="长程操作"/);
assert.doesNotMatch(latestIssue, /class="kw-top"/);
assert.match(latestIssue, /class="keyword-cloud-outline"[^>]*>\s*<rect><\/rect>/);
assert.doesNotMatch(latestIssue, /feTurbulence|feDisplacementMap|id="rough"/);
assert.match(
  files.filter((file) => file.endsWith('.js')).map((file) => fs.readFileSync(file, 'utf8')).join('\n'),
  /disableMultiStroke/,
);
assert.doesNotMatch(latestIssue, /keywords-cloud-2026-11-06\.png/);
const cloudAt = latestIssue.indexOf('class="keyword-cloud"');
assert.ok(cloudAt > 0, 'latest issue is missing the keyword cloud');
assert.doesNotMatch(latestIssue.slice(cloudAt, cloudAt + 12000), /fffcf7/);
assert.match(latestIssue, /href="https:\/\/devin\.ai\/blog\/devin-review-2"/);
assert.doesNotMatch(latestIssue, /kiroween\.devpost\.com|linux\.do\/t\/topic\/3101137/);
assert.doesNotMatch(latestIssue, /<h4[^>]*>\s*整体排名\s*<\/h4>/);
assert.match(latestIssue, /data-model-board/);
assert.deepEqual(optionLabels(latestIssue), [
  'LLM Arena',
  'OpenRouter 应用用量',
  'OpenRouter 编程用量',
  'OpenRouter 本周用量',
]);
const latestSpecs = chartSpecs(latestIssue);
assert.equal(latestSpecs.length, 4);
assert.equal(latestSpecs[0].kind, 'llm-arena');
assert.equal(latestSpecs[0].publishDate, '2026-10-28');
assert.equal(latestSpecs[0].items.length, 15);
assert.ok(latestSpecs[0].items.some((item) => item.name === 'Gemini 4 Carbon (High)'));
assert.equal(latestSpecs[0].items.some((item) => item.highlight), false);
assert.ok(latestSpecs[3].items.some((item) => item.name === 'Hy4'));
assert.match(latestIssue, /class="model-facts-name">腾讯混元 Hy4<\/p>[\s\S]{0,240}暂无/);
assert.match(latestIssue, /class="model-facts-name">美团 LongCat-2\.5<\/p>[\s\S]{0,240}暂无/);
assert.doesNotMatch(latestIssue, /采样周|榜单发布日|下一期|后面几期/);
assert.doesNotMatch(latestIssue, /原始链接/);
assertCategoryPills(latestIssue, [
  ['产品', 'Kimi Hosted Agents'],
  ['架构', 'Make long-running agents faster with message threads'],
], []);

const newestIssue = fs.readFileSync(path.join(dist, 'ai-news/2026-11-13/index.html'), 'utf8');
assert.match(newestIssue, /<h1>\s*2026-11-13 AI 资讯\s*<\/h1>/);
assertSourcesCard(newestIssue, '2026-11-13');
assert.match(newestIssue, /class="info-card"/);
assert.match(newestIssue, /<mark class="note-card-hl">11-06 08:00 → 11-13 07:59<\/mark>/);
assert.match(newestIssue, /<dt>生成日<\/dt><dd>2026-11-13<\/dd>/);
assert.match(newestIssue, /<dt>时区<\/dt><dd>北京时间<\/dd>/);
assert.doesNotMatch(newestIssue, /覆盖窗口：2026-11-06～2026-11-12（生成日 2026-11-13）。/);
const newestToc = newestIssue.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(newestToc, '2026-11-13 is missing the chapter toc');
assert.match(newestToc[0], /四、精选文章/);
for (const heading of ['国内模型厂', '国外模型厂', '国内非模型厂', '国外非模型厂']) {
  assert.match(newestToc[0], new RegExp(`>${heading}<`));
}
assert.ok(newestToc[0].indexOf('>国内模型厂<') < newestToc[0].indexOf('>国外模型厂<'));
assert.doesNotMatch(newestToc[0], /国内进展|国际进展/);
assert.match(newestToc[0], /二、模型进展/);
assert.doesNotMatch(newestToc[0], /模型发布/);
assert.doesNotMatch(newestToc[0], /LLM Arena|Artificial Analysis|OpenRouter/);
assertModelProgressToc(newestToc[0]);
assert.doesNotMatch(newestToc[0], /&lt;|&#x3C;|data-cat/);
const platformOrder = [...newestIssue.matchAll(/<h3\b[^>]*>([^<]*)<\/h3>/g)]
  .map((match) => match[1].replace(/\s+/g, ' ').trim())
  .filter((text) => ['LLM Arena', 'Artificial Analysis', 'OpenRouter', '模型发布'].includes(text));
assert.deepEqual(platformOrder, []);
assert.deepEqual(optionLabels(newestIssue), [
  'Artificial Analysis',
  'LLM Arena',
  'OpenRouter 本周用量',
  'OpenRouter 编程用量',
  'OpenRouter 应用用量',
]);
assert.equal(firstPanelKind(newestIssue), 'aa');
const newestSpecs = chartSpecs(newestIssue);
assert.deepEqual(newestSpecs.map((spec) => spec.kind), [
  'aa',
  'llm-arena',
  'openrouter-usage',
  'openrouter-programming',
  'openrouter-apps',
]);
for (const spec of newestSpecs) {
  assert.equal(spec.items.length, 15, spec.kind);
  assert.equal(typeof spec.items[0].value, 'number', spec.kind);
}
assert.ok(newestSpecs[1].items.some((item) => item.name === 'Gemini 4 Hydrogen (High)' && item.rank === 15 && item.highlight === true));
assert.equal(newestSpecs[1].publishDate, '2026-11-11');
assert.ok(newestSpecs[0].items.some((item) => item.highlight && item.name.includes('Claude Fable 5.2')));
assert.equal(newestSpecs[2].scaleZero, true);
assert.match(newestSpecs[2].items[0].valueText, / T$/);
assert.equal(newestSpecs[2].items[0].name.includes('/'), false);
assert.match(newestSpecs[2].items[0].name, /\s|[A-Z]/);
const modelProgress = newestIssue.split(/<h2\b[^>]*>\s*二、模型进展\s*<\/h2>/)[1]?.split(/<h2\b/)[0] ?? '';
assert.doesNotMatch(modelProgress, /<h3\b[^>]*>\s*模型发布\s*<\/h3>/);
const releaseAt = modelProgress.search(/发布要点|<h4\b/);
const boardAt = modelProgress.indexOf('data-model-board');
assert.ok(boardAt >= 0 && releaseAt > boardAt, '2026-11-13 model entries follow the rankings');
assertCategoryPills(newestIssue, [
  ['架构', 'Exploring Super-agent Design: Towards a More Autonomous Agent System'],
  ['产品', 'Your Harness. You Define It. Meet Creator Mode in DeepSeek Harness. Turn ideas i…'],
], []);
assert.doesNotMatch(newestIssue, /\]\(https?:/);
assert.match(newestIssue, /href="https:\/\/x\.com\/DeepSeekHarness\/status\/2116857257245987236"/);
assert.match(newestIssue, /href="https:\/\/x\.com\/DeepSeekHarness\/status\/2117256196227019194"/);
assert.match(newestIssue, /href="https:\/\/x\.com\/DeepSeekHarness\/status\/2119431663642153128"/);
assert.match(newestIssue, /dsh-superagent-prototype/);
assert.match(newestIssue, /这是补录，日期仍是原发日/);

const issue1030 = fs.readFileSync(path.join(dist, 'ai-news/2026-10-30/index.html'), 'utf8');
assert.match(issue1030, /class="keyword-cloud"/);
assert.match(issue1030, /class="kw-top"[^>]*>software factory</);
assert.doesNotMatch(issue1030, /class="kw-top"[^>]*>GPT-6\.1 Terra</);
assert.match(issue1030, /输入 ¥13 · 输出 ¥68 · 缓存读 ¥1\.3/);
assert.doesNotMatch(issue1030, /输入 \$13|采样周|榜单发布日/);

const backfillIssue = fs.readFileSync(path.join(dist, 'ai-news/2026-10-23/index.html'), 'utf8');
assert.match(backfillIssue, /<h1>\s*2026-10-23 AI 资讯\s*<\/h1>/);
assert.doesNotMatch(backfillIssue, /旧版/);
assert.match(backfillIssue, /10-16 08:00 → 10-23 07:59/);
assert.doesNotMatch(backfillIssue, /一、本周关键词|Partner Network/);
assert.match(backfillIssue, /class="keyword-cloud"/);
assert.match(backfillIssue, /aria-label="何时交给人、技能成标准、面向 Agent、DeepSeek V4\.1 Flash、Claude Duet、MiniMax M3\.1 Flash、Reflection Beam"/);
assert.match(backfillIssue, /data-keyword="面向 Agent"/);
assert.match(backfillIssue, /<div class="weekly-overview">/);
assert.match(backfillIssue, /class="weekly-overview-card"/);
assert.doesNotMatch(backfillIssue, /<ol class="weekly-overview">/);
assert.match(backfillIssue, /一、本周概览/);
assert.match(backfillIssue, /五、精选推文/);
assert.doesNotMatch(backfillIssue, /文章总结列表/);
const backfillToc = backfillIssue.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(backfillToc, '2026-10-23 is missing the chapter toc');
assert.match(backfillToc[0], /二、模型进展/);
assert.deepEqual(optionLabels(backfillIssue), [
  'LLM Arena',
  'OpenRouter 应用用量',
  'OpenRouter 编程用量',
  'OpenRouter 本周用量',
]);
const backfillSpecs = chartSpecs(backfillIssue);
assert.deepEqual(backfillSpecs.map((spec) => spec.kind), [
  'llm-arena',
  'openrouter-apps',
  'openrouter-programming',
  'openrouter-usage',
]);
assert.equal(backfillSpecs[0].publishDate, '2026-10-22');
assert.equal(backfillSpecs[0].items.length, 15);
assert.equal(backfillSpecs[0].items.some((item) => item.highlight), false);
assert.equal(backfillSpecs[3].items[0].name, 'DeepSeek V4.1 Flash');
assert.equal(backfillSpecs[3].items.some((item) => item.name === 'DeepSeek V4.1 Flash' && item.highlight), false);
assert.match(backfillIssue, /输入 ¥1 · 输出 ¥4 · 缓存读 ¥0\.1/);
assert.doesNotMatch(backfillIssue, /采样周|榜单发布日|后面几期|下一期/);

const issue20 = fs.readFileSync(path.join(dist, 'ai-news/2026-11-20/index.html'), 'utf8');
assert.match(issue20, /<h1>\s*2026-11-20 AI 资讯\s*<\/h1>/);
assert.match(issue20, /class="keyword-cloud"/);
assert.match(issue20, /aria-label="常驻 Agent、进入工作流、软件工厂、验证评测、Gemini 4 Neon、GPT-6\.2 Astra、LoopForge、Devin Apps、Warp Learn、Devin Bots"/);
assert.match(issue20, /class="kw-high"[^>]*>常驻 Agent</);
assert.doesNotMatch(issue20, /class="kw-top"/);
assert.match(issue20, /data-keyword="进入工作流"/);
assert.match(issue20, /data-keyword="常驻 Agent"/);
assert.match(issue20, /data-keyword="验证评测"/);
assert.match(issue20, /data-keyword="软件工厂"/);
const keywordAlt20 = issue20.match(/aria-label="(常驻 Agent、进入工作流、[^"]*)"/);
assert.ok(keywordAlt20, '2026-11-20 is missing the keyword cloud label');
assert.doesNotMatch(keywordAlt20[1], /Claude Code|Codex|OpenRouter|LangSmith|llama\.cpp|Grok Bot|DeepSeek|\bKiro\b|Octop/);
assert.doesNotMatch(issue20, /<p>\s*GPT-6\.2 Astra、Gemini 4 Neon、GPT-6\.2 Sol/);
assert.doesNotMatch(aiNewsList, /GPT-6\.2 Astra、Gemini 4 Neon、GPT-6\.2 Sol、常驻 Agent/);
assert.match(issue20, /class="post-kicker"[\s\S]*2026-11-20[\s\S]*覆盖 2026-11-13～11-19/);
assert.match(issue20, /class="info-card"/);
assertSourcesCard(issue20, '2026-11-20');
assert.match(issue20, /<mark class="note-card-hl">11-13 08:00 → 11-20 07:59<\/mark>/);
assert.match(issue20, /class="info-card-note">不含生成当天/);
assert.match(issue20, /class="info-card-label"[\s\S]*发布要点/);
assert.doesNotMatch(issue20, /release-points/);
assert.doesNotMatch(issue20, /前五是|这期看的是一周榜/);
assert.doesNotMatch(issue20, /覆盖窗口：2026-11-13 08:00:00 至 2026-11-20 07:59:59（北京时间；生成日 2026-11-20）。/);
assert.doesNotMatch(issue20, /2026-11-13 00:00:00 至 2026-11-19 23:59:59（UTC/);
assert.deepEqual(optionLabels(issue20), [
  'Artificial Analysis',
  'LLM Arena',
  'OpenRouter 应用用量',
  'OpenRouter 编程用量',
  'OpenRouter 本周用量',
]);
assert.equal(firstPanelKind(issue20), 'aa');
const specs20 = chartSpecs(issue20);
assert.deepEqual(specs20.map((spec) => spec.kind), [
  'aa',
  'llm-arena',
  'openrouter-apps',
  'openrouter-programming',
  'openrouter-usage',
]);
assert.ok(specs20[1].items.some((item) => item.name === 'Gemini 4 Neon (High)'));
assert.equal(specs20[1].publishDate, '2026-11-18');
assert.ok(specs20[4].items.some((item) => item.name === 'Hy4 flash'));
assert.equal(specs20[2].items[0].name.includes('/'), false);
assert.match(issue20, /这一期的榜单。/);
assert.doesNotMatch(issue20, /这张智力指数前 15 里，本周新发布的是/);
assert.doesNotMatch(issue20, /Hy4 flash 这周用量排到第 1/);
assert.doesNotMatch(issue20, /数据取自/);
assert.doesNotMatch(issue20, /抓取于/);
assert.doesNotMatch(issue20, /快照/);
assert.doesNotMatch(issue20, /chart-meta/);
assert.doesNotMatch(issue20, /红圈：/);
assert.doesNotMatch(issue20, /榜单发布日/);
assert.doesNotMatch(issue20, /<h3\b[^>]*>\s*模型发布\s*<\/h3>/);
assert.match(issue20, /class="model-facts"/);
assert.match(issue20, /GPT-6\.2 Astra/);
assert.match(issue20, /输入 \$8 · 输出 \$40 · 缓存读 \$0\.4/);
assert.match(issue20, /首 token 2\.7 秒 · 吞吐 37 token\/s/);
assert.match(issue20, /智力指数 62\.1，第 3\/156/);
assert.match(issue20, /61\.4，第 6\/156/);
assert.match(issue20, /原文写 Extra High 档 61 分、第 3/);
assert.match(issue20, /输入 \$1\.425 · 输出 \$4\.275 · 缓存读 \$0\.07125/);
assert.match(issue20, /OpenRouter·Alibaba/);
assert.match(issue20, /OpenAI 11 月 17 日发布/);
assert.match(newestIssue, /发布要点/);
assert.match(newestIssue, /class="keyword-cloud"/);
assert.match(newestIssue, />Claude Fable 5\.2</);
const toc20 = issue20.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(toc20, '2026-11-20 is missing the chapter toc');
assert.doesNotMatch(issue20, /薅羊毛/);
assert.doesNotMatch(toc20[0], /薅羊毛/);
for (const heading of ['一、本周概览', '二、模型进展', '三、项目开源', '四、精选文章']) {
  assert.match(toc20[0], new RegExp(heading));
}
const cloud20 = issue20.indexOf('class="keyword-cloud"');
const overviewAt = issue20.indexOf('class="weekly-overview"');
assert.ok(cloud20 >= 0 && overviewAt > cloud20, '2026-11-20 puts the word cloud above the overview list');
const overviewHtml20 = issue20.slice(overviewAt, issue20.indexOf('二、模型进展', overviewAt));
assert.match(overviewHtml20, /class="weekly-overview-card"/);
assert.doesNotMatch(overviewHtml20, /<ol class="weekly-overview">|本周主线|class="tag"/);
const overviewData20 = JSON.parse(fs.readFileSync(
  path.join(process.env.AI_NEWS_DATA_ROOT || path.join(siteRoot, '.cache/ai-news-data'), 'issues/2026-11-20/summary/overview.json'),
  'utf8',
));
assert.equal(
  (overviewHtml20.match(/class="weekly-overview-card"/g) || []).length,
  overviewData20.themes.length,
);
const overviewPlain20 = overviewHtml20.replace(/<[^>]+>/g, '');
for (const theme of overviewData20.themes) {
  assert.ok(overviewPlain20.includes(theme.text), `2026-11-20 overview is missing ${theme.text.slice(0, 24)}`);
}
const neon = entryAnchor('Gemini 4 Neon');
assert.match(issue20, new RegExp(`href="#${neon}"`));
assert.match(issue20, new RegExp(`id="${neon}"`));
for (const heading of ['国内模型厂', '国外模型厂', '国内非模型厂', '国外非模型厂']) {
  assert.match(toc20[0], new RegExp(`>${heading}<`));
}
assert.doesNotMatch(toc20[0], />国内</);
assert.doesNotMatch(toc20[0], />国际</);
assert.ok(toc20[0].indexOf('四、精选文章') < toc20[0].indexOf('五、精选推文'));
assert.ok(toc20[0].indexOf('五、精选推文') < toc20[0].indexOf('六、精选播客'));
assert.doesNotMatch(toc20[0], /建设中/);
const skill20 = JSON.parse(
  fs.readFileSync(
    path.join(process.env.AI_NEWS_DATA_ROOT || path.join(siteRoot, '.cache/ai-news-data'), 'issues/2026-11-20/summary/index.json'),
    'utf8',
  ),
).skill || {};
assert.match(String(skill20.version || ''), /^\d+\.\d+\.\d+$/);
assert.match(issue20, new RegExp(`weekly-ai-blogs-digest@${String(skill20.version).replaceAll('.', '\\.')}`));
assert.match(issue20, /href="https:\/\/github\.com\/VirusPC\/edges-brain-viruspc\/blob\/[0-9a-f]{40}\/\.edges\/routines\/weekly-ai-blogs-digest\/INDEX\.md"/);
assert.doesNotMatch(issue20, /skill 未记录|（当前版本）/);
assert.doesNotMatch(issue20, /<dt>生成规则<\/dt><dd class="info-card-wrap">未记录<\/dd>/);
const dataCommit20 = gitIssueCommit('2026-11-20');
assert.match(issue20, new RegExp(`href="https://github.com/VirusPC/ai-news-data/tree/${dataCommit20}/issues/2026-11-20"`));
assert.match(issue20, new RegExp(`>${dataCommit20.slice(0, 7)}<`));
assert.doesNotMatch(issue20, /github.com\/VirusPC\/ai-news-data\/(?:tree|blob)\/main\//);
assert.doesNotMatch(issue20, /<!-- provenance/);
const headingAt20 = [...issue20.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>/g)];
const projectAt20 = headingAt20.find((match) => match[0].includes('三、项目开源'))?.index ?? -1;
const selectedAt20 = headingAt20.find((match) => match[0].includes('四、精选文章'))?.index ?? -1;
const tweetsAt20 = headingAt20.find((match) => match[0].includes('五、精选推文'))?.index ?? -1;
const podcastsAt20 = headingAt20.find((match) => match[0].includes('六、精选播客'))?.index ?? -1;
assert.ok(projectAt20 > 0 && selectedAt20 > projectAt20 && tweetsAt20 > selectedAt20 && podcastsAt20 > tweetsAt20, '2026-11-20 chapter headings are out of order');
const projectHtml20 = issue20.slice(projectAt20, selectedAt20);
const selectedHtml20 = issue20.slice(selectedAt20, tweetsAt20);
const betweenWip = issue20.slice(tweetsAt20, podcastsAt20);
const podcastHeading = headingAt20.find((match) => match[0].includes('六、精选播客'))[0];
assert.match(betweenWip, /data-wip="建设中"[^>]*>五、精选推文</);
assert.match(betweenWip, /aria-label="五、精选推文，建设中"/);
assert.match(podcastHeading, /data-wip="建设中"[^>]*>六、精选播客</);
assert.match(podcastHeading, /aria-label="六、精选播客，建设中"/);
assert.doesNotMatch(betweenWip, /href=|note-card|article-card|<p/);
assert.doesNotMatch(podcastHeading, /href=/);
const projectFolded20 = [...projectHtml20.matchAll(/<details class="article-more">([\s\S]*?)<\/details>/g)];
const selectedFolded20 = [...selectedHtml20.matchAll(/<details class="article-more">([\s\S]*?)<\/details>/g)];
assert.equal(projectFolded20.length, 5);
assert.equal(selectedFolded20.length, 33);
for (const block of projectFolded20) {
  assert.match(block[1], /<summary>完整总结<\/summary>/);
  for (const label of ['什么问题', '如何解决', '效果怎样', '洞察与启发', '相关工作']) {
    assert.match(block[1], new RegExp(`class="note-card-k">${label}</div>`));
  }
  assert.doesNotMatch(block[1], /class="note-card-k">解决什么问题<\/div>/);
  assert.match(block[1], /class="note-card-hl"/);
  assert.doesNotMatch(block[1], /后续可以怎么做|相关进展：|在解决什么问题|怎么解决：|与其他进展的关联|和最近的进展|做 agent infra|做业务时/);
}
for (const block of selectedFolded20) {
  assert.match(block[1], /<summary>完整总结<\/summary>/);
  for (const label of ['什么问题', '如何解决', '效果怎样', '洞察与启发', '相关工作']) {
    assert.match(block[1], new RegExp(`class="note-card-k">${label}</div>`));
  }
  assert.doesNotMatch(block[1], /class="note-card-k">解决什么问题<\/div>/);
  assert.match(block[1], /class="note-card-hl"/);
  assert.doesNotMatch(block[1], /在解决什么问题|怎么解决：|后续可以怎么做|相关进展：|和最近的进展|与其他进展的关联|做 agent infra|做业务时|微信原文这次没打开|这次没打开原文/);
}
assert.equal((projectHtml20.match(/class="note-card article-card"/g) || []).length, 5);
assert.equal((selectedHtml20.match(/class="note-card article-card"/g) || []).length, 36);
assert.doesNotMatch(projectHtml20, /GitHub Trending（weekly \/ all 前 5）/);
assert.doesNotMatch(projectHtml20, /data-cat=/);
assert.match(selectedHtml20, /data-cat="开源"/);
assert.match(selectedHtml20, /llama\.cpp v1\.0\.0/);
assert.equal((selectedHtml20.match(/订阅源里只有这些/g) || []).length, 3);
assert.equal((issue20.match(/微信原文这次没打开|这次没打开原文/g) || []).length, 0);
const selectedHeadings20 = issue20.match(/<h4\b[^>]*>[\s\S]*?<\/h4>/g) || [];
for (const [cat, tag, title] of [
  ['开源', '腾讯', 'LoopForge'],
  ['架构', '腾讯', 'Octop'],
  ['架构', '腾讯', 'Ontology'],
]) {
  assert.ok(
    selectedHeadings20.some((heading) => heading.includes(`data-cat="${cat}"`)
      && heading.includes(`data-tags="${tag}"`)
      && heading.includes(title)),
    title,
  );
}
assert.doesNotMatch(toc20[0], /模型发布|LLM Arena/);
assertModelProgressToc(toc20[0]);

const aiFeed = fs.readFileSync(path.join(dist, 'ai-news/rss.xml'), 'utf8');
assert.match(aiFeed, /<title>AI 资讯<\/title>/);
assert.match(aiFeed, /<title>2026-11-06 AI 资讯<\/title>/);
assert.match(aiFeed, /<title>2026-10-30 AI 资讯<\/title>/);
assert.match(aiFeed, /edges-brain-viruspc\/ai-news\/2026-11-06\//);
assert.match(aiFeed, /<title>2026-11-13 AI 资讯<\/title>/);
assert.match(aiFeed, /<title>2026-11-20 AI 资讯<\/title>/);
assert.doesNotMatch(aiFeed, /data-cat|&lt;研发提效&gt;|&lt;交付闭环&gt;/);
assert.equal((aiFeed.match(/<item>/g) || []).length, issuePages.length);

const newestIssueDate = issuePages
  .map((rel) => rel.slice('ai-news/'.length, 'ai-news/'.length + 10))
  .sort()
  .at(-1);
const latestDoc = JSON.parse(fs.readFileSync(path.join(dist, 'ai-news/latest.json'), 'utf8'));
const subscribePrompt = '请打开这个说明页，按里面的规则建立一条定时任务，查询最新的 AI 资讯：https://viruspc.github.io/edges-brain-viruspc/ai-news/subscribe/';
assert.equal(latestDoc.id, newestIssueDate, 'latest.json must point at the deployed newest issue');
assert.equal(latestDoc.issues[0].id, newestIssueDate);
assert.equal(latestDoc.issues.length, issuePages.length);
assert.equal(latestDoc.url, `https://viruspc.github.io/edges-brain-viruspc/ai-news/${newestIssueDate}/`);
assert.equal(latestDoc.rss, 'https://viruspc.github.io/edges-brain-viruspc/ai-news/rss.xml');
assert.equal(latestDoc.date, newestIssueDate);
assert.ok(Array.isArray(latestDoc.overview) && latestDoc.overview.length > 0, 'latest.json is missing the overview');
assert.equal(typeof latestDoc.overview[0].text, 'string');
assert.ok(latestDoc.overview[0].text.length > 0);
const firstFeedTitle = aiFeed.match(/<item>[\s\S]*?<title>([^<]+)<\/title>/);
assert.equal(firstFeedTitle?.[1], latestDoc.title, 'RSS and latest.json disagree on the newest issue');
const overviewPath = path.join(
  process.env.AI_NEWS_DATA_ROOT || path.join(siteRoot, '.cache/ai-news-data'),
  'issues',
  newestIssueDate,
  'summary',
  'overview.json',
);
const newestOverview = JSON.parse(fs.readFileSync(overviewPath, 'utf8'));
const leadText = newestOverview.themes.find((theme) => typeof theme?.text === 'string' && theme.text.trim()).text.trim();
assert.equal(latestDoc.overview[0].text, leadText);
for (const link of latestDoc.overview[0].links || []) {
  assert.ok(link.url.startsWith(`${latestDoc.url}#entry-`), link.url);
}

function assertSubscribeEntry(html, label) {
  const proseAt = html.indexOf('<div class="prose">');
  const head = html.slice(0, proseAt);
  assert.match(head, /复制订阅提示词/, `${label} button`);
  assert.match(head, /class="sub-help" href="\/edges-brain-viruspc\/ai-news\/subscribe\/">说明<\/a>/, `${label} help link`);
  assert.ok(head.includes(subscribePrompt), `${label} prompt`);
  assert.doesNotMatch(html.slice(proseAt), /sub-copy|复制订阅提示词/, `${label} body stays free of the button`);
  const top = html.match(/<header class="top">[\s\S]*?<\/header>/);
  assert.doesNotMatch(top[0], /sub-copy|复制订阅提示词/, `${label} top bar`);
}

assert.match(aiNewsList, /class="ai-news-cadence"[\s\S]*class="sub-row"[\s\S]*class="issue-list"|class="empty"/);
const listHead = aiNewsList.slice(0, aiNewsList.indexOf('<ol class="issue-list">') === -1 ? aiNewsList.indexOf('class="empty"') : aiNewsList.indexOf('<ol class="issue-list">'));
assert.ok(listHead.includes('每周五上午 9 点开始生成（北京时间）'));
assert.ok(listHead.indexOf('每周五上午 9 点开始生成（北京时间）') < listHead.indexOf('class="sub-row"'));
assert.ok(listHead.includes(subscribePrompt));
assert.match(aiNewsList, /<a class="sub-help" href="\/edges-brain-viruspc\/ai-news\/subscribe\/">说明<\/a>/);
assert.doesNotMatch(aiNewsList.match(/<header class="top">[\s\S]*?<\/header>/)[0], /sub-copy/);
for (const rel of issuePages) {
  assertSubscribeEntry(fs.readFileSync(path.join(dist, rel), 'utf8'), rel);
}
const guide = fs.readFileSync(path.join(dist, 'ai-news/subscribe/index.html'), 'utf8');
assert.match(guide, /<h1>订阅 AI 资讯<\/h1>/);
assert.match(guide, /class="post-kicker"[\s\S]*href="\/edges-brain-viruspc\/ai-news\/"/);
assert.match(guide, /https:\/\/viruspc\.github\.io\/edges-brain-viruspc\/ai-news\/latest\.json/);
assert.match(guide, /北京时间（Asia\/Shanghai）10:00/);
assert.match(guide, /周五 21:00/);
assert.match(guide, /周六 21:00/);
assert.match(guide, /记住上次推过的期/);
assert.match(guide, /本周概览的文字，加当期页链接/);
assert.match(guide, /不发“今天没有更新”/);
assert.match(guide, /也可以让它按关键词筛选；第一版默认推送整期。/);
assert.match(guide, /不用 Agent，也可以用 <a href="\/edges-brain-viruspc\/ai-news\/rss\.xml">RSS<\/a> 订阅。/);
assert.ok(guide.includes(leadText), 'subscribe sample is not the latest overview');
assert.match(guide, new RegExp(`href="https://viruspc\\.github\\.io/edges-brain-viruspc/ai-news/${newestIssueDate}/"`));
assert.doesNotMatch(guide, /class="sub-help"/);
assert.doesNotMatch(guide, /data-reader-comments|class="toc"|nav class="toc"/);
assert.ok(guide.includes(subscribePrompt));
for (const rel of ['index.html', 'about/index.html', 'posts/index.html']) {
  assert.equal(fs.readFileSync(path.join(dist, rel), 'utf8').includes('复制订阅提示词'), false, rel);
}

assert.match(home, /href="\/edges-brain-viruspc\/ai-news\/"/);
assert.doesNotMatch(home, /ai-news\/2026-/);
assert.equal(rels.includes('archive/index.html'), false);
const archiveHref = /\/edges-brain-viruspc\/archive\/?/;
for (const rel of rels.filter((item) => item.endsWith('.html') || item.endsWith('.xml'))) {
  assert.doesNotMatch(
    fs.readFileSync(path.join(dist, rel), 'utf8'),
    archiveHref,
    `${rel} still links to /archive`,
  );
}

const about = fs.readFileSync(path.join(dist, 'about/index.html'), 'utf8');
assert.match(about, /亲手修订后发表的成稿/);

function chapterToc(html) {
  return html.match(/<nav class="toc"[\s\S]*?<\/nav>/);
}

const detailPages = rels.filter((rel) => {
  if (!rel.endsWith('/index.html')) return false;
  if (projectBrowserRels.has(rel)) return false;
  if (rel === 'ai-news/subscribe/index.html') return false;
  const [section, ...rest] = rel.split('/');
  if (!['posts', 'notes', 'projects', 'ai-news'].includes(section)) return false;
  return rest.join('/') !== 'index.html';
});
assert.ok(detailPages.some((rel) => rel.startsWith('notes/')));
assert.ok(detailPages.some((rel) => rel.startsWith('projects/')));
assert.ok(detailPages.some((rel) => rel.startsWith('ai-news/')));
for (const rel of detailPages) {
  const html = fs.readFileSync(path.join(dist, rel), 'utf8');
  const nav = chapterToc(html);
  assert.ok(nav, `${rel} is missing the chapter toc`);
  assert.match(html, /class="post has-toc"/, `${rel} article layout`);
  for (const href of nav[0].matchAll(/href="#([^"]*)"/g)) {
    let id = href[1];
    try {
      id = decodeURIComponent(id);
    } catch {
      /* keep the raw fragment */
    }
    assert.ok(id, `${rel} toc link is missing a fragment`);
    assert.ok(
      html.includes(`id="${id}"`) || html.includes(`id="${href[1]}"`),
      `${rel} toc target #${id} is missing`,
    );
  }
}

const dshProject = fs.readFileSync(path.join(dist, 'projects/2026-11-09--dsh/index.html'), 'utf8');
assert.match(dshProject, /data-project-browser/);
assert.match(dshProject, /项目说明/);
assert.equal(chapterToc(dshProject), null, 'project browser is not an article toc');
for (const heading of ['课程', '笔记', '相关']) {
  assert.match(dshProject, new RegExp(heading));
}
for (const rel of projectBrowserRels) {
  const html = fs.readFileSync(path.join(dist, rel), 'utf8');
  assert.equal(chapterToc(html), null, `${rel} project browser has a chapter toc`);
  assert.doesNotMatch(html, /data-reader-comments/, `${rel} project browser is not an article`);
}

for (const rel of [
  'index.html',
  'posts/index.html',
  'notes/index.html',
  'projects/index.html',
  'ai-news/index.html',
  'ai-news/subscribe/index.html',
  'about/index.html',
]) {
  assert.equal(chapterToc(fs.readFileSync(path.join(dist, rel), 'utf8')), null, `${rel} has a chapter toc`);
}

const githubLink = /<footer class="colophon">[\s\S]*?<a href="https:\/\/github\.com\/VirusPC\/edges-brain-viruspc" rel="me noopener">GitHub<\/a>/;
const navOrder = ['Posts', 'Notes', 'Projects', 'Teaching', 'AI News', 'About'];
let layoutPages = 0;
for (const rel of rels.filter((item) => item.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(dist, rel), 'utf8');
  assert.match(html, githubLink, `${rel} is missing the GitHub repository link`);
  const nav = html.match(/<nav class="nav"[\s\S]*?<\/nav>/);
  if (!nav) continue;
  layoutPages += 1;
  const items = [...nav[0].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    attrs: match[1],
    label: match[2].replace(/\s+/g, ' ').trim(),
  }));
  assert.deepEqual(
    items.map((item) => item.label),
    navOrder,
    `${rel} nav order`,
  );
  const teaching = items[navOrder.indexOf('Teaching')];
  assert.match(teaching.attrs, /href="\/edges-brain-viruspc\/teaching\/"/, `${rel} Teaching href`);
  assert.doesNotMatch(teaching.attrs, /noopener/, `${rel} Teaching stays on this site`);
  const onTeaching = rel === 'teaching/index.html' || rel.startsWith('teaching/');
  if (onTeaching) assert.match(teaching.attrs, /aria-current="page"/, `${rel} Teaching current`);
  else assert.doesNotMatch(teaching.attrs, /is-current|aria-current/, `${rel} Teaching must not be current`);
}
assert.ok(layoutPages > 0, 'expected BaseLayout pages with a section nav');

exists('teaching/index.html');
exists('teaching/agent-evals/index.html');
exists('teaching/agent-evals/lesson-02/index.html');
exists('teaching/agent-evals/lessons/0002-three-grader-types/index.html');
exists('teaching/changelog/index.html');
exists('teaching/link-external-repo/index.html');
exists('teaching/obsidian-cli/index.html');
exists('teaching/dsh-coding-agent-course/lessons/0002-agent-and-driver/index.html');
exists('teaching/materials/index.html');
const teachingHome = fs.readFileSync(path.join(dist, 'teaching/index.html'), 'utf8');
assert.match(teachingHome, /agent-evals/);
assert.match(teachingHome, /dsh-coding-agent-course/);
assert.doesNotMatch(teachingHome, /完成率|progressbar|aria-valuenow/);
const lessonTwo = fs.readFileSync(path.join(dist, 'teaching/agent-evals/lesson-02/index.html'), 'utf8');
const lessonBody = lessonTwo.split('<div class="lesson"')[1] || '';
assert.match(lessonTwo, /优先写确定性代码检查条件/);
assert.match(lessonBody, /data-choice="B"/);
assert.match(lessonBody, /function grade/);
assert.doesNotMatch(lessonBody, /<style|rel="stylesheet"|--accent:\s*#9a3412|filter:\s*invert/);
assert.doesNotMatch(lessonTwo, /data-reader-comments/);
const parallel = fs.readFileSync(path.join(dist, 'teaching/agent-evals/lessons/0002-three-grader-types/index.html'), 'utf8');
assert.match(parallel, /\/edges-brain-viruspc\/teaching\/agent-evals\/lesson-0[13]\//);
const dshForm = fs.readFileSync(path.join(dist, 'teaching/dsh-coding-agent-course/lessons/0002-agent-and-driver/index.html'), 'utf8');
assert.match(dshForm, /检查判断题/);
assert.match(dshForm, /导出作答 Markdown/);
assert.match(dshForm, /id="check"/);
assert.match(dshForm, /id="export"/);
const thin = fs.readFileSync(path.join(dist, 'teaching/changelog/index.html'), 'utf8');
assert.match(thin, /changelog/);
assert.doesNotMatch(thin, /占位课|假课/);

assert.equal(giscusReady(), true, 'giscus category id is filled in');
const feedbackButton = /<a class="site-feedback" data-feedback-link href="https:\/\/github\.com\/VirusPC\/edges-brain-viruspc\/issues\/new\?template=reader-feedback\.yml" target="_blank" rel="noopener noreferrer">/;
const distFiles = rels.map((rel) => fs.readFileSync(path.join(dist, rel), 'utf8'));
assert.ok(distFiles.some((file) => file.includes('DIC_kwDOQzfxSc4DLqmP')), 'built site is missing the Comments category id');
for (const rel of rels.filter((item) => item.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(dist, rel), 'utf8');
  assert.equal(html.match(/class="site-feedback"/g)?.length ?? 0, 1, `${rel} feedback button count`);
  assert.match(html, feedbackButton, `${rel} feedback link`);
  assert.doesNotMatch(html, /src="https:\/\/giscus\.app\/client\.js"/, `${rel} loads giscus before the comments are near the screen`);
  assert.doesNotMatch(html, /尚未启用 GitHub Discussions/, `${rel} still says Discussions are off`);
}
for (const rel of detailPages) {
  const html = fs.readFileSync(path.join(dist, rel), 'utf8');
  assert.match(html, /data-reader-comments/, `${rel} comments`);
  assert.match(html, /data-giscus/, `${rel} giscus slot`);
  assert.match(html, /留言使用 GitHub 账号/, `${rel} login note`);
}
for (const rel of ['index.html', 'posts/index.html', 'notes/index.html', 'projects/index.html', 'ai-news/index.html', 'ai-news/subscribe/index.html', 'about/index.html']) {
  const html = fs.readFileSync(path.join(dist, rel), 'utf8');
  assert.doesNotMatch(html, /data-reader-comments/, `${rel} is not an article`);
}

for (const rel of issuePages) {
  const issueDate = rel.slice('ai-news/'.length, 'ai-news/'.length + 10);
  const html = fs.readFileSync(path.join(dist, rel), 'utf8');
  assertSwitchableCharts(html, issueDate);
}

console.log(
  `site dist ok: ${expectedNotes.length} notes, fixture ${fixtureOn ? 'on' : 'off'}, ${rels.length} files`,
);
