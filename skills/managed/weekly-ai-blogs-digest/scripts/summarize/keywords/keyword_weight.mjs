function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * 热度。种类分不进这个数。已写入的 weight 直接用。
 * @param {{ word?: string, weight?: number, mentions?: number, sources?: number }} item
 */
export function keywordWeight(item) {
  if (item.weight != null && item.weight !== "") {
    const weight = Number(item.weight);
    if (!Number.isFinite(weight)) throw new Error(`权重不是数字: ${item.word}`);
    return clamp(round1(weight), 1, 5);
  }
  const mentions = item.mentions == null ? 0 : Number(item.mentions);
  const sources = item.sources == null ? 0 : Number(item.sources);
  if (![mentions, sources].every(Number.isFinite)) throw new Error(`分数或计数不是数字: ${item.word}`);
  const mentionPart = (Math.min(mentions, 4) / 4) * 5;
  const sourcePart = (Math.min(sources, 3) / 3) * 5;
  return clamp(round1(0.625 * mentionPart + 0.375 * sourcePart), 1, 5);
}
