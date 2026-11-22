/**
 * 校验一期 products/ 四张表的引用是否齐、sha256 是否对得上现存文件。
 * 不生成数据，也不要求历史期次已经有 products/。
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PRODUCT_FILES = {
  selection: "selection.json",
  summaries: "summaries.json",
  boards: "boards.json",
  page: "page.json",
};

const CHAPTERS = [
  "一、本周关键词",
  "二、模型进展",
  "三、项目开源",
  "四、精选文章",
  "五、精选推文",
  "六、精选播客",
];

/**
 * @param {string} file
 */
export function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/**
 * @param {string} issueDir
 * @returns {string[]}
 */
export function validateIssueProducts(issueDir) {
  const errors = [];
  const products = path.join(issueDir, "products");
  /** @type {Record<string, any>} */
  const docs = {};
  for (const [node, name] of Object.entries(PRODUCT_FILES)) {
    const file = path.join(products, name);
    if (!existsSync(file)) {
      errors.push(`缺少 products/${name}`);
      continue;
    }
    let doc;
    try {
      doc = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      errors.push(`${name} 不是 JSON`);
      continue;
    }
    docs[node] = doc;
    checkEnvelope(doc, node, name, errors);
    checkInputs(doc, issueDir, name, errors);
  }
  if (docs.page) checkPage(docs.page, errors);
  if (docs.selection) checkSelection(docs.selection, errors);
  if (docs.summaries) checkSummaries(docs.summaries, errors);
  if (docs.boards) checkBoards(docs.boards, errors);
  return errors;
}

/**
 * @param {any} doc
 * @param {string} node
 * @param {string} name
 * @param {string[]} errors
 */
function checkEnvelope(doc, node, name, errors) {
  if (doc.version !== 1) errors.push(`${name} version 应为 1`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(doc.issue || ""))) errors.push(`${name} issue 应为 YYYY-MM-DD`);
  if (doc.node !== node) errors.push(`${name} node 应为 ${node}`);
  const rules = doc.rules || {};
  if (!/^[0-9a-f]{40}$/.test(String(rules.commit || ""))) errors.push(`${name} rules.commit 应为 40 位`);
  if (!rules.path) errors.push(`${name} rules.path 必填`);
  if (!Array.isArray(doc.inputs)) errors.push(`${name} inputs 应为数组`);
}

/**
 * @param {any} doc
 * @param {string} issueDir
 * @param {string} name
 * @param {string[]} errors
 */
function checkInputs(doc, issueDir, name, errors) {
  for (const input of doc.inputs || []) {
    if (!input?.path || String(input.path).includes("..")) {
      errors.push(`${name} 引用路径无效`);
      continue;
    }
    if (input.status === "skipped") {
      if (!input.reason) errors.push(`${name} skipped 要有 reason`);
      continue;
    }
    if (!/^[0-9a-f]{64}$/.test(String(input.sha256 || ""))) {
      errors.push(`${name} 引用 ${input.path} 要有 sha256`);
      continue;
    }
    const file = path.join(issueDir, input.path);
    if (!existsSync(file)) continue;
    if (sha256File(file) !== input.sha256) errors.push(`${name} 引用 ${input.path} 的 sha256 与文件不符`);
  }
}

/**
 * @param {any} doc
 * @param {string[]} errors
 */
function checkPage(doc, errors) {
  const titles = Array.isArray(doc.chapters) ? doc.chapters.map((item) => item?.title) : [];
  if (titles.join("\n") !== CHAPTERS.join("\n")) {
    errors.push("page.json 章节顺序应为关键词、模型进展、项目开源、精选文章、精选推文、精选播客");
  }
  const paths = new Set((doc.inputs || []).map((item) => item.path));
  for (const need of ["products/selection.json", "products/summaries.json", "products/boards.json", "keywords.json"]) {
    if (!paths.has(need)) errors.push(`page.json 要引用 ${need}`);
  }
  if (!doc.window?.since || !doc.window?.until || !doc.window?.generated) {
    errors.push("page.json 要有 window.since、until、generated");
  }
}

/**
 * @param {any} doc
 * @param {string[]} errors
 */
function checkSelection(doc, errors) {
  if (!Array.isArray(doc.rows)) {
    errors.push("selection.json rows 应为数组");
    return;
  }
  for (const row of doc.rows) {
    if (!row?.link || !row.section || !row.title) errors.push("selection 行要有 link、section、title");
  }
}

/**
 * @param {any} doc
 * @param {string[]} errors
 */
function checkSummaries(doc, errors) {
  if (!Array.isArray(doc.rows)) {
    errors.push("summaries.json rows 应为数组");
    return;
  }
  for (const row of doc.rows) {
    if (!row?.link || !row.title) errors.push("summary 行要有 link、title");
    else if (!row.one_line && !Array.isArray(row.sections) && !Array.isArray(row.points)) {
      errors.push(`summary ${row.link} 要有 one_line、sections 或 points`);
    }
  }
}

/**
 * @param {any} doc
 * @param {string[]} errors
 */
function checkBoards(doc, errors) {
  if (!Array.isArray(doc.rows)) {
    errors.push("boards.json rows 应为数组");
    return;
  }
  for (const row of doc.rows) {
    if (!row?.id || !row.title) errors.push("board 行要有 id、title");
    else if (row.omitted) {
      if (!row.reason) errors.push(`board ${row.id} 省略时要有 reason`);
    } else if (!row.caption || !row.data?.path) {
      errors.push(`board ${row.id} 要有 caption 和 data.path`);
    }
  }
}

function main() {
  const issueDir = process.argv[2];
  if (!issueDir) {
    console.error("用法: node scripts/validate_products.mjs <issues/YYYY-MM-DD>");
    process.exit(2);
  }
  const errors = validateIssueProducts(issueDir);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  console.log(`${issueDir}: products ok`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
