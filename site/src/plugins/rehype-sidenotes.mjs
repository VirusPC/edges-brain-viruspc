/**
 * Turn GFM footnote refs into margin sidenotes and drop the endnote list.
 * Presentation (margin vs inline) is left to CSS.
 * @returns {(tree: { children?: unknown[] }) => void}
 */
export function rehypeSidenotes() {
  return (tree) => {
    /** @type {Set<any>} */
    const containers = new Set();
    walk(tree, (node) => {
      if (isFootnotesContainer(node)) containers.add(node);
    });
    if (containers.size === 0) return;

    /** @type {Map<string, any>} */
    const definitions = new Map();
    for (const container of containers) {
      walk(container, (node) => {
        if (node?.type === 'element' && node.tagName === 'li' && node.properties?.id) {
          definitions.set(String(node.properties.id), node);
        }
      });
    }

    /** @type {{ parent: any, index: number, nodes: any[] }[]} */
    const replacements = [];
    let sequence = 0;
    let unresolved = 0;

    walk(tree, (node, parent, index, grand) => {
      if (!parent || !isFootnoteRef(node)) return;
      const href = String(node.properties?.href || '');
      const definition = definitionFor(href, definitions);
      if (!definition) {
        unresolved += 1;
        return;
      }
      const number = textOf(node).trim() || String(sequence + 1);
      sequence += 1;
      const nodes = sidenoteNodes(number, sequence, cloneTree(phrasingFrom(definition)));
      if (parent.type === 'element' && parent.tagName === 'sup' && grand) {
        const supIndex = grand.children.indexOf(parent);
        if (supIndex >= 0) replacements.push({ parent: grand, index: supIndex, nodes });
        return;
      }
      replacements.push({ parent, index, nodes });
    });

    const seen = new Set();
    for (const replacement of replacements.reverse()) {
      const key = `${replacement.index}:${replacement.parent.children?.[replacement.index]?.tagName || ''}:${textOf(replacement.parent.children?.[replacement.index] || {})}`;
      if (seen.has(replacement)) continue;
      seen.add(replacement);
      if (!replacement.parent.children) continue;
      if (replacement.parent.children[replacement.index] == null) continue;
      replacement.parent.children.splice(replacement.index, 1, ...replacement.nodes);
    }

    if (unresolved === 0) stripContainers(tree, containers);
  };
}

/**
 * @param {any} node
 * @param {Set<any>} containers
 */
function stripContainers(node, containers) {
  if (!node || !Array.isArray(node.children)) return;
  node.children = node.children.filter((child) => !containers.has(child));
  for (const child of node.children) stripContainers(child, containers);
}

/**
 * @param {any} node
 * @param {(node: any, parent: any, index: number, grand: any) => void} visit
 * @param {any} [parent]
 * @param {number} [index]
 * @param {any} [grand]
 */
function walk(node, visit, parent = null, index = 0, grand = null) {
  if (!node || typeof node !== 'object') return;
  visit(node, parent, index, grand);
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (let i = 0; i < children.length; i += 1) {
    walk(children[i], visit, node, i, parent);
  }
}

/** @param {any} node */
function isFootnotesContainer(node) {
  if (node?.type !== 'element') return false;
  const props = node.properties || {};
  if ('dataFootnotes' in props || 'data-footnotes' in props) return true;
  const className = props.className;
  const classes = Array.isArray(className) ? className : String(className || '').split(/\s+/);
  return classes.includes('footnotes');
}

/** @param {any} node */
function isFootnoteRef(node) {
  if (node?.type !== 'element' || node.tagName !== 'a') return false;
  const props = node.properties || {};
  if ('dataFootnoteRef' in props || 'data-footnote-ref' in props) return true;
  const id = String(props.id || '');
  const href = String(props.href || '');
  return href.includes('fn-') && !id.includes('fnref');
}

/**
 * @param {string} href
 * @param {Map<string, any>} definitions
 */
function definitionFor(href, definitions) {
  const raw = safeDecode(href.replace(/^#/, ''));
  return (
    definitions.get(raw) ||
    definitions.get(raw.replace(/^user-content-/, '')) ||
    definitions.get(`user-content-${raw}`) ||
    null
  );
}

/** @param {string} value */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * @param {string} number
 * @param {number} sequence
 * @param {any[]} phrasing
 */
function sidenoteNodes(number, sequence, phrasing) {
  const id = `sn-${number}-${sequence}`;
  return [
    {
      type: 'element',
      tagName: 'input',
      properties: {
        type: 'checkbox',
        id,
        className: ['fn-toggle'],
        ariaLabel: `Show note ${number}`,
      },
      children: [],
    },
    {
      type: 'element',
      tagName: 'label',
      properties: {
        htmlFor: id,
        className: ['fn-label'],
      },
      children: [{ type: 'text', value: String(number) }],
    },
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: ['sidenote'],
        role: 'note',
        id: `sidenote-${id}`,
      },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: { className: ['sidenote-mark'] },
          children: [{ type: 'text', value: String(number) }],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: { className: ['sidenote-body'] },
          children: phrasing,
        },
      ],
    },
  ];
}

/** @param {any} li */
function phrasingFrom(li) {
  /** @type {any[]} */
  const out = [];
  const children = Array.isArray(li.children) ? li.children : [];
  for (const child of children) {
    if (child?.type === 'text' && !String(child.value).trim()) continue;
    const parts = convertInline(child);
    if (parts.length === 0) continue;
    if (out.length > 0) out.push({ type: 'element', tagName: 'br', properties: {}, children: [] });
    out.push(...parts);
  }
  return out;
}

const BLOCKS = new Set(['p', 'div', 'li', 'ol', 'ul', 'blockquote', 'section', 'h1', 'h2', 'h3', 'h4', 'pre']);
const INLINE = new Set(['a', 'em', 'strong', 'code', 'span', 'br', 'del', 'ins', 'sub', 'sup', 'kbd', 'mark', 'abbr']);

/** @param {any} node */
function convertInline(node) {
  if (!node) return [];
  if (node.type === 'text') return [node];
  if (node.type !== 'element') return [];
  const props = node.properties || {};
  if (
    node.tagName === 'a' &&
    ('dataFootnoteBackref' in props || 'data-footnote-backref' in props)
  ) {
    return [];
  }
  if (node.tagName === 'pre') {
    return [
      {
        type: 'element',
        tagName: 'code',
        properties: { className: ['sidenote-code'] },
        children: inlineChildren(node),
      },
    ];
  }
  if (BLOCKS.has(node.tagName)) return inlineChildren(node);
  if (!INLINE.has(node.tagName)) return inlineChildren(node);
  return [
    {
      type: 'element',
      tagName: node.tagName,
      properties: props,
      children: inlineChildren(node),
    },
  ];
}

/** @param {any} node */
function inlineChildren(node) {
  /** @type {any[]} */
  const out = [];
  for (const child of node.children || []) out.push(...convertInline(child));
  return out;
}

/** @param {any} node */
function cloneTree(node) {
  if (Array.isArray(node)) return node.map(cloneTree);
  if (!node || typeof node !== 'object') return node;
  const copy = { ...node };
  if (node.properties && typeof node.properties === 'object') {
    copy.properties = { ...node.properties };
    if (Array.isArray(node.properties.className)) copy.properties.className = [...node.properties.className];
  }
  if (Array.isArray(node.children)) copy.children = node.children.map(cloneTree);
  return copy;
}

/** @param {any} node */
function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return String(node.value || '');
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textOf).join('');
}
