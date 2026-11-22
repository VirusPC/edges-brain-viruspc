import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateIssueProducts } from "./validate_products.mjs";

const RULES = {
  repo: "VirusPC/edges-brain-viruspc",
  commit: "a".repeat(40),
  path: "skills/managed/weekly-ai-blogs-digest/references/页面.md",
};

test("a synthetic products directory passes when hashes match", () => {
  const issue = writeIssue();
  assert.deepEqual(validateIssueProducts(issue), []);
});

test("a changed upstream file invalidates the table that cites it", () => {
  const issue = writeIssue();
  fs.writeFileSync(path.join(issue, "keywords.json"), "{\"words\":[{\"word\":\"changed\"}]}\n");
  const errors = validateIssueProducts(issue);
  assert.ok(errors.some((error) => error.includes("keywords.json")));
});

test("skipped input without a reason fails, and missing products fail", () => {
  const issue = writeIssue();
  const selection = JSON.parse(fs.readFileSync(path.join(issue, "products/selection.json"), "utf8"));
  selection.inputs.push({ path: "aa-language-models.json", status: "skipped" });
  fs.writeFileSync(path.join(issue, "products/selection.json"), JSON.stringify(selection));
  assert.ok(validateIssueProducts(issue).some((error) => error.includes("reason")));
  fs.rmSync(path.join(issue, "products/page.json"));
  assert.ok(validateIssueProducts(issue).some((error) => error.includes("page.json")));
});

function writeIssue() {
  const issue = fs.mkdtempSync(path.join(os.tmpdir(), "products-contract-"));
  const keywords = "{\"words\":[]}\n";
  fs.writeFileSync(path.join(issue, "keywords.json"), keywords);
  const products = path.join(issue, "products");
  fs.mkdirSync(products);
  const selection = envelope("selection", "选文.md", [
    { path: "feeds.index.json", sha256: "b".repeat(64) },
  ], { rows: [{ link: "https://example.com/a", title: "示例", section: "精选文章/国外非模型厂", date: "2099-01-01" }] });
  fs.writeFileSync(path.join(products, "selection.json"), JSON.stringify(selection));
  const summaries = envelope("summaries", "总结.md", [
    { path: "products/selection.json", sha256: sha(path.join(products, "selection.json")) },
  ], { rows: [{ link: "https://example.com/a", title: "示例", one_line: "一句", short: true }] });
  const boards = envelope("boards", "榜单.md", [
    { path: "aa-language-models.json", status: "skipped", reason: "夹具里没有这份榜" },
  ], { rows: [{ id: "aa", title: "Artificial Analysis", omitted: true, reason: "夹具里没有这份榜" }] });
  fs.writeFileSync(path.join(products, "summaries.json"), JSON.stringify(summaries));
  fs.writeFileSync(path.join(products, "boards.json"), JSON.stringify(boards));
  const page = envelope("page", "页面.md", [
    { path: "products/selection.json", sha256: sha(path.join(products, "selection.json")) },
    { path: "products/summaries.json", sha256: sha(path.join(products, "summaries.json")) },
    { path: "products/boards.json", sha256: sha(path.join(products, "boards.json")) },
    { path: "keywords.json", sha256: sha(path.join(issue, "keywords.json")) },
  ], {
    window: { since: "2098-12-25", until: "2098-12-31", generated: "2099-01-01" },
    chapters: [
      { title: "一、本周关键词" },
      { title: "二、模型进展" },
      { title: "三、项目开源" },
      { title: "四、精选文章" },
      { title: "五、精选推文", status: "wip" },
      { title: "六、精选播客", status: "wip" },
    ],
    notes: "这是校验夹具，不是某一期周报。",
  });
  fs.writeFileSync(path.join(products, "page.json"), JSON.stringify(page));
  return issue;
}

function envelope(node, ref, inputs, extra) {
  return {
    version: 1,
    issue: "2099-01-01",
    node,
    rules: { ...RULES, path: `skills/managed/weekly-ai-blogs-digest/references/${ref}` },
    inputs,
    ...extra,
  };
}

function sha(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
