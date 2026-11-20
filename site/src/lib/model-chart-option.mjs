const ORG_COLORS = {
  google: '#5B9BD5',
  anthropic: '#E8A87C',
  meta: '#2F5496',
  openai: '#10A37F',
  moonshot: '#7B68EE',
  xai: '#111111',
  mistral: '#F2A900',
  deepseek: '#4C8BF5',
  alibaba: '#FF6A00',
  bytedance: '#325AB4',
};
const DEFAULT_COLOR = '#888888';
const APP_COLOR = '#3d6f8f';
export const MOBILE_NAME_LIMIT = 20;
const FONT = '"Source Serif 4", Palatino, "Songti SC", "Noto Serif SC", "Noto Sans CJK SC", "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';

/**
 * @param {string} org
 */
export function organizationColor(org) {
  const key = String(org || '').trim().toLowerCase();
  if (key === 'app') return APP_COLOR;
  return ORG_COLORS[key] || DEFAULT_COLOR;
}

/**
 * @param {unknown} value
 */
/**
 * Visible mobile name, at most `limit` characters, ellipsis included.
 * The full name stays in the tooltip.
 *
 * @param {unknown} name
 * @param {number} [limit]
 */
export function compactModelName(name, limit = MOBILE_NAME_LIMIT) {
  const chars = [...String(name ?? '')];
  if (chars.length <= limit) return chars.join('');
  return `${chars.slice(0, limit - 1).join('')}…`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Horizontal bar option. Highlighted rows are models released inside the
 * issue window and still on this chart — the marker that used to be a red ring.
 *
 * @param {{
 *   axis: string,
 *   scaleZero?: boolean,
 *   items: { name: string, value: number, valueText: string, organization?: string, highlight?: boolean, rank?: number, detail?: string }[],
 * }} spec
 * @param {{ ink: string, inkSoft: string, muted: string, rule: string, note: string, noteWash: string, paper: string }} theme
 * @param {{ compactLabels?: boolean }} [options]
 */
export function chartOption(spec, theme, options = {}) {
  const compact = Boolean(options.compactLabels);
  const highlighted = new Set(spec.items.filter((item) => item.highlight).map((item) => item.name));
  const grid = compact
    ? { left: 2, right: 36, top: 8, bottom: 28, containLabel: true }
    : { left: 8, right: 72, top: 12, bottom: 36, containLabel: true };
  return {
    animation: false,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: FONT, color: theme.ink },
    grid,
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove|click',
      confine: true,
      backgroundColor: theme.paper,
      borderColor: theme.rule,
      textStyle: { color: theme.ink, fontFamily: FONT, fontSize: 13 },
      formatter(params) {
        const item = spec.items[params.dataIndex];
        if (!item) return '';
        const lines = [`<strong>${escapeHtml(item.name)}</strong>`];
        if (item.rank) lines.push(`#${item.rank}`);
        lines.push(`${escapeHtml(spec.axis)}：${escapeHtml(item.valueText)}`);
        if (item.highlight) lines.push('本周新发布');
        return lines.join('<br/>');
      },
    },
    xAxis: {
      type: 'value',
      scale: !spec.scaleZero,
      min: spec.scaleZero ? 0 : undefined,
      name: spec.axis,
      nameLocation: 'middle',
      nameGap: compact ? 22 : 28,
      nameTextStyle: { color: theme.inkSoft, fontFamily: FONT, fontSize: compact ? 11 : 12 },
      splitNumber: compact ? 4 : 5,
      axisLabel: {
        color: theme.muted,
        fontFamily: FONT,
        fontSize: compact ? 10 : 11,
        hideOverlap: true,
      },
      splitLine: { lineStyle: { color: theme.rule } },
      axisLine: { lineStyle: { color: theme.rule } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: spec.items.map((item) => item.name),
      axisTick: { show: false },
      axisLine: { show: false },
      triggerEvent: true,
      axisLabel: {
        color: theme.ink,
        fontFamily: FONT,
        fontSize: compact ? 11 : 12,
        formatter(value) {
          const shown = compact ? compactModelName(value) : value;
          return highlighted.has(value) ? `{hot|新} ${shown}` : shown;
        },
        rich: {
          hot: {
            color: theme.paper,
            backgroundColor: theme.note,
            fontWeight: 700,
            padding: [1, 4],
            borderRadius: 2,
          },
        },
      },
    },
    series: [
      {
        type: 'bar',
        barWidth: '58%',
        data: spec.items.map((item) => ({
          value: item.value,
          itemStyle: {
            color: organizationColor(item.organization),
            borderColor: item.highlight ? theme.note : 'transparent',
            borderWidth: item.highlight ? 2 : 0,
            borderRadius: [0, 3, 3, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          color: theme.ink,
          fontFamily: FONT,
          fontSize: compact ? 11 : 12,
          formatter(params) {
            return spec.items[params.dataIndex]?.valueText ?? '';
          },
        },
        emphasis: { focus: 'self' },
      },
    ],
  };
}
