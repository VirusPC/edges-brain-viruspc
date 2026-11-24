import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { chartOption } from './model-chart-option.mjs';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const charts = new WeakMap();
const themePaints = new Set();
const COMPACT_QUERY = '(max-width: 560px)';
let listening = false;

function listenForTheme() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('themechange', () => {
    for (const paint of themePaints) paint();
  });
}

function compactLabels() {
  return window.matchMedia(COMPACT_QUERY).matches;
}

/**
 * @param {ParentNode} [root]
 */
export function mountModelBoards(root = document) {
  const boards = [...root.querySelectorAll('[data-model-board]')];
  if (boards.length === 0) return;
  listenForTheme();
  for (const board of boards) mountBoard(board);
}

/**
 * @param {Element} board
 * @param {ReturnType<typeof readTheme>} theme
 */
function mountBoard(board) {
  const select = board.querySelector('select');
  const fromHash = panelValueForHash(board);
  if (select && fromHash) select.value = fromHash;
  const show = (value) => {
    const panels = [...board.querySelectorAll('[data-panel]')];
    const visible = panels.filter((panel) => !panel.classList.contains('is-keyword-hidden'));
    const wanted = visible.some((panel) => panel.getAttribute('data-panel') === value)
      ? value
      : (visible[0]?.getAttribute('data-panel') || '');
    if (select && wanted && select.value !== wanted) select.value = wanted;
    for (const panel of panels) {
      const on = Boolean(wanted) && panel.getAttribute('data-panel') === wanted && !panel.classList.contains('is-keyword-hidden');
      panel.hidden = !on;
    }
    const panel = wanted ? board.querySelector(`[data-panel="${CSS.escape(wanted)}"]`) : null;
    if (panel && !panel.classList.contains('is-keyword-hidden')) requestAnimationFrame(() => ensureChart(panel));
  };
  show(select?.value || '0');
  select?.addEventListener('change', () => show(select.value));
  board.addEventListener('keyword-board-sync', () => show(select?.value || '0'));
}

/**
 * @param {Element} panel
 * @param {ReturnType<typeof readTheme>} theme
 */
function ensureChart(panel) {
  const el = panel.querySelector('.model-chart');
  if (!(el instanceof HTMLElement)) return;
  const existing = charts.get(el);
  if (existing) {
    existing.resize();
    return;
  }
  const specNode = panel.querySelector('.model-chart-spec');
  if (!specNode?.textContent) return;
  let spec;
  try {
    spec = JSON.parse(specNode.textContent);
  } catch {
    return;
  }
  el.classList.add('is-ready');
  el.setAttribute('aria-label', spec.items.map((item) => item.name).join('，'));
  try {
    const chart = echarts.init(el, null, { renderer: 'canvas' });
    let compact = null;
    const paint = () => {
      compact = compactLabels();
      chart.setOption(chartOption(spec, readTheme(), { compactLabels: compact }), { notMerge: true });
      chart.resize();
    };
    const render = () => {
      const next = compactLabels();
      if (next !== compact) paint();
      else chart.resize();
    };
    themePaints.add(paint);
    chart.on('click', (params) => {
      if (params.componentType !== 'yAxis') return;
      const dataIndex = spec.items.findIndex((item) => item.name === params.value);
      if (dataIndex < 0) return;
      chart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex });
    });
    charts.set(el, chart);
    render();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => render());
      observer.observe(el);
    }
  } catch (error) {
    el.classList.remove('is-ready');
    console.error(error);
  }
}

/**
 * @param {Element} board
 */
function panelValueForHash(board) {
  const hash = decodeHash(location.hash);
  if (!hash) return '';
  const panel = board.querySelector(`[id="${CSS.escape(hash)}"]`);
  return panel?.getAttribute('data-panel') || '';
}

/**
 * @param {string} hash
 */
function decodeHash(hash) {
  const raw = hash.replace(/^#/, '');
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function readTheme() {
  const style = getComputedStyle(document.documentElement);
  const pick = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: pick('--ink', '#1c1b19'),
    inkSoft: pick('--ink-soft', '#3d3a34'),
    muted: pick('--muted', '#8a8578'),
    rule: pick('--rule', '#e5dfd2'),
    note: pick('--note', '#b4541f'),
    noteWash: pick('--note-wash', '#f8efe4'),
    paper: pick('--paper', '#fffcf7'),
  };
}
