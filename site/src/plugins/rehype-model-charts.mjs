/**
 * Fold the marked leaderboard blocks into one `<select>` plus a panel per
 * chart. Images stay in the tree so Astro can still copy them; a snapshot
 * spec, when present, is moved onto a hidden `<pre>` for the ECharts client.
 */
export function rehypeModelCharts() {
  return (tree) => {
    if (!tree || !Array.isArray(tree.children)) return;
    const children = tree.children;
    let index = 0;
    while (index < children.length) {
      const node = children[index];
      if (!isHeading(node, 'h2') || textOf(node) !== '二、模型进展') {
        index += 1;
        continue;
      }
      let cursor = index + 1;
      let start = -1;
      let end = -1;
      while (cursor < children.length && !isHeading(children[cursor], 'h2')) {
        if (chartIndex(children[cursor])) {
          if (start < 0) start = cursor;
          end = cursor;
        } else if (start >= 0 && !ignorable(children[cursor])) {
          break;
        }
        cursor += 1;
      }
      if (start < 0) {
        index += 1;
        continue;
      }
      const board = buildBoard(children.slice(start, end + 1));
      children.splice(start, end - start + 1, board);
      index = start + 1;
    }
  };
}

/**
 * @param {any[]} nodes
 */
function buildBoard(nodes) {
  /** @type {{ index: string, nodes: any[], label: string, anchor: string, kind: string, spec: string }[]} */
  const panels = [];
  /** @type {(typeof panels)[number] | null} */
  let current = null;
  for (const node of nodes) {
    const index = chartIndex(node);
    if (index == null) {
      if (current && ignorable(node)) current.nodes.push(node);
      continue;
    }
    if (!current || current.index !== index) {
      current = {
        index,
        nodes: [],
        label: '',
        anchor: '',
        kind: '',
        spec: '',
      };
      panels.push(current);
    }
    const label = attr(node, 'data-chart-label');
    const anchor = attr(node, 'data-chart-anchor');
    const kind = attr(node, 'data-chart-kind');
    if (label) current.label = label;
    if (anchor) current.anchor = anchor;
    if (kind) current.kind = kind;
    const spec = takeSpec(node);
    if (spec) current.spec = spec;
    current.nodes.push(node);
  }

  const options = panels.map((panel, index) => ({
    type: 'element',
    tagName: 'option',
    properties: { value: String(index) },
    children: [{ type: 'text', value: panel.label || `榜单 ${index + 1}` }],
  }));

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['model-board'],
      'data-model-board': '',
    },
    children: [
      {
        type: 'element',
        tagName: 'label',
        properties: { className: ['model-board-switch'] },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: {},
            children: [{ type: 'text', value: '榜单' }],
          },
          {
            type: 'element',
            tagName: 'select',
            properties: { 'aria-label': '切换模型榜单' },
            children: options,
          },
        ],
      },
      ...panels.map((panel, index) => panelElement(panel, index)),
    ],
  };
}

/**
 * @param {{ nodes: any[], label: string, anchor: string, kind: string, spec: string }} panel
 * @param {number} index
 */
function panelElement(panel, index) {
  const media = [];
  const notes = [];
  for (const node of panel.nodes) {
    if (attr(node, 'data-chart-role') === 'media') media.push(node);
    else notes.push(node);
  }
  /** @type {any[]} */
  const children = [];
  if (panel.spec) {
    children.push({
      type: 'element',
      tagName: 'div',
      properties: {
        className: ['model-chart'],
        role: 'img',
        'aria-label': panel.label || '模型榜单',
      },
      children: [],
    });
    children.push({
      type: 'element',
      tagName: 'pre',
      properties: { hidden: true, className: ['model-chart-spec'] },
      children: [{ type: 'text', value: panel.spec }],
    });
  }
  children.push(...media, ...notes);
  /** @type {Record<string, unknown>} */
  const properties = {
    className: ['model-panel'],
    'data-panel': String(index),
  };
  if (panel.anchor) properties.id = panel.anchor;
  if (panel.kind) properties['data-chart-kind'] = panel.kind;
  if (index > 0) properties.hidden = true;
  return { type: 'element', tagName: 'div', properties, children };
}

/**
 * @param {any} node
 */
function takeSpec(node) {
  let spec = '';
  walk(node, (element) => {
    const raw = attr(element, 'data-chart-spec');
    if (!raw) return;
    spec = raw;
    delete element.properties['data-chart-spec'];
    delete element.properties.dataChartSpec;
  });
  return spec;
}

/**
 * @param {any} node
 * @param {(element: any) => void} visit
 */
function walk(node, visit) {
  if (!node || node.type !== 'element') return;
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}

/**
 * @param {any} node
 */
function chartIndex(node) {
  const value = attr(node, 'data-chart-index');
  return value === '' ? null : value;
}

/**
 * @param {any} node
 * @param {string} key
 */
function attr(node, key) {
  const props = node?.properties;
  if (!props) return '';
  const camel = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const value = props[key] ?? props[camel];
  if (value == null || value === false) return '';
  return String(value);
}

/**
 * @param {any} node
 */
function ignorable(node) {
  if (!node) return true;
  if (node.type === 'text') return !String(node.value || '').trim();
  if (node.type === 'element' && node.tagName === 'br') return true;
  if (node.type === 'raw') {
    const value = String(node.value || '').trim();
    return /^<br\s*\/?>$/i.test(value) || /^<!--\s*chart-meta\b[\s\S]*-->$/.test(value);
  }
  return false;
}

/**
 * @param {any} node
 * @param {string} tag
 */
function isHeading(node, tag) {
  return node?.type === 'element' && node.tagName === tag;
}

/**
 * @param {any} node
 */
function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map((child) => textOf(child)).join('').replace(/\s+/g, ' ').trim();
}
