import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  dateForProjectDocument,
  dateForProjectRow,
  listProjectDocuments,
  listProjectFolders,
  routeIdFor,
  sortProjectDocuments,
  sortProjects,
  titleForProject,
} from '../src/lib/projects.mjs';

test('lists top-level dirs, prefers INDEX.md, and skips the projects readme', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'projects-'));
  fs.writeFileSync(path.join(root, 'README.md'), '# Projects\n');
  fs.mkdirSync(path.join(root, '.hidden'));
  fs.mkdirSync(path.join(root, 'memory'));
  fs.mkdirSync(path.join(root, 'agent-infra'));
  fs.writeFileSync(path.join(root, 'agent-infra', 'README.md'), '# agent-infra\n');
  fs.mkdirSync(path.join(root, '2026-10-31--snapshot'));
  fs.writeFileSync(path.join(root, '2026-10-31--snapshot', 'INDEX.md'), '# Snapshot\n');
  fs.writeFileSync(path.join(root, '2026-10-31--snapshot', 'README.md'), '# Ignore\n');
  fs.mkdirSync(path.join(root, '2026-10-31--snapshot', 'notes'));
  fs.writeFileSync(path.join(root, '2026-10-31--snapshot', 'notes', 'INDEX.md'), '# Nested\n');

  const listed = listProjectFolders(root);
  assert.deepEqual(
    listed.map((item) => ({ id: item.id, hub: item.hub, dated: item.date instanceof Date })),
    [
      { id: '2026-10-31--snapshot', hub: 'INDEX.md', dated: true },
      { id: 'agent-infra', hub: 'README.md', dated: false },
      { id: 'memory', hub: null, dated: false },
    ],
  );
});

test('titles come from the hub heading, otherwise a readable slug', () => {
  assert.equal(titleForProject('agent-infra', '# agent-infra\n\nbody', ''), 'agent-infra');
  assert.equal(titleForProject('memory', '', ''), 'memory');
  assert.equal(titleForProject('agent-skills-landscape', '', ''), 'agent skills landscape');
  assert.equal(
    titleForProject('2026-10-31--仓库快照', '# 仓库快照下的评测\n', ''),
    '仓库快照下的评测',
  );
  assert.equal(titleForProject('2026-10-31--仓库快照', '', ''), '仓库快照');
  assert.equal(titleForProject('muse-gadgets', 'no heading', 'Muse Gadgets'), 'Muse Gadgets');
});

test('nested markdown gets a route, the root hub stays short, and pdfs are not pages', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-docs-'));
  const project = path.join(root, '2026-10-31--snapshot');
  fs.mkdirSync(path.join(project, 'notes', '2026-11-01--topic'), { recursive: true });
  fs.mkdirSync(path.join(project, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(project, 'INDEX.md'), '# Snapshot\n');
  fs.writeFileSync(path.join(project, 'README.md'), '# Also\n');
  fs.writeFileSync(path.join(project, 'notes', '2026-11-01--topic', 'INDEX.md'), '# Topic\n');
  fs.writeFileSync(path.join(project, 'notes', 'extra.md'), '# Extra\n');
  fs.writeFileSync(path.join(project, 'paper.pdf'), 'not really');
  fs.writeFileSync(path.join(project, 'node_modules', 'pkg', 'README.md'), '# Skip\n');

  const docs = listProjectDocuments(root);
  const byRel = Object.fromEntries(docs.map((doc) => [doc.relPosix, doc]));
  assert.equal(byRel['INDEX.md'].routeId, '2026-10-31--snapshot');
  assert.equal(byRel['INDEX.md'].isHub, true);
  assert.equal(byRel['INDEX.md'].kind, 'md');
  assert.equal(byRel['README.md'].routeId, '2026-10-31--snapshot/README');
  assert.equal(byRel['README.md'].isHub, false);
  assert.equal(byRel['notes/2026-11-01--topic/INDEX.md'].routeId, '2026-10-31--snapshot/notes/2026-11-01--topic');
  assert.equal(byRel['notes/extra.md'].collectionId, '2026-10-31--snapshot/notes/extra');
  assert.equal(byRel['paper.pdf'].kind, 'pdf');
  assert.equal(byRel['paper.pdf'].collectionId, '2026-10-31--snapshot/paper.pdf');
  assert.equal(docs.some((doc) => doc.relPosix.includes('node_modules')), false);
  assert.equal(
    dateForProjectDocument('notes/2026-11-01--topic/INDEX.md')?.toISOString().slice(0, 10),
    '2026-11-01',
  );
  assert.equal(routeIdFor('memory', 'LoCoMo.pdf', false), 'memory/LoCoMo');
});

test('hub document stays first inside a project', () => {
  const sorted = sortProjectDocuments([
    { title: 'later', date: new Date('2026-10-01T00:00:00.000Z'), isHub: false },
    { title: 'hub', date: null, isHub: true },
    { title: 'earlier', date: new Date('2026-01-01T00:00:00.000Z'), isHub: false },
  ]);
  assert.deepEqual(
    sorted.map((item) => item.title),
    ['hub', 'later', 'earlier'],
  );
});

test('project row date is the newest document date, else the folder prefix', () => {
  const folder = new Date('2026-09-13T00:00:00.000Z');
  const newerFolder = new Date('2026-11-20T00:00:00.000Z');
  const article = new Date('2026-11-18T00:00:00.000Z');
  const earlier = new Date('2026-11-09T00:00:00.000Z');

  assert.equal(
    dateForProjectRow([null, earlier, article], folder)?.toISOString(),
    article.toISOString(),
  );
  assert.equal(
    dateForProjectRow([earlier], newerFolder)?.toISOString(),
    earlier.toISOString(),
  );
  assert.equal(dateForProjectRow([null, undefined], folder)?.toISOString(), folder.toISOString());
  assert.equal(dateForProjectRow([], null), null);
  assert.equal(dateForProjectRow([new Date(Number.NaN)], null), null);
});

test('a project row uses the newest nested document, not the folder prefix', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-row-date-'));
  const dated = path.join(root, '2026-11-09--dsh');
  fs.mkdirSync(path.join(dated, 'notes', '2026-11-18--topic'), { recursive: true });
  fs.writeFileSync(path.join(dated, 'INDEX.md'), '# dsh\n');
  fs.writeFileSync(path.join(dated, 'notes', '2026-11-18--topic', 'INDEX.md'), '# Topic\n');
  const undatedFolder = path.join(root, 'agent-infra');
  fs.mkdirSync(path.join(undatedFolder, 'notes', '2026-11-17--topic'), { recursive: true });
  fs.writeFileSync(path.join(undatedFolder, 'INDEX.md'), '# Agent\n');
  fs.writeFileSync(path.join(undatedFolder, 'notes', '2026-11-17--topic', 'INDEX.md'), '# Topic\n');
  const folderOnly = path.join(root, '2026-09-09--empty');
  fs.mkdirSync(folderOnly);
  fs.writeFileSync(path.join(folderOnly, 'INDEX.md'), '# Empty\n');
  const neither = path.join(root, 'benchmark');
  fs.mkdirSync(neither);
  fs.writeFileSync(path.join(neither, 'README.md'), '# Benchmark\n');

  const folders = listProjectFolders(root);
  const docs = listProjectDocuments(root);
  const rows = sortProjects(
    folders.map((folder) => ({
      title: folder.id,
      date: dateForProjectRow(
        docs.filter((doc) => doc.projectId === folder.id).map((doc) => doc.date),
        folder.date,
      ),
    })),
  );
  assert.deepEqual(
    rows.map((row) => ({
      title: row.title,
      date: row.date ? row.date.toISOString().slice(0, 10) : null,
    })),
    [
      { title: '2026-11-09--dsh', date: '2026-11-18' },
      { title: 'agent-infra', date: '2026-11-17' },
      { title: '2026-09-09--empty', date: '2026-09-09' },
      { title: 'benchmark', date: null },
    ],
  );
  const hub = docs.find((doc) => doc.projectId === '2026-11-09--dsh' && doc.isHub);
  assert.equal(hub?.date, null);
  assert.equal(
    dateForProjectDocument('notes/2026-11-18--topic/INDEX.md')?.toISOString().slice(0, 10),
    '2026-11-18',
  );
});

test('dated projects sort before undated ones, undated by title', () => {
  const sorted = sortProjects([
    { title: 'routines', date: null },
    { title: 'memory', date: null },
    { title: 'older', date: new Date('2026-01-02T00:00:00.000Z') },
    { title: 'newer', date: new Date('2026-10-31T00:00:00.000Z') },
  ]);
  assert.deepEqual(
    sorted.map((item) => item.title),
    ['newer', 'older', 'memory', 'routines'],
  );
});
