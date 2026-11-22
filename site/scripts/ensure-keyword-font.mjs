import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The keyword cloud is measured with Noto Sans CJK SC Bold, the same face
 * the page subsets for display. Install it when the machine does not have it.
 * The digest script dependencies live next to the layout module; install them
 * once so the site build can import d3-cloud and the canvas.
 */

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(siteRoot, '..');
const fontCandidates = [
  '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansCJKsc-Bold.otf',
  path.join(homedir(), '.local/share/fonts/NotoSansCJKsc-Bold.otf'),
];

if (!fontCandidates.some((file) => existsSync(file))) {
  const apt = spawnSync('sudo', ['apt-get', 'install', '-y', 'fonts-noto-cjk'], { stdio: 'inherit' });
  if (apt.status !== 0 || !fontCandidates.some((file) => existsSync(file))) {
    console.error('词云找不到 Noto Sans CJK SC 粗体。');
    process.exit(apt.status || 1);
  }
}

const scripts = path.join(repoRoot, 'skills/managed/weekly-ai-blogs-digest/scripts');
if (!existsSync(path.join(scripts, 'node_modules/d3-cloud'))) {
  const install = spawnSync('npm', ['ci', '--prefix', scripts], { stdio: 'inherit' });
  if (install.status !== 0) process.exit(install.status || 1);
}
