#!/usr/bin/env node
/**
 * 把周报关键词画成 SVG，再用同一份字体文件导出 PNG。
 *
 * 输入是 JSON [{word, weight}]，或周报 markdown 里「一、本周关键词」章。
 * 章内若有 <!-- keywords-cloud ... -->，其中的 JSON 数组优先。
 * 已有 weight 就直接用；否则按 score、mentions、sources 计算。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { Resvg } from "@resvg/resvg-js";
import CloudLayout from "d3-cloud";

const PALETTES = {
  "ink-sans": {
    fontFamily: "Noto Sans CJK SC",
    fontWeight: 700,
    background: "#fffcf7",
    fills: ["#b4541f", "#1c1b19", "#1c1b19", "#3d3a34", "#3d3a34", "#5c574e"],
    fontFiles: [
      "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf",
      "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
      "/usr/share/fonts/truetype/noto/NotoSansCJKsc-Bold.otf",
      "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
      path.join(homedir(), ".local/share/fonts/NotoSansCJKsc-Bold.otf"),
    ],
  },
  "serif-earth": {
    fontFamily: "Noto Serif CJK SC",
    fontWeight: 400,
    background: "#f8efe4",
    fills: ["#9a3412", "#6d3a22", "#6d3a22", "#3d3228", "#3d3228", "#8a5a3a"],
    fontFiles: [
      "/usr/share/fonts/opentype/noto/NotoSerifCJKsc-Regular.otf",
      "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
      "/usr/share/fonts/truetype/noto/NotoSerifCJKsc-Regular.otf",
      path.join(homedir(), ".local/share/fonts/NotoSerifCJKsc-Regular.otf"),
    ],
  },
  "wenkai-pine": {
    fontFamily: "LXGW WenKai",
    fontWeight: 400,
    background: "#f4f7f5",
    fills: ["#1b4332", "#1c1b19", "#1f6b4a", "#245c48", "#245c48", "#3d6b58"],
    fontFiles: [
      "/usr/share/fonts/truetype/lxgw/LXGWWenKai-Regular.ttf",
      "/usr/local/share/fonts/LXGWWenKai-Regular.ttf",
      path.join(homedir(), ".local/share/fonts/LXGWWenKai-Regular.ttf"),
    ],
  },
};

const LAYOUT_BOXES = [
  [1080, 640],
  [1200, 720],
  [1400, 860],
];

function usage() {
  return `用法:
  node scripts/render_keyword_cloud.mjs --md <周报.md> --out-svg <出.svg> [--out-png <出.png>]
  node scripts/render_keyword_cloud.mjs --json <词.json> --out-svg <出.svg>

选项:
  --palette ink-sans|serif-earth|wenkai-pine   默认 ink-sans
  --font-file <路径>     测量和 PNG 共用的字体文件
  --font-family <名称>   须与字体文件的家族名一致，默认随预设
  --font-weight <数字>   默认随预设
  --seed <整数>          默认 1
  --no-png
`;
}

function parseArgs(argv) {
  const out = {
    md: null,
    json: null,
    outSvg: null,
    outPng: null,
    palette: "ink-sans",
    fontFile: process.env.KEYWORD_CLOUD_FONT || null,
    fontFamily: null,
    fontWeight: null,
    seed: 1,
    png: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value == null || value.startsWith("--")) fail(`缺少 ${arg} 的值`);
      i += 1;
      return value;
    };
    if (arg === "--md") out.md = next();
    else if (arg === "--json") out.json = next();
    else if (arg === "--out-svg") out.outSvg = next();
    else if (arg === "--out-png") out.outPng = next();
    else if (arg === "--palette") out.palette = next();
    else if (arg === "--font-file") out.fontFile = next();
    else if (arg === "--font-family") out.fontFamily = next();
    else if (arg === "--font-weight") out.fontWeight = Number(next());
    else if (arg === "--seed") out.seed = Number(next());
    else if (arg === "--no-png") out.png = false;
    else if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else fail(`未知参数 ${arg}\n${usage()}`);
  }
  if (!out.outSvg) fail(`需要 --out-svg\n${usage()}`);
  if (!out.md && !out.json) fail(`需要 --md 或 --json\n${usage()}`);
  if (out.md && out.json) fail("不要同时传 --md 和 --json");
  if (!PALETTES[out.palette]) fail(`未知预设 ${out.palette}。可选: ${Object.keys(PALETTES).join(", ")}`);
  if (!Number.isInteger(out.seed)) fail("--seed 必须是整数");
  return out;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function keywordWeight(item) {
  if (item.weight != null && item.weight !== "") {
    const weight = Number(item.weight);
    if (!Number.isFinite(weight)) fail(`权重不是数字: ${item.word}`);
    return clamp(round1(weight), 1, 5);
  }
  const score = item.score == null ? 1 : Number(item.score);
  const mentions = item.mentions == null ? 0 : Number(item.mentions);
  const sources = item.sources == null ? 0 : Number(item.sources);
  if (![score, mentions, sources].every(Number.isFinite)) fail(`分数或计数不是数字: ${item.word}`);
  const mentionPart = (Math.min(mentions, 4) / 4) * 5;
  const sourcePart = (Math.min(sources, 3) / 3) * 5;
  return clamp(round1(0.6 * score + 0.25 * mentionPart + 0.15 * sourcePart), 1, 5);
}

export function fontSize(weight) {
  return Math.round(18 + ((weight - 1) / 4) * 40);
}

function normalizeWord(item) {
  const word = String(item.word ?? item.text ?? "").trim();
  if (!word) fail("有一条关键词是空的");
  return { word, weight: keywordWeight({ ...item, word }) };
}

function wordsFromJson(file) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(data)) fail("JSON 必须是数组");
  return data.map(normalizeWord);
}

function sectionText(markdown) {
  const match = /^##[ \t]*一、本周关键词[ \t]*$/m.exec(markdown);
  if (!match) fail("找不到「一、本周关键词」");
  const rest = markdown.slice(match.index + match[0].length);
  const next = rest.search(/^##[ \t]+\S/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function wordsFromMarkdown(file) {
  const section = sectionText(readFileSync(file, "utf8"));
  const comment = section.match(/<!--\s*keywords-cloud\s*([\s\S]*?)-->/);
  if (comment) {
    let data;
    try {
      data = JSON.parse(comment[1].trim());
    } catch (error) {
      fail(`keywords-cloud 注释不是 JSON: ${error.message}`);
    }
    if (!Array.isArray(data)) fail("keywords-cloud 注释必须是 JSON 数组");
    return data.map(normalizeWord);
  }
  const plain = section.replace(/<!--[\s\S]*?-->/g, "");
  const lines = plain
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("![") && !/^<br\s*\/?>$/i.test(line) && !/^[-*]{3,}$/.test(line));
  if (!lines.length) fail("「本周关键词」里没有可画的词");
  return lines.map((line) => normalizeWord({ word: line.replace(/^[-*]\s+/, ""), weight: 1 }));
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolveFont(args, preset) {
  const fontFile = args.fontFile || preset.fontFiles.find((file) => existsSync(file));
  if (!fontFile || !existsSync(fontFile)) {
    fail(
      `找不到字体文件。安装对应字体，或传入 --font-file。\n预设 ${args.palette} 会查找:\n${preset.fontFiles.join("\n")}`,
    );
  }
  return {
    fontFile,
    fontFamily: args.fontFamily || preset.fontFamily,
    fontWeight: args.fontWeight ?? preset.fontWeight,
  };
}

function layoutWords(words, font, seed, width, height) {
  const layout = new CloudLayout()
    .canvas(() => createCanvas(1, 1))
    .size([width, height])
    .overflow(false)
    .random(mulberry32(seed));
  const ranked = [...words].sort(
    (a, b) => fontSize(b.weight) - fontSize(a.weight) || a.word.localeCompare(b.word, "zh"),
  );
  const placed = [];
  for (const word of ranked) {
    const size = fontSize(word.weight);
    let sprite;
    try {
      sprite = layout.getSprite(word.word, {
        size,
        font: font.fontFamily,
        weight: font.fontWeight,
        rotate: 0,
        padding: 8,
        datum: word,
      });
    } catch (error) {
      fail(`字体被画布拒绝（${font.fontFamily}）: ${error.message}`);
    }
    const next = sprite && layout.place(sprite);
    if (!next) return null;
    placed.push(next);
  }
  return { placed, bounds: layout.bounds() };
}

function renderSvg(preset, font, placed, width, height, originX, originY) {
  const bySize = [...placed].sort((a, b) => b.size - a.size || a.text.localeCompare(b.text, "zh"));
  const colorOf = new Map(
    bySize.map((word, index) => [word.text, preset.fills[Math.min(index, preset.fills.length - 1)]]),
  );
  const texts = placed.map((word) => {
    const fill = colorOf.get(word.text);
    return `<text x="${word.x}" y="${word.y}" text-anchor="middle" dominant-baseline="alphabetic" font-size="${word.size}" fill="${fill}">${escapeXml(word.text)}</text>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${preset.background}"/>
  <g transform="translate(${originX} ${originY})" font-family="${escapeXml(font.fontFamily)}" font-weight="${font.fontWeight}">
    ${texts.join("\n    ")}
  </g>
</svg>
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const preset = PALETTES[args.palette];
  const font = resolveFont(args, preset);
  const registered = GlobalFonts.registerFromPath(font.fontFile, font.fontFamily);
  if (!registered) fail(`无法注册字体: ${font.fontFile}`);

  const words = args.json ? wordsFromJson(args.json) : wordsFromMarkdown(args.md);
  let packed = null;
  for (const [width, height] of LAYOUT_BOXES) {
    packed = layoutWords(words, font, args.seed, width, height);
    if (packed) break;
  }
  if (!packed) {
    const widest = [...words].sort((a, b) => fontSize(b.weight) - fontSize(a.weight))[0];
    fail(`放不下: ${widest.word}`);
  }

  const margin = 36;
  const [min, max] = packed.bounds;
  const width = Math.ceil(max.x - min.x) + margin * 2;
  const height = Math.ceil(max.y - min.y) + margin * 2;
  const svg = renderSvg(preset, font, packed.placed, width, height, margin - min.x, margin - min.y);
  mkdirSync(path.dirname(path.resolve(args.outSvg)), { recursive: true });
  writeFileSync(args.outSvg, svg);
  console.log(`SVG: ${args.outSvg}`);

  if (!args.png) return;
  const pngPath = args.outPng || args.outSvg.replace(/\.svg$/i, ".png");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: 2 },
    font: {
      fontFiles: [font.fontFile],
      loadSystemFonts: false,
      defaultFontFamily: font.fontFamily,
      sansSerifFamily: font.fontFamily,
      serifFamily: font.fontFamily,
      cursiveFamily: font.fontFamily,
    },
  });
  writeFileSync(pngPath, resvg.render().asPng());
  console.log(`PNG: ${pngPath} via @resvg/resvg-js`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
