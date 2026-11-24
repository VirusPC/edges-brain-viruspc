import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyThemeLabel,
  buildKeywordDocument,
  isBlockedProduct,
  isEvaluationTitle,
  mergeOverviewTags,
  modelNamesInTitle,
  NO_MODEL_TEXT,
  releaseKind,
  summaryKeywords,
  textHasWord,
  THEME_TAG_WEIGHT,
} from "./build_keywords.mjs";
import { keywordWeight } from "./keyword_weight.mjs";

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
  assert.equal(byWord["software factory"].theme, true);
  assert.equal(byWord["GPT-6.2 Sol"].theme, undefined);
  assert.equal(byWord["GPT-6.2 Astra"].theme, undefined);
  assert.ok(byWord["software factory"].mentions >= 2);
  assert.equal(
    keywordWeight({ score: 5, mentions: 3, sources: 3 }),
    keywordWeight({ score: 3, mentions: 3, sources: 3 }),
  );
  assert.equal(textHasWord("Introducing GPT-6.2 Astra and Sol", "GPT-6.2 Sol"), false);
});

test("a model-releases name already present in an earlier snapshot is not a new word", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kw-prior-"));
  writeIssue(root, "2026-11-13", "2026-11-06", "2026-11-12", [
    item("Qwen4-Max 预览版上线，Qwen Code 1.0 Preview 发布", "2026-11-11", "https://qwen.ai/blog", "qwen"),
  ]);
  writeIssue(root, "2026-11-20", "2026-11-13", "2026-11-19", [
    item("Qwen4-Max 正式上线", "2026-11-16", "https://qwen.ai/blog/max", "qwen", "Qwen4-Max is live."),
    item("Qwen4-Max lands on one host", "2026-11-17", "https://example.com/a", "qwen"),
    item("Qwen4-Max lands on another host", "2026-11-18", "https://example.com/b", "qwen"),
  ]);
  fs.writeFileSync(
    path.join(root, "2026-11-20", "model-releases.json"),
    JSON.stringify({
      models: [{ name: "Qwen4-Max", release_url: "https://qwen.ai/blog/max" }],
    }),
  );
  const doc = buildKeywordDocument(root, "2026-11-20");
  assert.equal(doc.words.some((word) => word.word === "Qwen4-Max"), false);
  assert.equal(doc.words.some((word) => word.word === "Qwen4-Max lands"), false);
});

test("versioned security, review, and code tools are products, and eval titles yield no model", () => {
  assert.equal(isEvaluationTitle("GPT-6 Cyber Security Evaluation: CodeRabbit’s Results"), true);
  assert.deepEqual(modelNamesInTitle("GPT-6 Cyber Security Evaluation: CodeRabbit’s Results"), []);
  assert.equal(releaseKind("Devin Security 2.0", "Devin Security 2.0: Built for the new threat landscape"), "product");
  assert.equal(releaseKind("Devin Review 2.0", "Introducing Devin Review 2.0"), "product");
  assert.equal(releaseKind("Qwen Code 1.0 Preview", "Qwen Code 1.0 Preview 发布"), "product");
  assert.equal(releaseKind("SWE-2 Flash", "Introducing SWE-2 Flash, our new fast coding model"), "model");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kw-kind-"));
  writeIssue(root, "2026-11-06", "2026-10-30", "2026-11-05", [
    item("Devin Security 2.0: Built for the new threat landscape", "2026-11-02", "https://devin.ai/security", "devin-blog"),
    item("Introducing Devin Review 2.0: the best way to review PRs", "2026-11-05", "https://devin.ai/review", "devin-blog"),
    item("Qwen4-Max 预览版上线，Qwen Code 1.0 Preview 发布", "2026-11-04", "https://qwen.ai/code", "qwen"),
    item("GPT-6 Cyber Security Evaluation: CodeRabbit’s Results", "2026-11-05", "https://coderabbit.ai/eval", "coderabbit"),
    item("Introducing SWE-2 Flash, our new fast coding model", "2026-11-04", "https://cognition.ai/swe", "cognition"),
  ]);
  const byWord = Object.fromEntries(buildKeywordDocument(root, "2026-11-06").words.map((word) => [word.word, word]));
  assert.equal(byWord["Devin Security 2.0"].kind, "product");
  assert.equal(byWord["Devin Security 2.0"].score, 4);
  assert.equal(byWord["Devin Review 2.0"].kind, "product");
  assert.equal(byWord["Qwen Code 1.0 Preview"].kind, "product");
  assert.equal(byWord["GPT-6 Cyber"], undefined);
  assert.equal(byWord["SWE-2 Flash"].kind, "model");
  assert.equal(byWord["SWE-2 Flash"].score, 5);
  assert.equal(byWord["SWE-2 Flash"].theme, undefined);
});

test("a new model's category score does not take the theme from a wider concept", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kw-theme-"));
  writeIssue(root, "2026-11-13", "2026-11-06", "2026-11-12", [
    item("Introducing Claude Fable 5.2", "2026-11-09", "https://www.anthropic.com/fable", "anthropic", "Claude Fable 5.2"),
    item("Claude Fable 5.2 on a second host", "2026-11-10", "https://aws.amazon.com/fable", "aws-ml", "Claude Fable 5.2"),
    item("Claude Fable 5.2 on a third host", "2026-11-11", "https://devin.ai/fable", "devin-blog", "Claude Fable 5.2"),
    item("The components of agent memory", "2026-11-06", "https://www.anthropic.com/memory", "anthropic", "Agent Memory"),
    item("Context Engineering (Agent Memory) for AI Agents", "2026-11-10", "https://www.langchain.com/memory", "langchain", "Agent Memory"),
    item("Managed Deep Agents v0.10", "2026-11-07", "https://www.langchain.com/deep", "langchain", "Deep Agents"),
    item("How Stripe Built Kai on Deep Agents", "2026-11-10", "https://www.langchain.com/kai", "langchain", "Deep Agents again"),
  ]);
  fs.writeFileSync(
    path.join(root, "2026-11-13", "model-releases.json"),
    JSON.stringify({ models: [{ name: "Claude Fable 5.2", release_url: "https://www.anthropic.com/fable" }] }),
  );
  const doc = buildKeywordDocument(root, "2026-11-13");
  const theme = doc.words.filter((word) => word.theme);
  assert.equal(theme.length, 1);
  assert.equal(theme[0].kind, "concept");
  assert.notEqual(theme[0].word, "Claude Fable 5.2");
  const model = doc.words.find((word) => word.word === "Claude Fable 5.2");
  assert.equal(model.score, 5);
  assert.equal(model.theme, undefined);
  assert.equal(model.weight, keywordWeight({ mentions: model.mentions, sources: model.sources }));
  assert.throws(
    () => applyThemeLabel(doc.words, { evidence: "not the theme", word: "别的话题" }),
    /对不上/,
  );
});

test("summary keywords keep model names and do not emit the whole title", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kw-summary-"));
  const issue = "2026-11-13";
  const summary = path.join(root, issue, "summary");
  fs.mkdirSync(path.join(summary, "articles"), { recursive: true });
  fs.mkdirSync(path.join(summary, "models"), { recursive: true });
  fs.writeFileSync(
    path.join(summary, "articles", "post.json"),
    JSON.stringify({
      id: "https://example.com/post",
      title: "Introducing Claude Fable 5.2 and a very long product announcement title",
      link: "https://example.com/post",
      sentence: "Claude Fable 5.2 is the release.",
      text: "Claude Fable 5.2",
    }),
  );
  fs.writeFileSync(
    path.join(summary, "models", "fable.json"),
    JSON.stringify({ id: "Claude Fable 5.2", text: "Claude Fable 5.2" }),
  );
  const names = summaryKeywords(root, issue).keywords.map((item) => item.name);
  assert.ok(names.includes("Claude Fable 5.2"));
  assert.equal(names.some((name) => name.includes("very long")), false);
});

test("theme tags raise weight without replacing extracted names or the theme flag", () => {
  const merged = mergeOverviewTags(
    [
      { name: "常驻 Agent", weight: 4.2, theme: true, targets: ["a"] },
      { name: "GPT-6.2 Astra", weight: 4.7, targets: ["m"] },
    ],
    [
      { text: "能力往工作流里走。", tag: "进入工作流", refs: [{ id: "m" }] },
      { text: "值守还在。", tag: "常驻 agent", refs: [{ id: "a" }, { id: "b" }] },
      { text: NO_MODEL_TEXT, tag: "无重要发布", refs: [] },
    ],
  );
  assert.equal(merged[0].name, "常驻 Agent");
  assert.equal(merged[0].theme, true);
  assert.equal(merged[0].weight, THEME_TAG_WEIGHT);
  assert.deepEqual(merged[0].targets, ["a", "b"]);
  const added = merged.find((item) => item.name === "进入工作流");
  assert.equal(added.weight, THEME_TAG_WEIGHT);
  assert.equal(added.theme, undefined);
  assert.deepEqual(added.targets, ["m"]);
  const model = merged.find((item) => item.name === "GPT-6.2 Astra");
  assert.equal(model.weight, 4.7);
  assert.equal(model.theme, undefined);
  assert.equal(merged.some((item) => item.name === "无重要发布"), false);
  assert.ok(merged.findIndex((item) => item.name === "进入工作流") < merged.findIndex((item) => item.name === "GPT-6.2 Astra"));
});

test("summary keywords merge theme tags after extraction and keep the model name", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kw-tags-"));
  const issue = "2026-11-13";
  const summary = path.join(root, issue, "summary");
  fs.mkdirSync(path.join(summary, "articles"), { recursive: true });
  fs.mkdirSync(path.join(summary, "models"), { recursive: true });
  fs.writeFileSync(
    path.join(summary, "articles", "post.json"),
    JSON.stringify({
      id: "https://example.com/post",
      title: "Introducing Claude Fable 5.2 and a very long product announcement title",
      link: "https://example.com/post",
      sentence: "Claude Fable 5.2 is the release.",
      text: "Claude Fable 5.2",
    }),
  );
  fs.writeFileSync(
    path.join(summary, "models", "fable.json"),
    JSON.stringify({ id: "Claude Fable 5.2", text: "Claude Fable 5.2" }),
  );
  const before = summaryKeywords(root, issue).keywords.find((item) => item.name === "Claude Fable 5.2");
  assert.ok(before);
  assert.ok(before.weight < THEME_TAG_WEIGHT);
  fs.writeFileSync(
    path.join(summary, "overview.json"),
    JSON.stringify({
      skill: { name: "weekly-ai-blogs-digest", version: "0.0.9" },
      themes: [
        {
          kind: "model",
          tag: "Claude Fable 5.2",
          text: "Claude Fable 5.2",
          refs: [{ id: "Claude Fable 5.2", label: "Claude Fable 5.2" }],
        },
        {
          kind: "other",
          tag: "进入工作流",
          text: "一篇",
          refs: [{ id: "https://example.com/post", label: "一篇" }],
        },
        { kind: "model", tag: "无重要发布", text: NO_MODEL_TEXT, refs: [] },
      ],
    }),
  );
  const after = summaryKeywords(root, issue).keywords;
  const model = after.find((item) => item.name === "Claude Fable 5.2");
  assert.equal(model.weight, THEME_TAG_WEIGHT);
  assert.equal(model.theme, undefined);
  assert.ok(model.targets.includes("Claude Fable 5.2"));
  const tag = after.find((item) => item.name === "进入工作流");
  assert.equal(tag.weight, THEME_TAG_WEIGHT);
  assert.equal(tag.theme, undefined);
  assert.deepEqual(tag.targets, ["https://example.com/post"]);
  assert.equal(after.some((item) => item.name === "无重要发布"), false);
  assert.equal(after.some((item) => item.name.includes("very long")), false);
});

test("keyword build refuses to run before overview exists and before tags exist", () => {
  const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const script = path.join(skillRoot, "scripts/summarize/keywords/build_keywords.mjs");
  const missing = fs.mkdtempSync(path.join(os.tmpdir(), "kw-no-overview-"));
  const missingDir = path.join(missing, "2026-11-20");
  fs.mkdirSync(missingDir, { recursive: true });
  const withoutOverview = spawnSync(process.execPath, [script, "--issue-dir", missingDir], { encoding: "utf8" });
  assert.notEqual(withoutOverview.status, 0);
  assert.match(withoutOverview.stderr, /overview\.json/);

  const untagged = fs.mkdtempSync(path.join(os.tmpdir(), "kw-no-tag-"));
  const untaggedDir = path.join(untagged, "2026-11-20");
  fs.mkdirSync(path.join(untaggedDir, "summary"), { recursive: true });
  fs.writeFileSync(
    path.join(untaggedDir, "summary", "overview.json"),
    JSON.stringify({
      skill: { name: "weekly-ai-blogs-digest", version: "0.0.9" },
      themes: [{ kind: "model", text: "x", refs: [] }],
    }),
  );
  const withoutTag = spawnSync(process.execPath, [script, "--issue-dir", untaggedDir], { encoding: "utf8" });
  assert.notEqual(withoutTag.status, 0);
  assert.match(withoutTag.stderr, /缺少 tag/);
  assert.equal(fs.existsSync(path.join(untaggedDir, "summary", "keywords.json")), false);
});

test("a theme label replaces only the evidenced concept", () => {
  const words = [
    { word: "Gemini 4 Neon", kind: "model", score: 5, mentions: 3, sources: 3, weight: 4.2 },
    { word: "always-on agents", kind: "concept", score: 3, mentions: 3, sources: 3, weight: 4.2, theme: true },
  ];
  applyThemeLabel(words, { evidence: "always-on agents", word: "常驻 Agent" });
  assert.equal(words.filter((word) => word.theme).length, 1);
  assert.equal(words.find((word) => word.theme).word, "常驻 Agent");
  assert.equal(words.find((word) => word.theme).evidence, "always-on agents");
  assert.equal(words.some((word) => word.word === "always-on agents"), false);
  assert.equal(words.find((word) => word.word === "Gemini 4 Neon").theme, undefined);
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
