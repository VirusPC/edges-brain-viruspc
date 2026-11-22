#!/usr/bin/env node
/**
 * 把周报关键词画成透明 SVG，再用同一套字体导出 PNG。
 *
 * 输入是 JSON [{word, weight}]，或周报 markdown 里「一、本周关键词」章。
 * 章内若有 <!-- keywords-cloud ... -->，其中的 JSON 数组优先。
 * 已有 weight 就直接用；否则按 mentions、sources 算热度。种类分不进字号。
 * theme: true 的词是清洗时写好的主题，渲染只消费这个字段。
 * sources 在写入 JSON 时按标题链接和短述行内链接的 hostname 计数
 * （scripts/source_hostnames.mjs）。这里不从正文重算，避免链接换位置后把已有 weight 清掉。
 *
 * 排版测量固定用预设的粗体（ink-sans 是 Noto Sans CJK SC 700），
 * 中档和低档只在上色时改成常规字重，位置和字号不动。
 * SVG 不铺底、不画外框。外框由站点包一层手绘轮廓。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { Resvg } from "@resvg/resvg-js";
import CloudLayout from "d3-cloud";
import {
  CROP_PADDING,
  INK_TIERS,
  assignWeightTiers,
  fontSize,
  keywordWeight,
  renderCloudSvg,
  withVisualSizes,
} from "./keyword_cloud_style.mjs";

export { sourceHostnames } from "./source_hostnames.mjs";
export { assignWeightTiers, fontSize, keywordWeight, renderCloudSvg, withVisualSizes, CROP_PADDING };

const PALETTES = {
  "ink-sans": {
    fontFamily: "Noto Sans CJK SC",
    fontWeight: 700,
    tiers: INK_TIERS,
    fontFiles: [
      "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf",
      "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
      "/usr/share/fonts/truetype/noto/NotoSansCJKsc-Bold.otf",
      "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
      path.join(homedir(), ".local/share/fonts/NotoSansCJKsc-Bold.otf"),
    ],
    regularFiles: [
      "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf",
      "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
      "/usr/share/fonts/truetype/noto/NotoSansCJKsc-Regular.otf",
      "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
      path.join(homedir(), ".local/share/fonts/NotoSansCJKsc-Regular.otf"),
    ],
  },
  "serif-earth": {
    fontFamily: "Noto Serif CJK SC",
    fontWeight: 400,
    tiers: {
      top: { fill: "#9a3412", fontWeight: 400 },
      high: { fill: "#3d3228", fontWeight: 400 },
      mid: { fill: "#6d3a22", fontWeight: 400 },
      low: { fill: "#8a5a3a", fontWeight: 400 },
    },
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
    tiers: {
      top: { fill: "#1b4332", fontWeight: 400 },
      high: { fill: "#1c1b19", fontWeight: 400 },
      mid: { fill: "#245c48", fontWeight: 400 },
      low: { fill: "#3d6b58", fontWeight: 400 },
    },
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
  --font-file <路径>     测量和 PNG 粗体共用的字体文件
  --font-family <名称>   须与字体文件的家族名一致，默认随预设
  --font-weight <数字>   排版测量用的字重，默认随预设
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

function normalizeWord(item) {
  const word = String(item.word ?? item.text ?? "").trim();
  if (!word) fail("有一条关键词是空的");
  try {
    return {
      word,
      weight: keywordWeight({ ...item, word }),
      theme: item.theme === true,
    };
  } catch (error) {
    fail(error.message);
  }
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

export function wordsFromMarkdown(file) {
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

function resolveFont(args, preset) {
  const fontFile = args.fontFile || preset.fontFiles.find((file) => existsSync(file));
  if (!fontFile || !existsSync(fontFile)) {
    fail(
      `找不到字体文件。安装对应字体，或传入 --font-file。\n预设 ${args.palette} 会查找:\n${preset.fontFiles.join("\n")}`,
    );
  }
  const regularFile = (preset.regularFiles || []).find((file) => existsSync(file)) || null;
  return {
    fontFile,
    regularFile,
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
  const sized = withVisualSizes(words);
  const ranked = [...sized].sort(
    (a, b) => b.size - a.size || a.word.localeCompare(b.word, "zh"),
  );
  const placed = [];
  for (const word of ranked) {
    const size = word.size;
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

export function placeKeywords(words, font, seed = 1) {
  if (!GlobalFonts.has(font.fontFamily)) {
    const registered = GlobalFonts.registerFromPath(font.fontFile, font.fontFamily);
    if (!registered) fail(`无法注册字体: ${font.fontFile}`);
  }
  for (const [width, height] of LAYOUT_BOXES) {
    const packed = layoutWords(words, font, seed, width, height);
    if (packed) {
      return packed.placed.map((word) => ({
        text: word.text,
        x: word.x,
        y: word.y,
        size: word.size,
      }));
    }
  }
  return null;
}

/**
 * 站点构建用。测量字体是 Noto Sans CJK SC 粗体，中低档只在上色时改字重。
 * @param {{ word: string, weight: number }[]} words
 * @param {{ fontFile: string, fontFamily: string, fontWeight: number }} font
 * @param {number} [seed]
 */
export function renderKeywordCloudSvg(words, font, seed = 1) {
  if (!GlobalFonts.has(font.fontFamily)) {
    const registered = GlobalFonts.registerFromPath(font.fontFile, font.fontFamily);
    if (!registered) throw new Error(`无法注册字体: ${font.fontFile}`);
  }
  let packed = null;
  for (const [width, height] of LAYOUT_BOXES) {
    packed = layoutWords(words, font, seed, width, height);
    if (packed) break;
  }
  if (!packed) throw new Error(`放不下: ${words.map((word) => word.word).join("、")}`);
  return renderPacked({ tiers: INK_TIERS }, font, packed).svg;
}

/**
 * @returns {{ fontFile: string, fontFamily: string, fontWeight: number } | null}
 */
export function inkMeasurementFont() {
  const preset = PALETTES["ink-sans"];
  const fontFile = preset.fontFiles.find((file) => existsSync(file));
  if (!fontFile) return null;
  return { fontFile, fontFamily: preset.fontFamily, fontWeight: preset.fontWeight };
}

function renderPacked(preset, font, packed) {
  const [min, max] = packed.bounds;
  const width = Math.ceil(max.x - min.x) + CROP_PADDING * 2;
  const height = Math.ceil(max.y - min.y) + CROP_PADDING * 2;
  const svg = renderCloudSvg(
    preset,
    font,
    packed.placed,
    width,
    height,
    CROP_PADDING - min.x,
    CROP_PADDING - min.y,
  );
  return { svg, width, height };
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

  const { svg } = renderPacked(preset, font, packed);
  mkdirSync(path.dirname(path.resolve(args.outSvg)), { recursive: true });
  writeFileSync(args.outSvg, svg);
  console.log(`SVG: ${args.outSvg}`);

  if (!args.png) return;
  const pngPath = args.outPng || args.outSvg.replace(/\.svg$/i, ".png");
  const fontFiles = [...new Set([font.fontFile, font.regularFile].filter(Boolean))];
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: 2 },
    font: {
      fontFiles,
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

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) main();
