import path from 'node:path';
import {
  chartAnchor,
  chartLabel,
  classifyChart,
  loadSeries,
  markdownPath,
  resolveAiNewsDataRoot,
} from '../lib/model-charts.mjs';

const PLATFORM_HEADINGS = new Set(['LLM Arena', 'Artificial Analysis', 'OpenRouter', '整体排名']);

/**
 * Mark leaderboard images under 「二、模型进展」 and drop the platform
 * headings so the rehype pass can fold those blocks into one dropdown.
 * The markdown headings and filenames stay as the weekly skill writes them.
 * A chart with neither a snapshot nor an image never gets here: the skill
 * omits that block, and a heading with no chart image is left untouched.
 *
 * @param {{ repoRoot?: string }} [options]
 */
export function remarkModelCharts(options = {}) {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  return (tree, file) => {
    const filePath = markdownPath(file);
    if (!/-ai-news\.md$/i.test(path.basename(filePath))) return;
    const issueDate = /^(\d{4}-\d{2}-\d{2})-ai-news\.md$/i.exec(path.basename(filePath))?.[1];
    if (!issueDate || !tree || !Array.isArray(tree.children)) return;
    const dataRoot = resolveAiNewsDataRoot(repoRoot);
    const range = sectionRange(tree.children);
    if (!range) return;

    const blocks = blocksIn(tree.children, range.start + 1, range.end);
    /** @type {number[]} */
    const remove = [];
    const usedAnchors = new Set();
    let index = 0;

    for (const block of blocks) {
      const headingText = block.heading ? plainText(block.heading) : '';
      if (headingText === '模型发布') continue;
      const charts = chartsIn(block.nodes, headingText);
      if (charts.length === 0) continue;
      if (block.heading && PLATFORM_HEADINGS.has(headingText)) remove.push(block.headingIndex);

      let lead = [];
      /** @type {{ host: any, image: any, kind: string, captions: any[] } | null} */
      let current = null;
      /** @type {typeof charts} */
      const assigned = [];
      for (const node of block.nodes) {
        const found = findChart(node, headingText);
        if (found) {
          current = { ...found, captions: lead };
          lead = [];
          assigned.push(current);
          continue;
        }
        if (current) current.captions.push(node);
        else lead.push(node);
      }
      for (const chart of assigned) {
        const anchor = uniqueAnchor(chartAnchor(chart.kind), index, usedAnchors);
        const caption = chart.captions.map((node) => plainText(node)).join('\n');
        const spec = dataRoot ? loadSeries(dataRoot, issueDate, chart.kind, caption) : null;
        stamp(chart.host, {
          'data-chart-index': String(index),
          'data-chart-role': 'media',
          'data-chart-label': chartLabel(chart.kind),
          'data-chart-anchor': anchor,
          'data-chart-kind': chart.kind,
        });
        if (spec) {
          const props = hProps(chart.image);
          props['data-chart-spec'] = JSON.stringify(spec);
        }
        for (const captionNode of chart.captions) {
          if (!canStamp(captionNode)) continue;
          stamp(captionNode, {
            'data-chart-index': String(index),
            'data-chart-role': 'note',
          });
        }
        index += 1;
      }
    }

    remove.sort((a, b) => b - a);
    for (const headingIndex of remove) tree.children.splice(headingIndex, 1);
  };
}

/**
 * @param {any[]} children
 */
function sectionRange(children) {
  const start = children.findIndex((node) => isHeading(node, 2) && plainText(node) === '二、模型进展');
  if (start < 0) return null;
  let end = children.length;
  for (let index = start + 1; index < children.length; index += 1) {
    if (isHeading(children[index], 2)) {
      end = index;
      break;
    }
  }
  return { start, end };
}

/**
 * @param {any[]} children
 * @param {number} start
 * @param {number} end
 */
function blocksIn(children, start, end) {
  /** @type {{ heading: any, headingIndex: number, nodes: any[] }[]} */
  const blocks = [];
  /** @type {{ heading: any, headingIndex: number, nodes: any[] }} */
  let current = { heading: null, headingIndex: -1, nodes: [] };
  for (let index = start; index < end; index += 1) {
    const node = children[index];
    if (isHeading(node, 3) || (node?.type === 'heading' && node.depth >= 3)) {
      blocks.push(current);
      current = { heading: node, headingIndex: index, nodes: [] };
      continue;
    }
    current.nodes.push(node);
  }
  blocks.push(current);
  return blocks;
}

/**
 * @param {any[]} nodes
 * @param {string} heading
 */
function chartsIn(nodes, heading) {
  return nodes.map((node) => findChart(node, heading)).filter(Boolean);
}

/**
 * @param {any} node
 * @param {string} heading
 */
function findChart(node, heading) {
  if (node?.type === 'image') {
    const kind = classifyChart(node.url || '', node.alt || '', heading);
    return kind ? { host: node, image: node, kind } : null;
  }
  if (node?.type !== 'paragraph' || !Array.isArray(node.children)) return null;
  for (const child of node.children) {
    if (child?.type !== 'image') continue;
    const kind = classifyChart(child.url || '', child.alt || '', heading);
    if (kind) return { host: node, image: child, kind };
  }
  return null;
}

/**
 * @param {any} node
 * @param {number} depth
 */
function isHeading(node, depth) {
  return node?.type === 'heading' && node.depth === depth;
}

/**
 * @param {any} node
 */
function canStamp(node) {
  return node?.type === 'paragraph' || node?.type === 'image' || node?.type === 'html';
}

/**
 * @param {any} node
 * @param {Record<string, string>} props
 */
function stamp(node, props) {
  if (!canStamp(node)) return;
  Object.assign(hProps(node), props);
}

/**
 * @param {any} node
 */
function hProps(node) {
  node.data ??= {};
  node.data.hProperties ??= {};
  return node.data.hProperties;
}

/**
 * @param {string} anchor
 * @param {number} index
 * @param {Set<string>} used
 */
function uniqueAnchor(anchor, index, used) {
  let next = anchor || `model-chart-${index}`;
  if (used.has(next)) next = `${next}-${index}`;
  used.add(next);
  return next;
}

/**
 * @param {any} node
 */
function plainText(node) {
  if (!node) return '';
  if (typeof node.value === 'string' && (node.type === 'text' || node.type === 'html')) {
    return node.type === 'html' ? '' : node.value;
  }
  if (!Array.isArray(node.children)) return '';
  return node.children.map((child) => plainText(child)).join('');
}
