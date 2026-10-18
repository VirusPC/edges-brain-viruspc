import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, cp, symlink, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../..', import.meta.url));

test('compiled memory CLI includes templates and runs with no source skills checkout', async t => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'edges-memory-dist-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  // Compile into an isolated output so this check cannot pass on stale dist files.
  const runtime = path.join(temporary, 'runtime');
  await mkdir(runtime);
  execFileSync(path.join(cli, 'node_modules/.bin/tsc'), ['-p', path.join(cli, 'tsconfig.json'), '--outDir', path.join(runtime, 'dist')], { cwd: cli });
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/copy-memory-templates.ts'], { cwd: cli });
  await cp(path.join(cli, 'dist/assets/memory/templates'), path.join(runtime, 'dist/assets/memory/templates'), { recursive: true });
  // tsc does not copy JSON resources; mirror the config copy in the normal build.
  await cp(path.join(cli, 'src/domain/config'), path.join(runtime, 'dist/domain/config'), { recursive: true });
  await symlink(path.join(cli, 'node_modules'), path.join(runtime, 'node_modules'), 'dir');
  await writeFile(path.join(runtime, 'package.json'), '{"type":"module","version":"0.0.0"}');
  const scope = path.join(temporary, 'scope');
  await mkdir(scope);
  const output = execFileSync(process.execPath, [path.join(runtime, 'dist/index.js'), '--scope', scope, 'memory', 'init', '--memory-types', 'project'], { cwd: scope, encoding: 'utf8' });
  assert.equal(JSON.parse(output).ok, true);
  assert.match(await readFile(path.join(scope, 'AGENTS.md'), 'utf8'), /\.harness\/README\.md/);
  assert.match(await readFile(path.join(scope, '.harness/README.md'), 'utf8'), /memory\/projects\/README\.md/);
});
