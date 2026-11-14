/**
 * 一条周报条目里，标题链接和短述行内链接的 hostname。
 * 传入该条的标题行加上短述。同一 hostname 只出现一次，顺序按链接首次出现。
 * 图片链接不计。调用方不要把「本周关键词」整章传进来。
 */
const LINK_RE = /(?<!!)\[([^\[\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

export function sourceHostnames(itemMarkdown) {
  const hosts = [];
  const seen = new Set();
  const text = String(itemMarkdown).replace(/<!--[\s\S]*?-->/g, "");
  for (const match of text.matchAll(LINK_RE)) {
    const host = new URL(match[2]).hostname;
    if (!host || seen.has(host)) continue;
    seen.add(host);
    hosts.push(host);
  }
  return hosts;
}
