#!/usr/bin/env node
// Stage Grok Bot conversations from the box's local message search index
// (/home/box/agent-data/search-index.db) into <staging-dir>/<botId>.jsonl,
// the input of export-cli.mjs --source staging.
// Used because ReadTranscript may be unavailable in routine runs. The index has
// visible user/assistant text with real timestamps, but no tool names.
// Writes the FULL history per bot (turnPos = position on the full timeline,
// so trace ids stay stable); the export cursor decides what is new.
// Run: node adapter/stage-from-search-index.mjs [--db PATH] [--staging-dir DIR] [--agents-dir DIR]
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { DatabaseSync } from "node:sqlite";

const { values: a } = parseArgs({
  options: {
    db: { type: "string", default: "/home/box/agent-data/search-index.db" },
    "staging-dir": { type: "string", default: "/workspace/langfuse-export-staging" },
    "agents-dir": { type: "string", default: "/home/box/agent-data/agents" },
  },
});

/** epoch ms → Asia/Shanghai wall time at minute precision, e.g. 2026-10-24T19:51:00 */
const shanghaiMinute = (ms) => new Date(Math.floor(ms / 60000) * 60000 + 8 * 3600_000).toISOString().slice(0, 16) + ":00";

const botIds = fs.existsSync(a["agents-dir"])
  ? fs.readdirSync(a["agents-dir"]).filter((id) => fs.existsSync(path.join(a["agents-dir"], id, "profile.json"))).sort()
  : [];
const db = new DatabaseSync(a.db, { readOnly: true });
// Order must stay `timestamp_ms, seq, id`: it fixes turnPos numbering.
const q = db.prepare("SELECT role, timestamp_ms, body FROM messages WHERE agent_id = ? ORDER BY timestamp_ms, seq, id");
fs.mkdirSync(a["staging-dir"], { recursive: true });

const summary = { db: a.db, staging_dir: a["staging-dir"], bots: 0, rows: 0 };
for (const botId of botIds) {
  const rows = q.all(botId);
  if (!rows.length) continue;
  const lines = rows.map((r) => {
    const row = { role: r.role, message: { content: [{ type: "text", text: r.body }] } };
    if (r.role === "user") row._ts = shanghaiMinute(Number(r.timestamp_ms));
    return JSON.stringify(row);
  });
  const file = path.join(a["staging-dir"], `${botId}.jsonl`);
  fs.writeFileSync(`${file}.tmp`, `${lines.join("\n")}\n`);
  fs.renameSync(`${file}.tmp`, file);
  summary.bots++;
  summary.rows += rows.length;
}
db.close();
console.log(JSON.stringify(summary));
