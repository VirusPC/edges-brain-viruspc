import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildProjectCatalog,
  dateForProjectDocument,
  dateForProjectRow,
  formatProjectMeta,
  listProjectDocuments,
  listProjectFolders,
  projectStats,
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

test('formatProjectMeta keeps direct and total distinct without a bare number', () => {
  assert.equal(
    formatProjectMeta({ childCount: 3, directCount: 3, totalCount: 9 }),
    '3 子项目 · 直属 3 篇 · 共 9 篇',
  );
  assert.equal(
    formatProjectMeta({ childCount: 1, directCount: 0, totalCount: 3 }),
    '1 子项目 · 共 3 篇',
  );
  assert.equal(formatProjectMeta({ childCount: 0, directCount: 2, totalCount: 2 }), '2 篇');
  assert.equal(formatProjectMeta({ childCount: 0, directCount: 0, totalCount: 0 }), '暂无直属内容');
  assert.equal(formatProjectMeta({ childCount: 2, directCount: 1, totalCount: 1 }), '2 子项目 · 直属 1 篇');
});

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

test('nested projects follow P/projects/Q registration and keep flat documents', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nested-projects-'));
  const parent = path.join(root, 'agent');
  write(path.join(parent, 'INDEX.md'), `---
description: 父项目简介。后面还有一句。
---
# Agent

父项目正文，必须保留。

普通链接 [不是子项目](projects/orphan/INDEX.md) 不登记。

<!-- edges-entries-local:start -->
## 本层内容

- [notes](notes/README.md) — 笔记内容叶子的组织清单。
- [projects](projects/README.md) — 子项目组织清单。
<!-- edges-entries-local:end -->
`);
  write(path.join(parent, 'notes/README.md'), '# Notes\n\n组织清单\n');
  write(path.join(parent, 'notes/2026-11-19--direct/INDEX.md'), '# 直属笔记\n');
  write(path.join(parent, 'tasks/README.md'), '# Tasks\n');
  write(path.join(parent, 'tasks/backlog/2026-11-18--job/INDEX.md'), '# 直属任务\n');
  write(path.join(parent, 'memory/README.md'), '# Memory\n');
  write(path.join(parent, 'memory/projects/README.md'), '# 项目记忆类型\n');
  write(path.join(parent, 'memory/projects/project_demo/INDEX.md'), `---
metadata:
  edges-type: project
---
# 这不是 Project
`);
  write(path.join(parent, 'archive/deep/note.md'), '# 深层文档\n');
  write(path.join(parent, 'programs/tool/README.md'), '# 工具说明\n');
  write(path.join(parent, 'paper.pdf'), 'pdf');
  write(path.join(parent, 'projects/orphan/INDEX.md'), '# 未登记\n');
  write(path.join(parent, 'projects/orphan/notes/2026-11-01--inside/INDEX.md'), '# 仍属父项目\n');
  write(path.join(parent, 'projects/README.md'), `<!-- edges-entries-local:start -->
## 本层内容

- [工具](<tool/INDEX.md>) — 已登记
<!-- edges-entries-local:end -->
`);
  const tool = path.join(parent, 'projects/tool');
  write(path.join(tool, 'INDEX.md'), '# 工具接入\n\n子项目正文。\n');
  write(path.join(tool, 'notes/README.md'), '# 子笔记清单\n');
  write(path.join(tool, 'notes/2026-11-20--mcp/INDEX.md'), '# MCP\n');
  write(path.join(tool, 'projects/README.md'), `<!-- edges-entries-local:start -->
## 本层内容

- [协议](proto/INDEX.md)
<!-- edges-entries-local:end -->
`);
  const proto = path.join(tool, 'projects/proto');
  write(path.join(proto, 'INDEX.md'), '# 协议\n');
  write(path.join(proto, 'notes/2026-11-17--oauth/INDEX.md'), '# OAuth\n');
  write(path.join(proto, 'notes/plain/INDEX.md'), '# 无日期\n');
  fs.utimesSync(path.join(proto, 'notes/2026-11-17--oauth/INDEX.md'), new Date('1999-01-01'), new Date('1999-01-01'));

  const flat = path.join(root, 'flat');
  write(path.join(flat, 'README.md'), '# 平铺\n\n只有文章。\n');
  write(path.join(flat, 'notes/2026-11-03--only/INDEX.md'), '# 唯一文章\n');
  write(path.join(root, 'empty/INDEX.md'), '# 空项目\n');

  const catalog = buildProjectCatalog(root);
  const ids = catalog.projects.map((project) => project.id).sort();
  assert.deepEqual(ids, ['agent', 'agent/projects/tool', 'agent/projects/tool/projects/proto', 'empty', 'flat']);
  const agent = catalog.byId.get('agent');
  assert.deepEqual(agent.childIds, ['agent/projects/tool']);
  assert.deepEqual(catalog.byId.get('agent/projects/tool').childIds, ['agent/projects/tool/projects/proto']);
  assert.equal(catalog.byId.get('flat').childIds.length, 0);
  assert.equal(catalog.byId.get('empty').hub, 'INDEX.md');
  assert.equal(catalog.byId.get('flat').hub, 'README.md');

  const routes = new Map(catalog.documents.map((doc) => [doc.routeId, doc]));
  assert.equal(routes.has('agent/projects/tool'), true);
  assert.equal(routes.get('agent/projects/tool').isHub, true);
  assert.equal(routes.get('agent/projects/tool').projectId, 'agent/projects/tool');
  assert.equal(routes.has('agent/projects/orphan'), true);
  assert.equal(routes.get('agent/projects/orphan').isHub, false);
  assert.equal(routes.get('agent/projects/orphan').projectId, 'agent');
  assert.equal(routes.get('agent/notes/2026-11-19--direct').contentKind, 'note');
  assert.equal(routes.get('agent/tasks/backlog/2026-11-18--job').contentKind, 'task');
  assert.equal(routes.get('agent/memory/projects/project_demo').contentKind, 'memory');
  assert.equal(routes.get('agent/memory/projects/project_demo').projectId, 'agent');
  assert.equal(routes.get('agent/archive/deep/note').contentKind, 'doc');
  assert.equal(routes.get('agent/programs/tool').isOrgList, false);
  assert.equal(routes.get('agent/notes').isOrgList, true);
  assert.equal(routes.get('agent/tasks').isOrgList, true);
  assert.equal(routes.get('agent/memory/projects').isOrgList, true);
  assert.equal(routes.get('agent/projects').isOrgList, true);
  assert.equal(routes.get('agent/projects/orphan/notes/2026-11-01--inside').projectId, 'agent');
  assert.equal(routes.get('agent/projects/tool/notes/2026-11-20--mcp').projectId, 'agent/projects/tool');
  assert.equal(
    routes.get('agent/projects/tool/projects/proto/notes/2026-11-17--oauth').projectId,
    'agent/projects/tool/projects/proto',
  );
  assert.equal(routes.get('agent/projects/tool/projects/proto/notes/plain').date, null);
  assert.equal(
    routes.get('agent/projects/tool/projects/proto/notes/2026-11-17--oauth').date.toISOString().slice(0, 10),
    '2026-11-17',
  );
  assert.equal(routes.get('flat').isHub, true);
  assert.equal(routes.get('flat/notes/2026-11-03--only').routeId, 'flat/notes/2026-11-03--only');

  const seen = new Set(catalog.documents.map((doc) => doc.collectionId));
  assert.equal(seen.size, catalog.documents.length);

  const stats = projectStats(catalog);
  const agentStats = stats.get('agent');
  assert.equal(agentStats.childCount, 1);
  const agentDirect = catalog.documents.filter((doc) => doc.projectId === 'agent' && !doc.isHub && !doc.isOrgList && doc.kind === 'md');
  assert.equal(agentStats.directCount, new Set(agentDirect.map((doc) => doc.routeId)).size);
  assert.ok(agentStats.directCount >= 5);
  assert.equal(stats.get('agent/projects/tool').directCount, 1);
  assert.equal(stats.get('agent/projects/tool/projects/proto').directCount, 2);
  assert.equal(stats.get('agent/projects/tool').totalCount, 3);
  assert.equal(agentStats.totalCount, agentStats.directCount + 1 + 2);
  assert.equal(stats.get('agent/projects/tool').contentDate.toISOString().slice(0, 10), '2026-11-20');
  assert.equal(stats.get('empty').directCount, 0);
  assert.equal(stats.get('empty').rowDate, null);
  assert.equal(stats.get('flat').directCount, 1);
  assert.equal(formatProjectMeta(stats.get('flat')), '1 篇');
  assert.equal(formatProjectMeta(stats.get('empty')), '暂无直属内容');
});

test('a parent hub entry registers a child without a projects README', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'parent-index-project-'));
  const parent = path.join(root, 'parent');
  write(path.join(parent, 'INDEX.md'), `# 父

<!-- edges-entries-local:start -->
## 本层内容

- [子](<projects/child/INDEX.md>)
<!-- edges-entries-local:end -->
`);
  write(path.join(parent, 'projects/child/INDEX.md'), '# 子\n');
  write(path.join(parent, 'projects/child/notes/2026-11-02--a/INDEX.md'), '# A\n');
  const catalog = buildProjectCatalog(root);
  assert.deepEqual(
    catalog.projects.map((project) => project.id),
    ['parent', 'parent/projects/child'],
  );
  assert.equal(
    catalog.documents.find((doc) => doc.routeId === 'parent/projects/child/notes/2026-11-02--a').projectId,
    'parent/projects/child',
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
