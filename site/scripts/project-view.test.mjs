import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildProjectBrowser } from '../src/lib/project-view.mjs';
import { PREVIEW_LIMIT, buildProjectCatalog } from '../src/lib/projects.mjs';

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

test('root and project pages share one list and preview only one level', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-view-'));
  const parent = path.join(root, 'agent');
  write(path.join(parent, 'INDEX.md'), '# Agent\n');
  write(path.join(parent, 'projects/README.md'), `<!-- edges-entries-local:start -->
## 本层内容

- [one](one/INDEX.md)
- [two](two/INDEX.md)
- [three](three/INDEX.md)
- [four](four/INDEX.md)
- [five](five/INDEX.md)
- [six](six/INDEX.md)
<!-- edges-entries-local:end -->
`);
  for (const name of ['one', 'two', 'three', 'four', 'five', 'six']) {
    write(path.join(parent, 'projects', name, 'INDEX.md'), `# ${name}\n`);
  }
  write(path.join(parent, 'projects/one/projects/README.md'), `<!-- edges-entries-local:start -->
## 本层内容

- [deep](deep/INDEX.md)
<!-- edges-entries-local:end -->
`);
  write(path.join(parent, 'projects/one/projects/deep/INDEX.md'), '# deep\n');
  write(path.join(parent, 'projects/one/notes/2026-11-20--mcp/INDEX.md'), '# MCP\n');
  for (let i = 0; i < 6; i += 1) {
    write(path.join(parent, 'notes', `2026-11-0${i + 1}--n${i}`, 'INDEX.md'), `# 笔记${i}\n`);
  }

  const catalog = buildProjectCatalog(root);
  const titles = new Map([
    ['agent', { title: 'Agent 基础设施', description: '一行简介。' }],
    ['agent/projects/one', { title: '工具接入', description: '子项目简介。' }],
  ]);
  const rootView = buildProjectBrowser(catalog, titles, null);
  assert.equal(rootView.title, 'Projects');
  assert.equal(rootView.ancestors.length, 0);
  assert.equal(rootView.documents.length, 0);
  assert.equal(rootView.children.length, 1);
  assert.equal(rootView.children[0].expandable, true);
  assert.equal(rootView.children[0].previewProjects.length, PREVIEW_LIMIT);
  assert.equal(rootView.children[0].moreProjects, 1);
  assert.equal(rootView.children[0].previewDocuments.length, PREVIEW_LIMIT);
  assert.equal(rootView.children[0].moreDocuments, 1);
  assert.equal(rootView.children[0].previewProjects.every((child) => child.expandable === undefined), true);

  const agentView = buildProjectBrowser(catalog, titles, 'agent');
  assert.equal(agentView.title, 'Agent 基础设施');
  assert.equal(agentView.intro, '一行简介。');
  assert.equal(agentView.ancestors.length, 0);
  assert.equal(agentView.children.length, 6);
  assert.equal(agentView.documents.length, 6);
  const one = agentView.children.find((child) => child.id === 'agent/projects/one');
  assert.equal(one.expandable, true);
  assert.equal(one.previewProjects.length, 1);
  assert.equal(one.previewProjects[0].id, 'agent/projects/one/projects/deep');
  assert.equal(one.previewDocuments.length, 1);
  assert.equal(one.previewDocuments[0].contentKind, 'note');

  const deep = buildProjectBrowser(catalog, titles, 'agent/projects/one/projects/deep');
  assert.deepEqual(deep.ancestors.map((item) => item.id), ['agent', 'agent/projects/one']);
  assert.equal(deep.children.length, 0);
  assert.equal(deep.documents.length, 0);
  assert.equal(deep.meta, '暂无直属内容');
});
