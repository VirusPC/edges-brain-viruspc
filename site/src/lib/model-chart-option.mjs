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
 */
export function chartOption(spec, theme) {
  const highlighted = new Set(spec.items.filter((item) => item.highlight).map((item) => item.name));
  return {
    animation: false,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: FONT, color: theme.ink },
    grid: { left: 8, right: 72, top: 12, bottom: 36, containLabel: true },
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
        if (item.detail && item.detail !== item.name) lines.push(escapeHtml(item.detail));
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
      nameGap: 28,
      nameTextStyle: { color: theme.inkSoft, fontFamily: FONT, fontSize: 12 },
      axisLabel: { color: theme.muted, fontFamily: FONT, fontSize: 11 },
      splitLine: { lineStyle: { color: theme.rule } },
      axisLine: { lineStyle: { color: theme.rule } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: spec.items.map((item) => item.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: theme.ink,
        fontFamily: FONT,
        fontSize: 12,
        formatter(value) {
          return highlighted.has(value) ? `{hot|新} ${value}` : value;
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
          fontSize: 12,
          formatter(params) {
            return spec.items[params.dataIndex]?.valueText ?? '';
          },
        },
        emphasis: { focus: 'self' },
      },
    ],
  };
}
