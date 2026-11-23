import fs from 'node:fs';
import path from 'node:path';
import { inkMeasurementFont, renderKeywordCloudSvg } from '../lib/render_keyword_cloud.mjs';
import { markdownPath, resolveAiNewsDataRoot } from '../lib/model-charts.mjs';
import { keywordAlt, loadKeywordWords } from '../lib/keyword-snapshot.mjs';
import { cloudHtml } from './rehype-keyword-cloud.mjs';

/**
 * Draw the word cloud under 「一、本周概览」 from the snapshot's keywords.json.
 * The overview list that follows the heading stays in place.
 * The digest comment is the fallback copy. No SVG or PNG is required.
 * Light and dark stay in CSS; the SVG itself is transparent.
 *
 * @param {{ repoRoot?: string }} [options]
 */
export function remarkKeywordCloud(options = {}) {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  return (tree, file) => {
    const filePath = markdownPath(file);
    if (!/-ai-news\.md$/i.test(path.basename(filePath || ''))) return;
    const issueDate = /^(\d{4}-\d{2}-\d{2})-ai-news\.md$/i.exec(path.basename(filePath))?.[1];
    if (!issueDate || !Array.isArray(tree?.children)) return;
    const markdown = typeof file.value === 'string'
      ? file.value
      : (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '');
    const words = loadKeywordWords(resolveAiNewsDataRoot(repoRoot), issueDate, markdown);
    if (!words.length) return;
    const range = keywordRange(tree.children);
    if (!range) return;
    const font = inkMeasurementFont();
    if (!font) throw new Error('词云找不到 Noto Sans CJK SC 粗体。安装 fonts-noto-cjk 后再构建。');
    const html = cloudHtml(renderKeywordCloudSvg(words, font, 1), keywordAlt(words));
    tree.children.splice(range.start + 1, range.end - range.start - 1, { type: 'html', value: html });
  };
}

/**
 * @param {any[]} children
 */
function keywordRange(children) {
  let start = -1;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (start !== -1 && node?.type === 'html' && String(node.value || '').includes('weekly-overview')) {
      return { start, end: index };
    }
    if (node?.type !== 'heading' || node.depth !== 2) continue;
    if (start === -1) {
      if (plainText(node) === '一、本周概览') start = index;
      continue;
    }
    return { start, end: index };
  }
  if (start === -1) return null;
  return { start, end: children.length };
}

/**
 * @param {any} node
 */
function plainText(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return String(node.value || '');
  if (Array.isArray(node.children)) return node.children.map(plainText).join('');
  return '';
}
