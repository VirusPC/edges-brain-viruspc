import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { run } from "../src/program.js";

const packageVersion = (createRequire(import.meta.url)("../package.json") as {
  version: string;
}).version;

const requiredNoteFlags = [
  "--title",
  "Daily summary",
  "--body",
  "Some useful content",
] as const;

function failedJson(stdout: string): { status: string; errorCode: string; reason: string } {
  return JSON.parse(stdout) as { status: string; errorCode: string; reason: string };
}

test("run note rejects missing required flags", async () => {
  const result = await run(["notes", "create"]);
  assert.equal(result.exitCode, 2);
  const parsed = failedJson(result.stdout);
  assert.equal(parsed.errorCode, "VALIDATION_ERROR");
  assert.match(parsed.reason, /--title|H1/);
});

test("run note rejects unknown flags", async () => {
  const result = await run(["notes", "create", ...requiredNoteFlags, "--nope"]);
  assert.equal(result.exitCode, 2);
  assert.equal(failedJson(result.stdout).errorCode, "VALIDATION_ERROR");
});

test("run --help is help", async () => {
  const result = await run(["--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Commands:/);
});

test("run note --help is help, not a validation error", async () => {
  const result = await run(["notes", "--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /--title/);
});

test("run tasks --help is help", async () => {
  const result = await run(["tasks", "--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /\blist\b/);
});

test("run tasks without a subcommand is a validation error", async () => {
  const result = await run(["tasks"]);
  assert.equal(result.exitCode, 2);
  assert.equal(failedJson(result.stdout).errorCode, "VALIDATION_ERROR");
});

test("run rejects unexpected positionals on note", async () => {
  const result = await run(["notes", "create", ...requiredNoteFlags, "leftover"]);
  assert.equal(result.exitCode, 2);
  assert.equal(failedJson(result.stdout).errorCode, "VALIDATION_ERROR");
});

test("run note rejects removed ingest flags", async () => {
  const result = await run(["notes", "create", ...requiredNoteFlags, "--co-author", "Codex <codex@openai.com>"]);
  assert.equal(result.exitCode, 2);
  const parsed = failedJson(result.stdout);
  assert.equal(parsed.errorCode, "VALIDATION_ERROR");
  assert.match(parsed.reason, /co-author/);
});

test("run returns version", async () => {
  const version = await run(["--version"]);
  assert.equal(version.exitCode, 0);
  assert.equal(version.stdout, `${packageVersion}\n`);
  const short = await run(["-v"]);
  assert.equal(short.exitCode, 0);
  assert.equal(short.stdout, `${packageVersion}\n`);
});

test("run root without a subcommand is a usage error", async () => {
  const result = await run([]);
  assert.notEqual(result.exitCode, 0);
});

test("run rejects the removed ingest subcommand name", async () => {
  const result = await run(["ingest", ...requiredNoteFlags]);
  assert.equal(result.exitCode, 2);
  const parsed = failedJson(result.stdout);
  assert.equal(parsed.errorCode, "VALIDATION_ERROR");
  assert.match(parsed.reason, /edges notes/);
});

test("run rejects old root-as-ingest flat flags", async () => {
  const result = await run([...requiredNoteFlags, "--json"]);
  assert.equal(result.exitCode, 2);
  assert.equal(failedJson(result.stdout).errorCode, "VALIDATION_ERROR");
});
