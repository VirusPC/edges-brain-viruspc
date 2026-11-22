import fs from 'node:fs';
import path from 'node:path';

/**
 * Issues whose summary/index.json is present. The site renders only these.
 * @param {string | null} dataRoot
 * @returns {string[]}
 */
export function listSummaryIssues(dataRoot) {
  if (!dataRoot) return [];
  const root = path.join(dataRoot, 'issues');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .filter((name) => fs.existsSync(path.join(root, name, 'summary', 'index.json')))
    .sort();
}

/**
 * Rebuild the issue markdown from summary/index.json blocks and card text.
 * The slices were copied from the published issue, so a faithful conversion
 * round-trips the same text the current pages render.
 * @param {string} issueDir
 * @returns {string | null}
 */
export function composeIssueMarkdown(issueDir) {
  const indexPath = path.join(issueDir, 'summary', 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  if (!Array.isArray(index.blocks)) return null;
  let out = '';
  for (const block of index.blocks) {
    if (block?.kind === 'raw') {
      out += String(block.text ?? '');
      continue;
    }
    if (block?.kind !== 'card' || !block.id) return null;
    const card = findCard(issueDir, block.id);
    if (!card) return null;
    out += String(card.text ?? '');
  }
  return out;
}

/**
 * @param {string} issueDir
 * @param {string} id
 */
function findCard(issueDir, id) {
  const summary = path.join(issueDir, 'summary');
  for (const lane of ['articles', 'projects', 'models']) {
    const dir = path.join(summary, lane);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name === 'index.json') continue;
      const card = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      if (card?.id === id) return card;
    }
  }
  return null;
}
