import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { chartOption } from './model-chart-option.mjs';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const charts = new WeakMap();

/**
 * @param {ParentNode} [root]
 */
export function mountModelBoards(root = document) {
  const boards = [...root.querySelectorAll('[data-model-board]')];
  if (boards.length === 0) return;
  const theme = readTheme();
  for (const board of boards) mountBoard(board, theme);
}

/**
 * @param {Element} board
 * @param {ReturnType<typeof readTheme>} theme
 */
function mountBoard(board, theme) {
  const select = board.querySelector('select');
  const fromHash = panelValueForHash(board);
  if (select && fromHash) select.value = fromHash;
  const show = (value) => {
    for (const panel of board.querySelectorAll('[data-panel]')) {
      panel.hidden = panel.getAttribute('data-panel') !== value;
    }
    const panel = board.querySelector(`[data-panel="${CSS.escape(value)}"]`);
    if (panel) requestAnimationFrame(() => ensureChart(panel, theme));
  };
  show(select?.value || '0');
  select?.addEventListener('change', () => show(select.value));
}

/**
 * @param {Element} panel
 * @param {ReturnType<typeof readTheme>} theme
 */
function ensureChart(panel, theme) {
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
  try {
    const chart = echarts.init(el, null, { renderer: 'canvas' });
    chart.setOption(chartOption(spec, theme));
    charts.set(el, chart);
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => chart.resize());
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
