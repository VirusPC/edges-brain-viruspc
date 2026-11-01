import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  dateForProjectDocument,
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
