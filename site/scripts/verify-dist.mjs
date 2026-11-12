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
assert.match(home, />open-grokbot 全程坑点</);
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

const sampleNote = noteDetails[0];
assert.ok(sampleNote, 'expected at least one note detail');
const noteDetail = fs.readFileSync(path.join(dist, sampleNote), 'utf8');
assert.match(noteDetail, /class="post-head"/);
assert.match(noteDetail, /class="post-kicker"/);
assert.match(noteDetail, /class="post"/);
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
assert.match(aiNewsList, /2026-10-23 AI Coding 资讯/);
assert.match(aiNewsList, /MiniMax M3\.1 Flash，DeepSeek V4\.1 Flash/);
assert.match(aiNewsList, /href="\/edges-brain-viruspc\/ai-news\/rss\.xml"/);
assert.doesNotMatch(aiNewsList, /class="tag">旧版/);

const latestIssue = fs.readFileSync(path.join(dist, 'ai-news/2026-11-06/index.html'), 'utf8');
assert.match(latestIssue, /<h1>\s*2026-11-06 AI Coding 资讯\s*<\/h1>/);
assert.match(latestIssue, /覆盖 2026-10-30～11-05/);
const latestToc = latestIssue.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(latestToc, 'latest issue is missing the chapter toc');
for (const heading of ['〇、薅羊毛', '一、本周关键词', '二、模型进展', '三、项目开源', '四、国内进展', '五、国际进展']) {
  assert.match(latestToc[0], new RegExp(heading));
}
assert.doesNotMatch(latestToc[0], /SWE-2 Flash|####|is-current/);
assert.match(latestIssue, /IntersectionObserver/);
assert.match(latestIssue, /is-current/);
const plainNote = fs.readFileSync(path.join(dist, 'notes/2026-10-29--open-grokbot-全程坑点/index.html'), 'utf8');
assert.doesNotMatch(plainNote, /IntersectionObserver/);
assert.doesNotMatch(aiNewsList, /IntersectionObserver/);
assert.match(latestIssue, /aria-current="page"[^>]*>\s*AI News\s*</);
assert.match(latestIssue, /较上周无新榜/);
assert.match(latestIssue, /alt="LLM Arena Top15 2026-10-28"/);
assert.doesNotMatch(latestIssue, /llm-arena-top15-2026-11-06/);
assert.doesNotMatch(latestIssue, /ai-coding-news\.notes/);
assert.doesNotMatch(aiNewsList, /ai-coding-news\.notes/);
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
assert.match(latestIssue, /<h4[^>]*>\s*整体排名\s*<\/h4>/);
assert.doesNotMatch(latestIssue, /原始链接/);

const backfillIssue = fs.readFileSync(path.join(dist, 'ai-news/2026-10-23/index.html'), 'utf8');
assert.match(backfillIssue, /<h1>\s*2026-10-23 AI Coding 资讯\s*<\/h1>/);
assert.doesNotMatch(backfillIssue, /旧版/);
assert.match(backfillIssue, /覆盖 2026-10-16～10-22/);
assert.match(backfillIssue, /一、本周关键词/);
assert.doesNotMatch(backfillIssue, /文章总结列表/);
const backfillToc = backfillIssue.match(/<nav class="toc"[\s\S]*?<\/nav>/);
assert.ok(backfillToc, '2026-10-23 is missing the chapter toc');
assert.match(backfillToc[0], /二、模型进展/);
assert.match(backfillIssue, /alt="LLM Arena Top15 2026-10-22"/);

const aiFeed = fs.readFileSync(path.join(dist, 'ai-news/rss.xml'), 'utf8');
assert.match(aiFeed, /<title>AI Coding 资讯<\/title>/);
assert.match(aiFeed, /<title>2026-11-06 AI Coding 资讯<\/title>/);
assert.match(aiFeed, /<title>2026-10-30 AI Coding 资讯<\/title>/);
assert.match(aiFeed, /edges-brain-viruspc\/ai-news\/2026-11-06\//);
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

console.log(
  `site dist ok: ${expectedNotes.length} notes, fixture ${fixtureOn ? 'on' : 'off'}, ${rels.length} files`,
);
