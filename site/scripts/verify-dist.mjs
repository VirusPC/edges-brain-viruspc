import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
exists('archive/index.html');
exists('about/index.html');
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

const about = fs.readFileSync(path.join(dist, 'about/index.html'), 'utf8');
assert.match(about, /亲手修订后发表的成稿/);

console.log(
  `site dist ok: ${expectedNotes.length} notes, fixture ${fixtureOn ? 'on' : 'off'}, ${rels.length} files`,
);
