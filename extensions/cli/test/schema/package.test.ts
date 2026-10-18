import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rename, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const cliPackage = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { name: string; version: string };
const packedArchiveName = `${cliPackage.name.replace(/^@/, '').replace('/', '-')}-${cliPackage.version}.tgz`;

async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    if (entry.name === 'node_modules') continue;
    if (entry.isDirectory()) result.push(...(await files(path.join(directory,entry.name))).map(file => `${entry.name}/${file}`));
    else result.push(entry.name);
  }
  return result;
}

test('packed CLI works outside repo with production dependencies and fails clearly for missing artifacts', { timeout: 240000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'edges-schema-package-'));
  try {
    execFileSync('pnpm', ['pack','--pack-destination',directory], {cwd: new URL('../../', import.meta.url), stdio:'pipe'});
    const archiveName = (await readdir(directory)).find(file => file.endsWith('.tgz'))!;
    const archive = path.join(directory, archiveName);
    const packedManifest = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], {encoding:'utf8'}));
    assert.equal(packedManifest.name, '@viruspc/edges');
    assert.equal(packedManifest.version, cliPackage.version);
    assert.equal(packedManifest.private, undefined);
    assert.equal(packedManifest.bin?.edges, './dist/index.js');
    assert.equal(packedManifest.publishConfig?.access, 'public');
    assert.equal(JSON.stringify(packedManifest).includes('workspace:'), false);
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      assert.equal(packedManifest[field]?.['tasks-review-app'], undefined);
    }
    assert.equal(packedManifest.dependencies?.react, undefined);
    const installation = path.join(directory,'installation');
    await mkdir(installation);
    execFileSync('npm',['install','-g','--prefix',installation,'--omit=dev','--ignore-scripts','--no-audit','--no-fund',archive], {stdio:'pipe'});
    const packageRoot = execFileSync('npm', ['root', '-g', '--prefix', installation], {encoding:'utf8'}).trim();
    const packageDir = path.join(packageRoot, '@viruspc/edges');
    const inventory = await files(packageDir);
    assert.equal(inventory.some(file => file.startsWith('src/') || file.startsWith('scripts/') || (file.endsWith('.ts') && !file.endsWith('.d.ts'))),false);
    assert.ok(inventory.includes('dist/schemas/task-doc.v1.json'));
    assert.ok(inventory.includes('dist/schemas/manifest.json'));
    assert.ok(inventory.includes('dist/commands/tasks/project/assets/review-page/review.js'));
    assert.equal(inventory.some(file => file.endsWith('.tsx')), false);
    assert.ok(inventory.some(file => file.startsWith('dist/assets/memory/templates/')));
    const installed = await readdir(path.join(packageDir, 'node_modules'));
    assert.ok(installed.includes('ajv') && installed.includes('ajv-formats'));
    assert.equal(installed.includes('ts-json-schema-generator') || installed.includes('tsx') || installed.includes('tasks-review-app'), false);
    const bin = path.join(installation, 'bin', 'edges');
    const help = spawnSync(bin, ['--help'], {cwd: directory, encoding:'utf8'});
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /\bedges\b/);
    const repo = path.join(directory, 'repo');
    await mkdir(repo);
    execFileSync('git', ['init'], {cwd: repo, stdio:'pipe'});
    const home = path.join(directory, 'home');
    await mkdir(home);
    const smoke = (args: string[]) => spawnSync(bin, args, {cwd: repo, encoding:'utf8', env:{...process.env, EDGES_SCOPE: repo, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), DO_NOT_TRACK: '1'}});
    const init = smoke(['init', '--target-dir', repo, '--', '-y', '--agent', 'claude-code']);
    assert.equal(init.status, 0, init.stderr + init.stdout);
    const remembered = smoke(['memory', 'remember', '--target-dir', repo, '--type', 'project', '--slug', 'smoke_publish', '--title', 'Smoke', '--description', 'Packed CLI can remember', '--content', 'Packed install wrote this entry.', '--username', 'edges smoke', '--email', 'edges-smoke@example.com']);
    assert.equal(remembered.status, 0, remembered.stderr + remembered.stdout);
    const invoke = (...argv: string[]) => spawnSync(process.execPath,[path.join(packageDir,'dist/index.js'),...argv], {cwd: directory, encoding:'utf8', env:{...process.env, EDGES_SCOPE:'/invalid'}});
    const list = invoke('schema','list');
    assert.equal(list.status,0,list.stderr); assert.equal(list.stderr,'');
    const entries = JSON.parse(list.stdout);
    assert.deepEqual(Object.keys(entries[0]).sort(), ['description','id','key','title']);
    const get = invoke('schema','get','task-doc/v1');
    assert.equal(get.status,0,get.stderr); assert.equal(get.stderr,''); assert.equal(JSON.parse(get.stdout).$id,'edges.task-doc/v1');
    const unknown = invoke('schema','get','../other');
    assert.notEqual(unknown.status,0); assert.equal(unknown.stdout,''); assert.match(unknown.stderr,/Unknown schema key/);
    // Exercise the compiled JSON boundary as well as the command tree without development dependencies.
    const validator = spawnSync(process.execPath,['--input-type=module','-e',`import {validateTaskDocInput} from ${JSON.stringify(new URL('file://' + path.join(packageDir,'dist/services/tasks/task-doc.js')).href)}; const doc={name:'',description:'',metadata:{custom:{nested:true}},body:''}; if(validateTaskDocInput(doc)!==doc)throw Error('changed input'); try {validateTaskDocInput({...doc,extra:true}); throw Error('accepted extra')} catch(e) {if(!e.message.includes('doc/extra')) throw e}`], {cwd:directory,encoding:'utf8'});
    assert.equal(validator.status,0,validator.stderr);
    for (const file of ['task-doc.v1.json','manifest.json']) {
      const original = path.join(packageDir,'dist/schemas',file);
      const saved = original + '.saved';
      await rename(original,saved);
      try {
        const missing = invoke('schema','get','task-doc/v1');
        assert.notEqual(missing.status,0); assert.equal(missing.stdout,''); assert.match(missing.stderr,/Rebuild.*build:schemas.*reinstall/);
        assert.equal((await readdir(path.dirname(original))).includes(file),false);
      } finally {await rename(saved,original);}
    }
    const manifest = JSON.parse(await readFile(path.join(packageDir,'dist/schemas/manifest.json'),'utf8'));
    assert.equal(manifest[0].file,'task-doc.v1.json');
  } finally {await rm(directory,{recursive:true,force:true});}
});

test('npm pack is rejected when npm_execpath is npm even if the user agent says pnpm', () => {
  const cli = fileURLToPath(new URL('../../', import.meta.url));
  const script = fileURLToPath(new URL('../../scripts/assert-pnpm-publish.mjs', import.meta.url));
  const pnpmAgent = 'pnpm/10.33.4 npm/? node/v22.14.0 linux x64';
  const runGuard = (execpath: string, userAgent: string) => spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {...process.env, npm_config_user_agent: userAgent, npm_execpath: execpath},
  });
  const allowed = runGuard('/opt/corepack/v1/pnpm/10.33.4/dist/pnpm.cjs', 'npm/10.9.9 node/v22.14.0 linux x64');
  assert.equal(allowed.status, 0, allowed.stderr);
  const nestedNpm = runGuard('/opt/pnpm/npm/bin/npm-cli.js', pnpmAgent);
  assert.notEqual(nestedNpm.status, 0);
  assert.match(nestedNpm.stderr, /npm_execpath is npm, but npm_config_user_agent says pnpm/);
  const packed = spawnSync('npm', ['pack', '--dry-run'], {
    cwd: cli,
    encoding: 'utf8',
    env: {...process.env, npm_config_user_agent: pnpmAgent},
  });
  const output = `${packed.stdout}${packed.stderr}`;
  assert.notEqual(packed.status, 0, output);
  assert.match(output, /npm_execpath is npm, but npm_config_user_agent says pnpm/);
  assert.equal(output.includes(packedArchiveName), false);
});
