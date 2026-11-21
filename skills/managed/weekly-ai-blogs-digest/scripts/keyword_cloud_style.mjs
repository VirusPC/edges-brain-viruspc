/**
 * 词云的权重、字号、分档和 SVG。
 * 这里不排版、不读字体。排版仍在 render_keyword_cloud.mjs，测量一律用粗体，
 * 所以换档的字重不会挪动位置。
 */

export const CROP_PADDING = 12;

export const INK_TIERS = {
  top: { fill: "#b4541f", fontWeight: 700 },
  high: { fill: "#1c1b19", fontWeight: 700 },
  mid: { fill: "#5c574e", fontWeight: 400 },
  low: { fill: "#746f65", fontWeight: 400 },
};

const TIER_NAMES = ["top", "high", "mid", "low"];

function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function keywordWeight(item) {
  if (item.weight != null && item.weight !== "") {
    const weight = Number(item.weight);
    if (!Number.isFinite(weight)) throw new Error(`权重不是数字: ${item.word}`);
    return clamp(round1(weight), 1, 5);
  }
  const score = item.score == null ? 1 : Number(item.score);
  const mentions = item.mentions == null ? 0 : Number(item.mentions);
  const sources = item.sources == null ? 0 : Number(item.sources);
  if (![score, mentions, sources].every(Number.isFinite)) throw new Error(`分数或计数不是数字: ${item.word}`);
  const mentionPart = (Math.min(mentions, 4) / 4) * 5;
  const sourcePart = (Math.min(sources, 3) / 3) * 5;
  return clamp(round1(0.6 * score + 0.25 * mentionPart + 0.15 * sourcePart), 1, 5);
}

export function fontSize(weight) {
  return Math.round(18 + ((weight - 1) / 4) * 40);
}

/**
 * 按权重从高到低分四档。最高权重是 top。
 * 其余不同权重按 high、mid、low 尽量均分，多出来的名额给更重的档。
 * 权重相同的词一定同一档。
 * @param {{ word: string, weight: number }[]} words
 */
export function assignWeightTiers(words) {
  const unique = [...new Set(words.map((word) => word.weight))].sort((a, b) => b - a);
  const tierOf = new Map();
  if (unique.length) tierOf.set(unique[0], "top");
  const rest = unique.slice(1);
  const bands = ["high", "mid", "low"];
  const base = Math.floor(rest.length / bands.length);
  let extra = rest.length % bands.length;
  let cursor = 0;
  for (const band of bands) {
    const count = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    for (let index = 0; index < count; index += 1) {
      tierOf.set(rest[cursor], band);
      cursor += 1;
    }
  }
  return words.map((word) => {
    const tier = tierOf.get(word.weight);
    if (!TIER_NAMES.includes(tier)) throw new Error(`没有档位: ${word.word}`);
    return { ...word, tier };
  });
}

export function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * 透明 SVG。颜色是亮色默认值，站点内联后用 CSS 变量盖掉。
 * 不画底，不画外框。
 * @param {{ tiers: typeof INK_TIERS }} preset
 * @param {{ fontFamily: string }} font
 * @param {{ text: string, x: number, y: number, size: number, datum?: { weight?: number }, weight?: number }[]} placed
 */
export function renderCloudSvg(preset, font, placed, width, height, originX, originY) {
  const tiered = assignWeightTiers(
    placed.map((word) => ({
      word: word.text,
      weight: word.datum?.weight ?? word.weight,
    })),
  );
  const tierOf = new Map(tiered.map((word) => [word.word, word.tier]));
  const texts = placed.map((word) => {
    const tier = tierOf.get(word.text);
    const style = preset.tiers[tier];
    return `<text class="kw-${tier}" x="${word.x}" y="${word.y}" text-anchor="middle" dominant-baseline="alphabetic" font-size="${word.size}" font-weight="${style.fontWeight}" fill="${style.fill}">${escapeXml(word.text)}</text>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g transform="translate(${originX} ${originY})" font-family="${escapeXml(font.fontFamily)}">
    ${texts.join("\n    ")}
  </g>
</svg>
`;
}
