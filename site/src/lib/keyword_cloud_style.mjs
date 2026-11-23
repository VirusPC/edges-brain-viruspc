/**
 * 词云的字号、分档和 SVG。
 * 这里不排版、不读字体。排版在 render_keyword_cloud.mjs，测量一律用粗体，
 * 所以换档的字重不会挪动位置。
 */
import { keywordWeight } from "../../../skills/managed/weekly-ai-blogs-digest/scripts/summarize/keywords/keyword_weight.mjs";

export const CROP_PADDING = 12;

export const INK_TIERS = {
  top: { fill: "#b4541f", fontWeight: 700 },
  high: { fill: "#1c1b19", fontWeight: 700 },
  mid: { fill: "#5c574e", fontWeight: 400 },
  low: { fill: "#746f65", fontWeight: 400 },
};

const TIER_NAMES = ["top", "high", "mid", "low"];

export { keywordWeight };

/** 主题比最热的支撑词大这么多像素，橙色档才是视觉中心。 */
export const THEME_SIZE_LEAD = 8;

/**
 * 字号。有 theme 时主题最大；没有 theme 时不另造一个最大词。
 * @param {{ word: string, weight?: number, theme?: boolean, mentions?: number, sources?: number, score?: number }[]} words
 */
export function withVisualSizes(words) {
  const prepared = words.map((word) => ({
    ...word,
    theme: word.theme === true,
    weight: keywordWeight(word),
  }));
  const support = prepared.filter((word) => !word.theme).map((word) => fontSize(word.weight));
  const maxSupport = support.length ? Math.max(...support) : fontSize(1);
  return prepared.map((word) => ({
    ...word,
    size: word.theme ? maxSupport + THEME_SIZE_LEAD : fontSize(word.weight),
  }));
}

export function fontSize(weight) {
  return Math.round(18 + ((weight - 1) / 4) * 40);
}

/**
 * 橙色 top 只给 theme: true。没有主题字段时不把最热的词升成 top。
 * 支撑词按热度分 high、mid、low。同一热度同一档。多出来的名额给更热的档。
 * @param {{ word: string, weight: number, theme?: boolean }[]} words
 */
export function assignWeightTiers(words) {
  const weightTier = new Map();
  const unique = [...new Set(words.filter((word) => !word.theme).map((word) => word.weight))].sort((a, b) => b - a);
  const bands = ["high", "mid", "low"];
  const base = Math.floor(unique.length / bands.length);
  let extra = unique.length % bands.length;
  let cursor = 0;
  for (const band of bands) {
    const count = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    for (let index = 0; index < count && cursor < unique.length; index += 1) {
      weightTier.set(unique[cursor], band);
      cursor += 1;
    }
  }
  return words.map((word) => {
    const tier = word.theme ? "top" : weightTier.get(word.weight);
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
      theme: word.datum?.theme === true || word.theme === true,
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
