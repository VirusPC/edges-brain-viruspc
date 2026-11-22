import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildKeywordDocument, isBlockedProduct, modelNamesInTitle, textHasWord } from "./build_keywords.mjs";
import { keywordWeight } from "./keyword_cloud_style.mjs";

test("a model title keeps the official spans and does not invent the other name", () => {
  assert.deepEqual(modelNamesInTitle("Introducing GPT-6.2 Astra and Sol"), ["GPT-6.2 Astra"]);
  assert.deepEqual(modelNamesInTitle("Introducing Claude Fable 5.2 and Claude Mythos 5.2"), [
    "Claude Fable 5.2",
    "Claude Mythos 5.2",
  ]);
  assert.deepEqual(modelNamesInTitle("腾讯混元发布 Hy4，首次成为最强开源模型之一"), ["Hy4"]);
  assert.deepEqual(modelNamesInTitle("Claude Haiku 5.5 is now available in Kiro"), []);
  assert.equal(isBlockedProduct("OpenRouter"), true);
  assert.equal(isBlockedProduct("Devin Bots"), false);
});

test("mentions and sources come from snapshot entries, not from a written digest", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kw-build-"));
  const issue = "2026-11-20";
  const prior = "2026-11-13";
  writeIssue(root, prior, "2026-11-06", "2026-11-12", [
    item("Gemini 4 Carbon is the old one", "2026-11-10", "https://example.com/old", "blog"),
  ]);
  writeIssue(root, issue, "2026-11-13", "2026-11-19", [
    item("Introducing GPT-6.2 Astra and Sol", "2026-11-17", "https://openai.com/index/gpt", "openai-news", "Astra is here."),
    item("GPT-6.2 Sol and Astra review", "2026-11-19", "https://coderabbit.ai/blog/review", "coderabbit", "GPT-6.2 Sol and GPT-6.2 Astra."),
    item("Codex is mentioned everywhere", "2026-11-18", "https://openai.com/codex", "openai-news", "Codex Codex Codex"),
    item("Another Codex note", "2026-11-18", "https://aws.amazon.com/codex", "aws-ml", "Codex"),
    item("Introducing software factory notes", "2026-11-16", "https://www.warp.dev/a", "warp", "software factory"),
    item("Becoming a software factory", "2026-11-19", "https://kiro.dev/b", "kiro", "software factory"),
    item("福利", "2026-11-18", "https://linux.do/t/1", "linux-do-welfare", "GPT-6.2 Astra 免费额度"),
    item("Gemini 4 Carbon is now available in Devin", "2026-11-16", "https://devin.ai/carbon", "devin-blog"),
    item("out of window", "2026-11-20", "https://openai.com/later", "openai-news", "GPT-6.2 Astra"),
  ]);
  fs.writeFileSync(
    path.join(root, issue, "model-releases.json"),
    JSON.stringify({
      models: [
        { name: "GPT-6.2 Astra", release_url: "https://openai.com/index/gpt" },
        { name: "GPT-6.2 Sol", release_url: "https://openai.com/index/gpt" },
      ],
    }),
  );
  const doc = buildKeywordDocument(root, issue, {
    snapshot: { commit: "abc", ref: "main" },
  });
  const byWord = Object.fromEntries(doc.words.map((word) => [word.word, word]));
  assert.equal(byWord["GPT-6.2 Sol"].kind, "model");
  assert.equal(byWord["GPT-6.2 Sol"].score, 5);
  assert.equal(byWord["GPT-6.2 Sol"].mentions, 2);
  assert.equal(byWord["GPT-6.2 Sol"].sources, 2);
  assert.equal(byWord["GPT-6.2 Sol"].weight, keywordWeight({ score: 5, mentions: 2, sources: 2 }));
  assert.equal(byWord.Codex, undefined);
  assert.equal(byWord["Gemini 4 Carbon"], undefined);
  assert.equal(byWord["software factory"].kind, "concept");
  assert.equal(byWord["software factory"].score, 3);
  assert.ok(byWord["software factory"].mentions >= 2);
  assert.equal(textHasWord("Introducing GPT-6.2 Astra and Sol", "GPT-6.2 Sol"), false);
});

/**
 * @param {string} root
 * @param {string} issue
 * @param {string} since
 * @param {string} until
 * @param {object[]} items
 */
function writeIssue(root, issue, since, until, items) {
  const dir = path.join(root, issue);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "feeds.json"),
    JSON.stringify({ window: { since, until }, items }),
  );
}

/**
 * @param {string} title
 * @param {string} date
 * @param {string} link
 * @param {string} source
 * @param {string} [summary]
 */
function item(title, date, link, source, summary = "") {
  return { title, date, link, source, summary, thin: !summary, lane: "product" };
}
