import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { NodeService } from '../../src/services/node/node-service.js';
import { syncAgentsBlocks } from '../../src/services/memory/agents.js';
import { initMemory } from '../../src/services/memory/init.js';
import { indexTaskFixtureBoard } from '../tasks/utils/helpers.js';
import { taskBoardLocation } from '../../src/services/tasks/paths.js';
import { updateTask } from '../../src/services/tasks/write.js';
import { createNodeBoardWriter } from '../../src/services/tasks/board.js';
import { parseDocument } from '../../src/utils/markdown/document.js';

function fixture(t: any) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'node-review-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('Memory derives an index edit from the snapshot loaded after an intervening human edit', async t => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ['project'] });
  const file = path.join(root, 'AGENTS.md'), original = fs.readFileSync(file, 'utf8');
  const get = NodeService.prototype.get;
  let edited = false;
  t.mock.method(NodeService.prototype, 'get', async function(this: NodeService, target: string, Model?: any) {
    if (target === file && !edited) { edited = true; fs.writeFileSync(file, original + '\nHuman edit survives.\n'); }
    return get.call(this, target, Model);
  });
  await syncAgentsBlocks(root, '<!-- project-memory-local:start -->\n## Local\n<!-- project-memory-local:end -->');
  assert.match(fs.readFileSync(file, 'utf8'), /Human edit survives/);
});

test('Memory does not overwrite a destination that appears before its creation snapshot', async t => {
  const root = fixture(t), file = path.join(root, 'AGENTS.md');
  const get = NodeService.prototype.get;
  t.mock.method(NodeService.prototype, 'get', async function(this: NodeService, target: string, Model?: any) {
    if (target === file && !fs.existsSync(file)) fs.writeFileSync(file, '# Human-created entry\n');
    return get.call(this, target, Model);
  });
  await syncAgentsBlocks(root);
  assert.equal(fs.readFileSync(file, 'utf8'), '# Human-created entry\n');
});

test('Task body update preserves supplied blank lines and trailing spaces', async t => {
  const root = fixture(t), rel = 'tasks/_default/todo/2026-10-05--body/index.md';
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), '---\nname: body\nmetadata:\n  edges-tasks-status: todo\n---\nOld\n');
  await indexTaskFixtureBoard(path.join(root, 'tasks'));
  const board = taskBoardLocation(root, { super: true });
  await updateTask(board, '2026-10-05--body', { body: '\nBody  \n\n' }, { fs: createNodeBoardWriter(board), now: new Date('2026-10-05T00:00:00Z') });
  assert.equal(parseDocument(fs.readFileSync(path.join(root, rel), 'utf8')).body, '\nBody  \n\n');
});

for (const exists of [false, true]) test(`Memory rejects ${exists ? 'edits' : 'creation'} after its loaded snapshot`, async t => {
  const root = fixture(t), file = path.join(root, 'AGENTS.md');
  if (exists) await initMemory({ targetDir: root, memoryTypes: ['project'] });
  const humanSource = exists ? fs.readFileSync(file, 'utf8') + '\nLater human edit\n' : '# Later human creation\n';
  const get = NodeService.prototype.get;
  let changed = false;
  t.mock.method(NodeService.prototype, 'get', async function(this: NodeService, target: string, Model?: any) {
    const node = await get.call(this, target, Model);
    if (target === file && !changed) { changed = true; fs.writeFileSync(file, humanSource); }
    return node;
  });
  await assert.rejects(() => syncAgentsBlocks(root, '<!-- project-memory-local:start -->\n## Replacement\n<!-- project-memory-local:end -->'), /changed|already exists/);
  assert.equal(fs.readFileSync(file, 'utf8'), humanSource);
});
