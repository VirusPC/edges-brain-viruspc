import path from 'node:path';
import { markdownPath, resolveAiNewsDataRoot } from '../lib/model-charts.mjs';
import { factsHtmlForHeading, loadModelReleases } from '../lib/model-releases.mjs';

/**
 * Insert the generation-day price / speed / effect card under each model
 * heading in 「二、模型进展」. The prose stays. Issues without a snapshot are unchanged.
 *
 * @param {{ repoRoot?: string }} [options]
 */
export function remarkModelFacts(options = {}) {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  return (tree, file) => {
    const filePath = markdownPath(file);
    if (!/-ai-news\.md$/i.test(path.basename(filePath))) return;
    const issueDate = /^(\d{4}-\d{2}-\d{2})-ai-news\.md$/i.exec(path.basename(filePath))?.[1];
    if (!issueDate || !tree || !Array.isArray(tree.children)) return;
    const models = loadModelReleases(resolveAiNewsDataRoot(repoRoot), issueDate);
    insertModelFacts(tree, models);
  };
}

/**
 * @param {any} tree
 * @param {any[]} models
 */
export function insertModelFacts(tree, models) {
  const children = tree?.children;
  if (!Array.isArray(children) || !models?.length) return;
  let inSection = false;
  /** @type {{ index: number, html: string }[]} */
  const inserts = [];
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node?.type !== 'heading') continue;
    const text = plain(node);
    if (node.depth === 2) {
      if (text === '二、模型进展') {
        inSection = true;
        continue;
      }
      if (inSection) break;
      continue;
    }
    if (!inSection || node.depth !== 4) continue;
    const html = factsHtmlForHeading(text, models);
    if (html) inserts.push({ index: index + 1, html });
  }
  for (const item of inserts.reverse()) {
    children.splice(item.index, 0, { type: 'html', value: item.html });
  }
}

/**
 * @param {any} node
 */
function plain(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map((child) => plain(child)).join('');
}
