import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { listProjectFolders, sortProjects, titleForProject } from '../src/lib/projects.mjs';

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
