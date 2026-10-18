import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { run } from '../../src/program.js';
import { AgentsNode, ReadmeNode } from '../../src/domain/models/index.js';
import { placeHarnessMaterial } from '../../src/domain/config/harness-materials.js';
import { generateTasksSite } from '../../src/services/tasks/generate-site.js';

function fixture(t: { after(fn: () => void): void }) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), 'owner-board-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', root]);
  const write = (rel: string, source: string) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, source);
  };
  const call = (scope: string, face: string, args: string[]) => run(['--scope', path.join(root, scope), ...(face === 'domain' ? ['--super'] : []), 'tasks', ...args], { env: {} });
  const read = (scope: string) => new AgentsNode(path.join(root, scope, 'AGENTS.md')).parse(fs.readFileSync(path.join(root, scope, 'AGENTS.md'), 'utf8'));
  return { root, write, call, read };
}

test('CLI first projects and tasks connect existing root, child and content scopes to global CLI and HTML', async t => {
  const { root, write, call, read } = fixture(t);
  const owner = new AgentsNode(path.join(root, 'AGENTS.md')).parse('# Scope\n\nHuman introduction\n');
  owner.setConstraints(['Keep this']);
  owner.addChild('descendant', { id: path.join(root, 'child/AGENTS.md'), name: 'Child', description: 'Authored child' });
  owner.addChild('local', { id: path.join(root, 'notes/example/index.md'), name: 'Note' });
  write('AGENTS.md', owner.serialize());
  write('child/AGENTS.md', '# Child\n\nChild prose\n');
  write('notes/example/index.md', '# Content\n');
  write('notes/example/AGENTS.md', '# Content maintenance\n\nKeep content harness prose\n');
  const maintenance: string[] = [];
  for (const scope of ['.', 'child', 'notes/example']) {
    for (const purpose of ['maintenance', 'domain']) {
      const project = await call(scope, purpose, ['project', 'create', 'empty', '--title', 'Empty', '--description', 'No tasks yet']);
      assert.equal(project.exitCode, 0, project.stdout);
      const globalEmpty = await run(['--scope', root, '--all', 'tasks', 'list', '--group-by', 'project'], { env: {} });
      assert.equal(globalEmpty.exitCode, 0, globalEmpty.stdout);
      assert.equal(JSON.parse(globalEmpty.stdout).groupBy, "project");
      const created = await call(scope, purpose, ['create', '--title', 'Same']);
      assert.equal(created.exitCode, 0, created.stdout);
      if (purpose === 'maintenance') maintenance.push(path.join(scope, JSON.parse(created.stdout).path));
      const local = await call(scope, purpose, ['list']);
      assert.equal(local.exitCode, 0, local.stdout); assert.equal(JSON.parse(local.stdout).tasks.length, 1);
    }
  }
  const global = await run(['--scope', root, '--all', 'tasks', 'list', '--group-by', 'project'], { env: {} });
  assert.equal(global.exitCode, 0, global.stdout);
  const payload = JSON.parse(global.stdout);
  const items = payload.groups.flatMap((group: { items: Array<{ path: string }> }) => group.items);
  assert.deepEqual(items.map((item) => item.path).sort(), maintenance.sort());
  assert.equal(new Set(items.map((item) => item.path)).size, maintenance.length);
  const outPath = path.join(root, 'site/index.html');
  await generateTasksSite({ repoPath: root, outPath });
  const html = JSON.parse(fs.readFileSync(outPath, 'utf8').match(/<script type="application\/json" id="edges-review-payload">([\s\S]*?)<\/script>/)![1]!);
  assert.equal(html.items.length, items.length);
  for (const scope of ['.', 'child', 'notes/example']) {
    const node = read(scope);
    const material = placeHarnessMaterial(path.join(root, scope), 'tasks').absPath;
    assert.ok(node.localChildren.some(ref => ref.id === material));
    assert.equal(fs.existsSync(path.join(path.dirname(material), 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(path.dirname(placeHarnessMaterial(path.join(root, scope), 'tasks', { super: true }).absPath), 'AGENTS.md')), false);
    assert.ok(!fs.existsSync(path.join(root, scope, '.harness/AGENTS.md')));
  }
  assert.deepEqual(read('.').constraints, ['Keep this']);
  assert.deepEqual(read('.').descendantChildren.find(ref => ref.id === path.join(root, 'child/AGENTS.md')), owner.descendantChildren[0]);
  assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /Human introduction/);
  assert.match(fs.readFileSync(path.join(root, 'child/AGENTS.md'), 'utf8'), /Child prose/);
  assert.match(fs.readFileSync(path.join(root, 'notes/example/AGENTS.md'), 'utf8'), /Keep content harness prose/);
});

for (const domainGroup of ['local', 'descendant'] as const)
  test('existing board labels and domain ' + domainGroup + ' relation remain unchanged across repeated writes', async t => {
    const { root, write, call, read } = fixture(t);
    const node = new AgentsNode(path.join(root, 'AGENTS.md')).parse('# Scope\n\nIntro\n');
    node.setConstraints(['Rule']);
    node.addChild(domainGroup, { id: path.join(root, 'tasks/AGENTS.md'), name: 'Domain label', description: 'Domain description' });
    node.addChild('local', { id: path.join(root, '.harness/tasks/AGENTS.md'), name: 'Maintenance label', description: 'Maintenance description' });
    const source = node.serialize() + '\nTail\n'; write('AGENTS.md', source);
    for (const purpose of ['domain', 'maintenance']) for (const title of ['First', 'Second']) {
      const result = await call('.', purpose, ['create', '--title', title]);
      assert.equal(result.exitCode, 0, result.stdout);
    }
    assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), source);
    assert.equal(read('.').children.length, 2);
  });

test('fresh scope writes remain authorized without initializing Project Memory or a root index', async t => {
  const { root, call } = fixture(t);
  for (const purpose of ['maintenance', 'domain']) {
    const result = await call('.', purpose, ['create', '--title', 'Fresh']);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.equal(JSON.parse((await call('.', purpose, ['list'])).stdout).tasks.length, 1);
  }
  assert.ok(!fs.existsSync(path.join(root, 'AGENTS.md')));
  assert.ok(!fs.existsSync(path.join(root, '.harness/memory')));
  const global = await run(['--scope', root, '--all', 'tasks', 'list'], { env: {} });
  assert.equal(global.exitCode, 0, global.stdout + global.stderr);
  assert.deepEqual(JSON.parse(global.stdout).tasks, []);
});

test('first task creation registers both purposes without an earlier project command', async t => {
  const { root, write, call, read } = fixture(t);
  const owner = new AgentsNode(path.join(root, 'AGENTS.md')).parse('# Root\n');
  owner.addChild('descendant', { id: path.join(root, 'child/AGENTS.md') });
  write('AGENTS.md', owner.serialize()); write('child/AGENTS.md', '# Child\n');
  const maintenance: string[] = [];
  for (const scope of ['.', 'child']) for (const purpose of ['maintenance', 'domain']) {
    const created = await call(scope, purpose, ['create', '--title', 'First']);
    assert.equal(created.exitCode, 0, created.stdout);
    if (purpose === 'maintenance') maintenance.push(path.join(scope, JSON.parse(created.stdout).path));
  }
  const global = await run(['--scope', root, '--all', 'tasks', 'list'], { env: {} });
  assert.equal(global.exitCode, 0, global.stdout);
  assert.deepEqual(JSON.parse(global.stdout).tasks.map((x: { path: string }) => x.path).sort(), maintenance.sort());
  assert.equal(read('.').localChildren.length, 1);
});

test('maintenance registration preserves an existing descendant relation and authored metadata', async t => {
  const { root, write, call, read } = fixture(t);
  const node = new AgentsNode(path.join(root, 'AGENTS.md')).parse('# Root\n\nKeep prose\n');
  const reference = { id: path.join(root, '.harness/tasks/AGENTS.md'), name: 'My upkeep', description: 'Keep description' };
  node.addChild('descendant', reference);
  write('AGENTS.md', node.serialize());
  const result = await call('.', 'maintenance', ['create', '--title', 'First']);
  assert.equal(result.exitCode, 0, result.stdout);
  assert.deepEqual(read('.').localChildren, []);
  assert.deepEqual(read('.').descendantChildren, [reference]);
});

test('unsafe owner indexes are refused without overwriting their source', async t => {
  const { root, write, call } = fixture(t);
  const source = '# Root\n<!-- project-memory-local:start -->\n';
  write('AGENTS.md', source);
  const result = await call('.', 'maintenance', ['create', '--title', 'Refused']);
  assert.notEqual(result.exitCode, 0);
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), source);
  assert.ok(!fs.existsSync(path.join(root, '.harness/tasks/_default/backlog')));
});

test('unlinked maintenance board registers the tasks README without index-group', async t => {
  const { root, write, read } = fixture(t);
  write('AGENTS.md', '# Owner\n');
  const created = await run(['--scope', root, 'tasks', 'project', 'create', 'example', '--title', 'Example', '--description', 'Description'], { env: {} });
  assert.equal(created.exitCode, 0, created.stdout + created.stderr);
  const material = placeHarnessMaterial(root, 'tasks').absPath;
  assert.equal(read('.').localChildren[0]?.id, material);
  assert.equal(read('.').descendantChildren.length, 0);
  assert.equal(fs.existsSync(path.join(path.dirname(material), 'AGENTS.md')), false);
  const list = new ReadmeNode(material).parse(fs.readFileSync(material, 'utf8'));
  assert.equal(list.localChildren.filter(ref => ref.name === 'Example').length, 1);
});

test('task create keeps a scope that already lists the board README', async t => {
  const { root, write, call } = fixture(t);
  const owner = new AgentsNode(path.join(root, 'AGENTS.md')).parse('# Scope\n\nKeep prose\n');
  owner.addChild('local', { id: path.join(root, '.harness/tasks/README.md'), name: 'Tasks', description: 'board' });
  const source = owner.serialize();
  write('AGENTS.md', source);
  write('.harness/tasks/AGENTS.md', '# tasks\n');
  write('.harness/tasks/README.md', '# Tasks\n\nBoard.\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n- [Alpha](alpha/README.md) — alpha work\n<!-- project-entries-local:end -->\n');
  write('.harness/tasks/alpha/README.md', '# Alpha\n\nalpha work\n\n<!-- project-entries-local:start -->\n## 本层内容\n<!-- project-entries-local:end -->\n');
  const created = await call('.', 'maintenance', ['create', '--title', 'Fresh', '--project', 'alpha']);
  assert.equal(created.exitCode, 0, created.stdout + created.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), source);
  assert.match(fs.readFileSync(path.join(root, '.harness/tasks/alpha/README.md'), 'utf8'), /Fresh/);
});

test('super project create writes the configured tasks material and leaves the real owner unchanged', async t => {
  const { root, write, read } = fixture(t);
  const owner = new AgentsNode(path.join(root, 'AGENTS.md')).parse('# Owner\n\nKeep prose\n');
  owner.setConstraints(['Keep rule']);
  owner.addChild('local', { id: path.join(root, 'other/AGENTS.md'), name: 'Authored', description: 'Keep' });
  const source = owner.serialize();
  write('AGENTS.md', source); write('other/AGENTS.md', '# Other\n');
  const result = await run(['--scope', root, '--super', 'tasks', 'project', 'create', 'example', '--title', 'Example', '--description', 'Description'], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), source);
  const material = placeHarnessMaterial(root, 'tasks', { super: true }).absPath;
  assert.equal(fs.existsSync(material), true);
  assert.equal(fs.existsSync(path.join(path.dirname(material), 'AGENTS.md')), false);
  const updated = read('.');
  assert.deepEqual(updated.localChildren.find(ref => ref.id === path.join(root, 'other/AGENTS.md')), owner.localChildren[0]);
  assert.deepEqual(updated.constraints, ['Keep rule']);
  assert.match(updated.body, /Keep prose/);
});
