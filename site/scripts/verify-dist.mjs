import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAiNewsFiles } from '../src/lib/ai-news.mjs';
import { FIXTURE_ID, listDatedNoteDirs } from '../src/lib/select.mjs';
import { listProjectDocuments } from '../src/lib/projects.mjs';

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

function chartSpecs(html) {
  return [...html.matchAll(/<pre\b[^>]*\bmodel-chart-spec\b[^>]*>([\s\S]*?)<\/pre>/g)].map((match) =>
    JSON.parse(decodeHtml(match[1])),
  );
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

const projectPage = fs.readFileSync(path.join(dist, 'projects/index.html'), 'utf8');
assert.match(projectPage, /class="post-list"/);
assert.match(projectPage, /class="archive-year"/);
assert.match(projectPage, /prompt-caching/);
assert.match(projectPage, /github\.com\/VirusPC\/edges-brain-viruspc\/blob\/main\/projects\/memory\//);
assert.doesNotMatch(projectPage, /class="dash"|entry-list|note-kicker/);

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
assert.equal(
  projectDetails.length,
  markdownDocs.length,
  `project pages ${projectDetails.length} != markdown documents ${markdownDocs.length}`,
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

const aiNewsFiles = listAiNewsFiles(path.join(repoRoot, 'ai-news'));
const issuePages = rels.filter((rel) => /^ai-news\/\d{4}-\d{2}-\d{2}\/index\.html$/.test(rel));
assert.equal(
  issuePages.length,
  aiNewsFiles.length,
  `ai-news pages ${issuePages.length} != digest files ${aiNewsFiles.length}`,
);
assert.equal(rels.includes('ai-news/README/index.html'), false);

const aiNewsList = fs.readFileSync(path.join(dist, 'ai-news/index.html'), 'utf8');
assert.match(aiNewsList, /<h1>AI News<\/h1>/);
assert.match(aiNewsList, /href="\/edges-brain-viruspc\/ai-news\/"[^>]*aria-current="page"/);
assert.match(aiNewsList, /href="\/edges-brain-viruspc\/ai-news\/2026-11-06\/"/);
assert.match(aiNewsList, /2026-10-30～11-05/);
assert.match(aiNewsList, /交付闭环：OpenAI 收购 Pierre，Amp 接入 GitLab/);
assert.match(aiNewsList, /2026-10-23 AI 资讯/);
assert.match(aiNewsList, /MiniMax M3\.1 Flash，DeepSeek V4\.1 Flash/);
assert.match(aiNewsList, /href="\/edges-brain-viruspc\/ai-news\/rss\.xml"/);
assert.doesNotMatch(aiNewsList, /class="tag">旧版/);

const latestIssue = fs.readFileSync(path.join(dist, 'ai-news/2026-11-06/index.html'), 'utf8');
assert.match(latestIssue, /<h1>\s*2026-11-06 AI 资讯\s*<\/h1>/);
assert.match(latestIssue, /覆盖 2026-10-30～11-05/);
const latestToc = latestIssue.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(latestToc, 'latest issue is missing the chapter toc');
for (const heading of ['〇、薅羊毛', '一、本周关键词', '二、模型进展', '三、项目开源', '四、精选文章', '国内', '国际']) {
  assert.match(latestToc[0], new RegExp(heading));
}
assert.doesNotMatch(latestToc[0], /SWE-2 Flash|####|is-current|&lt;|&#x3C;|data-cat/);
assert.match(latestIssue, /IntersectionObserver/);
assert.match(latestIssue, /is-current/);
const plainNote = fs.readFileSync(path.join(dist, 'notes/2026-10-29--open-grokbot-全程坑点/index.html'), 'utf8');
assert.match(plainNote, /IntersectionObserver/);
assert.doesNotMatch(aiNewsList, /IntersectionObserver/);
assert.match(latestIssue, /aria-current="page"[^>]*>\s*AI News\s*</);
assert.match(latestIssue, /较上周无新榜/);
assert.match(latestIssue, /alt="LLM Arena Top15 2026-10-28"/);
assert.doesNotMatch(latestIssue, /llm-arena-top15-2026-11-06/);
assert.doesNotMatch(latestIssue, /ai-news\.notes/);
assert.doesNotMatch(aiNewsList, /ai-news\.notes/);
assert.equal(
  rels.some((rel) => rel.includes('.notes')),
  false,
  'notes sidecars are not site pages',
);
const arenaSrc = latestIssue.match(/<img[^>]*alt="LLM Arena Top15 2026-10-28"[^>]*src="([^"]+)"/)
  ?? latestIssue.match(/<img[^>]*src="([^"]+)"[^>]*alt="LLM Arena Top15 2026-10-28"/);
assert.ok(arenaSrc, 'latest issue is missing the arena image');
const arenaRel = arenaSrc[1].replace(/^\/edges-brain-viruspc\//, '').split('?')[0];
exists(arenaRel);
assert.match(latestIssue, /alt="交付闭环：OpenAI 收购 Pierre，Amp 接入 GitLab"/);
const cloudSrc = latestIssue.match(/<img[^>]*alt="交付闭环：OpenAI 收购 Pierre，Amp 接入 GitLab"[^>]*src="([^"]+)"/)
  ?? latestIssue.match(/<img[^>]*src="([^"]+)"[^>]*alt="交付闭环：OpenAI 收购 Pierre，Amp 接入 GitLab"/);
assert.ok(cloudSrc, 'latest issue is missing the keyword cloud');
const cloudRel = cloudSrc[1].replace(/^\/edges-brain-viruspc\//, '').split('?')[0];
assert.match(cloudRel, /keywords-cloud-2026-11-06/);
exists(cloudRel);
assert.match(latestIssue, /href="https:\/\/kiroween\.devpost\.com"/);
assert.match(latestIssue, /href="https:\/\/linux\.do\/t\/topic\/3101137"/);
assert.doesNotMatch(latestIssue, /<h4[^>]*>\s*整体排名\s*<\/h4>/);
assert.match(latestIssue, /data-model-board/);
assert.deepEqual(optionLabels(latestIssue), ['LLM Arena']);
assert.equal(chartSpecs(latestIssue).length, 0);
assert.doesNotMatch(latestIssue, /原始链接/);
assertCategoryPills(latestIssue, [
  ['交付闭环', 'OpenAI 收购 Pierre'],
  ['代码评审', 'Devin Review 2.0'],
], []);

const newestIssue = fs.readFileSync(path.join(dist, 'ai-news/2026-11-13/index.html'), 'utf8');
assert.match(newestIssue, /<h1>\s*2026-11-13 AI 资讯\s*<\/h1>/);
assert.match(newestIssue, /覆盖窗口：2026-11-06～2026-11-12（生成日 2026-11-13）。/);
assert.doesNotMatch(newestIssue, /北京时间/);
const newestToc = newestIssue.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(newestToc, '2026-11-13 is missing the chapter toc');
assert.match(newestToc[0], /四、精选文章/);
assert.match(newestToc[0], />国内</);
assert.match(newestToc[0], />国际</);
assert.doesNotMatch(newestToc[0], /国内进展|国际进展/);
assert.match(newestToc[0], /二、模型进展/);
assert.match(newestToc[0], /模型发布/);
assert.doesNotMatch(newestToc[0], /LLM Arena|Artificial Analysis|OpenRouter/);
assert.doesNotMatch(newestToc[0], /&lt;|&#x3C;|data-cat/);
const platformOrder = [...newestIssue.matchAll(/<h3\b[^>]*>([^<]*)<\/h3>/g)]
  .map((match) => match[1].replace(/\s+/g, ' ').trim())
  .filter((text) => ['LLM Arena', 'Artificial Analysis', 'OpenRouter', '模型发布'].includes(text));
assert.deepEqual(platformOrder, ['模型发布']);
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
assert.ok(newestSpecs[1].items.some((item) => item.name === 'Gemini 4 Hydrogen (High)' && item.highlight));
assert.equal(newestSpecs[1].publishDate, '2026-11-11');
assert.ok(newestSpecs[0].items.some((item) => item.highlight && item.name.includes('Claude Fable 5.2')));
assert.equal(newestSpecs[2].scaleZero, true);
assert.match(newestSpecs[2].items[0].valueText, / T$/);
assert.equal(newestSpecs[2].items[0].name.includes('/'), false);
assert.match(newestSpecs[2].items[0].name, /\s|[A-Z]/);
const modelProgress = newestIssue.split(/<h2\b[^>]*>\s*二、模型进展\s*<\/h2>/)[1]?.split(/<h2\b/)[0] ?? '';
assert.doesNotMatch(
  modelProgress.split(/<h3\b[^>]*>\s*模型发布\s*<\/h3>/)[0],
  /<h4\b/,
  '2026-11-13 rankings have no h4 before 模型发布',
);
assertCategoryPills(newestIssue, [
  ['研发提效', '授人以鱼不如授人以渔：我对企业级 AI 研发提效的思考与实践'],
  ['Harness', '研发Loop的上下文优化与多Agent协作实践'],
], [
  /<h3\b[^>]*>\s*模型发布\s*<\/h3>/,
]);
for (const alt of [
  'OpenRouter 本周用量 Top 15，2026-11-13',
  'OpenRouter 编程用量 Top 15，2026-11-13',
  'OpenRouter 应用用量 Top 15，2026-11-13',
]) {
  const pattern = alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const src = newestIssue.match(new RegExp(`<img[^>]*alt="${pattern}"[^>]*src="([^"]+)"`))
    ?? newestIssue.match(new RegExp(`<img[^>]*src="([^"]+)"[^>]*alt="${pattern}"`));
  assert.ok(src, `2026-11-13 is missing ${alt}`);
  exists(src[1].replace(/^\/edges-brain-viruspc\//, '').split('?')[0]);
}

const backfillIssue = fs.readFileSync(path.join(dist, 'ai-news/2026-10-23/index.html'), 'utf8');
assert.match(backfillIssue, /<h1>\s*2026-10-23 AI 资讯\s*<\/h1>/);
assert.doesNotMatch(backfillIssue, /旧版/);
assert.match(backfillIssue, /覆盖 2026-10-16～10-22/);
assert.match(backfillIssue, /一、本周关键词/);
assert.doesNotMatch(backfillIssue, /文章总结列表/);
const backfillToc = backfillIssue.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(backfillToc, '2026-10-23 is missing the chapter toc');
assert.match(backfillToc[0], /二、模型进展/);
assert.match(backfillIssue, /alt="LLM Arena Top15 2026-10-22"/);
assert.deepEqual(optionLabels(backfillIssue), ['LLM Arena']);
assert.equal(chartSpecs(backfillIssue).length, 0);

const issue20 = fs.readFileSync(path.join(dist, 'ai-news/2026-11-20/index.html'), 'utf8');
assert.match(issue20, /<h1>\s*2026-11-20 AI 资讯\s*<\/h1>/);
assert.match(issue20, /覆盖窗口：2026-11-13 08:00:00 至 2026-11-20 07:59:59（北京时间；生成日 2026-11-20）。/);
assert.doesNotMatch(issue20, /2026-11-13 00:00:00 至 2026-11-19 23:59:59（UTC/);
assert.deepEqual(optionLabels(issue20), [
  'Artificial Analysis',
  'LLM Arena',
  'OpenRouter 本周用量',
  'OpenRouter 编程用量',
  'OpenRouter 应用用量',
]);
assert.equal(firstPanelKind(issue20), 'aa');
const specs20 = chartSpecs(issue20);
assert.deepEqual(specs20.map((spec) => spec.kind), [
  'aa',
  'llm-arena',
  'openrouter-usage',
  'openrouter-programming',
  'openrouter-apps',
]);
assert.ok(specs20[1].items.some((item) => item.name === 'Gemini 4 Neon (High)' && item.highlight));
assert.equal(specs20[1].publishDate, '2026-11-18');
assert.ok(specs20[0].items.some((item) => item.highlight));
assert.equal(specs20[2].items.some((item) => item.name === 'Hy4 flash' && item.highlight), true);
assert.equal(specs20[2].items[0].name.includes('/'), false);
assert.match(issue20, /alt="LLM Arena Top 15，2026-11-18"/);
assert.match(issue20, /这张智力指数前 15 里，本周新发布的是 GPT-6\.2 Astra、Gemini 4 Neon 和 GPT-6\.2 Sol。/);
assert.match(issue20, /Gemini 4 Neon \(High\) 新进第 3。/);
assert.match(issue20, /Hy4 flash 这周用量排到第 1/);
assert.match(issue20, /Inkling 2 Small \(free\) 和 MiMo-V2\.6-Flash 新进前 15/);
assert.match(issue20, /公开应用用量的前四仍是 Hermes Agent、Claude Code、Kilo Code 和 pi。/);
assert.doesNotMatch(issue20, /数据取自/);
assert.doesNotMatch(issue20, /抓取于/);
assert.doesNotMatch(issue20, /快照/);
assert.doesNotMatch(issue20, /chart-meta/);
assert.doesNotMatch(issue20, /红圈：/);
assert.doesNotMatch(issue20, /榜单发布日/);
assert.match(issue20, /<h3\b[^>]*>\s*模型发布\s*<\/h3>/);
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
assert.doesNotMatch(newestIssue, /class="model-facts"/);
const toc20 = issue20.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(toc20, '2026-11-20 is missing the chapter toc');
assert.doesNotMatch(issue20, /薅羊毛/);
assert.doesNotMatch(toc20[0], /薅羊毛/);
for (const heading of ['一、本周关键词', '二、模型进展', '三、项目开源', '四、精选文章']) {
  assert.match(toc20[0], new RegExp(heading));
}
assert.match(toc20[0], />国内</);
assert.match(toc20[0], />国际</);
const headingAt20 = [...issue20.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>/g)];
const projectAt20 = headingAt20.find((match) => match[0].includes('三、项目开源'))?.index ?? -1;
const selectedAt20 = headingAt20.find((match) => match[0].includes('四、精选文章'))?.index ?? -1;
assert.ok(projectAt20 > 0 && selectedAt20 > projectAt20, '2026-11-20 chapter headings are out of order');
const projectHtml20 = issue20.slice(projectAt20, selectedAt20);
const selectedHtml20 = issue20.slice(selectedAt20);
const projectFolded20 = [...projectHtml20.matchAll(/<details class="article-more">([\s\S]*?)<\/details>/g)];
const selectedFolded20 = [...selectedHtml20.matchAll(/<details class="article-more">([\s\S]*?)<\/details>/g)];
assert.equal(projectFolded20.length, 5);
assert.equal(selectedFolded20.length, 31);
for (const block of projectFolded20) {
  assert.match(block[1], /<summary>完整总结<\/summary>/);
  for (const label of ['在解决什么问题：', '怎么解决：', '效果怎样：']) {
    assert.match(block[1], new RegExp(`<strong>${label}</strong>`));
  }
  assert.doesNotMatch(block[1], /后续可以怎么做|相关进展：|与其他进展的关联|和最近的进展/);
}
for (const block of selectedFolded20) {
  assert.match(block[1], /<summary>完整总结<\/summary>/);
  for (const label of ['在解决什么问题：', '怎么解决：', '效果怎样：', '后续可以怎么做：', '相关进展：']) {
    assert.match(block[1], new RegExp(`<strong>${label}</strong>`));
  }
  assert.doesNotMatch(block[1], /和最近的进展|与其他进展的关联|微信原文这次没打开|这次没打开原文/);
}
assert.equal((projectHtml20.match(/class="article-card"/g) || []).length, 5);
assert.equal((selectedHtml20.match(/class="article-card"/g) || []).length, 34);
assert.match(projectHtml20, /GitHub Trending（weekly \/ all 前 5）/);
assert.doesNotMatch(projectHtml20.slice(0, projectHtml20.indexOf('GitHub Trending')), /article-card/);
assert.doesNotMatch(projectHtml20, /data-cat=/);
assert.match(selectedHtml20, /data-cat="开源"/);
assert.match(selectedHtml20, /llama\.cpp v1\.0\.0/);
assert.equal((issue20.match(/订阅源里只有这些/g) || []).length, 3);
assert.equal((issue20.match(/微信原文这次没打开|这次没打开原文/g) || []).length, 0);
const selectedHeadings20 = issue20.match(/<h4\b[^>]*>[\s\S]*?<\/h4>/g) || [];
for (const [cat, tag, title] of [
  ['开源', '腾讯', 'LoopForge'],
  ['Agent 与 Harness', '腾讯', 'Octop'],
  ['Agent 与 Harness', '腾讯', 'Ontology'],
]) {
  assert.ok(
    selectedHeadings20.some((heading) => heading.includes(`data-cat="${cat}"`)
      && heading.includes(`data-tags="${tag}"`)
      && heading.includes(title)),
    title,
  );
}
assert.doesNotMatch(toc20[0], /LLM Arena/);
const arena20 = issue20.match(/<img[^>]*alt="LLM Arena Top 15，2026-11-18"[^>]*src="([^"]+)"/)
  ?? issue20.match(/<img[^>]*src="([^"]+)"[^>]*alt="LLM Arena Top 15，2026-11-18"/);
assert.ok(arena20, '2026-11-20 is missing the arena image');
exists(arena20[1].replace(/^\/edges-brain-viruspc\//, '').split('?')[0]);

const aiFeed = fs.readFileSync(path.join(dist, 'ai-news/rss.xml'), 'utf8');
assert.match(aiFeed, /<title>AI 资讯<\/title>/);
assert.match(aiFeed, /<title>2026-11-06 AI 资讯<\/title>/);
assert.match(aiFeed, /<title>2026-10-30 AI 资讯<\/title>/);
assert.match(aiFeed, /edges-brain-viruspc\/ai-news\/2026-11-06\//);
assert.match(aiFeed, /<title>2026-11-13 AI 资讯<\/title>/);
assert.match(aiFeed, /<title>2026-11-20 AI 资讯<\/title>/);
assert.doesNotMatch(aiFeed, /data-cat|&lt;研发提效&gt;|&lt;交付闭环&gt;/);
assert.equal((aiFeed.match(/<item>/g) || []).length, aiNewsFiles.length);

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

const projectToc = chapterToc(
  fs.readFileSync(path.join(dist, 'projects/2026-11-09--dsh/index.html'), 'utf8'),
);
assert.ok(projectToc, 'project detail is missing the chapter toc');
for (const heading of ['课程', '笔记', '相关']) {
  assert.match(projectToc[0], new RegExp(heading));
}

for (const rel of [
  'index.html',
  'posts/index.html',
  'notes/index.html',
  'projects/index.html',
  'ai-news/index.html',
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
  assert.match(teaching.attrs, /href="https:\/\/edges\.viruspc\.tech\/teaching\/"/, `${rel} Teaching href`);
  assert.match(teaching.attrs, /\brel="noopener"/, `${rel} Teaching rel`);
  assert.doesNotMatch(teaching.attrs, /is-current|aria-current/, `${rel} Teaching must not be current`);
}
assert.ok(layoutPages > 0, 'expected BaseLayout pages with a section nav');

console.log(
  `site dist ok: ${expectedNotes.length} notes, fixture ${fixtureOn ? 'on' : 'off'}, ${rels.length} files`,
);
